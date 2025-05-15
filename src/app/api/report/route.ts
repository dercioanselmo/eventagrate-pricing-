import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { marked } from 'marked';
import { MongoClient, ObjectId } from 'mongodb';

interface ProviderInput {
  name: string;
  type: string;
  defaultValue: string;
  description: string;
}

interface Provider {
  _id: string;
  name: string;
  inputs: ProviderInput[];
  pricing?: { [key: string]: { price: string; url: string } };
}

interface SelectedProvider {
  provider: Provider;
  inputs: { [key: string]: string };
}

interface ReportRequest {
  providers: SelectedProvider[];
}

// In-memory cache for Grok responses
const responseCache = new Map<string, string>();

// Generate cache key from provider inputs
const generateCacheKey = (provider: SelectedProvider): string => {
  const inputString = JSON.stringify(provider.inputs);
  return `${provider.provider.name}:${inputString}`;
};

// MongoDB connection
const uri = process.env.MONGODB_URI;
let mongoClient: MongoClient | null = null;

async function connectToMongoDB(): Promise<MongoClient> {
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in .env.local');
  }
  if (!mongoClient) {
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
  }
  return mongoClient;
}

// Fallback table generator
const generateFallbackTable = (provider: SelectedProvider, pricingUrl: string): string => {
  const rows = Object.entries(provider.inputs)
    .map(([key, value]) => `| ${key} | ${value ?? ''} | Unknown | Unknown | - | ${pricingUrl} |`)
    .join('\n');
  return `
## Provider: ${provider.provider.name}
| Input | Value | Original Price (USD) | Estimated Cost (USD) | Cost Calculation | Pricing Source URL |
|-------|-------|----------------------|----------------------|------------------|--------------------|
${rows}
| Total | - | - | Unknown | - | - |
For exact pricing, see: ${pricingUrl}

`;
};

export async function POST(request: NextRequest) {
  try {
    const body: ReportRequest = await request.json();

    if (!body.providers || !Array.isArray(body.providers) || body.providers.length === 0) {
      return NextResponse.json({ error: 'At least one provider is required' }, { status: 400 });
    }

    // Connect to MongoDB
    const client = await connectToMongoDB();
    const db = client.db('eventagrate');
    const providersCollection = db.collection('providers');

    // Prepare data for Grok
    const summary = body.providers.map((item) => {
      return `${item.provider.name}: Inputs=${JSON.stringify(item.inputs)}`;
    }).join('\n');

    // Check cache and MongoDB for consistent pricing
    let reportText = '';
    let allCached = true;

    for (const provider of body.providers) {
      const cacheKey = generateCacheKey(provider);

      // Check cache
      if (responseCache.has(cacheKey)) {
        reportText += responseCache.get(cacheKey) + '\n';
        continue;
      }

      // Check MongoDB for stored pricing
      const storedProvider = await providersCollection.findOne({ _id: new ObjectId(provider.provider._id) });
      let pricingFound = true;

      if (storedProvider?.pricing) {
        const pricingRows = Object.entries(provider.inputs)
          .map(([key, value]) => {
            const displayValue = value ?? '';
            const pricingData = storedProvider.pricing?.[`${key}:${displayValue}`];
            if (pricingData) {
              const { price, url } = pricingData;
              let estimatedCost = 'Included';
              let costCalculation = '-';
              if (price && !price.includes('Included')) {
                if (price.includes('/hour')) {
                  const hourlyRate = parseFloat(price.replace('$', '').replace('/hour', ''));
                  estimatedCost = (hourlyRate * 730).toFixed(2);
                  costCalculation = `${price} × 730 hours`;
                } else if (price.includes('/GB/month')) {
                  const perGB = parseFloat(price.replace('$', '').replace('/GB/month', ''));
                  const gb = parseFloat(value) || 1;
                  estimatedCost = (perGB * gb).toFixed(2);
                  costCalculation = `${price} × ${gb} GB`;
                }
              }
              return `| ${key} | ${displayValue} | ${price} | $${estimatedCost} | ${costCalculation} | ${url} |`;
            }
            pricingFound = false;
            return `| ${key} | ${displayValue} | Unknown | Unknown | - | - |`;
          })
          .join('\n');

        if (pricingFound) {
          const totalCost = Object.entries(provider.inputs)
            .reduce((sum, [key, value]) => {
              const displayValue = value ?? '';
              const pricingData = storedProvider.pricing?.[`${key}:${displayValue}`];
              if (pricingData && pricingData.price && !pricingData.price.includes('Included')) {
                if (pricingData.price.includes('/hour')) {
                  const hourlyRate = parseFloat(pricingData.price.replace('$', '').replace('/hour', ''));
                  return sum + hourlyRate * 730;
                } else if (pricingData.price.includes('/GB/month')) {
                  const perGB = parseFloat(pricingData.price.replace('$', '').replace('/GB/month', ''));
                  const gb = parseFloat(value) || 1;
                  return sum + perGB * gb;
                }
              }
              return sum;
            }, 0)
            .toFixed(2);

          const providerTable = `
## Provider: ${provider.provider.name}
| Input | Value | Original Price (USD) | Estimated Cost (USD) | Cost Calculation | Pricing Source URL |
|-------|-------|----------------------|----------------------|------------------|--------------------|
${pricingRows}
| Total | - | - | $${totalCost} | - | - |
`;
          reportText += providerTable + '\n';
          responseCache.set(cacheKey, providerTable);
          continue;
        }
      }

      allCached = false;
    }

    // If not all providers are cached or in MongoDB, call Grok
    if (!allCached) {
      const prompt = `You are a cloud cost estimation expert. Based on the following provider inputs, estimate the monthly costs for each provider. Use consistent pricing from the provider's most specific pricing page available, ensuring the URL points to the detailed pricing for the service or tier (e.g., for Mongo Atlas M30 in us-east-1, use $0.54/hour from https://www.mongodb.com/products/platform/atlas-cloud-providers/aws/pricing; adjust for regions like me-central-1 with a 15% uplift, e.g., $0.621/hour). If exact pricing or a specific URL is unavailable, use the provider's general pricing page and note it. Ensure the same pricing, URL, and calculation formula are used for identical inputs across runs. Log pricing assumptions (e.g., tier, region, extras) in the Notes section.

Inputs:
${summary}

Generate a report in Markdown format with:
- A separate table for each provider with columns: Input, Value, Original Price (USD), Estimated Cost (USD), Cost Calculation, Pricing Source URL.
  - Original Price: The provider's standard list price (e.g., $0.621/hour for Mongo Atlas M30 in me-central-1). Use fixed prices for known configurations (e.g., Mongo Atlas M30: $0.54/hour in us-east-1, adjust 15% for me-central-1).
  - Estimated Cost: The calculated cost based on inputs, using consistent pricing for each run.
  - Cost Calculation: A short, precise mathematical expression (e.g., "$0.621/hour × 730 hours") for rows with a non-zero or non-"Included" Estimated Cost; otherwise, use "-".
  - Pricing Source URL: The most specific URL of the pricing page used for the Original Price (e.g., https://www.mongodb.com/products/platform/atlas-cloud-providers/aws/pricing for Mongo Atlas M30). Use the same URL for identical inputs.
  - Include a final row in each table with the total estimated cost: | Total | - | - | $X.XX | - | - |.
- For multiple providers, include a totals table with columns: Provider, Original Price (USD), Estimated Cost (USD), summarizing each provider's totals and a grand total in the last row.
- Use only Markdown table syntax (e.g., | Input | Value | Original Price | Estimated Cost | Cost Calculation | Pricing Source URL |).
- Include headers: ## Provider: <Name> for provider tables, ## Totals for the totals table.
- At the end, add a ## Notes section listing the pricing source URLs as plain text, matching the specific URLs used in the tables (e.g., - Mongo Atlas: https://www.mongodb.com/products/platform/atlas-cloud-providers/aws/pricing). Include detailed pricing assumptions (e.g., "Mongo Atlas M30: $0.621/hour, me-central-1, standard replica set, 15% uplift from us-east-1").
- Format prices as $X.XX (e.g., $123.45).
- Do not include cost optimization recommendations.
- Use only Markdown tables, no other formats.`;

      // Validate API key
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) {
        console.error('XAI_API_KEY is not defined in .env.local');
        return NextResponse.json({ error: 'Server configuration error: API key missing' }, { status: 500 });
      }

      // Call Grok API
      const response = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        {
          model: 'grok-beta',
          messages: [
            { role: 'system', content: 'You are a cloud cost estimation expert.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0,
          max_tokens: 1500,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      reportText = response.data.choices[0].message.content;

      // Validate and cache Grok response
      const hasTables = reportText.includes('|') && reportText.includes('---');
      if (!hasTables) {
        console.warn('Grok response lacks valid Markdown tables, generating fallback');
        reportText = body.providers
          .map((provider) => {
            const defaultUrl = `https://www.${provider.provider.name.toLowerCase().replace(/\s+/g, '')}.com/pricing`;
            const fallbackTable = generateFallbackTable(provider, defaultUrl);
            responseCache.set(generateCacheKey(provider), fallbackTable);
            return fallbackTable;
          })
          .join('\n');
      } else {
        // Parse reportText to extract tables and cache them
        const providerSections = reportText.split('## Provider:').slice(1);
        for (let i = 0; i < providerSections.length && i < body.providers.length; i++) {
          const providerTable = `## Provider:${providerSections[i]}`;
          responseCache.set(generateCacheKey(body.providers[i]), providerTable);
        }
      }

      // Save pricing to MongoDB
      for (const provider of body.providers) {
        const providerTable = responseCache.get(generateCacheKey(provider));
        if (providerTable) {
          const pricing: { [key: string]: { price: string; url: string } } = {};
          const rows = providerTable.split('\n').filter((line) => line.startsWith('|') && !line.includes('Total'));
          for (const row of rows) {
            const [, input, value, price, , , url] = row.split('|').map((s) => s.trim());
            if (input && price && url) {
              pricing[`${input}:${value || ''}`] = { price, url };
            }
          }
          await providersCollection.updateOne(
            { _id: new ObjectId(provider.provider._id) },
            { $set: { pricing } },
            { upsert: true }
          );
        }
      }
    }

    // Append totals table and notes
    if (body.providers.length > 1 && reportText.includes('## Totals')) {
      // Totals table already included by Grok
    } else if (body.providers.length > 1) {
      const totals = body.providers.map((provider) => {
        const providerTable = responseCache.get(generateCacheKey(provider));
        if (providerTable) {
          const totalLine = providerTable.split('\n').find((line) => line.includes('Total'));
          if (totalLine) {
            const [, , , estimatedCost] = totalLine.split('|').map((s) => s.trim());
            return `| ${provider.provider.name} | - | $${estimatedCost.replace('$', '')} |`;
          }
        }
        return `| ${provider.provider.name} | Unknown | Unknown |`;
      }).join('\n');

      const grandTotal = body.providers
        .reduce((sum, provider) => {
          const providerTable = responseCache.get(generateCacheKey(provider));
          if (providerTable) {
            const totalLine = providerTable.split('\n').find((line) => line.includes('Total'));
            if (totalLine) {
              const [, , , estimatedCost] = totalLine.split('|').map((s) => s.trim());
              return sum + (parseFloat(estimatedCost.replace('$', '')) || 0);
            }
          }
          return sum;
        }, 0)
        .toFixed(2);

      reportText += `
## Totals
| Provider | Original Price (USD) | Estimated Cost (USD) |
|----------|----------------------|----------------------|
${totals}
| **Total** | **-** | **$${grandTotal}** |

## Notes
${body.providers.map((p) => {
  const defaultUrl = `https://www.${p.provider.name.toLowerCase().replace(/\s+/g, '')}.com/pricing`;
  const providerTable = responseCache.get(generateCacheKey(p));
  const urlMatch = providerTable?.match(/https?:\/\/[^\s|]+/) || [defaultUrl];
  return `- ${p.provider.name}: ${urlMatch[0]}`;
}).join('\n')}
`;
    } else {
      const provider = body.providers[0];
      const defaultUrl = `https://www.${provider.provider.name.toLowerCase().replace(/\s+/g, '')}.com/pricing`;
      const providerTable = responseCache.get(generateCacheKey(provider)) || reportText;
      const urlMatch = providerTable.match(/https?:\/\/[^\s|]+/) || [defaultUrl];
      reportText += `
## Notes
- ${provider.provider.name}: ${urlMatch[0]}
`;
    }

    // Convert Markdown to HTML
    const reportHtml = await marked(reportText, { breaks: true, gfm: true });

    return NextResponse.json({ report: reportHtml }, { status: 200 });
  } catch (error: any) {
    console.error('POST /api/report error:', error.response?.data || error.message);
    const errorMessage =
      error.response?.data?.error?.message ||
      error.message ||
      'Error generating report. Please check API key or try again.';
    return NextResponse.json({ error: errorMessage }, { status: error.response?.status || 500 });
  }
}
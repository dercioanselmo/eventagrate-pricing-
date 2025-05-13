import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { marked } from 'marked';

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
}

interface SelectedProvider {
  provider: Provider;
  inputs: { [key: string]: string };
}

interface ReportRequest {
  providers: SelectedProvider[];
}

// Fallback table generator if Grok doesn't provide valid Markdown tables
const generateFallbackTable = (provider: SelectedProvider, pricingUrl: string): string => {
  const rows = Object.entries(provider.inputs)
    .map(([key, value]) => `| ${key} | ${value} | Unknown | Unknown | - |`)
    .join('\n');
  return `
## Provider: ${provider.provider.name}
| Input | Value | Original Price (USD) | Estimated Cost (USD) | Cost Calculation |
|-------|-------|----------------------|----------------------|------------------|
${rows}
| Total | - | - | Unknown | - |
For exact pricing, see: ${pricingUrl}

`;
};

export async function POST(request: NextRequest) {
  try {
    const body: ReportRequest = await request.json();

    if (!body.providers || !Array.isArray(body.providers) || body.providers.length === 0) {
      return NextResponse.json(
        { error: 'At least one provider is required' },
        { status: 400 }
      );
    }

    // Prepare data for Grok
    const summary = body.providers.map((item) => {
      return `${item.provider.name}: Inputs=${JSON.stringify(item.inputs)}`;
    }).join('\n');

    // Prompt Grok for structured tables with cost calculation
    const prompt = `You are a cloud cost estimation expert. Based on the following provider inputs, estimate the monthly costs for each provider. If exact pricing is unavailable, indicate the provider's pricing page URL.

Inputs:
${summary}

Generate a report in Markdown format with:
- A separate table for each provider with columns: Input, Value, Original Price (USD), Estimated Cost (USD), Cost Calculation.
  - Original Price: The provider's standard list price (e.g., $0.10/GB).
  - Estimated Cost: The calculated cost based on inputs (e.g., adjusted for usage).
  - Cost Calculation: A short description of how the Estimated Cost was calculated (e.g., "$0.08/hour × 730 hours") for rows with a non-zero or non-"Included" Estimated Cost; otherwise, use "-".
  - Include a final row in each table with the total estimated cost: | Total | - | - | $X.XX | - |.
- For multiple providers, include a totals table with columns: Provider, Original Price (USD), Estimated Cost (USD), summarizing each provider's totals and a grand total in the last row.
- Use only Markdown table syntax (e.g., | Input | Value | Original Price | Estimated Cost | Cost Calculation |).
- Include headers: ## Provider: <Name> for provider tables, ## Totals for the totals table.
- At the end, add a ## Notes section listing the pricing source URLs as plain text (e.g., - Mongo Atlas: https://www.mongodb.com/pricing). Do not use Markdown hyperlinks.
- Format prices as $X.XX (e.g., $123.45).
- Do not include cost optimization recommendations.
- Use only Markdown tables, no other formats.`;

    // Validate API key
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      console.error('XAI_API_KEY is not defined in .env.local');
      return NextResponse.json(
        { error: 'Server configuration error: API key missing' },
        { status: 500 }
      );
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
        temperature: 0.2,
        max_tokens: 1500,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let reportText = response.data.choices[0].message.content;

    // Validate that the response contains Markdown tables
    const hasTables = reportText.includes('|') && reportText.includes('---');
    if (!hasTables) {
      console.warn('Grok response lacks valid Markdown tables, generating fallback');
      reportText = body.providers
        .map((provider) =>
          generateFallbackTable(provider, `https://www.${provider.provider.name.toLowerCase().replace(/\s+/g, '')}.com/pricing`)
        )
        .join('\n');
      if (body.providers.length > 1) {
        reportText += `
## Totals
| Provider | Original Price (USD) | Estimated Cost (USD) |
|----------|----------------------|----------------------|
${body.providers.map((p) => `| ${p.provider.name} | Unknown | Unknown |`).join('\n')}
| **Total** | **Unknown** | **Unknown** |

## Notes
${body.providers.map((p) => `- ${p.provider.name}: https://www.${p.provider.name.toLowerCase().replace(/\s+/g, '')}.com/pricing`).join('\n')}
`;
      } else {
        reportText += `
## Notes
${body.providers.map((p) => `- ${p.provider.name}: https://www.${p.provider.name.toLowerCase().replace(/\s+/g, '')}.com/pricing`).join('\n')}
`;
      }
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
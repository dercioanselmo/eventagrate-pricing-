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

    // Prompt Grok for tables
    const prompt = `You are a cloud cost estimation expert. Based on the following provider inputs, estimate the monthly costs for each provider and provide a total cost. If exact pricing is unavailable, indicate where to find it (e.g., provider's pricing page). Do not include cost optimization recommendations.

Inputs:
${summary}

Generate a report in Markdown format with:
- A separate table for each provider with columns: Input, Value, Estimated Cost (in USD).
- For multiple providers, include a final table with columns: Provider, Total Cost (in USD).
- Use Markdown table syntax (e.g., | Input | Value | Estimated Cost |).
- Include headers like ## Provider: <Name> before each provider table and ## Totals before the totals table.
- Format costs as $X.XX (e.g., $123.45).
- If pricing is unavailable, note the provider's pricing page URL.`;

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
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const reportText = response.data.choices[0].message.content;
    // Convert Markdown to HTML using marked
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
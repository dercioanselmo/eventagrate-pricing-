import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

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

// Simple Markdown to HTML converter for Grok's response
const markdownToHtml = (text: string): string => {
  // Basic conversion (extend as needed)
  let html = text
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/(\n<li>.*<\/li>)+/g, '<ul>$&</ul>')
    .replace(/\n/g, '<br>');

  // Wrap in paragraph tags if not already structured
  if (!html.includes('<h') && !html.includes('<ul') && !html.includes('<p')) {
    html = `<p>${html}</p>`;
  }

  return html;
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

    // Prompt Grok to estimate costs and generate a report
    const prompt = `You are a cloud cost optimization expert. Based on the following provider inputs, estimate the monthly costs for each provider, provide a total cost, and suggest optimizations. If exact pricing is unavailable, indicate where to find it (e.g., provider's pricing page). Inputs:\n${summary}\n\nGenerate a detailed report with cost breakdowns and recommendations. Use Markdown for formatting (e.g., ## for headings, ** for bold, - for lists).`;

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
          { role: 'system', content: 'You are a cloud cost optimization expert.' },
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
    // Convert Markdown to HTML for rendering
    const reportHtml = markdownToHtml(reportText);

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
import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  const { providers } = await request.json();

  // Prepare data for Grok
  const summary = providers.map((item: any) => {
    return `${item.provider}: Inputs=${JSON.stringify(item.inputs)}`;
  }).join('\n');

  // Prompt Grok to estimate costs and generate a report
  const prompt = `You are a cloud cost optimization expert. Based on the following provider inputs, estimate the monthly costs for each provider, provide a total cost, and suggest optimizations. If exact pricing is unavailable, indicate where to find it (e.g., provider's pricing page). Inputs:\n${summary}\n\nGenerate a detailed report with cost breakdowns and recommendations.`;

  try {
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
          Authorization: `Bearer ${process.env.XAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const report = response.data.choices[0].message.content;
    return NextResponse.json({ report });
  } catch (error) {
    console.error('Grok API error:', error);
    return NextResponse.json({ report: 'Error generating report. Please check API key or try again.' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';

interface ProviderInput {
  name: string;
  type: string;
  defaultValue: string;
  description: string;
}

interface Provider {
  name: string;
  inputs: ProviderInput[];
}

interface CalculateRequest {
  provider: Provider;
  inputs: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    const { provider, inputs }: CalculateRequest = await request.json();
    console.log('POST /api/calculate received:', { provider, inputs });

    if (!provider || !provider.name || !provider.inputs) {
      return NextResponse.json({ error: 'Invalid provider data' }, { status: 400 });
    }
    if (!inputs || typeof inputs !== 'object') {
      return NextResponse.json({ error: 'Invalid input values' }, { status: 400 });
    }

    // Simple pricing calculation (customize based on your needs)
    const results: Record<string, number> = {};
    for (const input of provider.inputs) {
      const value = parseFloat(inputs[input.name] || input.defaultValue);
      if (isNaN(value)) {
        return NextResponse.json({ error: `Invalid value for ${input.name}` }, { status: 400 });
      }
      // Example: Assume cost is $0.01 per unit (adjust as needed)
      results[input.name] = value * 0.01;
    }

    const totalCost = Object.values(results).reduce((sum, cost) => sum + cost, 0);

    return NextResponse.json(
      {
        provider: provider.name,
        inputs,
        results,
        totalCost,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('POST /api/calculate error:', error);
    return NextResponse.json(
      { error: `Failed to calculate cost: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
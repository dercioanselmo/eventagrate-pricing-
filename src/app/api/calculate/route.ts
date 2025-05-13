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
    const body: CalculateRequest = await request.json();
    console.log('POST /api/calculate received:', body);

    if (!body) {
      return NextResponse.json({ error: 'Request body is empty' }, { status: 400 });
    }

    const { provider, inputs } = body;

    if (!provider) {
      return NextResponse.json({ error: 'Provider data is missing' }, { status: 400 });
    }
    if (!provider.name) {
      return NextResponse.json({ error: 'Provider name is required' }, { status: 400 });
    }
    if (!provider.inputs || !Array.isArray(provider.inputs)) {
      return NextResponse.json({ error: 'Provider inputs must be a non-empty array' }, { status: 400 });
    }
    if (provider.inputs.length === 0) {
      return NextResponse.json({ error: 'At least one provider input is required' }, { status: 400 });
    }
    if (!inputs || typeof inputs !== 'object' || Object.keys(inputs).length === 0) {
      return NextResponse.json({ error: 'Input values must be a non-empty object' }, { status: 400 });
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
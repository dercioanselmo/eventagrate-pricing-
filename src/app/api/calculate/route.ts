import { NextRequest, NextResponse } from 'next/server';

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

interface CalculateRequest {
  provider: Provider;
  inputs: { [key: string]: string };
}

export async function POST(request: NextRequest) {
  try {
    const body: CalculateRequest = await request.json();

    // Validate request body
    if (!body.provider || !body.provider.name || !body.provider.inputs) {
      return NextResponse.json(
        { error: 'Invalid request: provider, provider.name, and provider.inputs are required' },
        { status: 400 }
      );
    }
    if (!body.inputs || typeof body.inputs !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request: inputs must be an object' },
        { status: 400 }
      );
    }

    // Validate inputs against provider.inputs
    const missingInputs = body.provider.inputs.filter(
      (input) => !(input.name in body.inputs) || body.inputs[input.name] === ''
    );
    if (missingInputs.length > 0) {
      return NextResponse.json(
        {
          error: `Missing or empty inputs: ${missingInputs.map((i) => i.name).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate input types
    const invalidInputs = body.provider.inputs.filter((input) => {
      if (input.type === 'number') {
        const value = body.inputs[input.name];
        return isNaN(parseFloat(value)) || !isFinite(parseFloat(value));
      }
      return false;
    });
    if (invalidInputs.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid number inputs: ${invalidInputs.map((i) => i.name).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Mock calculation (replace with actual logic)
    const cost = body.provider.inputs.reduce((total, input) => {
      const value = input.type === 'number' ? parseFloat(body.inputs[input.name]) : 0;
      return total + (value || 0);
    }, 0);

    return NextResponse.json(
      {
        provider: body.provider.name,
        inputs: body.inputs,
        cost: cost.toFixed(2),
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
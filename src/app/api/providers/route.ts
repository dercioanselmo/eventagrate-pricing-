import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

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

export async function GET() {
  try {
    const db = await getDb();
    const providers = await db.collection('providers').find({}).toArray();
    return NextResponse.json({ providers }, { status: 200 });
  } catch (error) {
    console.error('GET /api/providers error:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const provider: Provider = await request.json();
    console.log('POST /api/providers received:', provider);

    if (!provider) {
      return NextResponse.json({ error: 'No provider data provided' }, { status: 400 });
    }
    if (!provider.name) {
      return NextResponse.json({ error: 'Provider name is required' }, { status: 400 });
    }
    if (!provider.inputs || !Array.isArray(provider.inputs)) {
      return NextResponse.json({ error: 'Inputs must be a non-empty array' }, { status: 400 });
    }
    if (provider.inputs.length === 0) {
      return NextResponse.json({ error: 'At least one input is required' }, { status: 400 });
    }
    if (provider.inputs.some((input) => !input.name)) {
      return NextResponse.json({ error: 'All input fields must have a name' }, { status: 400 });
    }

    const db = await getDb();
    const existingProvider = await db.collection('providers').findOne({ name: provider.name });
    if (existingProvider) {
      return NextResponse.json({ error: `Provider '${provider.name}' already exists` }, { status: 409 });
    }

    await db.collection('providers').insertOne(provider);
    return NextResponse.json({ message: 'Provider created' }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/providers error:', error);
    return NextResponse.json(
      { error: `Failed to create provider: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const provider: Provider & { _id?: any } = await request.json();
    console.log('PUT /api/providers received:', provider);

    if (!provider) {
      return NextResponse.json({ error: 'No provider data provided' }, { status: 400 });
    }
    if (!provider.name) {
      return NextResponse.json({ error: 'Provider name is required' }, { status: 400 });
    }
    if (!provider.inputs || !Array.isArray(provider.inputs)) {
      return NextResponse.json({ error: 'Inputs must be a non-empty array' }, { status: 400 });
    }
    if (provider.inputs.length === 0) {
      return NextResponse.json({ error: 'At least one input is required' }, { status: 400 });
    }
    if (provider.inputs.some((input) => !input.name)) {
      return NextResponse.json({ error: 'All input fields must have a name' }, { status: 400 });
    }

    // Exclude _id from the update
    const { _id, ...updateData } = provider;

    const db = await getDb();
    const result = await db.collection('providers').updateOne(
      { name: provider.name },
      { $set: updateData },
      { upsert: false }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: `Provider '${provider.name}' not found` }, { status: 404 });
    }

    return NextResponse.json({ message: 'Provider updated' }, { status: 200 });
  } catch (error: any) {
    console.error('PUT /api/providers error:', error);
    return NextResponse.json(
      { error: `Failed to update provider: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { name } = await request.json();
    console.log('DELETE /api/providers received:', { name });

    if (!name) {
      return NextResponse.json({ error: 'Provider name is required' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection('providers').deleteOne({ name });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: `Provider '${name}' not found` }, { status: 404 });
    }

    return NextResponse.json({ message: 'Provider deleted' }, { status: 200 });
  } catch (error: any) {
    console.error('DELETE /api/providers error:', error);
    return NextResponse.json(
      { error: `Failed to delete provider: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
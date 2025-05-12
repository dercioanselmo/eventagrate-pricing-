import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const client = new MongoClient(uri);

export async function GET() {
  try {
    await client.connect();
    const db = client.db('pricing');
    const providersCollection = db.collection('providers');

    const providers = await providersCollection.find({}).toArray();
    return NextResponse.json({ providers });
  } catch (error) {
    console.error('MongoDB error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await client.close();
  }
}

export async function POST(request: Request) {
  const { name, inputs } = await request.json();

  if (!name || !inputs || !Array.isArray(inputs) || inputs.length > 5) {
    return NextResponse.json({ error: 'Invalid provider name or inputs (max 5)' }, { status: 400 });
  }

  // Validate inputs
  for (const input of inputs) {
    if (!input.name || !['number', 'text'].includes(input.type)) {
      return NextResponse.json({ error: 'Invalid input field format' }, { status: 400 });
    }
    // defaultValue and description are optional but must be strings if provided
    if (input.defaultValue !== undefined && typeof input.defaultValue !== 'string') {
      return NextResponse.json({ error: 'Default value must be a string' }, { status: 400 });
    }
    if (input.description !== undefined && typeof input.description !== 'string') {
      return NextResponse.json({ error: 'Description must be a string' }, { status: 400 });
    }
  }

  try {
    await client.connect();
    const db = client.db('pricing');
    const providersCollection = db.collection('providers');

    // Check if provider exists
    const existing = await providersCollection.findOne({ name });
    if (existing) {
      return NextResponse.json({ error: 'Provider already exists' }, { status: 400 });
    }

    await providersCollection.insertOne({ name, inputs });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('MongoDB error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await client.close();
  }
}

export async function PUT(request: Request) {
  const { name, inputs } = await request.json();

  if (!name || !inputs || !Array.isArray(inputs) || inputs.length > 5) {
    return NextResponse.json({ error: 'Invalid provider name or inputs (max 5)' }, { status: 400 });
  }

  // Validate inputs
  for (const input of inputs) {
    if (!input.name || !['number', 'text'].includes(input.type)) {
      return NextResponse.json({ error: 'Invalid input field format' }, { status: 400 });
    }
    // defaultValue and description are optional but must be strings if provided
    if (input.defaultValue !== undefined && typeof input.defaultValue !== 'string') {
      return NextResponse.json({ error: 'Default value must be a string' }, { status: 400 });
    }
    if (input.description !== undefined && typeof input.description !== 'string') {
      return NextResponse.json({ error: 'Description must be a string' }, { status: 400 });
    }
  }

  try {
    await client.connect();
    const db = client.db('pricing');
    const providersCollection = db.collection('providers');

    const result = await providersCollection.updateOne(
      { name },
      { $set: { inputs } },
      { upsert: false }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('MongoDB error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await client.close();
  }
}

export async function DELETE(request: Request) {
  const { name } = await request.json();

  if (!name) {
    return NextResponse.json({ error: 'Provider name required' }, { status: 400 });
  }

  try {
    await client.connect();
    const db = client.db('pricing');
    const providersCollection = db.collection('providers');

    const result = await providersCollection.deleteOne({ name });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('MongoDB error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await client.close();
  }
}
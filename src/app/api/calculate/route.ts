import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const client = new MongoClient(uri);

export async function POST(request: Request) {
  const { provider, inputs } = await request.json();

  // Validate inputs
  if (!provider || !inputs || !Object.keys(inputs).length) {
    return NextResponse.json({ error: 'Invalid provider or inputs' }, { status: 400 });
  }

  try {
    await client.connect();
    const db = client.db('pricing');
    const providersCollection = db.collection('providers');

    // Verify provider exists and inputs match
    const providerData = await providersCollection.findOne({ name: provider });
    if (!providerData) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const missingFields = providerData.inputs.filter((field: any) => !inputs[field.name]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing fields: ${missingFields.map((f: any) => f.label).join(', ')}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('MongoDB error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await client.close();
  }
}
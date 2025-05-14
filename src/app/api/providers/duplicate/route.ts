import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const client = new MongoClient(uri);

export async function POST(req: NextRequest) {
  try {
    const { providerId } = await req.json();

    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    await client.connect();
    const db = client.db('eventagrate');
    const providersCollection = db.collection('providers');

    // Find the provider to duplicate
    const provider = await providersCollection.findOne({ _id: new ObjectId(providerId) });

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Create a copy with a new name and same inputs/pricing
    const duplicatedProvider = {
      ...provider,
      name: `${provider.name} Copy`,
      _id: new ObjectId(),
      createdAt: new Date(),
    };

    // Insert the duplicated provider
    const result = await providersCollection.insertOne(duplicatedProvider);

    return NextResponse.json({ provider: { ...duplicatedProvider, _id: result.insertedId } }, { status: 200 });
  } catch (error: any) {
    console.error('Error duplicating provider:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await client.close();
  }
}
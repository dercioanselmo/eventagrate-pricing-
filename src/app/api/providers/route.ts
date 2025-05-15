import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
let mongoClient: MongoClient | null = null;

async function connectToMongoDB(): Promise<MongoClient> {
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in .env.local');
  }
  if (!mongoClient) {
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
  }
  return mongoClient;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || !body.inputs || !Array.isArray(body.inputs)) {
      return NextResponse.json({ error: 'Provider name and inputs are required' }, { status: 400 });
    }

    const client = await connectToMongoDB();
    const db = client.db('eventagrate');
    const providersCollection = db.collection('providers');

    const provider = {
      name: body.name,
      inputs: body.inputs.map((input: any) => ({
        name: input.name || '',
        type: input.type || 'text',
        defaultValue: input.defaultValue || '',
        description: input.description || '',
      })),
      pricing: body.pricing || {},
      createdAt: new Date(),
    };

    const result = await providersCollection.insertOne(provider);
    const insertedProvider = {
      _id: result.insertedId.toString(),
      ...provider,
    };

    return NextResponse.json({ provider: insertedProvider }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/providers error:', error);
    return NextResponse.json({ error: error.message || 'Error creating provider' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const client = await connectToMongoDB();
    const db = client.db('eventagrate');
    const providersCollection = db.collection('providers');

    const providers = await providersCollection.find({}).toArray();
    const formattedProviders = providers.map((provider) => ({
      _id: provider._id.toString(),
      name: provider.name,
      inputs: provider.inputs,
      pricing: provider.pricing,
    }));

    return NextResponse.json({ providers: formattedProviders }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/providers error:', error);
    return NextResponse.json({ error: error.message || 'Error fetching providers' }, { status: 500 });
  }
}
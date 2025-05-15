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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid provider ID' }, { status: 400 });
    }

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
      updatedAt: new Date(),
    };

    const result = await providersCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: provider },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const updatedProvider = {
      _id: result.value._id.toString(),
      ...result.value,
    };

    return NextResponse.json({ provider: updatedProvider }, { status: 200 });
  } catch (error: any) {
    console.error('PUT /api/providers/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Error updating provider' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid provider ID' }, { status: 400 });
    }

    const client = await connectToMongoDB();
    const db = client.db('eventagrate');
    const providersCollection = db.collection('providers');

    const result = await providersCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Provider deleted' }, { status: 200 });
  } catch (error: any) {
    console.error('DELETE /api/providers/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Error deleting provider' }, { status: 500 });
  }
}
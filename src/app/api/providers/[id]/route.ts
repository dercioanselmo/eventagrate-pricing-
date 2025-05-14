import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const client = new MongoClient(uri);

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid provider ID' }, { status: 400 });
    }

    await client.connect();
    const db = client.db('eventagrate');
    const providersCollection = db.collection('providers');

    const result = await providersCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Provider deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting provider:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await client.close();
  }
}
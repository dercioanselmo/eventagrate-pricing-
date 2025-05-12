import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const client = new MongoClient(uri);

export async function connectToDatabase() {
  try {
    await client.connect();
    return client.db('pricing');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw new Error('Failed to connect to MongoDB');
  }
}

export async function closeDatabase() {
  await client.close();
}
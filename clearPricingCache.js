require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function clearPricingCache() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in .env.local');
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('eventagrate');
    const providersCollection = db.collection('providers');

    // Unset pricing field for all providers
    const result = await providersCollection.updateMany({}, { $unset: { pricing: '' } });
    console.log(`Updated ${result.modifiedCount} documents, pricing cache cleared`);
  } catch (error) {
    console.error('Error clearing pricing cache:', error);
  } finally {
    await client.close();
  }
}

clearPricingCache();
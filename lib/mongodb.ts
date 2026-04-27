import { MongoClient, type Db } from 'mongodb';

const uri = process.env.MONGODB_URI;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Returns a connected MongoDB database for Atlas (or null if MONGODB_URI is unset).
 * Uses a global promise in development to survive Next.js hot reloads.
 * @see https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connect/
 */
export async function getMongoDb(): Promise<Db | null> {
  if (!uri) {
    return null;
  }

  if (!globalThis._mongoClientPromise) {
    const client = new MongoClient(uri);
    globalThis._mongoClientPromise = client.connect();
  }

  const client = await globalThis._mongoClientPromise;
  const dbName = process.env.MONGODB_DB || 'saviour';
  return client.db(dbName);
}

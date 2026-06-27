import mongoose from 'mongoose';

// Connect to a given MongoDB URI.
export async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log('[db] connected to MongoDB');
  return mongoose.connection;
}

// Start an in-memory MongoDB (no install needed) and connect to it.
// Used as an automatic fallback so the app can be tested with zero DB setup.
export async function connectMemoryDB() {
  let MongoMemoryServer;
  try {
    ({ MongoMemoryServer } = await import('mongodb-memory-server'));
  } catch {
    throw new Error(
      'mongodb-memory-server is not installed. Run `npm install` in the server folder, ' +
      'or set MONGODB_URI to a running MongoDB.'
    );
  }
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri();
  await connectDB(uri);
  console.log('[db] using in-memory MongoDB (data resets when the server stops)');
  return mem;
}

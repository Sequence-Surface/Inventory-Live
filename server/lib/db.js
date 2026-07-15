import mongoose from 'mongoose';
import dns from 'dns';

// MongoDB Atlas (`mongodb+srv://`) requires a DNS SRV-record lookup. On some networks the local
// router/ISP DNS refuses the SRV queries Node's resolver makes (fails with `querySrv ECONNREFUSED`)
// even though `nslookup` works — which silently pushed the app onto its in-memory fallback and kept
// data out of Atlas. Prefer public DNS that reliably answers SRV, keeping system DNS as fallback.
// Override with DNS_SERVERS="1.2.3.4,5.6.7.8" if needed.
try {
  const preferred = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1').split(',').map(s => s.trim()).filter(Boolean);
  const system = dns.getServers();
  dns.setServers([...new Set([...preferred, ...system])]);
} catch (e) { /* DNS override is best-effort */ }

// Connect to a given MongoDB URI.
export async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log('[db] connected to MongoDB:', mongoose.connection.name);
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

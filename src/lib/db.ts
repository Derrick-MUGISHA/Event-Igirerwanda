import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

/* Next.js hot-reload re-evaluates modules; the connection is cached on
   globalThis so dev doesn't pile up connections */
type Cached = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalWithMongoose = globalThis as typeof globalThis & { _mongoose?: Cached };
const cached: Cached = globalWithMongoose._mongoose ?? { conn: null, promise: null };
globalWithMongoose._mongoose = cached;

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!MONGODB_URI) throw new Error("MONGODB_URI is not set");
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}

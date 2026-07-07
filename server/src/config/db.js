import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectMongo() {
  if (!env.mongoUri) {
    console.log('MONGODB_URI not set. Running with in-memory room storage.');
    return;
  }

  try {
    await mongoose.connect(env.mongoUri);
    console.log('MongoDB connected.');
  } catch (error) {
    console.warn('MongoDB connection failed. Continuing in-memory only.');
    console.warn(error.message);
  }
}

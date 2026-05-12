import { InterviewServer } from './index';
import { MongoAdapter } from './storage/MongoAdapter';
import mongoose from 'mongoose';

const start = async () => {
  // Use memory server or local mongo
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/interviewiq';
  
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    console.log('[InterviewIQ] Connected to MongoDB');
  } catch (err) {
    console.warn('[InterviewIQ] MongoDB not found. Falling back to MockStorage for testing.');
    // In a real app we'd use a real MockAdapter, here we just won't throw
  }

  const server = new InterviewServer({
    storage: new MongoAdapter(),
    secret: process.env.JWT_SECRET || 'test-secret',
    port: Number(process.env.PORT) || 3000
  });

  server.listen();
};

start();

import mongoose from 'mongoose';
import { MongoClient, GridFSBucket } from 'mongodb';

let nativeClient = null;
let gridBucket = null;

export async function connectMongo(config) {
	if (mongoose.connection.readyState === 1) return;
	await mongoose.connect(config.MONGODB_URI);
	nativeClient = new MongoClient(config.MONGODB_URI);
	await nativeClient.connect();
	const db = nativeClient.db();
	gridBucket = new GridFSBucket(db, { bucketName: 'uploads' });
	console.log('Connected to MongoDB');
}

export function getGridBucket() {
	if (!gridBucket) throw new Error('GridFS bucket not initialized');
	return gridBucket;
}

export function getNativeDb() {
	if (!nativeClient) throw new Error('Mongo client not initialized');
	return nativeClient.db();
}

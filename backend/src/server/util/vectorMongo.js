import mongoose from "mongoose";
import { MongoClient, GridFSBucket } from "mongodb";
import { loadConfig } from "./config.js";

const config = loadConfig();

let vectorNativeClient = null;
let vectorGridBucket = null;
let vectorConnection = null;

export async function connectVectorMongo() {
  try {
    // Create separate connection for vector search database
    const vectorDbUri = config.VECTOR_SEARCH_DB_URI;

    // Connect to vector search database
    vectorConnection = await mongoose.createConnection(vectorDbUri);
    console.log("Connected to Vector Search MongoDB");

    // Create native client for GridFS
    vectorNativeClient = new MongoClient(vectorDbUri);
    await vectorNativeClient.connect();
    const db = vectorNativeClient.db();
    vectorGridBucket = new GridFSBucket(db, { bucketName: "vector_uploads" });

    return vectorConnection;
  } catch (error) {
    console.error("Failed to connect to Vector Search MongoDB:", error);
    throw error;
  }
}

export function getVectorConnection() {
  if (!vectorConnection) {
    throw new Error("Vector Search MongoDB connection not initialized");
  }
  return vectorConnection;
}

export function getVectorGridBucket() {
  if (!vectorGridBucket) {
    throw new Error("Vector Search GridFS bucket not initialized");
  }
  return vectorGridBucket;
}

export function getVectorNativeDb() {
  if (!vectorNativeClient) {
    throw new Error("Vector Search MongoDB client not initialized");
  }
  return vectorNativeClient.db();
}

export async function closeVectorMongo() {
  try {
    if (vectorConnection) {
      await vectorConnection.close();
      vectorConnection = null;
    }
    if (vectorNativeClient) {
      await vectorNativeClient.close();
      vectorNativeClient = null;
    }
    vectorGridBucket = null;
    console.log("Vector Search MongoDB connection closed");
  } catch (error) {
    console.error("Error closing Vector Search MongoDB connection:", error);
  }
}

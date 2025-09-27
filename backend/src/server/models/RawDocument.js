import mongoose from "mongoose";
import { getVectorConnection } from "../util/vectorMongo.js";

const RawDocumentSchema = new mongoose.Schema(
  {
    file_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    upload_date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    file_size: {
      type: Number,
      required: true,
    },
    mime_type: {
      type: String,
      required: true,
    },
    file_source: {
      type: String,
      default: "user_upload",
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    gridFsId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    userId: {
      type: String,
      index: true,
    },
    raw_content: {
      type: String,
    },
    processing_status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    error_message: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "raw_documents",
  }
);

// Indexes for efficient querying
RawDocumentSchema.index({ upload_date: -1 });
RawDocumentSchema.index({ mime_type: 1 });
RawDocumentSchema.index({ userId: 1, upload_date: -1 });

// Create model using vector search connection
export function getRawDocumentModel() {
  const connection = getVectorConnection();
  return connection.model("RawDocument", RawDocumentSchema);
}

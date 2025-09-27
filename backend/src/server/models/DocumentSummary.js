import mongoose from "mongoose";
import { getVectorConnection } from "../util/vectorMongo.js";

const DocumentSummarySchema = new mongoose.Schema(
  {
    file_id: {
      type: String,
      required: true,
    },
    summary_text: {
      type: String,
      required: true,
    },
    extracted_tags: {
      industries: [{ type: String }],
      sectors: [{ type: String }],
      stock_names: [{ type: String }],
      general_tags: [{ type: String }],
    },
    semantic_embedding: {
      type: [Number], // Vector array for similarity search
      index: "2dsphere", // MongoDB vector search index
    },
    reference_date: {
      type: Date,
    },
    summary_date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    embedding_model: {
      type: String,
      default: "text-embedding-3-small",
    },
    confidence_score: {
      type: Number,
      min: 0,
      max: 1,
    },
    processing_metadata: {
      ai_model_used: { type: String, default: "gpt-4o-mini" },
      processing_time_ms: { type: Number },
      tokens_used: { type: Number },
    },
  },
  {
    timestamps: true,
    collection: "document_summaries",
  }
);

// Indexes for efficient querying and vector search
DocumentSummarySchema.index({ file_id: 1 });
DocumentSummarySchema.index({ summary_date: -1 });
DocumentSummarySchema.index({ reference_date: 1 });
DocumentSummarySchema.index({ "extracted_tags.industries": 1 });
DocumentSummarySchema.index({ "extracted_tags.sectors": 1 });
DocumentSummarySchema.index({ "extracted_tags.stock_names": 1 });

// Text search index for summary content
DocumentSummarySchema.index({
  summary_text: "text",
  "extracted_tags.industries": "text",
  "extracted_tags.sectors": "text",
  "extracted_tags.stock_names": "text",
});

// Create model using vector search connection
export function getDocumentSummaryModel() {
  const connection = getVectorConnection();
  return connection.model("DocumentSummary", DocumentSummarySchema);
}

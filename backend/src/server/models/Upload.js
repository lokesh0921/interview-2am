import mongoose from "mongoose";

const UploadSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true, required: true },
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    length: { type: Number },
    gridFsId: { type: mongoose.Schema.Types.ObjectId, index: true },
    sourceType: {
      type: String,
      enum: ["pdf", "docx", "txt", "image", "textbox"],
      required: true,
    },
    text: { type: String },
    summary: { type: String },
    categories: [{ type: String, index: true }],
    status: {
      type: String,
      enum: ["pending", "processed", "failed"],
      default: "pending",
      index: true,
    },
    error: { type: String },
  },
  { timestamps: true }
);

UploadSchema.index({ text: "text", summary: "text", filename: "text" });

export const Upload = mongoose.model("Upload", UploadSchema);

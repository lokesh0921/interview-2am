import express from "express";
import { Upload } from "../models/Upload.js";
import { getGridBucket } from "../util/mongo.js";
import { summarizeText, categorizeText } from "../services/ai.js";
import {
  extractFromPdf,
  extractFromDocx,
  extractFromTxt,
  extractFromImage,
} from "../services/extract.js";
import { ObjectId } from "mongodb";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.user?.id || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { type, category, from, to, q, page = 1, limit = 20 } = req.query;
    const filter = { userId };
    if (type) filter.sourceType = type;
    if (category) filter.categories = category;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (q) filter.$text = { $search: q };
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Upload.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Upload.countDocuments(filter),
    ]);
    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.user?.id || req.user?.id;
    const { id } = req.params;
    const doc = await Upload.findOne({ _id: id, userId });
    if (!doc) return res.status(404).json({ error: "Not found" });
    await Upload.deleteOne({ _id: id });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

async function bufferFromGridFS(id) {
  const bucket = getGridBucket();
  const stream = bucket.openDownloadStream(new ObjectId(id));
  const chunks = [];
  return await new Promise((resolve, reject) => {
    stream.on("data", (c) => chunks.push(c));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

router.post("/:id/resummarize", async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.user?.id || req.user?.id;
    const { id } = req.params;
    let doc = await Upload.findOne({ _id: id, userId });
    if (!doc) return res.status(404).json({ error: "Not found" });

    let text = doc.text || "no data to re-summarize";
    if (!text || doc.status === "failed") {
      if (!doc.gridFsId) throw new Error("No stored file to reprocess");
      const buffer = await bufferFromGridFS(doc.gridFsId);
      if (doc.sourceType === "pdf") text = await extractFromPdf(buffer);
      else if (doc.sourceType === "docx") text = await extractFromDocx(buffer);
      else if (doc.sourceType === "image")
        text = await extractFromImage(buffer);
      else text = await extractFromTxt(buffer);
      doc.text = text;
    }

    const categories = await categorizeText(text || "no data available");
    const summary = await summarizeText(text || "no data available to ");

    doc.categories = categories;
    doc.summary = summary;
    doc.status = "processed";
    await doc.save();
    res.json({ item: doc });
  } catch (e) {
    next(e);
  }
});

export default router;

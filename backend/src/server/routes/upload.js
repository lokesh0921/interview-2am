import express from "express";
import multer from "multer";
import { ObjectId } from "mongodb";
import { getGridBucket } from "../util/mongo.js";
import { Upload } from "../models/Upload.js";
import {
  extractFromPdf,
  extractFromDocx,
  extractFromTxt,
  extractFromImage,
} from "../services/extract.js";
import { categorizeText, summarizeText } from "../services/ai.js";
import mime from "mime-types";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

function detectSourceType(mimetype, filename) {
  const ext = (filename?.split(".").pop() || "").toLowerCase();
  if (mimetype === "application/pdf" || ext === "pdf") return "pdf";
  if (
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  )
    return "docx";
  if (
    mimetype?.startsWith("image/") ||
    ["png", "jpg", "jpeg", "bmp", "gif", "webp"].includes(ext)
  )
    return "image";
  if (mimetype === "text/plain" || ["txt", "md", "csv", "log"].includes(ext))
    return "txt";
  return "txt";
}

async function storeToGridFS(buffer, filename, contentType) {
  const bucket = getGridBucket();
  const uploadStream = bucket.openUploadStream(filename, { contentType });
  uploadStream.end(buffer);
  await new Promise((resolve, reject) => {
    uploadStream.on("finish", resolve);
    uploadStream.on("error", reject);
  });
  return uploadStream.id; // ObjectId
}

router.post("/", upload.array("files"), async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.user?.id || req.user?.id;
    console.log(req.user);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const results = [];

    // Textbox input
    const rawText = (req.body?.text || "").trim();
    if (rawText) {
      const categories = await categorizeText(rawText);
      const summary = await summarizeText(rawText);
      const doc = await Upload.create({
        userId,
        filename: "textbox-input.txt",
        contentType: "text/plain",
        length: rawText.length,
        sourceType: "textbox",
        text: rawText,
        summary,
        categories,
        status: "processed",
      });
      results.push(doc);
    }

    // Files
    for (const file of req.files || []) {
      const contentType =
        file.mimetype ||
        mime.lookup(file.originalname) ||
        "application/octet-stream";
      const sourceType = detectSourceType(contentType, file.originalname);

      let doc = await Upload.create({
        userId,
        filename: file.originalname,
        contentType,
        length: file.size,
        sourceType,
        status: "pending",
      });

      let gridId = null;
      try {
        gridId = await storeToGridFS(
          file.buffer,
          file.originalname,
          contentType
        );
        let text = "";
        if (sourceType === "pdf") text = await extractFromPdf(file.buffer);
        else if (sourceType === "docx")
          text = await extractFromDocx(file.buffer);
        else if (sourceType === "image")
          text = await extractFromImage(file.buffer);
        else text = await extractFromTxt(file.buffer);

        const categories = await categorizeText(text);
        const summary = await summarizeText(text);

        doc.gridFsId = new ObjectId(gridId);
        doc.text = text;
        doc.summary = summary;
        doc.categories = categories;
        doc.status = "processed";
        await doc.save();
      } catch (e) {
        doc.status = "failed";
        doc.error = e.message;
        await doc.save();
      }

      results.push(doc);
    }

    res.json({ results });
  } catch (e) {
    next(e);
  }
});

export default router;

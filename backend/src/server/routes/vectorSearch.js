import express from "express";
import multer from "multer";
import {
  uploadDocumentForVectorSearch,
  getUserDocuments,
  getRawDocument,
  getDocumentSummary,
  getFileContent,
} from "../services/vectorUpload.js";
import {
  semanticSearch,
  getAvailableTags,
  getDateRange,
  getDocumentStats,
} from "../services/vectorSearch.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
      "image/jpeg",
      "image/png",
      "image/tiff",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"), false);
    }
  },
});

// Upload document for vector search
router.post(
  "/upload",
  authMiddleware.required,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const userId = req.user.sub; // Supabase user ID
      const result = await uploadDocumentForVectorSearch(req.file, userId, {
        source: "vector_search_upload",
      });

      res.status(201).json({
        success: true,
        message: "Document uploaded and processed successfully",
        data: result,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Upload failed",
      });
    }
  }
);

// Semantic search
router.post("/search", authMiddleware.required, async (req, res) => {
  try {
    const { query, options = {} } = req.body;
    const userId = req.user.sub;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const searchResults = await semanticSearch(query, userId, options);

    res.json({
      success: true,
      data: searchResults,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Search failed",
    });
  }
});

// Get user's documents with pagination
router.get("/documents", authMiddleware.required, async (req, res) => {
  try {
    const userId = req.user.sub;
    const {
      page = 1,
      limit = 10,
      sortBy = "upload_date",
      sortOrder = "desc",
      status,
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
      status,
    };

    const result = await getUserDocuments(userId, options);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get documents",
    });
  }
});

// Get document summary by file_id
router.get(
  "/documents/:fileId/summary",
  authMiddleware.required,
  async (req, res) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.sub;

      const summary = await getDocumentSummary(fileId, userId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error("Get summary error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get document summary",
      });
    }
  }
);

// Get raw document metadata by file_id
router.get("/documents/:fileId", authMiddleware.required, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.sub;

    const document = await getRawDocument(fileId, userId);

    res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error("Get document error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get document",
    });
  }
});

// Download file content
router.get(
  "/documents/:fileId/download",
  authMiddleware.required,
  async (req, res) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.sub;

      const document = await getRawDocument(fileId, userId);
      const fileContent = await getFileContent(fileId, userId);

      res.setHeader("Content-Type", document.mime_type);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${document.filename}"`
      );
      res.setHeader("Content-Length", fileContent.length);

      res.send(fileContent);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to download file",
      });
    }
  }
);

// Get available tags for filtering
router.get("/tags", authMiddleware.required, async (req, res) => {
  try {
    const userId = req.user.sub;
    const tags = await getAvailableTags(userId);

    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    console.error("Get tags error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get tags",
    });
  }
});

// Get date range for documents
router.get("/date-range", authMiddleware.required, async (req, res) => {
  try {
    const userId = req.user.sub;
    const dateRange = await getDateRange(userId);

    res.json({
      success: true,
      data: dateRange,
    });
  } catch (error) {
    console.error("Get date range error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get date range",
    });
  }
});

// Get document statistics
router.get("/stats", authMiddleware.required, async (req, res) => {
  try {
    const userId = req.user.sub;
    const stats = await getDocumentStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get statistics",
    });
  }
});

export default router;

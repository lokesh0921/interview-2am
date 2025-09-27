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

    console.log(`[VectorSearch API] Search request received:`);
    console.log(`  - User ID: ${userId}`);
    console.log(`  - Query: "${query}"`);
    console.log(`  - Options:`, options);

    if (!query || query.trim().length === 0) {
      console.log(`[VectorSearch API] Invalid query: empty or missing`);
      return res.status(400).json({ error: "Search query is required" });
    }

    console.log(`[VectorSearch API] Calling semanticSearch function...`);
    const searchResults = await semanticSearch(query, userId, options);
    console.log(`[VectorSearch API] Search completed:`, {
      query: searchResults.query,
      results_count: searchResults.total_results,
      has_debug_info: !!searchResults.debug_info,
    });

    res.json({
      success: true,
      data: searchResults,
    });
  } catch (error) {
    console.error(`[VectorSearch API] Search error:`, error);
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

// Debug endpoint to check database status
router.get("/debug", authMiddleware.required, async (req, res) => {
  try {
    const userId = req.user.sub;
    console.log(`[VectorSearch API] Debug request for user: ${userId}`);

    // Import the models
    const { getDocumentSummaryModel } = await import(
      "../models/DocumentSummary.js"
    );
    const { getRawDocumentModel } = await import("../models/RawDocument.js");

    const DocumentSummary = getDocumentSummaryModel();
    const RawDocument = getRawDocumentModel();

    // Get database stats (global access)
    const totalSummaries = await DocumentSummary.countDocuments();
    const totalRawDocs = await RawDocument.countDocuments();
    const completedDocs = await RawDocument.countDocuments({
      processing_status: "completed",
    });

    // Get sample documents (global access)
    const sampleRawDocs = await RawDocument.find({})
      .limit(3)
      .select("file_id filename processing_status created_at");
    const sampleSummaries = await DocumentSummary.find()
      .limit(3)
      .select("file_id summary_text extracted_tags");

    // Check if there are any completed documents with summaries (global access)
    const completedWithSummaries = await DocumentSummary.aggregate([
      {
        $lookup: {
          from: "raw_documents",
          localField: "file_id",
          foreignField: "file_id",
          as: "raw_doc",
        },
      },
      {
        $match: {
          "raw_doc.processing_status": "completed",
        },
      },
      { $limit: 3 },
    ]);

    res.json({
      success: true,
      data: {
        user_id: userId,
        database_stats: {
          total_summaries: totalSummaries,
          total_raw_docs: totalRawDocs,
          completed_docs: completedDocs,
          completed_with_summaries: completedWithSummaries.length,
        },
        sample_raw_docs: sampleRawDocs,
        sample_summaries: sampleSummaries,
        completed_with_summaries: completedWithSummaries,
      },
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Debug check failed",
    });
  }
});

// Simple text search (fallback for debugging)
router.post("/simple-search", authMiddleware.required, async (req, res) => {
  try {
    const { query } = req.body;
    const userId = req.user.sub;

    console.log(
      `[VectorSearch API] Simple search request: "${query}" for user: ${userId}`
    );

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Import the models
    const { getDocumentSummaryModel } = await import(
      "../models/DocumentSummary.js"
    );
    const { getRawDocumentModel } = await import("../models/RawDocument.js");

    const DocumentSummary = getDocumentSummaryModel();
    const RawDocument = getRawDocumentModel();

    // Simple text search using MongoDB text search (global access)
    const pipeline = [
      {
        $lookup: {
          from: "raw_documents",
          localField: "file_id",
          foreignField: "file_id",
          as: "raw_doc",
        },
      },
      {
        $match: {
          "raw_doc.processing_status": "completed",
          $or: [
            { summary_text: { $regex: query, $options: "i" } },
            { "extracted_tags.industries": { $regex: query, $options: "i" } },
            { "extracted_tags.sectors": { $regex: query, $options: "i" } },
            { "extracted_tags.stock_names": { $regex: query, $options: "i" } },
            { "extracted_tags.general_tags": { $regex: query, $options: "i" } },
          ],
        },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          file_id: 1,
          summary_text: 1,
          extracted_tags: 1,
          reference_date: 1,
          filename: { $arrayElemAt: ["$raw_doc.filename", 0] },
          upload_date: { $arrayElemAt: ["$raw_doc.upload_date", 0] },
          file_size: { $arrayElemAt: ["$raw_doc.file_size", 0] },
          mime_type: { $arrayElemAt: ["$raw_doc.mime_type", 0] },
        },
      },
    ];

    let results = await DocumentSummary.aggregate(pipeline);

    // Post-process results to ensure proper structure
    results = results.map((result) => ({
      ...result,
      filename: result.filename || "Unknown filename",
      upload_date: result.upload_date || new Date(),
      file_size: result.file_size || 0,
      mime_type: result.mime_type || "unknown",
      summary_text: result.summary_text || "No summary available",
      extracted_tags: result.extracted_tags || {
        industries: [],
        sectors: [],
        stock_names: [],
        general_tags: [],
      },
    }));

    console.log(
      `[VectorSearch API] Simple search found ${results.length} results`
    );

    if (results.length > 0) {
      console.log(`[VectorSearch API] Sample simple search result:`, {
        file_id: results[0].file_id,
        filename: results[0].filename,
        upload_date: results[0].upload_date,
        file_size: results[0].file_size,
        reference_date: results[0].reference_date,
      });
    }

    res.json({
      success: true,
      data: {
        query,
        results,
        total_results: results.length,
        search_type: "simple_text_search",
      },
    });
  } catch (error) {
    console.error("Simple search error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Simple search failed",
    });
  }
});

// Get all documents for Summary and Dashboard pages (replaces /files/all)
router.get("/all-documents", authMiddleware.required, async (req, res) => {
  try {
    const userId = req.user.sub;
    const {
      page = 1,
      limit = 20,
      sortBy = "upload_date",
      sortOrder = "desc",
    } = req.query;

    console.log(
      `[VectorSearch] Getting all documents (global access) for user: ${userId}`
    );

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
    };

    const result = await getUserDocuments(userId, options);

    console.log(
      `[VectorSearch] Found ${result.documents.length} documents (global access)`
    );

    // Transform the data to match the expected format for Summary/Dashboard pages
    const transformedItems = result.documents.map((doc) => ({
      _id: doc.file_id,
      filename: doc.filename,
      sourceType: doc.mime_type?.includes("pdf")
        ? "pdf"
        : doc.mime_type?.includes("word")
        ? "docx"
        : doc.mime_type?.includes("text")
        ? "txt"
        : "other",
      categories: doc.summary?.extracted_tags
        ? [
            ...(doc.summary.extracted_tags.industries || []),
            ...(doc.summary.extracted_tags.sectors || []),
            ...(doc.summary.extracted_tags.stock_names || []),
          ]
        : [],
      summary: doc.summary?.summary_text || "No summary available",
      text: doc.raw_content || "No raw content available",
      metadata: {
        file_size: doc.file_size,
        mime_type: doc.mime_type,
        upload_date: doc.upload_date,
        processing_status: doc.processing_status,
      },
      created_at: doc.upload_date,
    }));

    res.json({
      success: true,
      items: transformedItems,
      total: result.total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Get all documents error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get documents",
    });
  }
});

// Delete document (replaces /files/:id DELETE)
router.delete(
  "/documents/:fileId",
  authMiddleware.required,
  async (req, res) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.sub;

      console.log(
        `[VectorSearch] Deleting document ${fileId} for user: ${userId}`
      );

      // Import the delete functions from vectorUpload service
      const { deleteDocument } = await import("../services/vectorUpload.js");

      const result = await deleteDocument(fileId, userId);

      console.log(`[VectorSearch] Document ${fileId} deleted successfully`);

      res.json({
        success: true,
        message: "Document deleted successfully",
        data: result,
      });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to delete document",
      });
    }
  }
);

// Re-summarize document (replaces /files/:id/resummarize)
router.post(
  "/documents/:fileId/resummarize",
  authMiddleware.required,
  async (req, res) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.sub;

      console.log(
        `[VectorSearch] Re-summarizing document ${fileId} for user: ${userId}`
      );

      // Import the resummarize function from vectorUpload service
      const { resummarizeDocument } = await import(
        "../services/vectorUpload.js"
      );

      const result = await resummarizeDocument(fileId, userId);

      console.log(
        `[VectorSearch] Document ${fileId} re-summarized successfully`
      );

      res.json({
        success: true,
        message: "Document re-summarized successfully",
        data: result,
      });
    } catch (error) {
      console.error("Re-summarize document error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to re-summarize document",
      });
    }
  }
);

export default router;

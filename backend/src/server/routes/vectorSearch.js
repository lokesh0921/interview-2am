import express from "express";
import multer from "multer";
import {
  uploadDocumentForVectorSearch,
  getUserDocuments,
  getRawDocument,
  getDocumentSummary,
  getFileContent,
} from "../services/vectorUpload.js";
import { getRawDocumentModel } from "../models/RawDocument.js";
import { getDocumentSummaryModel } from "../models/DocumentSummary.js";
import {
  semanticSearch,
  getDateRange,
  getDocumentStats,
} from "../services/vectorSearch.js";
import { generateAnswer } from "../services/vectorAi.js";
import { authMiddleware } from "../middleware/auth.js";

// Simple in-memory caches with TTL (per-process)
const ASK_CACHE = new Map();
const SIMPLE_CACHE = new Map();
const CACHE_TTL_MS = 60_000; // 60s

function getCache(map, key) {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() > entry.exp) {
    map.delete(key);
    return null;
  }
  return entry.val;
}

function setCache(map, key, val) {
  map.set(key, { val, exp: Date.now() + CACHE_TTL_MS });
}

/**
 * Perform keyword-based fallback search when semantic search fails
 * @param {string} question - The question to search for
 * @param {string} userId - User ID for authorization
 * @returns {Promise<Array>} - Array of matching documents
 */
async function performKeywordFallbackSearch(question, userId) {
  try {
    console.log(`[KeywordFallback] Starting keyword search for: "${question}"`);

    // Extract key terms from the question
    const questionTerms = question
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // Remove punctuation
      .split(/\s+/)
      .filter((term) => term.length > 2) // Filter out short words
      .filter(
        (term) =>
          ![
            "the",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
          ].includes(term)
      );

    console.log(`[KeywordFallback] Extracted terms:`, questionTerms);

    const DocumentSummary = getDocumentSummaryModel();
    const RawDocument = getRawDocumentModel();

    // Build regex patterns for keyword matching
    const keywordPatterns = questionTerms.map((term) => new RegExp(term, "i"));

    // Search in both summary and raw content
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
            // Search in summary text
            {
              summary_text: { $regex: questionTerms.join("|"), $options: "i" },
            },
            {
              comprehensive_summary: {
                $regex: questionTerms.join("|"),
                $options: "i",
              },
            },
            // Search in extracted tags
            {
              "extracted_tags.industries": {
                $regex: questionTerms.join("|"),
                $options: "i",
              },
            },
            {
              "extracted_tags.sectors": {
                $regex: questionTerms.join("|"),
                $options: "i",
              },
            },
            {
              "extracted_tags.stock_names": {
                $regex: questionTerms.join("|"),
                $options: "i",
              },
            },
            {
              "extracted_tags.general_tags": {
                $regex: questionTerms.join("|"),
                $options: "i",
              },
            },
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
          comprehensive_summary: 1,
          extracted_tags: 1,
          reference_date: 1,
          filename: { $arrayElemAt: ["$raw_doc.filename", 0] },
          upload_date: { $arrayElemAt: ["$raw_doc.upload_date", 0] },
          file_size: { $arrayElemAt: ["$raw_doc.file_size", 0] },
          mime_type: { $arrayElemAt: ["$raw_doc.mime_type", 0] },
          similarity_score: 0.5, // Assign a default score for keyword matches
        },
      },
    ];

    const results = await DocumentSummary.aggregate(pipeline);

    console.log(
      `[KeywordFallback] Found ${results.length} documents via keyword search`
    );

    return results.map((result) => ({
      ...result,
      filename: result.filename || "Unknown filename",
      upload_date: result.upload_date || new Date(),
      file_size: result.file_size || 0,
      mime_type: result.mime_type || "unknown",
      summary_text:
        result.comprehensive_summary ||
        result.summary_text ||
        "No summary available",
      extracted_tags: result.extracted_tags || {
        industries: [],
        sectors: [],
        stock_names: [],
        general_tags: [],
      },
    }));
  } catch (error) {
    console.error("Keyword fallback search error:", error);
    return [];
  }
}

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
      const prompt =
        typeof req.body?.prompt === "string" ? req.body.prompt : undefined;
      const result = await uploadDocumentForVectorSearch(req.file, userId, {
        source: "vector_search_upload",
        prompt,
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

// Question-answering endpoint (replaces semantic search)
router.post("/ask", authMiddleware.required, async (req, res) => {
  try {
    const { question } = req.body;
    const userId = req.user.sub;

    console.log(`[VectorSearch API] Question request received:`);
    console.log(`  - User ID: ${userId}`);
    console.log(`  - Question: "${question}"`);

    if (!question || question.trim().length === 0) {
      console.log(`[VectorSearch API] Invalid question: empty or missing`);
      return res.status(400).json({ error: "Question is required" });
    }

    // Pull tunables (with safe caps)
    const fastMode =
      String(req.body?.fast || "").toLowerCase() === "true" ||
      req.body?.fast === true;
    const requestedTopKRaw = Math.min(parseInt(req.body?.top_k || 3), 10);
    const requestedTopK = fastMode
      ? Math.min(requestedTopKRaw, 2)
      : requestedTopKRaw;
    const minScoreReq = Number(req.body?.min_score ?? 0.3);
    const searchLimit = Math.max(requestedTopK * 4, 12); // broader pool for rerank

    // Try cache first
    const cacheKey = `${userId}|${question}|${requestedTopK}|${minScoreReq}|fast=${fastMode}`;
    const cached = getCache(ASK_CACHE, cacheKey);
    if (cached) return res.json(cached);

    // Step 1: Find relevant documents using semantic search with progressive fallback
    console.log(`[VectorSearch API] Finding relevant documents...`);

    // Try multiple similarity thresholds with progressive fallback
    let searchResults;
    let finalResults = [];

    // First attempt: Standard search with moderate threshold
    searchResults = await semanticSearch(question, userId, {
      limit: searchLimit,
      minScore: minScoreReq,
      includeMetadata: true,
    });

    // Filter with moderate threshold
    let relevantResults = searchResults.results.filter(
      (doc) => doc.similarity_score > 0.4
    );

    // If no good results, try with lower threshold
    if (relevantResults.length === 0) {
      console.log(
        `[VectorSearch API] No results with score > 0.4, trying lower threshold...`
      );
      relevantResults = searchResults.results.filter(
        (doc) => doc.similarity_score > 0.2
      );
    }

    // If still no results, use all results above minimum
    if (relevantResults.length === 0) {
      console.log(
        `[VectorSearch API] No results with score > 0.2, using all available results...`
      );
      relevantResults = searchResults.results.filter(
        (doc) => doc.similarity_score > 0.1
      );
    }

    // Keep only top K for answer generation
    finalResults = relevantResults.slice(0, requestedTopK);

    console.log(
      `[VectorSearch API] Found ${searchResults.results.length} total documents, ${relevantResults.length} relevant, using ${finalResults.length} for answer`
    );

    if (finalResults.length === 0) {
      console.log(
        `[VectorSearch API] No relevant documents found with semantic search, trying keyword fallback...`
      );

      // Fallback: Try keyword-based search
      const keywordResults = await performKeywordFallbackSearch(
        question,
        userId
      );

      if (keywordResults.length > 0) {
        console.log(
          `[VectorSearch API] Found ${keywordResults.length} documents via keyword search`
        );
        finalResults = keywordResults.slice(0, 3); // Use top 3 for fallback
      } else {
        console.log(
          `[VectorSearch API] No documents found via keyword search either`
        );
        return res.json({
          success: true,
          question,
          answer:
            "No relevant documents found to answer this question. The available documents don't contain information related to your query. Please try rephrasing your question or upload relevant documents.",
          sources: [],
        });
      }
    }

    // Step 2: Extract relevant content from top documents
    let sections = [];
    if (fastMode) {
      const maxSummaryLengthFast = 4000;
      sections = finalResults.map((doc) => {
        const summaryContent = doc.summary_text || "Summary not available";
        const truncatedSummary =
          summaryContent.length > maxSummaryLengthFast
            ? summaryContent.substring(0, maxSummaryLengthFast) + "..."
            : summaryContent;
        return `Document: ${doc.filename}\nSummary: ${truncatedSummary}`;
      });
    } else {
      // Batch fetch raw content
      const RawDocument = getRawDocumentModel();
      const ids = finalResults.map((d) => d.file_id);
      const rawDocs = await RawDocument.find({ file_id: { $in: ids } })
        .select("file_id raw_content")
        .lean();
      const rawById = new Map(rawDocs.map((d) => [d.file_id, d]));

      const maxSummaryLength = 6000;
      const maxRawLength = 8000;

      sections = finalResults.map((doc) => {
        const summaryContent = doc.summary_text || "Summary not available";
        const truncatedSummary =
          summaryContent.length > maxSummaryLength
            ? summaryContent.substring(0, maxSummaryLength) + "..."
            : summaryContent;

        const rawContent = rawById.get(doc.file_id)?.raw_content || "";
        const truncatedRaw =
          rawContent.length > maxRawLength
            ? rawContent.substring(0, maxRawLength) + "..."
            : rawContent;

        return `Document: ${doc.filename}\nSummary: ${truncatedSummary}$${
          truncatedRaw ? `\nRaw Content: ${truncatedRaw}` : ""
        }`.replace("$", "");
      });
    }

    const finalContent = sections.join("\n\n");

    console.log(`[VectorSearch API] Generating answer with GPT-5-mini...`);
    // Step 3: Use AI to answer the question based on retrieved content
    const answer = await generateAnswer(question, finalContent);

    // Fallback: If the LLM returns an empty answer, synthesize key points from summaries
    if (!answer || !String(answer).trim()) {
      console.warn(
        `[VectorSearch API] Empty answer from LLM. Falling back to synthesized key points.`
      );
      const bullets = finalResults
        .map((doc) => {
          const text = (doc.summary_text || "").replace(/\n+/g, " ").trim();
          if (!text) return null;
          const snippet = text.length > 600 ? text.slice(0, 600) + "..." : text;
          return `- ${doc.filename}: ${snippet}`;
        })
        .filter(Boolean)
        .slice(0, 8)
        .join("\n");
      answer =
        bullets || "No direct answer generated. Try rephrasing your question.";
    }

    console.log(`[VectorSearch API] Answer generated successfully`);

    const responsePayload = {
      success: true,
      question,
      answer,
      sources: finalResults.map((doc) => ({
        file_id: doc.file_id,
        filename: doc.filename,
        similarity_score: doc.similarity_score,
        summary: doc.summary_text,
        upload_date: doc.upload_date,
        reference_date: doc.reference_date,
        file_size: doc.file_size,
        mime_type: doc.mime_type,
      })),
    };

    setCache(ASK_CACHE, cacheKey, responsePayload);
    res.json(responsePayload);
  } catch (error) {
    console.error(`[VectorSearch API] Question-answering error:`, error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to answer question",
    });
  }
});

// Legacy semantic search (kept for compatibility)
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

// Get comprehensive document summary by file_id
router.get(
  "/documents/:fileId/comprehensive-summary",
  authMiddleware.required,
  async (req, res) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.sub;

      const summary = await getDocumentSummary(fileId, userId);

      if (!summary.comprehensive_summary) {
        return res.status(404).json({
          success: false,
          error: "Comprehensive summary not available for this document",
        });
      }

      res.json({
        success: true,
        data: {
          file_id: summary.file_id,
          comprehensive_summary: summary.comprehensive_summary,
          summary_date: summary.summary_date,
          processing_metadata: summary.processing_metadata,
        },
      });
    } catch (error) {
      console.error("Get comprehensive summary error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get comprehensive summary",
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

// Preview file content (inline viewing)
router.get(
  "/documents/:fileId/preview",
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
        `inline; filename="${document.filename}"`
      );
      res.setHeader("Content-Length", fileContent.length);
      res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour

      res.send(fileContent);
    } catch (error) {
      console.error("Preview error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to preview file",
      });
    }
  }
);

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

    // Simple text search using MongoDB (global access)
    const reqLimit = Math.min(parseInt(req.body?.limit || 10), 25);
    const minScore = Number(req.body?.min_score ?? 0.1);

    // Cache key
    const key = `${userId}|${query}|${reqLimit}|${minScore}`;
    const cached = getCache(SIMPLE_CACHE, key);
    if (cached) return res.json(cached);

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
            { comprehensive_summary: { $regex: query, $options: "i" } },
            { "extracted_tags.industries": { $regex: query, $options: "i" } },
            { "extracted_tags.sectors": { $regex: query, $options: "i" } },
            { "extracted_tags.stock_names": { $regex: query, $options: "i" } },
            { "extracted_tags.general_tags": { $regex: query, $options: "i" } },
          ],
        },
      },
      { $limit: reqLimit },
      {
        $project: {
          file_id: 1,
          summary_text: 1,
          comprehensive_summary: 1,
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
      summary_text:
        result.comprehensive_summary ||
        result.summary_text ||
        "No summary available",
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

    const payload = {
      success: true,
      data: {
        query,
        results,
        total_results: results.length,
        search_type: "simple_text_search",
      },
    };

    setCache(SIMPLE_CACHE, key, payload);
    res.json(payload);
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
      limit = 5,
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
      summary:
        doc.summary?.comprehensive_summary ||
        doc.summary?.summary_text ||
        "No summary available",
      text: doc.raw_content || "No raw content available",
      metadata: {
        file_size: doc.file_size,
        mime_type: doc.mime_type,
        upload_date: doc.upload_date,
        reference_date: doc.summary?.reference_date || null,
        processing_status: doc.processing_status,
        owner_user_id: doc.userId,
      },
      created_at: doc.upload_date,
    }));

    res.json({
      success: true,
      items: transformedItems,
      total: result.total,
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore: result.documents.length === parseInt(limit),
      totalPages: Math.ceil(result.total / parseInt(limit)),
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

// Search summaries by tags and keywords
router.get("/search-summaries", authMiddleware.required, async (req, res) => {
  try {
    const { q, page = 1, limit = 20, type } = req.query;
    const userId = req.user.sub;

    console.log(`[VectorSearch] Searching summaries with query: "${q}"`);

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Search query is required",
      });
    }

    const DocumentSummary = getDocumentSummaryModel();
    const skip = (Number(page) - 1) * Number(limit);

    // Build search filter
    let filter = {};

    // Add text search for summary content and tags
    if (type === "text") {
      // Full-text search across summary and tags
      filter.$text = { $search: q };
    } else {
      // Tag-based search
      const searchRegex = new RegExp(q.trim(), "i");
      filter.$or = [
        { "extracted_tags.industries": searchRegex },
        { "extracted_tags.sectors": searchRegex },
        { "extracted_tags.stock_names": searchRegex },
        { "extracted_tags.general_tags": searchRegex },
        { summary_text: searchRegex },
      ];
    }

    // Execute search with pagination
    const [summaries, total] = await Promise.all([
      DocumentSummary.find(filter)
        .sort(
          type === "text"
            ? { score: { $meta: "textScore" } }
            : { summary_date: -1 }
        )
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      DocumentSummary.countDocuments(filter),
    ]);

    // Get file metadata for each summary
    const summariesWithMetadata = await Promise.all(
      summaries.map(async (summary) => {
        try {
          // Get file metadata from RawDocument
          const RawDocument = getRawDocumentModel();
          const rawDoc = await RawDocument.findOne({
            file_id: summary.file_id,
          }).lean();

          return {
            _id: summary._id,
            file_id: summary.file_id,
            filename: rawDoc?.filename || "Unknown file",
            summary_text: summary.summary_text,
            comprehensive_summary: summary.comprehensive_summary,
            extracted_tags: summary.extracted_tags,
            reference_date: summary.reference_date,
            summary_date: summary.summary_date,
            file_size: rawDoc?.file_size || 0,
            mime_type: rawDoc?.mime_type || "unknown",
            upload_date: rawDoc?.upload_date || summary.summary_date,
            // Include text score for relevance ranking
            ...(type === "text" && { score: summary.score }),
          };
        } catch (error) {
          console.error(
            `Error fetching metadata for file ${summary.file_id}:`,
            error
          );
          return {
            _id: summary._id,
            file_id: summary.file_id,
            filename: "Unknown file",
            summary_text: summary.summary_text,
            comprehensive_summary: summary.comprehensive_summary,
            extracted_tags: summary.extracted_tags,
            reference_date: summary.reference_date,
            summary_date: summary.summary_date,
            file_size: 0,
            mime_type: "unknown",
            upload_date: summary.summary_date,
            ...(type === "text" && { score: summary.score }),
          };
        }
      })
    );

    console.log(`[VectorSearch] Found ${total} summaries matching "${q}"`);

    res.json({
      success: true,
      items: summariesWithMetadata,
      total,
      page: Number(page),
      limit: Number(limit),
      hasMore: skip + Number(limit) < total,
      totalPages: Math.ceil(total / Number(limit)),
      query: q,
      searchType: type || "tags",
    });
  } catch (error) {
    console.error(`[VectorSearch] Search error:`, error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to search summaries",
    });
  }
});

export default router;

import { getDocumentSummaryModel } from "../models/DocumentSummary.js";
import { getRawDocumentModel } from "../models/RawDocument.js";
import { generateEmbedding } from "./vectorAi.js";

// Lightweight in-memory cache for query embeddings (per-process)
const QUERY_EMBED_CACHE = new Map();
const EMB_TTL_MS = 5 * 60_000; // 5 minutes

function getCachedEmbedding(key) {
  const entry = QUERY_EMBED_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.exp) {
    QUERY_EMBED_CACHE.delete(key);
    return null;
  }
  return entry.val;
}

function setCachedEmbedding(key, val) {
  QUERY_EMBED_CACHE.set(key, { val, exp: Date.now() + EMB_TTL_MS });
}

/**
 * Perform semantic vector search on document summaries
 * @param {string} query - Search query text
 * @param {string} userId - User ID for authorization
 * @param {Object} options - Search options
 * @returns {Promise<Object>} - Search results
 */
export async function semanticSearch(query, userId, options = {}) {
  const {
    limit = 10,
    minScore = 0.1,
    industries = [],
    sectors = [],
    stockNames = [],
    dateFrom = null,
    dateTo = null,
    includeMetadata = true,
  } = options;

  try {
    console.log(`[VectorSearch] Starting semantic search for user: ${userId}`);
    console.log(`[VectorSearch] Query: "${query}"`);
    console.log(`[VectorSearch] Options:`, options);

    // Step 1: Generate (or load cached) embedding for the search query
    console.log(
      `[VectorSearch] Generating embedding for query (with cache)...`
    );
    let queryEmbedding = getCachedEmbedding(query);
    if (!queryEmbedding) {
      queryEmbedding = await generateEmbedding(query);
      setCachedEmbedding(query, queryEmbedding);
    }
    console.log(
      `[VectorSearch] Using embedding with ${queryEmbedding.length} dimensions`
    );

    // Get models
    const DocumentSummary = getDocumentSummaryModel();
    const RawDocument = getRawDocumentModel();

    // Remove heavy debug scans; proceed directly to vector search pipeline

    // Step 2: Build aggregation pipeline for vector search
    const pipeline = [
      // Compute similarity first; join metadata later for top-K

      // Filter by tags if provided
      ...(industries.length > 0
        ? [
            {
              $match: {
                "extracted_tags.industries": { $in: industries },
              },
            },
          ]
        : []),

      ...(sectors.length > 0
        ? [
            {
              $match: {
                "extracted_tags.sectors": { $in: sectors },
              },
            },
          ]
        : []),

      ...(stockNames.length > 0
        ? [
            {
              $match: {
                "extracted_tags.stock_names": { $in: stockNames },
              },
            },
          ]
        : []),

      // Filter by date range if provided
      ...(dateFrom || dateTo
        ? [
            {
              $match: {
                reference_date: {
                  ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
                  ...(dateTo ? { $lte: new Date(dateTo) } : {}),
                },
              },
            },
          ]
        : []),

      // Calculate cosine similarity
      {
        $addFields: {
          similarity_score: {
            $divide: [
              {
                $reduce: {
                  input: { $range: [0, { $size: "$semantic_embedding" }] },
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      {
                        $multiply: [
                          { $arrayElemAt: ["$semantic_embedding", "$$this"] },
                          { $arrayElemAt: [queryEmbedding, "$$this"] },
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $multiply: [
                  {
                    $sqrt: {
                      $reduce: {
                        input: "$semantic_embedding",
                        initialValue: 0,
                        in: {
                          $add: [
                            "$$value",
                            { $multiply: ["$$this", "$$this"] },
                          ],
                        },
                      },
                    },
                  },
                  {
                    $sqrt: {
                      $reduce: {
                        input: queryEmbedding,
                        initialValue: 0,
                        in: {
                          $add: [
                            "$$value",
                            { $multiply: ["$$this", "$$this"] },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
        },
      },

      // Filter by minimum similarity score
      {
        $match: {
          similarity_score: { $gte: minScore },
        },
      },

      // Sort by similarity score
      {
        $sort: {
          similarity_score: -1,
        },
      },

      // Limit early to reduce downstream work
      {
        $limit: limit,
      },
      // Join raw metadata for top candidates and ensure completed processing
      {
        $lookup: {
          from: "raw_documents",
          localField: "file_id",
          foreignField: "file_id",
          as: "raw_doc",
        },
      },
      {
        $match: { "raw_doc.processing_status": "completed" },
      },
      // Project final fields and flatten raw_doc structure
      {
        $project: {
          file_id: 1,
          summary_text: 1,
          extracted_tags: 1,
          reference_date: 1,
          summary_date: 1,
          confidence_score: 1,
          similarity_score: 1,
          ...(includeMetadata
            ? {
                filename: { $arrayElemAt: ["$raw_doc.filename", 0] },
                upload_date: { $arrayElemAt: ["$raw_doc.upload_date", 0] },
                file_size: { $arrayElemAt: ["$raw_doc.file_size", 0] },
                mime_type: { $arrayElemAt: ["$raw_doc.mime_type", 0] },
              }
            : {}),
        },
      },
    ];

    console.log(`[VectorSearch] Executing aggregation pipeline...`);
    console.log(`[VectorSearch] Pipeline stages:`, pipeline.length);

    let results = await DocumentSummary.aggregate(pipeline);

    // Post-process results to ensure proper structure
    results = results.map((result) => ({
      ...result,
      filename: result.filename || "Unknown filename",
      upload_date: result.upload_date || new Date(),
      file_size: result.file_size || 0,
      mime_type: result.mime_type || "unknown",
      similarity_score: result.similarity_score || 0,
      summary_text: result.summary_text || "No summary available",
      extracted_tags: result.extracted_tags || {
        industries: [],
        sectors: [],
        stock_names: [],
        general_tags: [],
      },
    }));

    console.log(`[VectorSearch] Aggregation completed. Results:`, {
      query,
      results_count: results.length,
      total_results: results.length,
      search_options: options,
      sample_result:
        results.length > 0
          ? {
              file_id: results[0].file_id,
              similarity_score: results[0].similarity_score,
              has_embedding: !!results[0].semantic_embedding,
              filename: results[0].filename,
              upload_date: results[0].upload_date,
              file_size: results[0].file_size,
              reference_date: results[0].reference_date,
            }
          : null,
    });

    return {
      query,
      results,
      total_results: results.length,
      search_options: options,
    };
  } catch (error) {
    console.error("Semantic search error:", error);
    throw new Error(`Search failed: ${error.message}`);
  }
}

/**
 * Get date range for documents (global access)
 * @param {string} userId - User ID (kept for compatibility but not used)
 * @returns {Promise<Object>} - Date range information
 */
export async function getDateRange(userId) {
  try {
    const DocumentSummary = getDocumentSummaryModel();
    const RawDocument = getRawDocumentModel();

    const pipeline = [
      // Match all completed documents (global access)
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
          reference_date: { $exists: true, $ne: null },
        },
      },

      // Group to get min and max dates
      {
        $group: {
          _id: null,
          min_date: { $min: "$reference_date" },
          max_date: { $max: "$reference_date" },
          total_documents_with_dates: { $sum: 1 },
        },
      },
    ];

    const result = await DocumentSummary.aggregate(pipeline);
    const dateInfo = result[0] || {
      min_date: null,
      max_date: null,
      total_documents_with_dates: 0,
    };

    return dateInfo;
  } catch (error) {
    console.error("Error getting date range:", error);
    throw new Error(`Failed to get date range: ${error.message}`);
  }
}

/**
 * Get document statistics (global access)
 * @param {string} userId - User ID (kept for compatibility but not used)
 * @returns {Promise<Object>} - Document statistics
 */
export async function getDocumentStats(userId) {
  try {
    const DocumentSummary = getDocumentSummaryModel();
    const RawDocument = getRawDocumentModel();

    const pipeline = [
      // Match all documents (global access)
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
          // No user filter - show all documents
        },
      },

      // Group by processing status
      {
        $group: {
          _id: "$raw_doc.processing_status",
          count: { $sum: 1 },
        },
      },
    ];

    const statusCounts = await DocumentSummary.aggregate(pipeline);

    // Get total document count (global)
    const totalDocs = await RawDocument.countDocuments({});

    // Get processed documents count (global)
    const processedDocs = await RawDocument.countDocuments({
      processing_status: "completed",
    });

    return {
      total_documents: totalDocs,
      processed_documents: processedDocs,
      processing_status: statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  } catch (error) {
    console.error("Error getting document stats:", error);
    throw new Error(`Failed to get document stats: ${error.message}`);
  }
}

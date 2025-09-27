import { getDocumentSummaryModel } from "../models/DocumentSummary.js";
import { getRawDocumentModel } from "../models/RawDocument.js";
import { generateEmbedding } from "./vectorAi.js";

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

    // Step 1: Generate embedding for the search query
    console.log(`[VectorSearch] Generating embedding for query...`);
    const queryEmbedding = await generateEmbedding(query);
    console.log(
      `[VectorSearch] Generated embedding with ${queryEmbedding.length} dimensions`
    );

    // Get models
    const DocumentSummary = getDocumentSummaryModel();
    const RawDocument = getRawDocumentModel();

    // Debug: Check total documents (global access)
    console.log(
      `[VectorSearch] Checking database connection and documents (global access)...`
    );

    // Test database connection and get stats
    let totalDocs, totalRawDocs, completedDocs;
    try {
      totalDocs = await DocumentSummary.countDocuments();
      totalRawDocs = await RawDocument.countDocuments();
      completedDocs = await RawDocument.countDocuments({
        processing_status: "completed",
      });

      console.log(`[VectorSearch] Database connection successful`);
    } catch (dbError) {
      console.error(`[VectorSearch] Database connection error:`, dbError);
      throw new Error(`Database connection failed: ${dbError.message}`);
    }

    console.log(`[VectorSearch] Database stats (global):`);
    console.log(`  - Total DocumentSummary records: ${totalDocs}`);
    console.log(`  - Total RawDocument records: ${totalRawDocs}`);
    console.log(`  - Completed RawDocument records: ${completedDocs}`);

    const allDocs = await DocumentSummary.aggregate([
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
    ]);

    console.log(
      `[VectorSearch] All documents with completed processing: ${allDocs.length}`
    );

    if (allDocs.length === 0) {
      console.log(`[VectorSearch] No completed documents found in database`);

      // Let's also check if there are any documents at all (for debugging)
      const allRawDocs = await RawDocument.find({}).limit(5);
      console.log(
        `[VectorSearch] All documents (first 5):`,
        allRawDocs.map((doc) => ({
          file_id: doc.file_id,
          filename: doc.filename,
          processing_status: doc.processing_status,
          created_at: doc.created_at,
        }))
      );

      return {
        query,
        results: [],
        total_results: 0,
        search_options: options,
        debug_info: {
          total_docs: totalDocs,
          all_docs: allDocs.length,
          all_raw_docs: allRawDocs.length,
        },
      };
    }

    // Step 2: Build aggregation pipeline for vector search (global access)
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
        },
      },

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

      // Limit results
      {
        $limit: limit,
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
      debug_info: {
        total_docs: totalDocs,
        all_docs: allDocs.length,
        pipeline_stages: pipeline.length,
        results_count: results.length,
      },
    };
  } catch (error) {
    console.error("Semantic search error:", error);
    throw new Error(`Search failed: ${error.message}`);
  }
}

/**
 * Get all available tags for filtering (global access)
 * @param {string} userId - User ID (kept for compatibility but not used)
 * @returns {Promise<Object>} - Available tags
 */
export async function getAvailableTags(userId) {
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
        },
      },

      // Group and collect all unique tags
      {
        $group: {
          _id: null,
          industries: { $addToSet: "$extracted_tags.industries" },
          sectors: { $addToSet: "$extracted_tags.sectors" },
          stock_names: { $addToSet: "$extracted_tags.stock_names" },
          general_tags: { $addToSet: "$extracted_tags.general_tags" },
        },
      },

      // Flatten arrays and remove duplicates
      {
        $project: {
          industries: {
            $reduce: {
              input: "$industries",
              initialValue: [],
              in: { $setUnion: ["$$value", "$$this"] },
            },
          },
          sectors: {
            $reduce: {
              input: "$sectors",
              initialValue: [],
              in: { $setUnion: ["$$value", "$$this"] },
            },
          },
          stock_names: {
            $reduce: {
              input: "$stock_names",
              initialValue: [],
              in: { $setUnion: ["$$value", "$$this"] },
            },
          },
          general_tags: {
            $reduce: {
              input: "$general_tags",
              initialValue: [],
              in: { $setUnion: ["$$value", "$$this"] },
            },
          },
        },
      },
    ];

    const result = await DocumentSummary.aggregate(pipeline);
    const tags = result[0] || {
      industries: [],
      sectors: [],
      stock_names: [],
      general_tags: [],
    };

    return tags;
  } catch (error) {
    console.error("Error getting available tags:", error);
    throw new Error(`Failed to get tags: ${error.message}`);
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

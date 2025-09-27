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
    minScore = 0.7,
    industries = [],
    sectors = [],
    stockNames = [],
    dateFrom = null,
    dateTo = null,
    includeMetadata = true,
  } = options;

  try {
    // Step 1: Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    // Get models
    const DocumentSummary = getDocumentSummaryModel();
    const RawDocument = getRawDocumentModel();

    // Step 2: Build aggregation pipeline for vector search
    const pipeline = [
      // Match documents that belong to the user
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
          "raw_doc.userId": userId,
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

      // Project final fields
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
                "raw_doc.filename": 1,
                "raw_doc.upload_date": 1,
                "raw_doc.file_size": 1,
                "raw_doc.mime_type": 1,
              }
            : {}),
        },
      },
    ];

    const results = await DocumentSummary.aggregate(pipeline);

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
 * Get all available tags for filtering
 * @param {string} userId - User ID for authorization
 * @returns {Promise<Object>} - Available tags
 */
export async function getAvailableTags(userId) {
  try {
    const DocumentSummary = getDocumentSummaryModel();
    const RawDocument = getRawDocumentModel();

    const pipeline = [
      // Match documents that belong to the user
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
          "raw_doc.userId": userId,
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
 * Get date range for documents
 * @param {string} userId - User ID for authorization
 * @returns {Promise<Object>} - Date range information
 */
export async function getDateRange(userId) {
  try {
    const DocumentSummary = getDocumentSummaryModel();
    const RawDocument = getRawDocumentModel();

    const pipeline = [
      // Match documents that belong to the user
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
          "raw_doc.userId": userId,
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
 * Get document statistics for a user
 * @param {string} userId - User ID for authorization
 * @returns {Promise<Object>} - Document statistics
 */
export async function getDocumentStats(userId) {
  try {
    const DocumentSummary = getDocumentSummaryModel();
    const RawDocument = getRawDocumentModel();

    const pipeline = [
      // Match documents that belong to the user
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
          "raw_doc.userId": userId,
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

    // Get total document count
    const totalDocs = await RawDocument.countDocuments({ userId });

    // Get processed documents count
    const processedDocs = await RawDocument.countDocuments({
      userId,
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

import { v4 as uuidv4 } from "uuid";
import { getRawDocumentModel } from "../models/RawDocument.js";
import { getDocumentSummaryModel } from "../models/DocumentSummary.js";
import { processCompleteDocument } from "./vectorAi.js";
import { getVectorGridBucket } from "../util/vectorMongo.js";
import { extractTextFromFile } from "./extract.js";

/**
 * Upload and process a document for vector search
 * @param {Object} file - Multer file object
 * @param {string} userId - User ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} - Upload result with file_id
 */
export async function uploadDocumentForVectorSearch(
  file,
  userId,
  metadata = {}
) {
  const fileId = uuidv4();
  const startTime = Date.now();

  console.log(
    `[Upload] 🚀 Starting upload process for ${file.originalname} (${file.size} bytes)...`
  );
  const gridBucket = getVectorGridBucket();
  const RawDocument = getRawDocumentModel();
  const DocumentSummary = getDocumentSummaryModel();

  try {
    // Step 1: Store raw file in GridFS
    const uploadStream = gridBucket.openUploadStream(file.originalname, {
      metadata: {
        fileId,
        userId,
        mimeType: file.mimetype,
        uploadDate: new Date(),
        ...metadata,
      },
    });

    // Write file buffer to GridFS
    await new Promise((resolve, reject) => {
      uploadStream.end(file.buffer, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    // Step 2: Create RawDocument record
    const rawDocument = new RawDocument({
      file_id: fileId,
      filename: file.originalname,
      upload_date: new Date(),
      file_size: file.size,
      mime_type: file.mimetype,
      file_source: metadata.source || "user_upload",
      created_at: new Date(),
      gridFsId: uploadStream.id,
      userId,
      processing_status: "pending",
    });

    await rawDocument.save();

    // Step 3: Extract text content
    console.log(
      `[Upload] Step 3: Extracting text from ${file.originalname}...`
    );
    let extractedText = "";
    let extractionSuccess = false;

    try {
      extractedText = await extractTextFromFile(file);
      if (
        extractedText &&
        extractedText.trim() &&
        !extractedText.includes(
          "Document uploaded successfully but text extraction failed"
        )
      ) {
        extractionSuccess = true;
        rawDocument.raw_content = extractedText;
        rawDocument.processing_status = "processing";
        await rawDocument.save();
        console.log(
          `[Upload] Text extraction successful for ${file.originalname}, content length:`,
          extractedText.length
        );
      } else {
        throw new Error("No meaningful text extracted");
      }
    } catch (extractError) {
      console.error("Text extraction failed:", extractError);

      // Try to extract basic metadata and file info as fallback content
      const fileInfo = `
Document Information:
- Filename: ${file.originalname}
- File Size: ${file.size} bytes
- MIME Type: ${file.mimetype}
- Upload Date: ${new Date().toISOString()}

Note: This document could not be fully processed for text extraction. This may be due to:
- Scanned PDF format requiring OCR
- Complex formatting or encryption
- Corrupted file structure

The document has been uploaded and processed for metadata extraction and AI analysis based on available information.
      `.trim();

      extractedText = fileInfo;
      rawDocument.raw_content = extractedText;
      rawDocument.processing_status = "processing";
      rawDocument.error_message = `Text extraction failed: ${extractError.message}`;
      await rawDocument.save();

      console.log("Using fallback content for processing...");
    }

    // Step 4: Process with AI (summarization, tagging, embedding)
    console.log(
      `[Upload] Step 4: Processing ${file.originalname} with AI (this may take 30-60 seconds)...`
    );
    try {
      const aiProcessedData = await processCompleteDocument(
        extractedText,
        file.originalname,
        { prompt: metadata?.prompt }
      );

      // Step 5: Create DocumentSummary record
      console.log(
        `[Upload] Step 5: Saving processed data for ${file.originalname}...`
      );
      const documentSummary = new DocumentSummary({
        file_id: fileId,
        summary_text: aiProcessedData.summary,
        comprehensive_summary: aiProcessedData.comprehensive_summary,
        extracted_tags: {
          industries: aiProcessedData.industries,
          sectors: aiProcessedData.sectors,
          stock_names: aiProcessedData.stock_names,
          general_tags: aiProcessedData.general_tags,
        },
        semantic_embedding: aiProcessedData.semantic_embedding,
        reference_date: aiProcessedData.reference_date,
        summary_date: new Date(),
        embedding_model: aiProcessedData.embedding_model,
        confidence_score: aiProcessedData.confidence_score,
        processing_metadata: aiProcessedData.processing_metadata,
      });

      await documentSummary.save();

      // Step 6: Update RawDocument status
      console.log(
        `[Upload] Step 6: Finalizing upload for ${file.originalname}...`
      );
      rawDocument.processing_status = "completed";
      rawDocument.reference_date = aiProcessedData.reference_date || null;
      await rawDocument.save();

      console.log(
        `[Upload] ✅ Successfully processed ${file.originalname} in ${
          Date.now() - startTime
        }ms`
      );
      return {
        success: true,
        file_id: fileId,
        filename: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        upload_date: rawDocument.upload_date,
        processing_status: "completed",
        summary: aiProcessedData.summary,
        comprehensive_summary: aiProcessedData.comprehensive_summary,
        extracted_tags: aiProcessedData,
        gridFsId: uploadStream.id,
      };
    } catch (aiError) {
      console.error("AI processing failed:", aiError);
      rawDocument.processing_status = "failed";
      rawDocument.error_message = `AI processing failed 1: ${aiError.message}`;
      await rawDocument.save();
      throw aiError;
    }
  } catch (error) {
    console.error("Upload process failed:", error);

    // Clean up GridFS file if it was created
    try {
      const gridBucket = getVectorGridBucket();
      const files = await gridBucket
        .find({ "metadata.fileId": fileId })
        .toArray();
      for (const gridFile of files) {
        await gridBucket.delete(gridFile._id);
      }
    } catch (cleanupError) {
      console.error("Failed to cleanup GridFS file:", cleanupError);
    }

    throw error;
  }
}

/**
 * Get raw document by file_id
 * @param {string} fileId - File ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object>} - Raw document data
 */
export async function getRawDocument(fileId, userId) {
  const RawDocument = getRawDocumentModel();
  // Try strict user-ownership match first
  let rawDocument = await RawDocument.findOne({
    file_id: fileId,
    userId,
  });

  // Fallback: allow access by file_id only for globally visible contexts
  // This supports Summary/Dashboard where documents are globally listed.
  if (!rawDocument) {
    rawDocument = await RawDocument.findOne({ file_id: fileId });
  }

  if (!rawDocument) {
    throw new Error("Document not found or access denied");
  }

  return rawDocument;
}

/**
 * Get document summary by file_id
 * @param {string} fileId - File ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object>} - Document summary data
 */
export async function getDocumentSummary(fileId, userId) {
  const RawDocument = getRawDocumentModel();
  const DocumentSummary = getDocumentSummaryModel();

  // First verify user has access to the raw document
  const rawDocument = await RawDocument.findOne({
    file_id: fileId,
    userId,
  });

  if (!rawDocument) {
    throw new Error("Document not found or access denied");
  }

  const summary = await DocumentSummary.findOne({ file_id: fileId });

  if (!summary) {
    throw new Error("Document summary not found");
  }

  return summary;
}

/**
 * Get file content from GridFS
 * @param {string} fileId - File ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Buffer>} - File content buffer
 */
export async function getFileContent(fileId, userId) {
  const RawDocument = getRawDocumentModel();
  // Try strict user match
  let rawDocument = await RawDocument.findOne({
    file_id: fileId,
    userId,
  });

  // Fallback to file_id only for global preview/download
  if (!rawDocument) {
    rawDocument = await RawDocument.findOne({ file_id: fileId });
  }

  if (!rawDocument) {
    throw new Error("Document not found or access denied");
  }

  const gridBucket = getVectorGridBucket();
  const downloadStream = gridBucket.openDownloadStream(rawDocument.gridFsId);

  return new Promise((resolve, reject) => {
    const chunks = [];
    downloadStream.on("data", (chunk) => chunks.push(chunk));
    downloadStream.on("error", reject);
    downloadStream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Get all documents with pagination (global access)
 * @param {string} userId - User ID (kept for compatibility but not used)
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Paginated documents
 */
export async function getUserDocuments(userId, options = {}) {
  const RawDocument = getRawDocumentModel();
  const DocumentSummary = getDocumentSummaryModel();

  const {
    page = 1,
    limit = 10,
    sortBy = "upload_date",
    sortOrder = "desc",
    status = null,
  } = options;

  // Global access - no user filter
  const query = {};
  if (status) {
    query.processing_status = status;
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

  // Use aggregation to join with summaries (global access)
  const pipeline = [
    { $match: query },
    {
      $lookup: {
        from: "document_summaries",
        localField: "file_id",
        foreignField: "file_id",
        as: "summary",
      },
    },
    {
      $addFields: {
        summary: { $arrayElemAt: ["$summary", 0] },
      },
    },
    { $sort: sort },
    { $skip: skip },
    { $limit: limit },
  ];

  const [documents, total] = await Promise.all([
    RawDocument.aggregate(pipeline),
    RawDocument.countDocuments(query),
  ]);

  return {
    documents,
    total,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Delete a document and its associated data
 * @param {string} fileId - File ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object>} - Deletion result
 */
export async function deleteDocument(fileId, userId) {
  const RawDocument = getRawDocumentModel();
  const DocumentSummary = getDocumentSummaryModel();
  const gridBucket = getVectorGridBucket();

  console.log(`[VectorUpload] Deleting document ${fileId} for user ${userId}`);

  // First verify user has access to the document. In global Summary views,
  // the current user may differ from the original uploader. To support
  // deletion of globally visible documents in non-restrictive contexts,
  // fall back to finding by file_id only if the strict check fails.
  let rawDocument = await RawDocument.findOne({
    file_id: fileId,
    userId,
  });

  if (!rawDocument) {
    // Fallback: allow delete by file_id when user does not match
    rawDocument = await RawDocument.findOne({ file_id: fileId });
  }

  if (!rawDocument) {
    throw new Error("Document not found or access denied");
  }

  try {
    // Delete from GridFS (handle already-deleted files gracefully)
    if (rawDocument.gridFsId) {
      try {
        await gridBucket.delete(rawDocument.gridFsId);
        console.log(
          `[VectorUpload] Deleted GridFS file ${rawDocument.gridFsId}`
        );
      } catch (gridErr) {
        console.warn(
          `[VectorUpload] GridFS delete skipped for ${rawDocument.gridFsId}: ${gridErr.message}`
        );
        // Fall back: attempt deleting any GridFS files by metadata.fileId
        try {
          const files = await gridBucket
            .find({ "metadata.fileId": fileId })
            .toArray();
          for (const gridFile of files) {
            await gridBucket.delete(gridFile._id);
            console.log(
              `[VectorUpload] Deleted GridFS file by metadata ${gridFile._id}`
            );
          }
        } catch (fallbackErr) {
          console.warn(
            `[VectorUpload] GridFS metadata cleanup skipped: ${fallbackErr.message}`
          );
        }
      }
    }

    // Delete document summary (if exists)
    const { deletedCount } = await DocumentSummary.deleteOne({
      file_id: fileId,
    });
    if (deletedCount) {
      console.log(`[VectorUpload] Deleted document summary for ${fileId}`);
    } else {
      console.log(`[VectorUpload] No document summary found for ${fileId}`);
    }

    // Delete raw document record
    await RawDocument.deleteOne({ file_id: fileId });
    console.log(`[VectorUpload] Deleted raw document record for ${fileId}`);

    return {
      success: true,
      file_id: fileId,
      message: "Document deleted successfully",
    };
  } catch (error) {
    console.error(`[VectorUpload] Error deleting document ${fileId}:`, error);
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}

/**
 * Re-summarize a document with updated AI processing
 * @param {string} fileId - File ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object>} - Updated document data
 */
export async function resummarizeDocument(fileId, userId) {
  const RawDocument = getRawDocumentModel();
  const DocumentSummary = getDocumentSummaryModel();

  console.log(
    `[VectorUpload] Re-summarizing document ${fileId} for user ${userId}`
  );

  // First verify user has access to the document
  const rawDocument = await RawDocument.findOne({
    file_id: fileId,
    userId,
  });

  if (!rawDocument) {
    throw new Error("Document not found or access denied");
  }

  try {
    // Update processing status
    rawDocument.processing_status = "processing";
    await rawDocument.save();

    // Get the raw content
    let content = rawDocument.raw_content;
    if (!content) {
      // If no raw content, try to extract from GridFS
      const gridBucket = getVectorGridBucket();
      const downloadStream = gridBucket.openDownloadStream(
        rawDocument.gridFsId
      );

      content = await new Promise((resolve, reject) => {
        const chunks = [];
        downloadStream.on("data", (chunk) => chunks.push(chunk));
        downloadStream.on("error", reject);
        downloadStream.on("end", () => {
          const buffer = Buffer.concat(chunks);
          // For now, we'll use the buffer as text (this might need improvement)
          resolve(buffer.toString("utf8"));
        });
      });
    }

    // Process with AI
    const aiProcessedData = await processCompleteDocument(
      content,
      rawDocument.filename
    );

    // Update or create document summary
    const existingSummary = await DocumentSummary.findOne({ file_id: fileId });

    if (existingSummary) {
      // Update existing summary
      existingSummary.summary_text = aiProcessedData.summary;
      existingSummary.comprehensive_summary =
        aiProcessedData.comprehensive_summary;
      existingSummary.extracted_tags = {
        industries: aiProcessedData.industries,
        sectors: aiProcessedData.sectors,
        stock_names: aiProcessedData.stock_names,
        general_tags: aiProcessedData.general_tags,
      };
      existingSummary.semantic_embedding = aiProcessedData.semantic_embedding;
      existingSummary.reference_date = aiProcessedData.reference_date;
      existingSummary.summary_date = new Date();
      existingSummary.embedding_model = aiProcessedData.embedding_model;
      existingSummary.confidence_score = aiProcessedData.confidence_score;
      existingSummary.processing_metadata = aiProcessedData.processing_metadata;

      await existingSummary.save();
      console.log(`[VectorUpload] Updated document summary for ${fileId}`);
    } else {
      // Create new summary
      const documentSummary = new DocumentSummary({
        file_id: fileId,
        summary_text: aiProcessedData.summary,
        comprehensive_summary: aiProcessedData.comprehensive_summary,
        extracted_tags: {
          industries: aiProcessedData.industries,
          sectors: aiProcessedData.sectors,
          stock_names: aiProcessedData.stock_names,
          general_tags: aiProcessedData.general_tags,
        },
        semantic_embedding: aiProcessedData.semantic_embedding,
        reference_date: aiProcessedData.reference_date,
        summary_date: new Date(),
        embedding_model: aiProcessedData.embedding_model,
        confidence_score: aiProcessedData.confidence_score,
        processing_metadata: aiProcessedData.processing_metadata,
      });

      await documentSummary.save();
      console.log(`[VectorUpload] Created new document summary for ${fileId}`);
    }

    // Update raw document status
    rawDocument.processing_status = "completed";
    rawDocument.error_message = null;
    await rawDocument.save();

    return {
      success: true,
      file_id: fileId,
      summary: aiProcessedData.summary,
      comprehensive_summary: aiProcessedData.comprehensive_summary,
      extracted_tags: aiProcessedData,
      processing_status: "completed",
    };
  } catch (error) {
    console.error(
      `[VectorUpload] Error re-summarizing document ${fileId}:`,
      error
    );

    // Update status to failed
    rawDocument.processing_status = "failed";
    rawDocument.error_message = `Re-summarization failed: ${error.message}`;
    await rawDocument.save();

    throw new Error(`Failed to re-summarize document: ${error.message}`);
  }
}

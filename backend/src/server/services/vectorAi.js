import OpenAI from "openai";
import { loadConfig } from "../util/config.js";

const config = loadConfig();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

/**
 * Generate embeddings for text using OpenAI's text-embedding-3-small model
 * @param {string} text - Text to generate embeddings for
 * @returns {Promise<number[]>} - Embedding vector
 */
export async function generateEmbedding(text) {
  try {
    if (!config.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate comprehensive document summary following expert summarization rules
 * @param {string} content - Raw document content
 * @param {string} filename - Original filename for context
 * @returns {Promise<string>} - Comprehensive summary (5-7 pages for 70-100 page documents)
 */
export async function generateComprehensiveSummary(content, filename) {
  try {
    if (!config.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    const startTime = Date.now();

    // Calculate target summary length based on document size
    const documentLength = content.length;
    const wordsPerPage = 500; // Approximate words per page
    const documentPages = Math.ceil(documentLength / (wordsPerPage * 5)); // Rough estimate

    // Target 5-7 pages for 70-100 page documents, proportional for others
    let targetSummaryPages;
    if (documentPages >= 70) {
      targetSummaryPages = Math.min(
        7,
        Math.max(5, Math.ceil(documentPages * 0.08))
      ); // 8% of original
    } else if (documentPages >= 20) {
      targetSummaryPages = Math.min(
        5,
        Math.max(3, Math.ceil(documentPages * 0.15))
      ); // 15% of original
    } else {
      targetSummaryPages = Math.min(
        3,
        Math.max(1, Math.ceil(documentPages * 0.25))
      ); // 25% of original
    }

    const targetWords = targetSummaryPages * wordsPerPage;

    // Truncate content if too long (GPT-4o has a 128k context limit)
    const maxContentLength = 120000; // Leave room for prompt
    const truncatedContent =
      content.length > maxContentLength
        ? content.substring(0, maxContentLength) +
          "\n\n[Content truncated due to length]"
        : content;

    const prompt = `You are an expert document summarizer. You will be given a document to carefully read and summarize into a structured summary that is approximately ${targetSummaryPages} pages long (${targetWords} words).

Document: ${filename}
Content: ${truncatedContent}

Rules for summarization:

1. Do not omit any important information, data, figures, or arguments.
2. Preserve the logical flow of the document (headings, subheadings, and sections).
3. Condense repetitive or verbose text, but never remove critical details.
4. If numbers, statistics, or research findings are included, always retain them accurately in the summary.
5. Extract relevant tables, lists, or structured content in a simplified format.
6. The final output should be coherent, factually accurate, and easy to navigate.
7. Treat every paragraph as potentially meaningful—summarize instead of skipping.
8. Make sure the summary acts as a comprehensive substitute for reading the full document, while strictly avoiding the loss of essential details.

Structure your summary with:
- Clear headings and subheadings that mirror the original document structure
- All important data points, statistics, and findings
- Key arguments and conclusions
- Important tables or lists in simplified format
- All critical details that would be needed to understand the document's main points

Generate a comprehensive summary that maintains the document's essential information while condensing it to approximately ${targetWords} words.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert document summarizer specializing in creating comprehensive, detailed summaries that preserve all critical information while condensing lengthy documents. You maintain the logical structure and flow of original documents while ensuring no essential details are lost.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 8000, // Increased for longer summaries
    });

    const processingTime = Date.now() - startTime;
    const tokensUsed = response.usage?.total_tokens || 0;

    const summary = response.choices[0].message.content.trim();

    console.log(
      `[ComprehensiveSummary] Generated ${summary.length} character summary for ${filename} in ${processingTime}ms using ${tokensUsed} tokens`
    );

    return {
      summary,
      processing_metadata: {
        ai_model_used: "gpt-4o",
        processing_time_ms: processingTime,
        tokens_used: tokensUsed,
        target_summary_pages: targetSummaryPages,
        target_words: targetWords,
        original_document_pages: documentPages,
      },
    };
  } catch (error) {
    console.error("Error generating comprehensive summary:", error);
    throw new Error(`Comprehensive summarization failed: ${error.message}`);
  }
}

/**
 * Process document content using OpenAI GPT-4o-mini for summarization, tagging, and temporal extraction
 * @param {string} content - Raw document content
 * @param {string} filename - Original filename for context
 * @returns {Promise<Object>} - Processed document data
 */
export async function processDocumentWithAI(content, filename) {
  try {
    if (!config.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    const startTime = Date.now();

    // Generate comprehensive summary first
    const summaryResult = await generateComprehensiveSummary(content, filename);

    // Truncate content if too long (GPT-4o-mini has a 128k context limit)
    const maxContentLength = 100000; // Leave room for prompt
    const truncatedContent =
      content.length > maxContentLength
        ? content.substring(0, maxContentLength) + "..."
        : content;

    const prompt = `Analyze this document and return ONLY valid JSON. Do not include any text before or after the JSON.

Document: ${filename}
Content: ${truncatedContent}

Return this exact JSON structure:
{
  "summary": "Brief 2-3 sentence summary",
  "industries": ["Technology", "Healthcare"],
  "sectors": ["Software", "Biotech"],
  "stock_names": ["Apple", "Microsoft"],
  "general_tags": ["AI", "Machine Learning"],
  "reference_date": "2024-01-15",
  "confidence_score": 0.9
}

Rules:
- Return ONLY the JSON object, no other text
- Use double quotes for all strings
- Use null for reference_date if no date found
- confidence_score must be between 0.0 and 1.0
- All arrays must contain strings only
- Extract actual companies/industries mentioned, not generic ones`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert document analyst specializing in extracting structured information from business documents, financial reports, and technical content. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const processingTime = Date.now() - startTime;
    const tokensUsed = response.usage?.total_tokens || 0;

    // Parse the JSON response with better error handling
    let analysis;
    let rawResponse = response.choices[0].message.content.trim();

    try {
      // Try to extract JSON from the response if it's wrapped in markdown or other text
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        rawResponse = jsonMatch[0];
      }

      analysis = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:");
      console.error("Raw response:", rawResponse);
      console.error("Parse error:", parseError.message);

      // Try to provide a fallback response
      analysis = {
        summary:
          "Document analysis completed but AI response format was invalid",
        industries: [],
        sectors: [],
        stock_names: [],
        general_tags: [],
        reference_date: null,
        confidence_score: 0.5,
      };

      console.warn("Using fallback analysis due to JSON parsing error");
    }

    // Validate and clean the response - using comprehensive summary as primary
    const processedData = {
      summary: summaryResult.summary, // Use comprehensive summary as the primary summary
      comprehensive_summary: summaryResult.summary, // Keep comprehensive summary field for compatibility
      industries: Array.isArray(analysis.industries)
        ? analysis.industries.filter(Boolean)
        : [],
      sectors: Array.isArray(analysis.sectors)
        ? analysis.sectors.filter(Boolean)
        : [],
      stock_names: Array.isArray(analysis.stock_names)
        ? analysis.stock_names.filter(Boolean)
        : [],
      general_tags: Array.isArray(analysis.general_tags)
        ? analysis.general_tags.filter(Boolean)
        : [],
      reference_date:
        analysis.reference_date && analysis.reference_date !== "null"
          ? new Date(analysis.reference_date)
          : null,
      confidence_score:
        typeof analysis.confidence_score === "number"
          ? Math.max(0, Math.min(1, analysis.confidence_score))
          : 0.8,
      processing_metadata: {
        ai_model_used: "gpt-4o (comprehensive) + gpt-4o-mini (metadata)",
        processing_time_ms: processingTime,
        tokens_used: tokensUsed,
        comprehensive_summary_metadata: summaryResult.processing_metadata,
        pipeline_type: "comprehensive_summary_primary",
      },
    };

    return processedData;
  } catch (error) {
    console.error("Error processing document with AI:", error);
    throw new Error(`AI processing failed: ${error.message}`);
  }
}

/**
 * Generate a combined text for embedding using COMPREHENSIVE SUMMARY and tags
 * This ensures vector search uses the detailed, high-quality summary for better results
 * @param {Object} processedData - Data from processDocumentWithAI
 * @returns {string} - Combined text for embedding
 */
export function createEmbeddingText(processedData) {
  // Use comprehensive summary as primary content for embeddings
  const primaryContent =
    processedData.comprehensive_summary || processedData.summary;

  const parts = [
    primaryContent, // Use comprehensive summary for better vector search
    `Industries: ${processedData.industries.join(", ")}`,
    `Sectors: ${processedData.sectors.join(", ")}`,
    `Companies: ${processedData.stock_names.join(", ")}`,
    `Tags: ${processedData.general_tags.join(", ")}`,
  ].filter(Boolean);

  return parts.join(" | ");
}

/**
 * Process a complete document: AI analysis + embedding generation
 * @param {string} content - Raw document content
 * @param {string} filename - Original filename
 * @returns {Promise<Object>} - Complete processed document data
 */
export async function processCompleteDocument(content, filename) {
  try {
    // Step 1: AI analysis
    const aiAnalysis = await processDocumentWithAI(content, filename);

    // Step 2: Generate embedding
    const embeddingText = createEmbeddingText(aiAnalysis);
    const embedding = await generateEmbedding(embeddingText);

    return {
      ...aiAnalysis,
      semantic_embedding: embedding,
      embedding_model: "text-embedding-3-small",
    };
  } catch (error) {
    console.error("Error in complete document processing:", error);
    throw error;
  }
}

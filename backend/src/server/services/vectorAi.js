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

    // Validate and clean the response
    const processedData = {
      summary: analysis.summary || "No summary generated",
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
        ai_model_used: "gpt-4o-mini",
        processing_time_ms: processingTime,
        tokens_used: tokensUsed,
      },
    };

    return processedData;
  } catch (error) {
    console.error("Error processing document with AI:", error);
    throw new Error(`AI processing failed: ${error.message}`);
  }
}

/**
 * Generate a combined text for embedding that includes summary and tags
 * @param {Object} processedData - Data from processDocumentWithAI
 * @returns {string} - Combined text for embedding
 */
export function createEmbeddingText(processedData) {
  const parts = [
    processedData.summary,
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

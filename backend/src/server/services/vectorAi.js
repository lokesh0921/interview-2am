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
export async function generateComprehensiveSummary(
  content,
  filename,
  options = {}
) {
  try {
    if (!config.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    const startTime = Date.now();

    // Calculate target summary length based on document size
    const documentLength = content.length;
    console.log(
      `[ComprehensiveSummary] Processing document: ${filename}, Length: ${documentLength} characters`
    );
    const wordsPerPage = 500; // Approximate words per page
    const documentPages = Math.ceil(documentLength / (wordsPerPage * 5)); // Rough estimate

    // Target more comprehensive summaries - increase target length
    let targetSummaryPages;
    if (documentPages >= 70) {
      targetSummaryPages = Math.min(
        10,
        Math.max(7, Math.ceil(documentPages * 0.12))
      ); // 12% of original (increased from 8%)
    } else if (documentPages >= 20) {
      targetSummaryPages = Math.min(
        8,
        Math.max(5, Math.ceil(documentPages * 0.2))
      ); // 20% of original (increased from 15%)
    } else {
      targetSummaryPages = Math.min(
        5,
        Math.max(3, Math.ceil(documentPages * 0.35))
      ); // 35% of original (increased from 25%)
    }

    const targetWords = targetSummaryPages * wordsPerPage;

    // Use full content - GPT-5-mini can handle large documents
    // Only truncate if extremely large (over 1M chars) to prevent API issues
    const maxContentLength = 1000000; // 1M characters should be enough for most documents
    const truncatedContent =
      content.length > maxContentLength
        ? content.substring(0, maxContentLength) +
          "\n\n[Content truncated due to extreme length - document is over 1M characters]"
        : content;

    // Build prompt: use custom user prompt if provided; otherwise use backend default
    const userPrompt =
      typeof options?.prompt === "string" && options.prompt.trim().length > 0
        ? options.prompt.trim()
        : null;

    const baseInstruction = userPrompt
      ? `Follow the user's custom instructions for what to emphasize in the summary:\n\nCustom instructions: ${userPrompt}\n\nIf the custom instructions conflict with factual accuracy or document content, prioritize factual accuracy.`
      : `If no special instructions are provided, produce a balanced executive summary emphasizing key ideas, data, decisions, risks, timeline, stakeholders, and action items.`;

    const prompt = `You are a senior financial analyst working for top global investment firms such as BlackRock or Morgan Stanley. Your task is to analyze and summarize the given financial document or report in a deeply detailed, factual, and professional manner.

Document: ${filename}
Content: ${truncatedContent}

Follow these rules:

1. **Tone & Depth**
   - Maintain a professional, analytical, and insight-driven tone.
   - Use financial and economic terminology appropriately.
   - Focus on facts, trends, and numerical accuracy — avoid assumptions or opinions.
   - Highlight performance metrics, market implications, and investor sentiment indicators.

2. **Output Format**
   Structure your summary as follows:

   ## Executive Summary
   ## Key Financial Highlights
   - Revenue, profit, margin, growth rates, and YoY comparisons.
   - Segment-wise or business unit breakdown.
   - Any changes in cash flow, debt, or capital expenditure.

   ## Management Commentary / Outlook
   - Extract insights from management discussions, guidance, or future projections.
   - Identify risks, macroeconomic pressures, or tailwinds affecting performance.

   ## Ratio & Valuation Insights (if available)
   - Include data like P/E, ROE, EBITDA margin, debt-to-equity ratio, etc.
   - Compare trends with previous quarters or fiscal years.

   ## Market & Industry Context
   - Mention sector performance, competitor trends, or regulatory environment.
   - Identify external macroeconomic or geopolitical factors impacting results.

   ## Analyst Take
   - Offer a factual analysis of what these numbers imply.
   - Avoid generic summaries — provide insight into company strength, efficiency, or market position.

3. **Formatting Guidelines**
   - Use **bold** for key numbers, terms, and entities.
   - Use bullet points for clarity and comparisons.
   - Use markdown tables for quantitative data when possible.
   - Keep spacing and alignment clean for dashboard display.
   - Avoid verbose text or generic phrases — every line should add analytical value.

4. **Comprehensive Analysis Rules**
   - Do not omit ANY important information, data, figures, or arguments - be extremely thorough.
   - Preserve the logical flow of the document (headings, subheadings, and sections) exactly.
   - Condense repetitive or verbose text, but NEVER remove critical details.
   - If numbers, statistics, or research findings are included, ALWAYS retain them accurately in the summary.
   - Extract ALL relevant tables, lists, or structured content in a simplified format.
   - The final output should be coherent, factually accurate, and easy to navigate.
   - Treat every paragraph as potentially meaningful—summarize instead of skipping.
   - Make sure the summary acts as a comprehensive substitute for reading the full document, while strictly avoiding the loss of essential details.
   - Include ALL examples, case studies, and detailed explanations - don't skip them.
   - Be as detailed as possible while maintaining readability - err on the side of including more information.

${baseInstruction}

Guard rails (strict):
- Do not hallucinate facts, figures, entities, or relationships that are not present in the document.
- Do not infer industries, sectors, companies, or tags merely from a single mention of a word/name.
- Only reflect tags/entities when the document provides clear, substantive context (e.g., description, actions, roles, metrics, or relationships). Mere name-dropping is insufficient.
- If contextual relevance is not established, omit the tag/entity.

Formatting requirements (Markdown, strictly follow):
- Use GitHub-Flavored Markdown (GFM).
- Organize with clear section headings using '##' level: "Company Overview", "Financial Highlights", "Segment Performance", "Key Insights", and other relevant sections (e.g., "Outlook", "Risks", "Valuation").
- Use bullet points or numbered lists for details under each section.
- Insert blank lines between sections for readability.
- Separate paragraphs with a blank line. Do not run multiple paragraphs together.
- Highlight important numbers, metrics, or entities using **bold**.
- If data is tabular (e.g., quarterly metrics, segment breakups), render a proper Markdown table with headers and aligned columns.
- Do not include any surrounding code fences; return pure Markdown content only.

Your goal: deliver a **concise yet in-depth financial analysis** that could be presented in an investment meeting or internal research note.

Generate a comprehensive summary that maintains the document's essential information while condensing it to approximately ${targetWords} words.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a senior financial analyst working for top global investment firms such as BlackRock or Morgan Stanley. You specialize in creating comprehensive, detailed financial analyses that preserve all critical information while condensing lengthy documents. You maintain professional analytical standards, focus on facts and numerical accuracy, and deliver insights suitable for investment meetings or internal research notes.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: 20000, // Increased for very comprehensive summaries
    });

    const processingTime = Date.now() - startTime;
    const tokensUsed = response.usage?.total_tokens || 0;

    const summary = response.choices[0].message.content.trim();

    console.log(
      `[ComprehensiveSummary] Generated ${summary.length} character summary for ${filename} in ${processingTime}ms using ${tokensUsed} tokens`
    );
    console.log(
      `[ComprehensiveSummary] Target was ${targetWords} words (${targetSummaryPages} pages), actual summary: ${Math.round(
        summary.length / 5
      )} words`
    );

    return {
      summary,
      processing_metadata: {
        ai_model_used: "gpt-5-mini",
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
 * Process document content using OpenAI GPT-5-mini for summarization, tagging, and temporal extraction
 * @param {string} content - Raw document content
 * @param {string} filename - Original filename for context
 * @returns {Promise<Object>} - Processed document data
 */
export async function processDocumentWithAI(content, filename, options = {}) {
  try {
    if (!config.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    const startTime = Date.now();

    // Generate comprehensive summary first
    const summaryResult = await generateComprehensiveSummary(
      content,
      filename,
      { prompt: options?.prompt }
    );

    // Use full content for metadata extraction - GPT-5-mini can handle large documents
    // Only truncate if extremely large (over 1M chars) to prevent API issues
    const maxContentLength = 1000000; // 1M characters should be enough for most documents
    const truncatedContent =
      content.length > maxContentLength
        ? content.substring(0, maxContentLength) +
          "\n\n[Content truncated due to extreme length]"
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
- Extract actual companies/industries mentioned, not generic ones
- Do not add tags just because a term appears once; include tags only if the document provides clear contextual relevance (e.g., repeated discussion, definitions, roles, metrics, or relationships). If context is insufficient, omit the tag.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
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
      max_completion_tokens: 4000, // Increased for better metadata extraction
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

    // Validate and clean the response - generate separate comprehensive summary
    const processedData = {
      summary: summaryResult.summary, // Use comprehensive summary as the primary summary
      comprehensive_summary: summaryResult.summary, // This is already the comprehensive summary from generateComprehensiveSummary
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
        ai_model_used: "gpt-5-mini (comprehensive) + gpt-5-mini (metadata)",
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
 * Generate an answer to a question based on retrieved document content
 * @param {string} question - The question to answer
 * @param {string} context - Retrieved document content
 * @returns {Promise<string>} - Generated answer
 */
export async function generateAnswer(question, context) {
  try {
    if (!config.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    const prompt = `You are an expert document analyst. Answer the following question based ONLY on the provided document content. Be precise and factual.

Question: ${question}

Document Content:
${context}

Instructions:
1. Answer the question directly and concisely
2. Use only information from the provided documents
3. If the answer is not found in the documents, say "The answer is not available in the provided documents"
4. Include specific numbers, dates, and facts when available
5. Be accurate and don't make assumptions
6. Format your answer clearly and professionally

Answer:`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a precise document analyst who answers questions based only on provided content. Be factual and concise.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: 2000, // Increased for more detailed answers
      // Note: GPT-5-mini only supports default temperature (1)
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating answer:", error);
    throw new Error(`Failed to generate answer: ${error.message}`);
  }
}

/**
 * Process a complete document: AI analysis + embedding generation
 * @param {string} content - Raw document content
 * @param {string} filename - Original filename
 * @returns {Promise<Object>} - Complete processed document data
 */
export async function processCompleteDocument(content, filename, options = {}) {
  try {
    // Step 1: AI analysis
    const aiAnalysis = await processDocumentWithAI(content, filename, {
      prompt: options?.prompt,
    });

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

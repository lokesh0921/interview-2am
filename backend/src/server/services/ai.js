import { loadConfig } from "../util/config.js";

const config = loadConfig();

const defaultCategories = ["IT", "Pharma", "Auto", "Economics", "Other"];
const keywordMap = [
  {
    cat: "IT",
    words: [
      "software",
      "server",
      "api",
      "database",
      "backend",
      "frontend",
      "cloud",
      "devops",
    ],
  },
  {
    cat: "Pharma",
    words: [
      "drug",
      "clinical",
      "trial",
      "pharma",
      "medicine",
      "dose",
      "patient",
    ],
  },
  {
    cat: "Auto",
    words: ["vehicle", "engine", "electric", "battery", "autonomous", "tesla"],
  },
  {
    cat: "Economics",
    words: ["inflation", "gdp", "market", "economy", "finance", "stocks"],
  },
];

export async function categorizeText(text) {
  // Hugging Face zero-shot classification
  if (config.HUGGINGFACE_API_KEY) {
    try {
      const response = await fetch(
        "https://api-inference.huggingface.co/models/facebook/bart-large-mnli",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: text.slice(0, 4001),
            parameters: {
              candidate_labels: defaultCategories,
              multi_label: true,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.statusText}`);
      }

      const result = await response.json();

      // Check if we have a valid response
      if (result && result.labels && Array.isArray(result.labels)) {
        // Get top categories based on scores
        const scores = result.scores || [];
        const threshold = 0.2; // Minimum confidence threshold

        const selectedCategories = result.labels
          .filter((_, index) => scores[index] > threshold)
          .slice(0, 3); // Limit to top 3 categories

        if (selectedCategories.length > 0) {
          return selectedCategories;
        }
      }

      throw new Error("Invalid response format from Hugging Face API");
    } catch (error) {
      console.error("Hugging Face classification error:", error);
    }
  }

  // Fallback keyword-based
  const lc = text.toLowerCase();
  const cats = new Set();
  for (const { cat, words } of keywordMap) {
    if (words.some((w) => lc.includes(w))) cats.add(cat);
  }
  return cats.size ? Array.from(cats) : ["Other"];
}

// LEGACY FUNCTION - COMMENTED OUT DUE TO UNDEFINED VARIABLES
// This function had undefined variables (HF_MODEL_URL, HF_API_KEY, text) and was causing errors
// The working summarizeText function is defined below
/*
export async function summarizeText(text) {
  try {
    const response = await fetch(HF_MODEL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text,
        parameters: {
          max_length: 1500, // max summary length
          min_length: 400, // min summary length
          do_sample: false,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `HF API Error: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    return result[0]?.summary_text || "No summary generated";
  } catch (err) {
    console.error("Summarization failed:", err);
    throw err;
  }
}

(async () => {
  const summary = await summarizeText(text);
  console.log("Summary:\n", summary);
})();
*/

export async function summarizeText(text) {
  // Use Hugging Face BART model for summarization
  if (config.HUGGINGFACE_API_KEY) {
    try {
      // Handle empty or very short text
      if (!text || text.length < 50) {
        return text;
      }

      // Limit text length for API
      const inputText = text.slice(0, 8000);

      const response = await fetch(
        "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: inputText,
            parameters: {
              max_length: 150,
              min_length: 40,
              length_penalty: 2.0,
              num_beams: 4,
              early_stopping: true,
            },
          }),
        }
      );

      if (!response.ok) {
        console.error(
          `Hugging Face API error: ${response.status} ${response.statusText}`
        );
        // Fall through to fallback summary
      } else {
        const result = await response.json();

        // Handle different response formats
        if (Array.isArray(result) && result[0] && result[0].summary_text) {
          return result[0].summary_text;
        } else if (typeof result === "object" && result.summary_text) {
          return result.summary_text;
        } else if (result.generated_text) {
          return result.generated_text;
        } else if (result.error) {
          console.error(`Hugging Face API error: ${result.error}`);
          // Fall through to fallback summary
        } else {
          console.error(
            "Unexpected response format from Hugging Face API",
            result
          );
          // Fall through to fallback summary
        }
      }
    } catch (error) {
      console.error("Hugging Face summarization error:", error);
      // Fall through to fallback summary
    }
  } else {
    console.log("No Hugging Face API key found, using fallback summary");
  }

  // Fallback simple summary if Hugging Face API fails or key not available
  const firstSentences = text
    .split(/(?<=[.!?])\s+/)
    .slice(2, 5)
    .join(" ");
  return firstSentences || text.slice(0, 400);
}

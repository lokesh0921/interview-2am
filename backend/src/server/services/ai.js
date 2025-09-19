import OpenAI from "openai";
import { loadConfig } from "../util/config.js";

const config = loadConfig();
const openai = config.OPENAI_API_KEY
  ? new OpenAI({ apiKey: config.OPENAI_API_KEY })
  : null;

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
  // OpenAI structured classification
  if (openai) {
    try {
      const prompt = `Classify the following text into one or more of these categories: ${defaultCategories.join(
        ", "
      )}. Return a JSON array of categories only. Text:\n\n${text.slice(
        0,
        4000
      )}`;
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a classifier. Respond with JSON only.",
          },
          { role: "user", content: prompt },
        ],
      });
      const content = resp.choices[0]?.message?.content?.trim() || "[]";
      const cats = JSON.parse(content);
      if (Array.isArray(cats) && cats.length) return cats;
    } catch {}
  }
  // Fallback keyword-based
  const lc = text.toLowerCase();
  const cats = new Set();
  for (const { cat, words } of keywordMap) {
    if (words.some((w) => lc.includes(w))) cats.add(cat);
  }
  return cats.size ? Array.from(cats) : ["Other"];
}

export async function summarizeText(text) {
  if (openai) {
    try {
      const prompt = `Summarize the following text in 5-7 concise bullet points. Text:\n\n${text.slice(
        0,
        8000
      )}`;
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You write concise summaries." },
          { role: "user", content: prompt },
        ],
      });
      return resp.choices[0]?.message?.content?.trim() || "";
    } catch {}
  }
  // Fallback simple summary
  const firstSentences = text
    .split(/(?<=[.!?])\s+/)
    .slice(0, 3)
    .join(" ");
  return firstSentences || text.slice(0, 400);
}

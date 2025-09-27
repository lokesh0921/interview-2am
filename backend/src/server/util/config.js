import dotenv from "dotenv";

dotenv.config();

export function loadConfig() {
  return {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: Number(process.env.PORT || 4001),
    MONGODB_URI:
      process.env.MONGODB_URI || "mongodb://localhost:27017/ai_ingest",
    VECTOR_SEARCH_DB_URI:
      process.env.VECTOR_SEARCH_DB_URI ||
      "mongodb://localhost:27017/vector_search_db",
    SUPABASE_JWKS_URL: process.env.SUPABASE_JWKS_URL || "",
    SUPABASE_URL: process.env.SUPABASE_URL || "",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
    CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY || "",
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || "lokeshpawar721@gmail.com",
  };
}

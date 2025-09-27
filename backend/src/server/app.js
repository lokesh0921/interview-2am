import express from "express";
import morgan from "morgan";
import cors from "cors";
import { loadConfig } from "./util/config.js";
import { authMiddleware } from "./middleware/auth.js";
import uploadRouter from "./routes/upload.js";
import filesRouter from "./routes/files.js";
import adminRouter from "./routes/admin.js";
import authRouter from "./routes/auth.js";
import textRouter from "./routes/text.js";
import vectorSearchRouter from "./routes/vectorSearch.js";

const config = loadConfig();

const app = express();
app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api", authMiddleware.optional);
app.use("/api/auth", authMiddleware.required, authRouter);
app.use("/api/upload", authMiddleware.required, uploadRouter);
app.use("/api/files", authMiddleware.required, filesRouter);
app.use("/api/text", authMiddleware.required, textRouter);
app.use("/api/vector-search", authMiddleware.required, vectorSearchRouter);
app.use("/api/admin", authMiddleware.adminOnly, adminRouter);

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

export default app;

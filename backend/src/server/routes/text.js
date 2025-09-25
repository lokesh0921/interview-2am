import express from "express";
import { Upload } from "../models/Upload.js";

const router = express.Router();

/**
 * @route GET /api/text
 * @desc Fetch text data from MongoDB upload.text
 * @access Private
 */
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.user?.id || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { page = 1, limit = 20, q } = req.query;
    const filter = { userId };

    // Add text search if query parameter is provided
    if (q) filter.$text = { $search: q };

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Upload.find(filter, { text: 1, filename: 1, createdAt: 1, sourceType: 1 })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Upload.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (e) {
    next(e);
  }
});

// New route to get all text data (not user-specific)
router.get("/all", async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.user?.id || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { page = 1, limit = 20, q } = req.query;
    const filter = {};

    // Add text search if query parameter is provided
    if (q) filter.$text = { $search: q };

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Upload.find(filter, {
        text: 1,
        filename: 1,
        createdAt: 1,
        sourceType: 1,
        summary: 1,
        categories: 1,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Upload.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * @route GET /api/text/:id
 * @desc Fetch specific text data by ID
 * @access Private
 */
router.get("/:id", async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.user?.id || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const document = await Upload.findOne(
      { _id: id, userId },
      {
        text: 1,
        filename: 1,
        createdAt: 1,
        sourceType: 1,
        summary: 1,
        categories: 1,
      }
    );

    if (!document) {
      return res.status(404).json({ error: "Text document not found" });
    }

    res.json({ item: document });
  } catch (e) {
    next(e);
  }
});

export default router;

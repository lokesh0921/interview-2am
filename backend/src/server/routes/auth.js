import express from "express";

const router = express.Router();

router.get("/me", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  res.json({ user: req.user });
});

export default router;

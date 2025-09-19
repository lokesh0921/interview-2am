import express from 'express';
import { Upload } from '../models/Upload.js';

const router = express.Router();

router.get('/files', async (req, res, next) => {
	try {
		const { type, category, from, to, q, page = 1, limit = 20 } = req.query;
		const filter = {};
		if (type) filter.sourceType = type;
		if (category) filter.categories = category;
		if (from || to) {
			filter.createdAt = {};
			if (from) filter.createdAt.$gte = new Date(from);
			if (to) filter.createdAt.$lte = new Date(to);
		}
		if (q) filter.$text = { $search: q };
		const skip = (Number(page) - 1) * Number(limit);
		const [items, total] = await Promise.all([
			Upload.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
			Upload.countDocuments(filter)
		]);
		res.json({ items, total, page: Number(page), limit: Number(limit) });
	} catch (e) {
		next(e);
	}
});

router.get('/analytics', async (_req, res, next) => {
	try {
		const [count, byCategory] = await Promise.all([
			Upload.countDocuments({}),
			Upload.aggregate([
				{ $unwind: { path: '$categories', preserveNullAndEmptyArrays: true } },
				{ $group: { _id: '$categories', count: { $sum: 1 } } },
				{ $sort: { count: -1 } }
			])
		]);
		res.json({ totalUploads: count, categories: byCategory });
	} catch (e) {
		next(e);
	}
});

export default router;

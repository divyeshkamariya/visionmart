
import { Router } from "express";
import Product from "../models/Product.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

const router = Router();

const isValidId = (id) => /^[a-f\d]{24}$/i.test(id);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Only plain strings are accepted from the query string. This also blocks
// NoSQL operator injection such as ?category[$ne]=x.
const queryString = (value) =>
  typeof value === "string" ? value.trim().slice(0, 100) : "";

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  "price-asc": { price: 1, createdAt: -1 },
  "price-desc": { price: -1, createdAt: -1 },
};

// GET: List distinct categories of active products (used by the filter dropdown)
// Keep this route above "/:id".
router.get("/categories", async (_req, res, next) => {
  try {
    const categories = await Product.distinct("category", { isActive: true });

    res.json({ categories: categories.filter(Boolean).sort() });
  } catch (error) {
    next(error);
  }
});

// GET: Fetch active products with pagination, search, category filter and sorting
// Query: ?page=1&limit=12&search=watch&category=Electronics&sort=price-asc
router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Math.floor(Number(req.query.page)) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Math.floor(Number(req.query.limit)) || 12)
    );

    const search = queryString(req.query.search);
    const category = queryString(req.query.category);
    const sort = SORT_OPTIONS[queryString(req.query.sort)] || SORT_OPTIONS.newest;

    const filter = { isActive: true };

    if (category && category.toLowerCase() !== "all") {
      filter.category = category;
    }

    if (search) {
      filter.name = { $regex: escapeRegex(search), $options: "i" };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    res.json({
      count: products.length,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      products,
    });
  } catch (error) {
    next(error);
  }
});

// GET: Fetch one active product
router.get("/:id", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
});

// POST: Create product (admin only)
router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, description, price, image, category, stock } = req.body;

    if (
      typeof name !== "string" || !name.trim() ||
      typeof description !== "string" || !description.trim() ||
      typeof category !== "string" || !category.trim() ||
      typeof price !== "number" ||
      !Number.isFinite(price) || price < 0
    ) {
      return res.status(400).json({
        message: "Valid name, description, category and price are required.",
      });
    }

    const productStock = stock === undefined ? 0 : stock;

    if (
      typeof productStock !== "number" ||
      !Number.isInteger(productStock) ||
      productStock < 0
    ) {
      return res.status(400).json({
        message: "Stock must be a non-negative whole number.",
      });
    }

    if (
      image !== undefined &&
      (typeof image !== "string" || image.length > 1000)
    ) {
      return res.status(400).json({
        message: "Image must be a string of at most 1000 characters.",
      });
    }

    const product = await Product.create({
      name: name.trim(),
      description: description.trim(),
      price,
      image: image?.trim() || "",
      category: category.trim(),
      stock: productStock,
    });

    res.status(201).json({
      message: "Product created successfully.",
      product,
    });
  } catch (error) {
    next(error);
  }
});

// PUT: Update product (admin only)
router.put("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }

    const { name, description, price, image, category, stock } = req.body;

    if (
      typeof name !== "string" || !name.trim() ||
      typeof description !== "string" || !description.trim() ||
      typeof category !== "string" || !category.trim() ||
      typeof price !== "number" ||
      !Number.isFinite(price) || price < 0 ||
      typeof stock !== "number" ||
      !Number.isInteger(stock) || stock < 0 ||
      typeof image !== "string" || image.length > 1000
    ) {
      return res.status(400).json({
        message: "Please provide valid product details.",
      });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      {
        name: name.trim(),
        description: description.trim(),
        price,
        image: image.trim(),
        category: category.trim(),
        stock,
      },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.json({ message: "Product updated successfully.", product });
  } catch (error) {
    next(error);
  }
});

// DELETE: Soft-delete product (admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.json({ message: "Product deleted successfully." });
  } catch (error) {
    next(error);
  }
});

export default router;

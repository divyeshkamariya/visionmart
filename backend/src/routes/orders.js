
import { Router } from "express";
import mongoose from "mongoose";

import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

const router = Router();

// Helper: read ?page= and ?limit= safely.
function getPagination(query, defaultLimit = 20) {
  const page = Math.max(1, Math.floor(Number(query.page)) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Math.floor(Number(query.limit)) || defaultLimit)
  );

  return { page, limit, skip: (page - 1) * limit };
}

async function listOrders(filter, query) {
  const { page, limit, skip } = getPagination(query);

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  return {
    orders,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

// All order routes require login.
router.use(requireAuth);

// --------------------------------------------------
// GET /api/orders
// Get orders belonging to the logged-in customer.
// --------------------------------------------------
router.get("/", async (req, res, next) => {
  try {
    return res.json(await listOrders({ user: req.user.id }, req.query));
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// GET /api/orders/admin/all
// Admin only: get all orders.
// Keep this route before the dynamic order ID routes.
// --------------------------------------------------
router.get("/admin/all", requireAdmin, async (req, res, next) => {
  try {
    return res.json(await listOrders({}, req.query));
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// PATCH /api/orders/:orderId/status
// Admin only: move an order to its next status.
// --------------------------------------------------
router.patch(
  "/:orderId/status",
  requireAdmin,
  async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({
          message: "Invalid order ID.",
        });
      }

      const allowedStatuses = [
        "processing",
        "shipped",
        "delivered",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message:
            "Invalid status. Use processing, shipped or delivered.",
        });
      }

      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({
          message: "Order not found.",
        });
      }

      // Delivered and cancelled orders are final.
      if (
        order.status === "delivered" ||
        order.status === "cancelled"
      ) {
        return res.status(409).json({
          message: "This order can no longer be updated.",
        });
      }

      const statusOrder = {
        placed: 0,
        processing: 1,
        shipped: 2,
        delivered: 3,
      };

      // Prevent moving an order backwards or skipping stages.
      if (
        statusOrder[status] !== statusOrder[order.status] + 1
      ) {
        return res.status(409).json({
          message:
            "Order status must move forward one step at a time.",
        });
      }

      // Update only if the order is still in the expected previous status.
      // This avoids a race with a customer cancelling at the same moment.
      const updated = await Order.findOneAndUpdate(
        { _id: orderId, status: order.status },
        { status },
        { new: true }
      );

      if (!updated) {
        return res.status(409).json({
          message: "Order was changed by someone else. Refresh and try again.",
        });
      }

      return res.json({
        message: "Order status updated successfully.",
        order: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

// --------------------------------------------------
// PATCH /api/orders/:orderId/cancel
// Customer can cancel their own order while it is still "placed".
// Stock is returned to the products.
// --------------------------------------------------
router.patch("/:orderId/cancel", async (req, res, next) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    // Atomic: only one request can move the order from "placed" to "cancelled",
    // so stock can never be returned twice.
    const order = await Order.findOneAndUpdate(
      { _id: orderId, user: req.user.id, status: "placed" },
      { status: "cancelled" },
      { new: true }
    );

    if (!order) {
      return res.status(409).json({
        message:
          "This order cannot be cancelled. It may not exist, or it is already being processed.",
      });
    }

    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantity } }
      );
    }

    return res.json({
      message: "Order cancelled successfully.",
      order,
    });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// POST /api/orders
// Create an order using trusted database product data.
// --------------------------------------------------
router.post("/", async (req, res, next) => {
  const reservedProducts = [];

  try {
    const {
      items,
      customerName,
      phone,
      shippingAddress,
    } = req.body;

    const name = String(customerName ?? "").trim();
    const customerPhone = String(phone ?? "").replace(/[\s()-]/g, "");
    const address = String(shippingAddress ?? "").trim();

    if (!name || !customerPhone || !address) {
      return res.status(400).json({
        message:
          "Name, phone and delivery address are required.",
      });
    }

    if (!/^\+?\d{10,13}$/.test(customerPhone)) {
      return res.status(400).json({
        message:
          "Enter a valid phone number with 10-13 digits and an optional + country code.",
      });
    }

    if (name.length > 80 || address.length > 500) {
      return res.status(400).json({
        message: "Name or delivery address is too long.",
      });
    }

    if (
      !Array.isArray(items) ||
      items.length === 0 ||
      items.length > 100
    ) {
      return res.status(400).json({
        message: "Provide between 1 and 100 order items.",
      });
    }

    // Validate product IDs and quantities.
    const requestedItems = [];

    for (const item of items) {
      const productId = String(
        item?.productId ?? item?.id ?? ""
      );

      const quantity = Number(item?.quantity);

      if (
        !mongoose.Types.ObjectId.isValid(productId) ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 1000
      ) {
        return res.status(400).json({
          message:
            "One or more product IDs or quantities are invalid.",
        });
      }

      requestedItems.push({
        productId,
        quantity,
      });
    }

    // Combine duplicate product IDs for stock reservation.
    const quantitiesById = new Map();

    for (const item of requestedItems) {
      const current =
        quantitiesById.get(item.productId) || 0;

      quantitiesById.set(
        item.productId,
        current + item.quantity
      );
    }

    for (const quantity of quantitiesById.values()) {
      if (quantity > 1000) {
        return res.status(400).json({
          message: "Requested quantity is too large.",
        });
      }
    }

    // Fetch active products from MongoDB.
    const productIds = [...quantitiesById.keys()];

    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true,
    });

    const productMap = new Map(
      products.map((product) => [
        String(product._id),
        product,
      ])
    );

    // Reject missing, inactive or deleted products.
    for (const productId of productIds) {
      if (!productMap.has(productId)) {
        return res.status(400).json({
          message:
            "A product is unavailable. Refresh your cart and try again.",
        });
      }
    }

    // Atomically reserve stock for each requested product.
    for (const [productId, quantity] of quantitiesById) {
      const product = productMap.get(productId);

      const reserved = await Product.findOneAndUpdate(
        {
          _id: product._id,
          isActive: true,
          price: product.price,
          stock: { $gte: quantity },
        },
        {
          $inc: { stock: -quantity },
        },
        { new: true }
      );

      if (!reserved) {
        const error = new Error(
          "Product price or stock changed. Refresh your cart and try again."
        );

        error.status = 409;
        throw error;
      }

      reservedProducts.push({
        productId,
        quantity,
      });
    }

    // Build order items using trusted database values.
    const safeItems = requestedItems.map((item) => {
      const product = productMap.get(item.productId);

      return {
        productId: product._id,
        title: product.name,
        image: product.image || "",
        price: product.price,
        quantity: item.quantity,
      };
    });

    const total = Math.round(
      safeItems.reduce(
        (sum, item) =>
          sum + item.price * item.quantity,
        0
      )
    );

    const order = await Order.create({
      user: req.user.id,
      items: safeItems,
      customerName: name,
      phone: customerPhone,
      shippingAddress: address,
      total,
    });

    return res.status(201).json({
      message: "Order placed successfully.",
      order,
    });
  } catch (error) {
    // Restore reserved stock if order creation fails.
    for (const reserved of [...reservedProducts].reverse()) {
      try {
        await Product.updateOne(
          { _id: reserved.productId },
          { $inc: { stock: reserved.quantity } }
        );
      } catch (rollbackError) {
        console.error(
          "Stock rollback failed:",
          reserved.productId,
          rollbackError.message
        );
      }
    }

    if (error.status === 409) {
      return res.status(409).json({
        message: error.message,
      });
    }

    next(error);
  }
});

export default router;

import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        title: { type: String, required: true },
        image: { type: String, default: "" },
        price: { type: Number, min: 0, required: true },
        quantity: { type: Number, min: 1, required: true },
      },
    ],

    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    total: {
      type: Number,
      min: 0,
      required: true,
    },

    shippingAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    status: {
      type: String,
      index: true,
      enum: [
        "placed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "placed",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);

import "dotenv/config";
import { connectDB } from "../config/db.js";
import Product from "../models/Product.js";

const demoProducts = [
  { name: "Everyday Wireless Headphones", description: "Comfortable wireless headphones for music, calls and everyday listening.", price: 2499, image: "https://images.unsplash.com/photo-1508350558149-7a7a7c8a7a6c?auto=format&fit=crop&w=900&q=80", category: "Electronics", stock: 20 },
  { name: "Minimal Smart Watch", description: "A versatile everyday watch with a clean, modern design.", price: 3299, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80", category: "Accessories", stock: 15 },
  { name: "Daily Carry Tote Bag", description: "A practical tote bag for daily errands, work and weekends.", price: 899, image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=80", category: "Accessories", stock: 25 },
  { name: "Hydrating Skin Care Set", description: "A simple skin-care set for a refreshing daily routine.", price: 1199, image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=80", category: "Beauty", stock: 18 },
  { name: "Ceramic Coffee Mug", description: "A timeless ceramic mug for your morning coffee or evening tea.", price: 399, image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80", category: "Home", stock: 30 },
  { name: "Portable Bluetooth Speaker", description: "Compact speaker for music at home or on the go.", price: 1799, image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=80", category: "Electronics", stock: 12 },
  { name: "Classic Sunglasses", description: "Lightweight sunglasses with a versatile classic silhouette.", price: 699, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80", category: "Accessories", stock: 22 },
  { name: "Soft Throw Cushion", description: "A soft decorative cushion to add comfort to your living space.", price: 599, image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=900&q=80", category: "Home", stock: 16 },
];

try {
  await connectDB();
  let created = 0;
  for (const item of demoProducts) {
    const exists = await Product.exists({ name: item.name });
    if (!exists) {
      await Product.create(item);
      created += 1;
    }
  }
  console.log(`Seed complete. Added ${created} demo products; existing products were kept.`);
  process.exitCode = 0;
} catch (error) {
  console.error(`Product seeding failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  const mongoose = (await import("mongoose")).default;
  await mongoose.disconnect().catch(() => {});
}

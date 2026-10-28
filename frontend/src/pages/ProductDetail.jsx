import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";

import { CartContext } from "../context/CartContext";
import { formatINR } from "../utils/currency";
import { apiRequest } from "../utils/api";

function ProductDetails() {
  const { id } = useParams();
  const { addToCart } = useContext(CartContext);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      try {
        setLoading(true);
        setError("");
        setProduct(null);

        const data = await apiRequest(`/products/${id}`, {
          signal: controller.signal,
        });

        const item = data.product;

        setProduct({
          ...item,
          id: item._id,
          title: item.name,
          thumbnail: item.image || "",
          rating: item.rating ?? 0,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to load product.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => controller.abort();
  }, [id]);

  if (loading) {
    return <h2 className="loading">Loading product...</h2>;
  }

  if (error || !product) {
    return (
      <section className="details-page">
        <h2>{error || "Product not found."}</h2>
      </section>
    );
  }

  return (
    <section className="details-page">
      <div className="details-image">
        <img
          src={product.thumbnail || "/placeholder.png"}
          alt={product.title}
        />
      </div>

      <div className="details-content">
        <h1>{product.title}</h1>

        <p>Category: {product.category}</p>
        <p>⭐ {product.rating}</p>

        <h2>{formatINR(product.price)}</h2>

        <p>{product.description}</p>
        <p>Available: {product.stock}</p>

        <button
          onClick={() => addToCart(product)}
          className="cart-btn"
          disabled={product.stock <= 0}
        >
          {product.stock <= 0 ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
    </section>
  );
}

export default ProductDetails;
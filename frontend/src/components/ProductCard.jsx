import { Link } from "react-router-dom";
import { useContext } from "react";
import { CartContext } from "../context/CartContext";
import { formatINR } from "../utils/currency";

function ProductCard({ product }) {
  const { addToCart, toggleWishlist, isWishlisted } = useContext(CartContext);
  const saved = isWishlisted(product.id);

  return (
    <article className="product-card">
      <img src={product.thumbnail} alt={product.title} loading="lazy" />
      <div className="product-info">
        <h3>{product.title}</h3>
        <p className="category">{product.category}</p>
        <p className="price">{formatINR(product.price)}</p>
        <p>⭐ {product.rating ?? "No rating"}</p>
        <div className="product-buttons">
          <Link to={`/products/${product.id}`} className="details-btn">Details</Link>
          <button onClick={() => addToCart(product)} className="cart-btn">Add to Cart</button>
          <button
            onClick={() => toggleWishlist(product)}
            className="wishlist-btn"
            aria-label={saved ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
            aria-pressed={saved}
          >{saved ? "♥ Saved" : "♡ Wishlist"}</button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;

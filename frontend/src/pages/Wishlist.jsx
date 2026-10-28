import { useContext } from "react";
import { Link } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { formatINR } from "../utils/currency";

function Wishlist() {
  const { wishlist, removeFromWishlist, addToCart } = useContext(CartContext);

  if (wishlist.length === 0) {
    return <section className="simple-page"><h1>My Wishlist</h1><p>Your wishlist is empty. Save products you like to find them here.</p><Link to="/products">Browse Products</Link></section>;
  }

  return (
    <section className="products-page">
      <h1>My Wishlist ({wishlist.length})</h1>
      <div className="products-grid">
        {wishlist.map((product) => (
          <article className="product-card" key={product.id}>
            <img src={product.thumbnail} alt={product.title} loading="lazy" />
            <div className="product-info">
              <h3>{product.title}</h3><p className="category">{product.category}</p><p className="price">{formatINR(product.price)}</p>
              <div className="product-buttons">
                <Link to={`/products/${product.id}`} className="details-btn">Details</Link>
                <button className="cart-btn" onClick={() => addToCart(product)}>Add to Cart</button>
                <button className="remove-btn" onClick={() => removeFromWishlist(product.id)}>Remove</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Wishlist;

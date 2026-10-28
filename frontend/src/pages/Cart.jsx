
import { useContext } from "react";
import { Link } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { formatINR, getINRValue } from "../utils/currency";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function Cart() {
  const { cart, increase, decrease, removeFromCart } =
    useContext(CartContext);

  const total = cart.reduce(
    (sum, item) =>
      sum + getINRValue(item.price) * item.quantity,
    0
  );

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  if (cart.length === 0) {
    return (
      <section className="empty-cart">
        <div className="empty-cart-icon" aria-hidden="true">
          🛍️
        </div>
        <h1>Your Cart is Empty</h1>
        <p>
          Looks like you haven't added anything yet.
          Explore our collection and find something you love!
        </p>
        <Link to="/products" className="checkout-btn">
          Continue Shopping
        </Link>
      </section>
    );
  }

  return (
    <section className="cart-page">
      <div className="cart-header">
        <div>
          <span className="section-kicker">YOUR SHOPPING BAG</span>
          <h1>Shopping Cart</h1>
          <p>
            {totalItems} {totalItems === 1 ? "item" : "items"} in your cart
          </p>
        </div>

        <Link to="/products" className="text-link">
          ← Continue Shopping
        </Link>
      </div>

      <div className="cart-container">
        <div className="cart-items-list">
          {cart.map((item) => (
            <article className="cart-item" key={item.id}>
              <div className="cart-item-image">
                <img
                  src={
                    item.thumbnail ||
                    "https://placehold.co/240x240?text=VisionMart"
                  }
                  alt={item.title || "Product"}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src =
                      "https://placehold.co/240x240?text=No+Image";
                  }}
                />
              </div>

              <div className="cart-item-details">
                <h3>{item.title}</h3>

                <p className="cart-unit-price">
                  Unit price: {formatINR(item.price)}
                </p>

                <p className="cart-item-subtotal">
                  Subtotal:{" "}
                  <strong>
                    {inrFormatter.format(
                      getINRValue(item.price) * item.quantity
                    )}
                  </strong>
                </p>

                <div className="quantity">
                  <button
                    type="button"
                    onClick={() => decrease(item.id)}
                    disabled={item.quantity <= 1}
                    aria-label={`Decrease ${item.title} quantity`}
                  >
                    −
                  </button>

                  <span aria-live="polite">{item.quantity}</span>

                  <button
                    type="button"
                    onClick={() => increase(item.id)}
                    disabled={
                      Number.isFinite(Number(item.stock)) &&
                      item.quantity >= Number(item.stock)
                    }
                    aria-label={`Increase ${item.title} quantity`}
                  >
                    +
                  </button>
                </div>

                {Number.isFinite(Number(item.stock)) &&
                  Number(item.stock) <= 0 && (
                    <p role="alert" className="error-message">
                      This product is currently out of stock.
                    </p>
                  )}

                <button
                  type="button"
                  onClick={() => removeFromCart(item.id)}
                  className="remove-btn"
                  aria-label={`Remove ${item.title} from cart`}
                >
                  Remove item
                </button>
              </div>
            </article>
          ))}
        </div>

        <aside className="cart-total">
          <h2>Order Summary</h2>

          <div className="cart-summary-row">
            <span>Items</span>
            <span>{totalItems}</span>
          </div>

          <div className="cart-summary-row">
            <span>Subtotal</span>
            <span>{inrFormatter.format(total)}</span>
          </div>

          <div className="cart-summary-row">
            <span>Shipping</span>
            <span>Calculated at checkout</span>
          </div>

          <div className="cart-summary-total">
            <strong>Total</strong>
            <strong>{inrFormatter.format(total)}</strong>
          </div>

          <p className="cart-summary-note">
            Final pricing and stock availability should be verified at checkout.
          </p>

          <Link to="/checkout" className="checkout-btn">
            Proceed to Checkout →
          </Link>

          <Link to="/products" className="cart-continue-link">
            Continue Shopping
          </Link>
        </aside>
      </div>
    </section>
  );
}

export default Cart;
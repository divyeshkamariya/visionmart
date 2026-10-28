
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { getINRValue } from "../utils/currency";
import { apiRequest } from "../utils/api";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function Checkout() {
  const { cart, clearCart } = useContext(CartContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const total = cart.reduce(
    (sum, item) =>
      sum + getINRValue(item.price) * item.quantity,
    0
  );

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setError("");

    if (cart.length === 0) {
      setError("Your cart is empty. Add products before checkout.");
      return;
    }

    const name = form.name.trim();
    const phone = form.phone.replace(/[\s()-]/g, "");
    const address = form.address.trim();

    if (!name || !phone || !address) {
      setError("Please complete all delivery details.");
      return;
    }

    if (!/^\+?\d{10,13}$/.test(phone)) {
      setError(
        "Enter a valid phone number containing 10–13 digits, with an optional + country code."
      );
      return;
    }

    if (name.length > 80 || address.length > 500) {
      setError("Please check the length of your delivery details.");
      return;
    }

    const items = cart.map((item) => ({
      productId: String(item.productId ?? item.id ?? item._id ?? ""),
      quantity: Number(item.quantity),
    }));

    const invalidItem = items.some(
      (item) =>
        !item.productId ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
    );

    if (invalidItem) {
      setError(
        "One or more cart items are invalid. Remove them and add the products again."
      );
      return;
    }

    setLoading(true);

    try {
      await apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify({
          items,
          customerName: name,
          phone,
          shippingAddress: address,
        }),
      });

      clearCart();
      navigate("/orders", { replace: true });
    } catch (err) {
      setError(
        err.message || "Unable to place your order. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (cart.length === 0) {
    return (
      <section className="checkout-page">
        <h1>Checkout</h1>
        <p>Your cart is empty.</p>
        <Link to="/products">Browse Products</Link>
      </section>
    );
  }

  return (
    <section className="checkout-page">
      <form className="checkout-form" onSubmit={handleSubmit}>
        <h1>Checkout</h1>

        <div className="checkout-summary">
          <p className="checkout-total">
            Order total: <strong>{inrFormatter.format(total)}</strong>
          </p>
          <p>
            {totalItems} {totalItems === 1 ? "item" : "items"} in your order
          </p>
        </div>

        <label htmlFor="checkout-name">Full Name</label>
        <input
          id="checkout-name"
          type="text"
          name="name"
          autoComplete="name"
          minLength={2}
          maxLength={80}
          required
          value={form.name}
          onChange={handleChange}
          placeholder="Enter your full name"
        />

        <label htmlFor="checkout-phone">Phone Number</label>
        <input
          id="checkout-phone"
          type="tel"
          name="phone"
          autoComplete="tel"
          maxLength={18}
          required
          value={form.phone}
          onChange={handleChange}
          placeholder="10-digit phone number"
        />

        <label htmlFor="checkout-address">Delivery Address</label>
        <textarea
          id="checkout-address"
          name="address"
          autoComplete="street-address"
          minLength={10}
          maxLength={500}
          required
          rows={4}
          value={form.address}
          onChange={handleChange}
          placeholder="House number, street, area, city and PIN code"
        />

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Placing Order..." : "Place Order"}
        </button>

        <p className="demo-note">
          Demo checkout only. No payment is collected.
          Product prices and stock must be verified by the server.
        </p>

        <Link to="/cart" className="cart-continue-link">
          ← Back to Cart
        </Link>
      </form>
    </section>
  );
}

export default Checkout;
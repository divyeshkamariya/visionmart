import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../utils/api";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [cancellingId, setCancellingId] = useState("");
  const [notice, setNotice] = useState("");

  const fetchOrders = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setError("");

        const data = await apiRequest(`/orders?page=${page}&limit=10`, {
          signal,
        });

        setOrders(data.orders || []);
        setTotal(data.total ?? (data.orders || []).length);
        setPages(data.pages ?? 1);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to load your orders.");
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    },
    [page],
  );

  async function handleCancel(orderId) {
    if (!window.confirm("Cancel this order? This cannot be undone.")) {
      return;
    }

    setNotice("");
    setCancellingId(orderId);

    try {
      await apiRequest(`/orders/${orderId}/cancel`, {
        method: "PATCH",
      });

      setNotice("Order cancelled successfully.");
      setRetryKey((key) => key + 1);
    } catch (err) {
      setNotice(err.message || "Could not cancel this order.");
    } finally {
      setCancellingId("");
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders(controller.signal);

    return () => controller.abort();
  }, [fetchOrders, retryKey]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount ?? 0);

  const formatDate = (date) => {
    if (!date) return "Not available";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Not available";
    }

    return parsedDate.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (loading) {
    return (
      <section className="orders-page">
        <h1>My Orders</h1>
        <p role="status">Loading your orders...</p>
      </section>
    );
  }

  return (
    <section className="orders-page">
      <h1>My Orders</h1>

      {error ? (
        <div className="form-error" role="alert">
          <p>{error}</p>

          {/* Small Try Again Button */}
          <button
            type="button"
            className="orders-retry-btn"
            onClick={() => setRetryKey((key) => key + 1)}
          >
            Try Again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <h2>No orders yet</h2>
          <p>Your placed orders will appear here.</p>
          <Link to="/products">Browse Products</Link>
        </div>
      ) : (
        <>
          <p>{total} order(s) found</p>

          {notice && (
            <p className="form-error" role="status">
              {notice}
            </p>
          )}

          <div className="orders-list">
            {orders.map((order) => (
              <article className="order-card" key={order._id}>
                <h3>Order #{order._id}</h3>

                <p>
                  <strong>Order Date:</strong> {formatDate(order.createdAt)}
                </p>

                <p>
                  <strong>Customer:</strong> {order.customerName}
                </p>

                <p>
                  <strong>Phone:</strong> {order.phone}
                </p>

                <p>
                  <strong>Delivery Address:</strong> {order.shippingAddress}
                </p>

                <h4>Products</h4>

                {order.items?.map((item, index) => (
                  <div
                    className="order-product"
                    key={`${order._id}-${item.productId}-${index}`}
                  >
                    <p>
                      <strong>{item.title}</strong>
                    </p>

                    <p>Price: {formatCurrency(item.price)}</p>

                    <p>Quantity: {item.quantity}</p>

                    <p>
                      Subtotal: {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                ))}

                <p className="order-total">
                  Total: <strong>{formatCurrency(order.total)}</strong>
                </p>

                <p className="order-status">
                  <strong>Status:</strong>{" "}
                  {(order.status || "placed").toUpperCase()}
                </p>

                {order.status === "placed" && (
                  <div className="order-actions">
                    <button
                      type="button"
                      className="cancel-order-btn"
                      onClick={() => handleCancel(order._id)}
                      disabled={cancellingId === order._id}
                    >
                      {cancellingId === order._id
                        ? "Cancelling..."
                        : "Cancel order"}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>

          {pages > 1 && (
            <nav className="pagination" aria-label="Order pages">
              <button
                type="button"
                onClick={() => setPage((current) => current - 1)}
                disabled={page <= 1}
              >
                ← Previous
              </button>

              <span>
                Page {page} of {pages}
              </span>

              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={page >= pages}
              >
                Next →
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

export default Orders;

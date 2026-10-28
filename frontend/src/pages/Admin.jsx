
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../utils/api";
import "./Admin.css";

const emptyForm = {
  name: "",
  category: "Electronics",
  price: "",
  stock: "",
  image: "",
  description: "",
};

function normalizeProduct(product) {
  return {
    ...product,
    id: product._id,
    name: product.name || "",
    category: product.category || "Other",
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
    image: product.image || "",
    description: product.description || "",
  };
}

export default function Admin() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadProducts() {
    try {
      setLoading(true);
      // The API is paginated (max 100 per page). Admin needs the full
      // inventory for search and totals, so load every page.
      const first = await apiRequest("/products?limit=100&page=1");
      let all = first.products || [];

      if ((first.pages || 1) > 1) {
        const rest = await Promise.all(
          Array.from({ length: first.pages - 1 }, (_, index) =>
            apiRequest(`/products?limit=100&page=${index + 2}`)
          )
        );

        all = all.concat(...rest.map((data) => data.products || []));
      }

      setProducts(all.map(normalizeProduct));
    } catch (error) {
      setNotice(error.message || "Could not load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Loading is an async side effect; state updates happen after the API responds.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
    );
  }, [products, search]);

  const inventoryValue = products.reduce(
    (total, product) => total + product.price * product.stock,
    0
  );

  const lowStock = products.filter((product) => product.stock < 5).length;

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice("");

    const price = Number(form.price);
    const stock = Number(form.stock);

    if (
      !form.name.trim() ||
      !form.description.trim() ||
      !form.category.trim() ||
      form.price === "" ||
      !Number.isFinite(price) ||
      price < 0 ||
      form.stock === "" ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      setNotice("Please enter valid product details.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      price,
      stock,
      image: form.image.trim(),
    };

    try {
      setSaving(true);

      if (editingId) {
        await apiRequest(`/products/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNotice("Product updated successfully!");
      } else {
        await apiRequest("/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("Product added successfully!");
      }

      resetForm();
      await loadProducts();
    } catch (error) {
      setNotice(error.message || "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  function editProduct(product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
      image: product.image,
      description: product.description,
    });
    setNotice("");
    document.getElementById("admin-form")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  async function deleteProduct(id) {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    setNotice("");

    try {
      await apiRequest(`/products/${id}`, { method: "DELETE" });

      if (editingId === id) resetForm();

      setNotice("Product deleted successfully!");
      await loadProducts();
    } catch (error) {
      setNotice(error.message || "Could not delete product.");
    }
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <a className="admin-logo" href="/">
          Vision<span>Mart</span>
          <small>ADMIN PANEL</small>
        </a>

        <p className="admin-nav-heading">WORKSPACE</p>
        <a className="admin-nav active" href="#dashboard">
          <span>▦</span> Dashboard
        </a>
        <a className="admin-nav" href="#inventory">
          <span>▤</span> Products
        </a>
        <a className="admin-nav" href="#admin-form">
          <span>＋</span> Add Product
        </a>

        <div className="admin-profile">
          <div className="admin-avatar">VM</div>
          <div>
            <strong>Store Admin</strong>
            <small>VisionMart Store</small>
          </div>
        </div>
      </aside>

      <main className="admin-main" id="dashboard">
        <header className="admin-header">
          <div>
            <p className="admin-eyebrow">STORE MANAGEMENT</p>
            <h1>Admin Dashboard</h1>
            <p className="admin-subtitle">
              Welcome back! Manage your store inventory.
            </p>
          </div>
          <a className="admin-store-link" href="/">
            ← View Store
          </a>
        </header>

        <section className="admin-stats">
          <article className="admin-stat">
            <div className="stat-icon">▤</div>
            <p>Total Products</p>
            <h2>{products.length}</h2>
            <small>Active products in catalogue</small>
          </article>

          <article className="admin-stat">
            <div className="stat-icon gold">＄</div>
            <p>Inventory Value</p>
            <h2>
              ${inventoryValue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h2>
            <small>Price × stock quantity</small>
          </article>

          <article className="admin-stat">
            <div className="stat-icon warning">!</div>
            <p>Low Stock Items</p>
            <h2>{lowStock}</h2>
            <small>Products with fewer than 5 units</small>
          </article>
        </section>

        <section className="admin-card" id="admin-form">
          <div className="admin-card-heading">
            <div>
              <p className="admin-eyebrow">PRODUCT CATALOGUE</p>
              <h2>{editingId ? "Edit Product" : "Add New Product"}</h2>
            </div>
            {editingId && (
              <button
                type="button"
                className="admin-btn secondary"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            <label>
              Product Name *
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                maxLength="150"
                required
              />
            </label>

            <label>
              Category *
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                required
              >
                <option>Electronics</option>
                <option>Fashion</option>
                <option>Accessories</option>
                <option>Home</option>
                <option>Beauty</option>
                <option>Sports</option>
                <option>Other</option>
              </select>
            </label>

            <label>
              Price (USD) *
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Stock Quantity *
              <input
                name="stock"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={handleChange}
                required
              />
            </label>

            <label className="form-wide">
              Product Image URL
              <input
                name="image"
                type="url"
                value={form.image}
                onChange={handleChange}
                maxLength="1000"
                placeholder="https://example.com/image.jpg"
              />
            </label>

            <label className="form-wide">
              Description *
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                maxLength="2000"
                rows="3"
                required
              />
            </label>

            <div className="admin-form-actions">
              <button
                className="admin-btn primary"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "＋ Add Product"}
              </button>

              <button
                className="admin-btn secondary"
                type="button"
                onClick={() => {
                  resetForm();
                  setNotice("");
                }}
              >
                Clear Form
              </button>
            </div>
          </form>

          {notice && (
            <p className="admin-notice" role="status">
              {notice}
            </p>
          )}
        </section>

        <section className="admin-card" id="inventory">
          <div className="admin-card-heading inventory-heading">
            <div>
              <p className="admin-eyebrow">INVENTORY MANAGEMENT</p>
              <h2>
                All Products{" "}
                <span className="product-count">{products.length}</span>
              </h2>
            </div>

            <input
              className="admin-search"
              type="search"
              placeholder="Search products..."
              aria-label="Search products"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {loading ? (
            <p role="status">Loading products...</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="admin-product">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="admin-image-placeholder">VM</div>
                          )}
                          <div>
                            <strong>{product.name}</strong>
                            <small>{product.description || "No description"}</small>
                          </div>
                        </div>
                      </td>

                      <td>{product.category}</td>
                      <td>${product.price.toFixed(2)}</td>
                      <td>{product.stock}</td>

                      <td>
                        <span
                          className={`admin-status ${
                            product.stock < 5 ? "low" : "in-stock"
                          }`}
                        >
                          {product.stock < 5 ? "Low Stock" : "In Stock"}
                        </span>
                      </td>

                      <td>
                        <div className="admin-actions">
                          <button
                            type="button"
                            onClick={() => editProduct(product)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => deleteProduct(product.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!filteredProducts.length && (
                    <tr>
                      <td colSpan="6" className="admin-empty">
                        {products.length
                          ? "No products found. Try another search."
                          : "No active products yet. Add your first product above."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <p className="admin-footnote">
            Products are managed through the VisionMart backend API.
          </p>
        </section>
      </main>
    </div>
  );
}

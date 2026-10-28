import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { apiRequest } from "../utils/api";

const PAGE_SIZE = 12;

function Products() {
  // Filters live in the URL (?search=&category=&sort=&page=) so that
  // refresh, back button and shared links all keep working.
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSearch = searchParams.get("search") || "";
  const category = searchParams.get("category") || "all";
  const sort = searchParams.get("sort") || "newest";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const updateParams = useCallback(
    (changes) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);

          for (const [key, value] of Object.entries(changes)) {
            const isDefault =
              value === "" ||
              value == null ||
              (key === "category" && value === "all") ||
              (key === "sort" && value === "newest") ||
              (key === "page" && Number(value) === 1);

            if (isDefault) next.delete(key);
            else next.set(key, String(value));
          }

          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Wait a moment after typing before searching (avoids a request per keystroke).
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();

      if (trimmed !== urlSearch) {
        updateParams({ search: trimmed, page: 1 });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput, urlSearch, updateParams]);

  // Category list for the dropdown.
  useEffect(() => {
    const controller = new AbortController();

    apiRequest("/products/categories", { signal: controller.signal })
      .then((data) => setCategories(data.categories || []))
      .catch(() => {
        // The dropdown simply stays on "All categories".
      });

    return () => controller.abort();
  }, []);

  // Products for the current filters and page.
  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const query = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          sort,
        });

        if (urlSearch) query.set("search", urlSearch);
        if (category !== "all") query.set("category", category);

        const data = await apiRequest(`/products?${query}`, {
          signal: controller.signal,
        });

        setProducts(
          (data.products || []).map((product) => ({
            ...product,
            id: product._id,
            title: product.name,
            thumbnail: product.image || "",
            rating: product.rating ?? 0,
          }))
        );
        setTotal(data.total ?? 0);
        setPages(data.pages ?? 1);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Something went wrong while loading products.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => controller.abort();
  }, [urlSearch, category, sort, page, retryKey]);

  function goToPage(nextPage) {
    updateParams({ page: nextPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <section className="products-page">
      <h1>Our Products</h1>

      <div className="product-filters">
        <input
          type="search"
          placeholder="Search products..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="search-box"
          aria-label="Search products"
        />

        <select
          value={category}
          onChange={(e) => updateParams({ category: e.target.value, page: 1 })}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => updateParams({ sort: e.target.value, page: 1 })}
          aria-label="Sort products"
        >
          <option value="newest">Sort: Newest</option>
          <option value="price-asc">Price: Low to high</option>
          <option value="price-desc">Price: High to low</option>
        </select>
      </div>

      {loading && <p role="status">Loading products...</p>}

      {!loading && error && (
        <div className="error-state" role="alert">
          <p>{error}</p>
          <button onClick={() => setRetryKey((key) => key + 1)}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <p className="empty-state">
          No products found. Try another search or category.
        </p>
      )}

      {!loading && !error && products.length > 0 && (
        <p className="results-count">
          Showing {products.length} of {total} product(s)
        </p>
      )}

      <div className="products-grid">
        {!loading &&
          !error &&
          products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
      </div>

      {!loading && !error && pages > 1 && (
        <nav className="pagination" aria-label="Product pages">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
          >
            ← Previous
          </button>

          <span>
            Page {page} of {pages}
          </span>

          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= pages}
          >
            Next →
          </button>
        </nav>
      )}
    </section>
  );
}

export default Products;

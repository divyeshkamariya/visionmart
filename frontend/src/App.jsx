import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./ProtectedRoute";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import ErrorBoundary from "./components/ErrorBoundary";

// Admin panel is only needed by admins, so load it on demand.
const Admin = lazy(() => import("./pages/Admin"));

function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <>
      {!isAdmin && <Navbar />}
      <main>
        <ErrorBoundary>
          <Suspense fallback={<p role="status">Loading...</p>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/orders" element={<Orders />} />
              </Route>
              <Route element={<ProtectedRoute requiredRole="admin" />}>
                <Route path="/admin" element={<Admin />} />
              </Route>
              <Route
                path="*"
                element={
                  <section className="empty-state">
                    <h1>Page not found</h1>
                    <p>The page you requested does not exist.</p>
                  </section>
                }
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      {!isAdmin && <Footer />}
    </>
  );
}

export default App;

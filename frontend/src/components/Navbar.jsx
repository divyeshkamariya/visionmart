import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { CartContext } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { cart = [] } = useContext(CartContext);
  const { isLoggedIn, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const cartCount = cart.reduce(
    (total, item) => total + (Number(item.quantity) || 0),
    0
  );

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <nav className="navbar">
      <div className="logo">
        <Link to="/">VisionMart</Link>
      </div>

      <div className="pages">
        <Link to="/">Home</Link>
        <Link to="/products">Products</Link>
        <Link to="/wishlist">Wishlist</Link>
        <Link to="/cart">Cart ({cartCount})</Link>

        {isLoggedIn && <Link to="/orders">Orders</Link>}
        {isLoggedIn && isAdmin && <Link to="/admin">Admin</Link>}

        {isLoggedIn ? (
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
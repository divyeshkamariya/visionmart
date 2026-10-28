
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useEffect,
  useReducer,
  useState,
} from "react";

export const CartContext = createContext();

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getProductId(product) {
  return product?.id ?? product?._id;
}

function normalizeCart(cart) {
  if (!Array.isArray(cart)) return [];

  return cart
    .filter((item) => item && getProductId(item) != null)
    .map((item) => {
      const stock = Number(item.stock);
      const hasStockLimit =
        item.stock !== undefined &&
        item.stock !== null &&
        item.stock !== "";

      const maxQuantity = hasStockLimit
        ? Math.max(0, Number.isFinite(stock) ? stock : 0)
        : Infinity;

      const requestedQuantity = Math.max(
        1,
        Math.floor(Number(item.quantity) || 1)
      );

      return {
        ...item,
        id: getProductId(item),
        quantity: Math.min(requestedQuantity, maxQuantity),
      };
    })
    .filter((item) => item.quantity > 0);
}

function getMaxQuantity(product) {
  if (
    product.stock === undefined ||
    product.stock === null ||
    product.stock === ""
  ) {
    return Infinity;
  }

  const stock = Number(product.stock);

  if (!Number.isFinite(stock)) return 0;

  return Math.max(0, Math.floor(stock));
}

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_TO_CART": {
      const product = action.payload;
      const id = getProductId(product);

      if (id == null || getMaxQuantity(product) < 1) {
        return state;
      }

      const existing = state.find((item) => item.id === id);

      if (existing) {
        const maxQuantity = getMaxQuantity({
          ...existing,
          ...product,
        });

        if (existing.quantity >= maxQuantity) {
          return state;
        }

        return state.map((item) =>
          item.id === id
            ? {
                ...item,
                ...product,
                id,
                quantity: Math.min(
                  item.quantity + 1,
                  maxQuantity
                ),
              }
            : item
        );
      }

      return [
        ...state,
        {
          ...product,
          id,
          quantity: 1,
        },
      ];
    }

    case "REMOVE_FROM_CART":
      return state.filter((item) => item.id !== action.payload);

    case "INCREASE":
      return state.map((item) => {
        if (item.id !== action.payload) return item;

        const maxQuantity = getMaxQuantity(item);

        if (item.quantity >= maxQuantity) return item;

        return {
          ...item,
          quantity: Math.min(item.quantity + 1, maxQuantity),
        };
      });

    case "DECREASE":
      return state
        .map((item) =>
          item.id === action.payload
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0);

    case "CLEAR_CART":
      return [];

    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(
    cartReducer,
    undefined,
    () => normalizeCart(readStorage("visionmart-cart", []))
  );

  const [wishlist, setWishlist] = useState(() => {
    const stored = readStorage("visionmart-wishlist", []);

    if (!Array.isArray(stored)) return [];

    return stored.filter(
      (item) => item && getProductId(item) != null
    );
  });

  useEffect(() => {
    try {
      localStorage.setItem("visionmart-cart", JSON.stringify(cart));
    } catch (error) {
      console.error("Unable to save cart:", error);
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "visionmart-wishlist",
        JSON.stringify(wishlist)
      );
    } catch (error) {
      console.error("Unable to save wishlist:", error);
    }
  }, [wishlist]);

  const addToCart = useCallback((product) => {
    dispatch({ type: "ADD_TO_CART", payload: product });
  }, []);

  const removeFromCart = useCallback((id) => {
    dispatch({ type: "REMOVE_FROM_CART", payload: id });
  }, []);

  const increase = useCallback((id) => {
    dispatch({ type: "INCREASE", payload: id });
  }, []);

  const decrease = useCallback((id) => {
    dispatch({ type: "DECREASE", payload: id });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const toggleWishlist = useCallback((product) => {
    const id = getProductId(product);

    if (id == null) return;

    setWishlist((current) =>
      current.some((item) => getProductId(item) === id)
        ? current.filter((item) => getProductId(item) !== id)
        : [...current, { ...product, id }]
    );
  }, []);

  const removeFromWishlist = useCallback((id) => {
    setWishlist((current) =>
      current.filter((item) => getProductId(item) !== id)
    );
  }, []);

  const isWishlisted = useCallback(
    (id) => wishlist.some((item) => getProductId(item) === id),
    [wishlist]
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        increase,
        decrease,
        clearCart,
        wishlist,
        toggleWishlist,
        removeFromWishlist,
        isWishlisted,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
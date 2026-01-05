import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  /* =======================
     LOAD / SAVE
  ======================= */
  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem("cart");
        if (raw) setCart(JSON.parse(raw));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("cart", JSON.stringify(cart)).catch(() => {});
  }, [cart]);

  /* =======================
     ADD TO CART
  ======================= */
  const addToCart = (product, qty = 1) => {
    setCart((prev) => {
      const id = product.id ?? product._id;
      const found = prev.find((p) => (p.id ?? p._id) === id);

      const stock = product.stock ?? null;
      const addQty = Number(qty || 1);

      // 🔑 PRIX UTILISÉ (promo ou normal)
      const unitPrice =
        product.finalPrice != null
          ? Number(product.finalPrice)
          : Number(product.price);

      if (found) {
        const newQty = (found.quantity || 0) + addQty;

        if (stock != null && newQty > stock) {
          Alert.alert("Stock insuffisant", `Quantité disponible : ${stock}`);
          return prev.map((p) =>
            (p.id ?? p._id) === id ? { ...p, quantity: stock } : p
          );
        }

        return prev.map((p) =>
          (p.id ?? p._id) === id
            ? { ...p, quantity: newQty }
            : p
        );
      }

      let finalQty = addQty;
      if (stock != null && finalQty > stock) {
        Alert.alert("Stock insuffisant", `Quantité limitée à ${stock}`);
        finalQty = stock;
      }

      return [
        ...prev,
        {
          ...product,
          unitPrice,   // ✅ prix réel (promo ou non)
          quantity: finalQty,
        },
      ];
    });
  };

  /* =======================
     REMOVE
  ======================= */
  const removeFromCart = (productId) => {
    setCart((prev) =>
      prev.filter((p) => (p.id ?? p._id) !== productId)
    );
  };

  /* =======================
     CHANGE QTY
  ======================= */
  const changeQuantity = (productId, quantity) => {
    const q = Number(quantity);

    if (q <= 0) {
      setCart((prev) =>
        prev.filter((p) => (p.id ?? p._id) !== productId)
      );
      return;
    }

    setCart((prev) =>
      prev.map((p) => {
        if ((p.id ?? p._id) !== productId) return p;

        const stock = p.stock ?? null;
        if (stock != null && q > stock) {
          Alert.alert("Stock insuffisant", `Quantité disponible : ${stock}`);
          return { ...p, quantity: stock };
        }

        return { ...p, quantity: q };
      })
    );
  };

  /* =======================
     TOTAL (PROMO OK)
  ======================= */
  const getTotal = () =>
    cart.reduce(
      (sum, item) =>
        sum + (Number(item.unitPrice) || 0) * (item.quantity || 0),
      0
    );

  /* =======================
     UPDATE ITEM (sync stock)
  ======================= */
  const updateItem = (productId, patch) => {
    setCart((prev) =>
      prev.map((p) =>
        (p.id ?? p._id) === productId ? { ...p, ...patch } : p
      )
    );
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        addToCart,
        removeFromCart,
        changeQuantity,
        clearCart,
        getTotal,
        updateItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
export default CartContext;

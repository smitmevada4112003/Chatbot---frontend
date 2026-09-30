import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Package,
  RefreshCw,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { api, authStorage } from "./services/api";
import "./Cart.css";

export default function Cart({ onCartUpdated }) {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total_items: 0, total_price: 0 });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const checkoutRef = React.useRef(false);
  const [error, setError] = useState(null);
  const [successOrder, setSuccessOrder] = useState(null);

  const fetchCart = useCallback(async () => {
    if (!authStorage.getToken()) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCart();
      const updated = {
        items: data.items || [],
        total_items: data.total_items || 0,
        total_price: data.total_price || data.total_amount || 0,
      };
      setCart(updated);
      if (onCartUpdated) onCartUpdated(updated);
    } catch (err) {
      console.error("Failed to load cart:", err);
      setError(err.message || "Could not load shopping cart.");
    } finally {
      setLoading(false);
    }
  }, [onCartUpdated]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Update item quantity via PUT /cart/{item_id} with Optimistic UI
  const handleQuantityChange = async (itemId, currentQty, delta, maxStock) => {
    const newQty = currentQty + delta;
    if (newQty < 1) return;
    if (maxStock && newQty > maxStock) {
      setError(`Cannot exceed available stock (${maxStock} units).`);
      return;
    }

    // Save previous state for rollback on error
    const previousCart = cart;

    // Immediately update UI state (Optimistic Update)
    const updatedItems = cart.items.map((item) => {
      const id = item.item_id || item.id;
      if (id === itemId || item.product_id === itemId) {
        const itemPrice = Number(item.price) || 0;
        return {
          ...item,
          quantity: newQty,
          subtotal: Math.round(newQty * itemPrice * 100) / 100,
        };
      }
      return item;
    });

    const newTotalItems = updatedItems.reduce((acc, curr) => acc + curr.quantity, 0);
    const newTotalPrice = Math.round(
      updatedItems.reduce((acc, curr) => acc + (Number(curr.subtotal) || 0), 0) * 100
    ) / 100;

    const optimisticCart = {
      items: updatedItems,
      total_items: newTotalItems,
      total_price: newTotalPrice,
      total_amount: newTotalPrice,
    };

    setCart(optimisticCart);
    if (onCartUpdated) onCartUpdated(optimisticCart);

    try {
      setError(null);
      await api.updateCartItem(itemId, newQty);
    } catch (err) {
      // Revert if API fails
      setCart(previousCart);
      if (onCartUpdated) onCartUpdated(previousCart);
      setError(err.message || "Failed to update item quantity.");
    }
  };

  // Remove item via DELETE /cart/{item_id} with Optimistic UI
  const handleRemoveItem = async (itemId) => {
    const previousCart = cart;
    const updatedItems = cart.items.filter(
      (item) => (item.item_id || item.id) !== itemId && item.product_id !== itemId
    );
    const newTotalItems = updatedItems.reduce((acc, curr) => acc + curr.quantity, 0);
    const newTotalPrice = Math.round(
      updatedItems.reduce((acc, curr) => acc + (Number(curr.subtotal) || 0), 0) * 100
    ) / 100;

    const optimisticCart = {
      items: updatedItems,
      total_items: newTotalItems,
      total_price: newTotalPrice,
      total_amount: newTotalPrice,
    };

    setCart(optimisticCart);
    if (onCartUpdated) onCartUpdated(optimisticCart);

    try {
      setError(null);
      await api.removeFromCart(itemId);
    } catch (err) {
      setCart(previousCart);
      if (onCartUpdated) onCartUpdated(previousCart);
      setError(err.message || "Failed to remove item.");
    }
  };

  // Checkout via POST /cart/checkout
  const handleCheckout = async () => {
    if (checkoutRef.current || checkoutLoading) return;
    if (!authStorage.getToken()) {
      navigate("/login");
      return;
    }
    if (!cart.items || cart.items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    checkoutRef.current = true;
    try {
      setCheckoutLoading(true);
      setError(null);
      const result = await api.checkoutCart();
      setSuccessOrder(result);
      if (onCartUpdated) onCartUpdated();

      // Automatically redirect to My Orders after a short confirmation pause
      setTimeout(() => {
        navigate("/my-orders");
      }, 2500);
    } catch (err) {
      setError(err.message || "Checkout failed. Please check product stock and try again.");
    } finally {
      setCheckoutLoading(false);
      checkoutRef.current = false;
    }
  };

  const isLoggedIn = Boolean(authStorage.getToken());
  const isAdmin = authStorage.isAdmin();
  const continueShoppingLink = isAdmin ? "/admin" : "/chat";

  return (
    <div className="cart-page-container">
      {/* Header Banner */}
      <div className="cart-page-header">
        <div>
          <h1 className="cart-title">Shopping Cart</h1>
          <p className="cart-subtitle">
            Review your selected products and checkout securely.
          </p>
        </div>
        <Link to={continueShoppingLink} className="cart-continue-link">
          <ArrowLeft size={16} />
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* Notifications */}
      {error && (
        <div className="cart-page-alert error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {successOrder && (
        <div className="cart-page-alert success">
          <CheckCircle2 size={24} />
          <div className="success-content">
            <h3>🎉 Order #{successOrder.order_id} Placed Successfully!</h3>
            <p>
              Thank you for your order! Total paid: ₹{Number(successOrder.total_amount).toFixed(2)}. Redirecting to your Orders page...
            </p>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      {!isLoggedIn ? (
        <div className="cart-login-required-card">
          <Package size={48} className="cart-empty-icon" />
          <h2>Sign in to view your cart</h2>
          <p>Please log in to your account to view your shopping cart and place orders.</p>
          <Link to="/login" className="cart-btn-primary">
            Sign In Now
          </Link>
        </div>
      ) : loading && cart.items.length === 0 ? (
        <div className="cart-loading-box">
          <RefreshCw size={32} className="spin text-blue" />
          <p>Loading your shopping cart...</p>
        </div>
      ) : cart.items.length === 0 ? (
        <div className="cart-empty-box">
          <ShoppingBag size={56} className="cart-empty-icon" />
          <h2>Your Shopping Cart is Empty</h2>
          <p>Discover our latest products and add items to your cart to check out.</p>
          <Link to={continueShoppingLink} className="cart-btn-primary">
            Explore Products Catalog
          </Link>
        </div>
      ) : (
        <div className="cart-layout-grid">
          {/* Left Column: Cart Items List */}
          <div className="cart-items-column">
            <div className="cart-items-header-bar">
              <span>Product ({cart.total_items} items)</span>
              <span>Subtotal</span>
            </div>

            <div className="cart-items-cards-list">
              {cart.items.map((item) => {
                const itemId = item.item_id || item.id;
                const isItemUpdating = updatingId === itemId;
                const isMax = item.quantity >= item.stock;

                return (
                  <div key={itemId} className={`cart-row-card ${isItemUpdating ? "updating" : ""}`}>
                    <div className="cart-item-info">
                      <div className="cart-item-avatar">
                        <Package size={24} />
                      </div>
                      <div className="cart-item-meta">
                        <h3 className="cart-product-name">{item.product_name}</h3>
                        <div className="cart-product-pricing">
                          <span className="cart-price-tag">
                            ₹{Number(item.price).toFixed(2)}
                          </span>
                          {item.stock <= 5 && (
                            <span className="cart-stock-warning">
                              Only {item.stock} left
                            </span>
                          )}
                        </div>

                        {/* Quantity Controls & Remove */}
                        <div className="cart-controls-row">
                          <div className="cart-stepper">
                            <button
                              type="button"
                              className="stepper-btn"
                              disabled={item.quantity <= 1 || isItemUpdating}
                              onClick={() => handleQuantityChange(itemId, item.quantity, -1, item.stock)}
                              title="Decrease quantity"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="stepper-qty">{item.quantity}</span>
                            <button
                              type="button"
                              className="stepper-btn"
                              disabled={isMax || isItemUpdating}
                              onClick={() => handleQuantityChange(itemId, item.quantity, 1, item.stock)}
                              title={isMax ? "Max stock reached" : "Increase quantity"}
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <button
                            type="button"
                            className="cart-remove-link-btn"
                            disabled={isItemUpdating}
                            onClick={() => handleRemoveItem(itemId)}
                            title="Remove this item"
                          >
                            <Trash2 size={15} />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="cart-row-subtotal">
                      ₹{Number(item.subtotal).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Order Summary & Checkout */}
          <div className="cart-summary-column">
            <div className="cart-summary-card">
              <h2 className="summary-card-title">Order Summary</h2>

              <div className="summary-line">
                <span className="summary-label">Items Subtotal</span>
                <span className="summary-value">₹{Number(cart.total_price).toFixed(2)}</span>
              </div>

              <div className="summary-line">
                <span className="summary-label">Standard Shipping</span>
                <span className="summary-value free-tag">FREE</span>
              </div>

              <div className="summary-line">
                <span className="summary-label">Estimated Taxes</span>
                <span className="summary-value">₹0.00</span>
              </div>

              <div className="summary-separator"></div>

              <div className="summary-line total-line">
                <span className="summary-total-label">Total Amount</span>
                <span className="summary-total-value">
                  ₹{Number(cart.total_price).toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                className="cart-checkout-action-btn"
                disabled={checkoutLoading || cart.items.length === 0}
                onClick={handleCheckout}
              >
                {checkoutLoading ? (
                  <>
                    <RefreshCw size={18} className="spin" />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    <span>Checkout (₹{Number(cart.total_price).toFixed(2)})</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="summary-security-note">
                <ShieldCheck size={16} />
                <span>Encrypted & secure checkout transaction</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

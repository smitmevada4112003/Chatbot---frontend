import React, { useState } from "react";
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Package,
} from "lucide-react";
import "./CartDrawer.css";

export default function CartDrawer({
  isOpen,
  onClose,
  cartData,
  loading,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  isLoggedIn,
  onNavigateToLogin,
}) {
  const [checkingOut, setCheckingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  if (!isOpen) return null;

  const items = cartData?.items || [];
  const totalItems = cartData?.total_items || 0;
  const totalAmount = cartData?.total_amount || 0;

  const handleCheckoutClick = async () => {
    if (!isLoggedIn) {
      if (onNavigateToLogin) onNavigateToLogin();
      return;
    }
    setErrorMessage(null);
    setSuccessInfo(null);
    setCheckingOut(true);
    try {
      const res = await onCheckout();
      setSuccessInfo(res);
    } catch (err) {
      setErrorMessage(err.message || "Checkout failed. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="cart-backdrop" onClick={onClose}>
      <aside
        className="cart-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
      >
        {/* Header */}
        <div className="cart-drawer-header">
          <div className="cart-header-title-wrap">
            <ShoppingBag className="cart-header-icon" size={22} />
            <h2 id="cart-title">Your Cart</h2>
            <span className="cart-badge-pill">{totalItems} items</span>
          </div>
          <button
            className="cart-close-btn"
            onClick={onClose}
            aria-label="Close cart"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status / Alert Notices */}
        {errorMessage && (
          <div className="cart-alert error">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successInfo && (
          <div className="cart-alert success">
            <CheckCircle2 size={18} />
            <div>
              <strong>Order Placed Successfully!</strong>
              <p>Order #{successInfo.order_id} has been recorded.</p>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="cart-drawer-body">
          {loading ? (
            <div className="cart-loading-state">
              <div className="cart-spinner"></div>
              <p>Loading your cart...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="cart-empty-state">
              <div className="empty-icon-circle">
                <Package size={44} />
              </div>
              <h3>Your cart is empty</h3>
              <p>Looks like you haven't added any items to your shopping cart yet.</p>
              <button className="cart-browse-btn" onClick={onClose}>
                Browse Products
              </button>
            </div>
          ) : (
            <div className="cart-items-list">
              {items.map((item) => {
                const isMaxStock = item.quantity >= item.stock;
                return (
                  <div key={item.id} className="cart-item-card">
                    <div className="cart-item-details">
                      <div className="cart-item-top-row">
                        <h4 className="cart-item-name">{item.product_name}</h4>
                        <button
                          className="cart-item-delete-btn"
                          title="Remove from cart"
                          onClick={() => onRemoveItem(item.product_id)}
                          aria-label={`Remove ${item.product_name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="cart-item-pricing">
                        <span className="cart-unit-price">
                          ${Number(item.price).toFixed(2)} each
                        </span>
                        {item.stock <= 5 && (
                          <span className="cart-low-stock-tag">
                            Only {item.stock} left in stock
                          </span>
                        )}
                      </div>

                      <div className="cart-item-bottom-row">
                        {/* Quantity Counter */}
                        <div className="cart-quantity-selector">
                          <button
                            className="qty-btn"
                            disabled={item.quantity <= 1}
                            onClick={() =>
                              onUpdateQuantity(item.product_id, item.quantity - 1)
                            }
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="qty-number">{item.quantity}</span>
                          <button
                            className="qty-btn"
                            disabled={isMaxStock}
                            title={isMaxStock ? "Max available stock reached" : "Increase quantity"}
                            onClick={() =>
                              onUpdateQuantity(item.product_id, item.quantity + 1)
                            }
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {/* Line Subtotal */}
                        <div className="cart-item-subtotal">
                          ${Number(item.subtotal).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Summary & Checkout */}
        {items.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-summary-card">
              <div className="summary-row">
                <span className="summary-label">Items Subtotal</span>
                <span className="summary-val">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Shipping & Handling</span>
                <span className="summary-val shipping-free">FREE</span>
              </div>
              <div className="summary-divider"></div>
              <div className="summary-row total-row">
                <span className="total-label">Total Amount</span>
                <span className="total-val">${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {!isLoggedIn ? (
              <div className="cart-auth-notice">
                <p>Sign in to complete your checkout and track orders.</p>
                <button
                  className="cart-checkout-btn secondary"
                  onClick={onNavigateToLogin}
                >
                  Sign In to Checkout
                </button>
              </div>
            ) : (
              <button
                className="cart-checkout-btn"
                disabled={checkingOut || items.length === 0}
                onClick={handleCheckoutClick}
              >
                {checkingOut ? (
                  <>
                    <div className="btn-spinner"></div>
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <span>Checkout ({totalItems} items)</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            )}

            <button className="cart-clear-btn" onClick={onClearCart}>
              Clear Entire Cart
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from "react";
import { ShoppingCart, X, User, Package, Hash, Clock, AlertCircle, Loader2 } from "lucide-react";

const STATUS_OPTIONS = ["Pending", "Completed", "Cancelled", "Processing", "Shipped", "Delivered"];

export default function OrderModal({
  isOpen,
  mode = "add",
  order = null,
  products = [],
  onClose,
  onSave,
  isLoading,
}) {
  const [customer, setCustomer] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [status, setStatus] = useState("Pending");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      setSubmitError(null);
      if (mode === "edit" && order) {
        setCustomer(order.customer || "");
        setProductName(order.product || "");
        setQuantity(order.quantity !== undefined ? String(order.quantity) : "1");
        setStatus(order.status || "Pending");
      } else {
        setCustomer("");
        setProductName(products.length > 0 ? products[0].name : "");
        setQuantity("1");
        setStatus("Pending");
      }
      setErrors({});
    }
  }, [isOpen, mode, order, products]);

  // Find matching product price if available
  const matchedProduct = useMemo(() => {
    return products.find(
      (p) => p.name.trim().toLowerCase() === productName.trim().toLowerCase()
    );
  }, [products, productName]);

  const estimatedTotal = useMemo(() => {
    const qty = parseInt(quantity, 10);
    if (matchedProduct && !isNaN(qty) && qty > 0) {
      return matchedProduct.price * qty;
    }
    return null;
  }, [matchedProduct, quantity]);

  if (!isOpen) return null;

  const isBusy = Boolean(isLoading || isSubmitting);

  function validate() {
    const newErrors = {};
    if (!customer.trim()) {
      newErrors.customer = "Customer name is required";
    }
    if (!productName.trim()) {
      newErrors.product = "Product selection is required";
    }
    const numQty = parseInt(quantity, 10);
    if (!quantity || isNaN(numQty) || numQty <= 0) {
      newErrors.quantity = "Quantity must be at least 1";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    // Guard against duplicate clicks or rapid double-submissions
    if (isSubmittingRef.current || isBusy) return;
    if (!validate()) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSave({
        customer: customer.trim(),
        product: productName.trim(),
        quantity: parseInt(quantity, 10),
        status,
      });
    } catch (err) {
      const errorMsg =
        err?.message === "Failed to fetch"
          ? "Unable to connect to backend server. Please ensure the backend is running."
          : (err?.message || "Failed to place order. Please try again.");
      setSubmitError(errorMsg);
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge order-badge">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h3 className="modal-title">
                {mode === "edit" ? `Edit Order #${order?.id}` : "Create New Order"}
              </h3>
              <p className="modal-subtitle">
                {mode === "edit"
                  ? "Update customer, item quantity or order fulfillment status"
                  : "Manually place a new customer order into the database"}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} disabled={isLoading}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body form-body">
            {/* Global Submit Error Notice */}
            {submitError && (
              <div
                className="modal-alert-error"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#ef4444",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  marginBottom: "16px",
                  lineHeight: 1.4,
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{submitError}</span>
              </div>
            )}

            {/* Customer Name */}
            <div className="form-group">
              <label htmlFor="order-customer" className="form-label">
                <User size={15} /> Customer Name
              </label>
              <input
                id="order-customer"
                type="text"
                className={`form-input ${errors.customer ? "input-error" : ""}`}
                placeholder="e.g. John Doe / Priya Sharma"
                value={customer}
                onChange={(e) => {
                  setCustomer(e.target.value);
                  if (errors.customer) setErrors({ ...errors, customer: null });
                  if (submitError) setSubmitError(null);
                }}
                disabled={isBusy}
                autoFocus
              />
              {errors.customer && <span className="field-error">{errors.customer}</span>}
            </div>

            {/* Product selection */}
            <div className="form-group">
              <label htmlFor="order-product" className="form-label">
                <Package size={15} /> Product
              </label>
              {products.length > 0 ? (
                <div className="select-wrapper">
                  <select
                    id="order-product"
                    className={`form-input ${errors.product ? "input-error" : ""}`}
                    value={productName}
                    onChange={(e) => {
                      setProductName(e.target.value);
                      if (errors.product) setErrors({ ...errors, product: null });
                      if (submitError) setSubmitError(null);
                    }}
                    disabled={isBusy}
                  >
                    <option value="">-- Select a Product from Catalog --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} (₹{p.price.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <input
                  id="order-product"
                  type="text"
                  className={`form-input ${errors.product ? "input-error" : ""}`}
                  placeholder="Enter product name"
                  value={productName}
                  onChange={(e) => {
                    setProductName(e.target.value);
                    if (errors.product) setErrors({ ...errors, product: null });
                    if (submitError) setSubmitError(null);
                  }}
                  disabled={isBusy}
                />
              )}
              {errors.product && <span className="field-error">{errors.product}</span>}
            </div>

            {/* Quantity & Status row */}
            <div className="form-row-2col">
              <div className="form-group">
                <label htmlFor="order-qty" className="form-label">
                  <Hash size={15} /> Quantity
                </label>
                <div className="qty-stepper-input">
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => {
                      const cur = parseInt(quantity, 10) || 1;
                      if (cur > 1) setQuantity(String(cur - 1));
                    }}
                    disabled={isBusy || parseInt(quantity, 10) <= 1}
                  >
                    -
                  </button>
                  <input
                    id="order-qty"
                    type="number"
                    min="1"
                    className={`form-input text-center ${errors.quantity ? "input-error" : ""}`}
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(e.target.value);
                      if (errors.quantity) setErrors({ ...errors, quantity: null });
                      if (submitError) setSubmitError(null);
                    }}
                    disabled={isBusy}
                  />
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => {
                      const cur = parseInt(quantity, 10) || 1;
                      setQuantity(String(cur + 1));
                    }}
                    disabled={isBusy}
                  >
                    +
                  </button>
                </div>
                {errors.quantity && <span className="field-error">{errors.quantity}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="order-status" className="form-label">
                  <Clock size={15} /> Status
                </label>
                <select
                  id="order-status"
                  className="form-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={isBusy}
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Calculated price preview card */}
            {estimatedTotal !== null && (
              <div className="calc-summary-card">
                <div className="calc-summary-row">
                  <span>Unit Price:</span>
                  <strong>₹{matchedProduct.price.toLocaleString()}</strong>
                </div>
                <div className="calc-summary-row">
                  <span>Quantity:</span>
                  <strong>× {quantity}</strong>
                </div>
                <div className="calc-summary-divider" />
                <div className="calc-summary-row total-row">
                  <span>Estimated Total:</span>
                  <span className="total-highlight">₹{estimatedTotal.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isBusy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isBusy} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              {isBusy ? (
                <>
                  <Loader2 size={15} className="spin" />
                  <span>{mode === "edit" ? "Saving..." : "Placing order..."}</span>
                </>
              ) : (
                mode === "edit" ? "Save Order" : "Place Order"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { ShoppingCart, X, User, Package, Hash, Clock } from "lucide-react";

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

  useEffect(() => {
    if (isOpen) {
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

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      customer: customer.trim(),
      product: productName.trim(),
      quantity: parseInt(quantity, 10),
      status,
    });
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
                }}
                disabled={isLoading}
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
                    }}
                    disabled={isLoading}
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
                  }}
                  disabled={isLoading}
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
                    disabled={isLoading || parseInt(quantity, 10) <= 1}
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
                    }}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => {
                      const cur = parseInt(quantity, 10) || 1;
                      setQuantity(String(cur + 1));
                    }}
                    disabled={isLoading}
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
                  disabled={isLoading}
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
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? "Saving..." : mode === "edit" ? "Save Order" : "Place Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

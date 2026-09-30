import { useState, useEffect } from "react";
import { Package, X, IndianRupee, Tag } from "lucide-react";

export default function ProductModal({ isOpen, mode = "add", product = null, onClose, onSave, isLoading }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("10");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      if (mode === "edit" && product) {
        setName(product.name || "");
        setPrice(product.price !== undefined ? String(product.price) : "");
        setStock(product.stock !== undefined ? String(product.stock) : "10");
      } else {
        setName("");
        setPrice("");
        setStock("10");
      }
      setErrors({});
    }
  }, [isOpen, mode, product]);

  if (!isOpen) return null;

  const isBusy = Boolean(isLoading || isSubmitting);

  function validate() {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = "Product name is required";
    }
    const numPrice = Number(price);
    if (!price || isNaN(numPrice) || numPrice < 0) {
      newErrors.price = "Price must be a valid positive number";
    }
    const numStock = Number(stock);
    if (stock === "" || isNaN(numStock) || numStock < 0) {
      newErrors.stock = "Stock must be a non-negative number";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isBusy) return;
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        price: Math.round(Number(price)),
        stock: Math.max(0, Math.round(Number(stock))),
      });
    } catch {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Package size={20} />
            </div>
            <div>
              <h3 className="modal-title">
                {mode === "edit" ? `Edit Product #${product?.id}` : "Add New Product"}
              </h3>
              <p className="modal-subtitle">
                {mode === "edit"
                  ? "Update product information in the MySQL catalog"
                  : "Create a new product available for orders and chatbot queries"}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} disabled={isLoading}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body form-body">
            <div className="form-group">
              <label htmlFor="product-name" className="form-label">
                <Tag size={15} /> Product Name
              </label>
              <input
                id="product-name"
                type="text"
                className={`form-input ${errors.name ? "input-error" : ""}`}
                placeholder="e.g. Wireless Noise-Cancelling Headphones"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: null });
                }}
                disabled={isBusy}
                autoFocus
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="product-price" className="form-label">
                <IndianRupee size={15} /> Price (INR)
              </label>
              <input
                id="product-price"
                type="number"
                min="0"
                step="1"
                className={`form-input ${errors.price ? "input-error" : ""}`}
                placeholder="e.g. 2999"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (errors.price) setErrors({ ...errors, price: null });
                }}
                disabled={isBusy}
              />
              {errors.price && <span className="field-error">{errors.price}</span>}
              <small className="form-hint">Enter the unit price as an integer.</small>
            </div>

            <div className="form-group">
              <label htmlFor="product-stock" className="form-label">
                <Package size={15} /> Initial Stock / Inventory Quantity
              </label>
              <input
                id="product-stock"
                type="number"
                min="0"
                step="1"
                className={`form-input ${errors.stock ? "input-error" : ""}`}
                placeholder="e.g. 15"
                value={stock}
                onChange={(e) => {
                  setStock(e.target.value);
                  if (errors.stock) setErrors({ ...errors, stock: null });
                }}
                disabled={isBusy}
              />
              {errors.stock && <span className="field-error">{errors.stock}</span>}
              <small className="form-hint">Units currently available in inventory.</small>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isBusy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isBusy}>
              {isBusy ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

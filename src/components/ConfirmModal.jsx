import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({ isOpen, title, message, confirmText = "Delete", onConfirm, onCancel, isLoading }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="confirm-icon-badge">
            <AlertTriangle size={22} className="text-danger" />
          </div>
          <button className="modal-close-btn" onClick={onCancel} disabled={isLoading}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <h3 className="modal-title">{title}</h3>
          <p className="modal-message">{message}</p>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

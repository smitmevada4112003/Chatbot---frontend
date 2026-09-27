import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export default function ToastContainer({ toasts, onCloseToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" style={{
      position: "fixed",
      bottom: "24px",
      right: "24px",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      maxWidth: "380px",
      width: "100%",
      pointerEvents: "none"
    }}>
      {toasts.map((toast) => {
        const isError = toast.type === "error";
        const isInfo = toast.type === "info";

        return (
          <div
            key={toast.id}
            className={`toast-item ${toast.type}`}
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 16px",
              borderRadius: "12px",
              background: isError ? "var(--danger-subtle)" : isInfo ? "var(--info-subtle)" : "var(--success-subtle)",
              border: `1px solid ${isError ? "var(--danger-border)" : isInfo ? "var(--info-border)" : "var(--success-border)"}`,
              color: isError ? "var(--danger-text)" : isInfo ? "var(--info-text)" : "var(--success-text)",
              boxShadow: "var(--shadow-lg)",
              animation: "toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              fontSize: "14px",
              fontWeight: 500,
              backdropFilter: "blur(6px)",
              transition: "background-color 250ms ease, color 250ms ease, border-color 250ms ease"
            }}
          >
            <div style={{ flexShrink: 0 }}>
              {isError && <AlertCircle size={20} color="var(--danger)" />}
              {isInfo && <Info size={20} color="var(--info)" />}
              {!isError && !isInfo && <CheckCircle2 size={20} color="var(--success)" />}
            </div>
            <div style={{ flex: 1, lineHeight: "1.4" }}>
              {toast.message}
            </div>
            <button
              onClick={() => onCloseToast(toast.id)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                color: "inherit",
                opacity: 0.7,
                display: "flex",
                alignItems: "center"
              }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

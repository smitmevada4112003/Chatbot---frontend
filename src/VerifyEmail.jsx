import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "./services/api";
import {
  CheckCircle2,
  AlertCircle,
  MailCheck,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import "./AuthPages.css";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(Boolean(token));
  const [status, setStatus] = useState(token ? "loading" : "missing"); // "loading", "success", "error", "missing"
  const [message, setMessage] = useState(
    !token ? "Verification token is missing from the URL. Please use the full link sent to your email." : ""
  );

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    async function verify() {
      try {
        const res = await api.verifyEmail(token);
        if (isMounted) {
          setStatus("success");
          setMessage(
            res.message || "Your email address has been verified successfully! You can now sign in."
          );
        }
      } catch (err) {
        if (isMounted) {
          setStatus("error");
          setMessage(err.message || "Email verification failed or token has expired.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    verify();
    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-card-header">
          <div
            className="auth-icon-circle"
            style={{
              background:
                status === "success"
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : status === "error" || status === "missing"
                  ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                  : "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)",
            }}
          >
            {status === "success" ? (
              <MailCheck size={28} />
            ) : status === "error" || status === "missing" ? (
              <AlertCircle size={28} />
            ) : (
              <ShieldCheck size={28} />
            )}
          </div>

          <h2>
            {status === "loading"
              ? "Verifying Email..."
              : status === "success"
              ? "Email Verified!"
              : "Verification Failed"}
          </h2>
          <p>
            {status === "loading"
              ? "Please wait while we confirm your account credentials"
              : status === "success"
              ? "Your account email has been confirmed and is now active"
              : "We could not verify your email with the provided link"}
          </p>
        </div>

        <div style={{ padding: "0 28px 28px 28px" }}>
          {/* Loading State */}
          {loading && (
            <div
              className="auth-page-alert"
              style={{
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                color: "#0369a1",
                justifyContent: "center",
                margin: "12px 0 20px 0",
              }}
            >
              <Loader2 size={18} className="spin-icon" style={{ animation: "spin 1s linear infinite" }} />
              <span>Contacting authentication server...</span>
            </div>
          )}

          {/* Success State */}
          {status === "success" && (
            <div>
              <div
                className="auth-page-alert success"
                style={{ margin: "12px 0 20px 0", flexDirection: "column", alignItems: "flex-start", gap: "6px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle2 size={17} />
                  <span style={{ fontWeight: 600 }}>Confirmation Complete</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.4 }}>
                  {message}
                </p>
              </div>

              <Link
                to="/login"
                className="auth-btn-submit"
                style={{ textDecoration: "none", width: "100%", boxSizing: "border-box" }}
              >
                <span>Proceed to Sign In</span>
                <ArrowRight size={17} />
              </Link>
            </div>
          )}

          {/* Error / Missing State */}
          {(status === "error" || status === "missing") && (
            <div>
              <div
                className="auth-page-alert error"
                style={{ margin: "12px 0 20px 0", flexDirection: "column", alignItems: "flex-start", gap: "6px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertCircle size={17} />
                  <span style={{ fontWeight: 600 }}>Verification Issue</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.4 }}>
                  {message}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <Link
                  to="/login"
                  className="auth-btn-submit"
                  style={{ textDecoration: "none", width: "100%", boxSizing: "border-box" }}
                >
                  <span>Return to Sign In</span>
                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="auth-card-footer">
          <p>
            Need assistance? <Link to="/chat" className="auth-link">Chat with Support AI</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

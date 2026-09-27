import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "./services/api";
import {
  Mail,
  ArrowRight,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import "./AuthPages.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [devResetLink, setDevResetLink] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setDevResetLink("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.forgotPassword(trimmedEmail);
      setSuccessMsg("Check your email for a reset link. If an account matches this email, you will receive instructions shortly.");
      if (res.reset_link) {
        setDevResetLink(res.reset_link);
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to process request. Please verify the email and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-card-header">
          <div className="auth-icon-circle">
            <KeyRound size={28} />
          </div>
          <h2>Forgot Password?</h2>
          <p>
            Enter your account email and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="auth-page-alert error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-page-alert success" style={{ flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} />
              <span style={{ fontWeight: 600 }}>Email Dispatched</span>
            </div>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.83rem", lineHeight: 1.4 }}>
              {successMsg}
            </p>
            {devResetLink && (
              <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed #bbf7d0", width: "100%" }}>
                <span style={{ fontSize: "0.75rem", color: "#166534", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                  Dev / Testing Direct Link:
                </span>
                <a
                  href={devResetLink}
                  style={{
                    fontSize: "0.78rem",
                    color: "#15803d",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    wordBreak: "break-all",
                    textDecoration: "underline"
                  }}
                >
                  <span>Open Reset Password Page</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-card-form" noValidate>
          <div className="auth-field">
            <label htmlFor="forgot-email">Email Address</label>
            <div className="auth-field-input">
              <Mail size={17} className="auth-field-icon" />
              <input
                id="forgot-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-btn-submit"
            disabled={loading}
          >
            {loading ? (
              <span>Sending reset link...</span>
            ) : (
              <>
                <span>Send Reset Link</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="auth-card-footer">
          <p>
            Remember your password?{" "}
            <Link to="/login" className="auth-link" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <ArrowLeft size={13} />
              <span>Back to Sign In</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "./services/api";
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
} from "lucide-react";
import "./AuthPages.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(Boolean(token));
  const [tokenStatus, setTokenStatus] = useState(token ? "checking" : "missing"); // "checking", "valid", "invalid", "missing"
  const [errorMsg, setErrorMsg] = useState(
    !token ? "Reset token is missing from the URL. Please use the link sent to your email." : ""
  );
  const [successMsg, setSuccessMsg] = useState("");

  // Verify token on mount if present
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    async function checkToken() {
      try {
        await api.verifyResetToken(token);
        if (isMounted) {
          setTokenStatus("valid");
          setErrorMsg("");
        }
      } catch (err) {
        if (isMounted) {
          setTokenStatus("invalid");
          setErrorMsg(err.message || "This reset token is invalid or has expired.");
        }
      } finally {
        if (isMounted) setVerifying(false);
      }
    }

    checkToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!token) {
      setErrorMsg("Reset token is missing. Please request a new password reset link.");
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter identical passwords.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.resetPassword(token, password);
      setSuccessMsg(
        res.message || "Password has been reset successfully! Redirecting to login..."
      );
      setTokenStatus("completed");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || "Failed to reset password. The link may have expired.");
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
            <ShieldCheck size={28} />
          </div>
          <h2>Reset Password</h2>
          <p>Create a secure new password for your account</p>
        </div>

        {/* Verifying Indicator */}
        {verifying && (
          <div className="auth-page-alert" style={{ background: "#f8fafc", border: "1px solid #cbd5e1", color: "#475569" }}>
            <span>Verifying reset token security...</span>
          </div>
        )}

        {/* Error Feedback */}
        {errorMsg && (
          <div className="auth-page-alert error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Feedback */}
        {successMsg && (
          <div className="auth-page-alert success" style={{ flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={18} />
              <span style={{ fontWeight: 600 }}>Password Updated</span>
            </div>
            <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.4 }}>
              {successMsg}
            </p>
            <button
              type="button"
              className="auth-btn-submit"
              style={{ width: "100%", marginTop: "12px", padding: "10px 14px", fontSize: "0.9rem" }}
              onClick={() => navigate("/login")}
            >
              <span>Go to Sign In</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Form or Invalid State */}
        {tokenStatus === "invalid" || tokenStatus === "missing" ? (
          <div style={{ padding: "16px 28px 28px 28px", textAlign: "center" }}>
            <p style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "18px" }}>
              Reset links expire in 30 minutes and can only be used once.
            </p>
            <Link
              to="/forgot-password"
              className="auth-btn-submit"
              style={{ textDecoration: "none", display: "inline-flex" }}
            >
              <span>Request New Reset Link</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : tokenStatus !== "completed" ? (
          <form onSubmit={handleSubmit} className="auth-card-form" noValidate>
            <div className="auth-field">
              <label htmlFor="reset-new-password">New Password</label>
              <div className="auth-field-input">
                <Lock size={17} className="auth-field-icon" />
                <input
                  id="reset-new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center"
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reset-confirm-password">Confirm New Password</label>
              <div className="auth-field-input">
                <Lock size={17} className="auth-field-icon" />
                <input
                  id="reset-confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-btn-submit"
              disabled={loading || verifying}
            >
              {loading ? (
                <span>Updating password...</span>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        ) : null}

        {/* Footer Link */}
        <div className="auth-card-footer">
          <p>
            Remember your credentials?{" "}
            <Link to="/login" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, authStorage } from "../services/api";
import {
  Lock,
  Mail,
  User,
  X,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  AlertCircle,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import "./AuthModal.css";

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = "login" }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setErrorMsg("");
  };

  const fillAdminCredentials = () => {
    setMode("login");
    setFormData({
      name: "",
      email: "admin@example.com",
      password: "Admin123!",
    });
    setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (mode === "login") {
        if (!formData.email || !formData.password) {
          throw new Error("Please enter both email and password.");
        }
        const res = await api.login(formData.email, formData.password);
        setSuccessMsg("Signed in successfully!");
        setTimeout(() => {
          if (onSuccess) onSuccess(res.user, res.access_token);
          if (onClose) onClose();
        }, 500);
      } else {
        if (!formData.name || !formData.email || !formData.password) {
          throw new Error("Please fill in all fields.");
        }
        if (formData.password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        const res = await api.register(formData.name, formData.email, formData.password);
        setSuccessMsg("Account created successfully!");
        setTimeout(() => {
          if (onSuccess) onSuccess(res.user, res.access_token);
          if (onClose) onClose();
        }, 500);
      }
    } catch (err) {
      setErrorMsg(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="auth-modal-header">
          <div className="auth-modal-icon-badge">
            <ShieldCheck size={26} />
          </div>
          <div className="auth-modal-title-group">
            <h3>{mode === "login" ? "Welcome Back" : "Create Account"}</h3>
            <p>
              {mode === "login"
                ? "Sign in to access your administrative tools and order records"
                : "Register for an account to manage store orders and tracking"}
            </p>
          </div>
          <button className="auth-modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Demo Admin Quick Button */}
        <div className="auth-demo-banner">
          <div className="demo-banner-text">
            <KeyRound size={16} className="demo-key-icon" />
            <div>
              <strong>Quick Admin Access:</strong>
              <span> admin@example.com / Admin123!</span>
            </div>
          </div>
          <button
            type="button"
            className="demo-autofill-btn"
            onClick={fillAdminCredentials}
          >
            Auto-fill
          </button>
        </div>

        {/* Feedback messages */}
        {errorMsg && (
          <div className="auth-alert error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <div className="auth-input-group">
              <label htmlFor="auth-name">Full Name</label>
              <div className="auth-input-wrapper">
                <User size={17} className="auth-input-icon" />
                <input
                  id="auth-name"
                  type="text"
                  name="name"
                  placeholder="e.g. Jane Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          )}

          <div className="auth-input-group">
            <label htmlFor="auth-email">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail size={17} className="auth-input-icon" />
              <input
                id="auth-email"
                type="email"
                name="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="auth-input-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="auth-password">Password</label>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => {
                    if (onClose) onClose();
                    navigate("/forgot-password");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: "0.75rem",
                    color: "#4f46e5",
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="auth-input-wrapper">
              <Lock size={17} className="auth-input-icon" />
              <input
                id="auth-password"
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-dots">Processing...</span>
            ) : (
              <>
                <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Footer Mode Switch */}
        <div className="auth-modal-footer">
          {mode === "login" ? (
            <p>
              Don't have an account?{" "}
              <button
                type="button"
                className="mode-switch-btn"
                onClick={() => {
                  setMode("register");
                  setErrorMsg("");
                }}
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                className="mode-switch-btn"
                onClick={() => {
                  setMode("login");
                  setErrorMsg("");
                }}
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

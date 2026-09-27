import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, authStorage } from "./services/api";
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import "./AuthPages.css";

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleAutofillAdmin = () => {
    setEmail("admin@example.com");
    setPassword("Admin123!");
    setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Basic client-side validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    if (!password) {
      setErrorMsg("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      // Calls POST /login (accepts email and password, returns access_token & role)
      const data = await api.login(trimmedEmail, password);

      // Store in localStorage under "authToken" and "userRole"
      const token = data.access_token;
      const role = data.role || data.user?.role || "customer";

      localStorage.setItem("authToken", token);
      localStorage.setItem("userRole", role);
      localStorage.setItem("userEmail", trimmedEmail);

      setSuccessMsg("Logged in successfully! Redirecting...");

      if (onLoginSuccess) {
        onLoginSuccess(data.user || { email: trimmedEmail, role }, token);
      }

      setTimeout(() => {
        if (role === "admin") {
          navigate("/admin");
        } else {
          navigate("/chat");
        }
      }, 400);
    } catch (err) {
      // Display error message returned from backend
      setErrorMsg(err.message || "Invalid credentials. Please try again.");
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
          <h2>Welcome Back</h2>
          <p>Sign in to your account to continue</p>
        </div>

        {/* Demo Admin Banner */}
        <div className="auth-demo-box">
          <div className="auth-demo-text">
            <KeyRound size={15} />
            <span>Admin Demo: <code>admin@example.com</code> / <code>Admin123!</code></span>
          </div>
          <button
            type="button"
            className="auth-demo-btn"
            onClick={handleAutofillAdmin}
          >
            Auto-fill
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="auth-page-alert error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-page-alert success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="auth-card-form" noValidate>
          <div className="auth-field">
            <label htmlFor="login-email">Email Address</label>
            <div className="auth-field-input">
              <Mail size={17} className="auth-field-icon" />
              <input
                id="login-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="login-password">Password</label>
              <Link
                to="/forgot-password"
                className="auth-link"
                style={{ fontSize: "0.8rem", textDecoration: "none", fontWeight: 500 }}
              >
                Forgot password?
              </Link>
            </div>
            <div className="auth-field-input">
              <Lock size={17} className="auth-field-icon" />
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
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
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="auth-card-footer">
          <p>
            Don't have an account?{" "}
            <Link to="/signup" className="auth-link">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

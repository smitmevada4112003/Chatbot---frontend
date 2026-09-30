import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { api, authStorage } from "./services/api";
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import "./AuthPages.css";

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  // Determine intended redirect destination for customers
  const rawFrom = location.state?.from?.pathname || location.state?.from;
  // If the intended page was /admin or invalid, customers cannot access it, so default to /chat
  const customerDestination =
    rawFrom && typeof rawFrom === "string" && !rawFrom.startsWith("/admin") && rawFrom !== "/login"
      ? rawFrom
      : "/chat";

  // If already logged in, redirect immediately based on role
  useEffect(() => {
    const token = authStorage.getToken() || localStorage.getItem("authToken");
    const role = (authStorage.getRole() || localStorage.getItem("userRole") || "").toLowerCase();
    if (token) {
      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate(customerDestination, { replace: true });
      }
    }
  }, [navigate, customerDestination]);

  const handleAutofillAdmin = () => {
    setEmail("admin@example.com");
    setPassword("Admin123!");
    setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Basic client-side validation (with fallback to DOM values for browser autofill)
    const emailEl = document.getElementById("login-email");
    const passwordEl = document.getElementById("login-password");
    const trimmedEmail = (email || emailEl?.value || "").trim();
    const cleanPassword = (password || passwordEl?.value || "").trim();
    if (!trimmedEmail) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    if (!cleanPassword) {
      setErrorMsg("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      // Calls POST /login (accepts email and password, returns access_token & role)
      const data = await api.login(trimmedEmail, cleanPassword);

      // Store in localStorage under "authToken" and "userRole"
      const token = data.access_token;
      const role = (data.role || data.user?.role || "customer").toLowerCase();

      localStorage.setItem("authToken", token);
      localStorage.setItem("userRole", role);
      localStorage.setItem("userEmail", trimmedEmail);

      setSuccessMsg("Logged in successfully! Redirecting...");

      if (onLoginSuccess) {
        onLoginSuccess(data.user || { email: trimmedEmail, role }, token);
      }

      setTimeout(() => {
        if (role === "admin") {
          navigate("/admin", { replace: true });
        } else {
          navigate(customerDestination, { replace: true });
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

        {/* Demo Admin Quick-Fill Banner */}
        <div className="auth-demo-box">
          <div className="auth-demo-text">
            <KeyRound size={15} />
            <span>Admin: <code>admin@example.com</code> / <code>Admin123!</code></span>
          </div>
          <button
            type="button"
            className="auth-demo-btn"
            onClick={handleAutofillAdmin}
          >
            Fill Admin
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
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
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
            <div className="auth-field-input" style={{ position: "relative" }}>
              <Lock size={17} className="auth-field-icon" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
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

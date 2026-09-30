import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "./services/api";
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import "./AuthPages.css";

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Client-side validation
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!trimmedEmail) {
      setErrorMsg("Please enter an email address.");
      return;
    }
    if (!trimmedEmail.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (!cleanPassword) {
      setErrorMsg("Please enter a password.");
      return;
    }
    if (cleanPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    if (cleanPassword !== cleanConfirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // Calls POST /signup (creates user with role 'customer')
      await api.signup(trimmedEmail, cleanPassword, trimmedName);

      setSuccessMsg("Account created successfully! Redirecting to login...");

      // Redirect to the login page on success with email pre-filled
      setTimeout(() => {
        navigate("/login", { state: { email: trimmedEmail } });
      }, 800);
    } catch (err) {
      // Display error message returned from backend
      setErrorMsg(err.message || "Signup failed. Please try again.");
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
            <UserPlus size={28} />
          </div>
          <h2>Create Account</h2>
          <p>Register as a new customer to place and track orders</p>
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

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="auth-card-form" noValidate>
          <div className="auth-field">
            <label htmlFor="signup-name">Full Name</label>
            <div className="auth-field-input">
              <User size={17} className="auth-field-icon" />
              <input
                id="signup-name"
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="signup-email">Email Address</label>
            <div className="auth-field-input">
              <Mail size={17} className="auth-field-icon" />
              <input
                id="signup-email"
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
            <label htmlFor="signup-password">Password</label>
            <div className="auth-field-input" style={{ position: "relative" }}>
              <Lock size={17} className="auth-field-icon" />
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
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

          <div className="auth-field">
            <label htmlFor="signup-confirm-password">Confirm Password</label>
            <div className="auth-field-input" style={{ position: "relative" }}>
              <Lock size={17} className="auth-field-icon" />
              <input
                id="signup-confirm-password"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
                style={{ paddingRight: "40px" }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-btn-submit"
            disabled={loading}
          >
            {loading ? (
              <span>Creating account...</span>
            ) : (
              <>
                <span>Sign Up</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="auth-card-footer">
          <p>
            Already have an account?{" "}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

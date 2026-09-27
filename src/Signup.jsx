import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "./services/api";
import {
  Lock,
  Mail,
  ArrowRight,
  UserPlus,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import "./AuthPages.css";

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Client-side validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg("Please enter an email address.");
      return;
    }
    if (!trimmedEmail.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setErrorMsg("Please enter a password.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // Calls POST /signup (accepts email and password, creates user with role 'customer')
      const res = await api.signup(trimmedEmail, password);

      setSuccessMsg("Account created successfully! Redirecting to login...");

      // Redirect to the login page on success
      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (err) {
      // Display error message returned from backend (e.g. "Email is already registered.")
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
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="signup-password">Password</label>
            <div className="auth-field-input">
              <Lock size={17} className="auth-field-icon" />
              <input
                id="signup-password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="signup-confirm-password">Confirm Password</label>
            <div className="auth-field-input">
              <Lock size={17} className="auth-field-icon" />
              <input
                id="signup-confirm-password"
                type="password"
                placeholder="Re-enter password"
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

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Star,
  X,
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle2,
  Package,
  User,
  Clock,
  LogIn,
} from "lucide-react";
import { api, authStorage } from "../services/api";
import "./ProductReviews.css";

const RATING_LABELS = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent!",
};

export default function ProductReviewsModal({
  isOpen,
  product,
  onClose,
  onReviewSubmitted,
}) {
  const [reviewsData, setReviewsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const user = authStorage.getUser();
  const token = authStorage.getToken();
  const isLoggedIn = Boolean(token);

  // Fetch reviews whenever the modal opens with a valid product
  useEffect(() => {
    if (isOpen && product?.id) {
      setErrorMsg("");
      setSuccessMsg("");
      setComment("");
      setRating(5);
      fetchReviews();
    }
  }, [isOpen, product?.id]);

  async function fetchReviews() {
    if (!product?.id) return;
    setLoading(true);
    try {
      const data = await api.getProductReviews(product.id);
      setReviewsData(data);
    } catch (err) {
      setErrorMsg(err.message || "Failed to load product reviews.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!isLoggedIn) {
      setErrorMsg("Please sign in to submit a review.");
      return;
    }
    if (!rating || rating < 1 || rating > 5) {
      setErrorMsg("Please select a rating between 1 and 5 stars.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await api.submitProductReview(product.id, rating, comment);
      setSuccessMsg(res.message || "Review submitted successfully!");
      setComment("");

      // Refresh reviews list
      await fetchReviews();

      // Notify parent to update product stats in listing
      if (onReviewSubmitted && res.product_stats) {
        onReviewSubmitted(product.id, res.product_stats);
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen || !product) return null;

  const avgRating = reviewsData?.average_rating ?? (product.average_rating || 0.0);
  const reviewCount = reviewsData?.review_count ?? (product.review_count || 0);
  const reviewsList = reviewsData?.reviews || [];

  return (
    <div className="reviews-modal-backdrop" onClick={onClose}>
      <div className="reviews-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="reviews-modal-header">
          <div className="reviews-header-info">
            <div className="reviews-product-badge">
              <Package size={20} />
            </div>
            <div>
              <h3 className="reviews-product-title">{product.name}</h3>
              <div className="reviews-product-meta">
                <span className="reviews-price-tag">₹{Number(product.price).toLocaleString()}</span>
                <span className="reviews-meta-separator">•</span>
                <div className="reviews-rating-pill">
                  <Star size={14} className="star-icon filled" />
                  <span className="rating-value">{Number(avgRating).toFixed(1)}</span>
                  <span className="rating-count">({reviewCount} {reviewCount === 1 ? "review" : "reviews"})</span>
                </div>
              </div>
            </div>
          </div>
          <button className="reviews-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="reviews-modal-body">
          {/* Review Submission Section */}
          <div className="review-form-section">
            <h4 className="section-subtitle">
              <MessageSquare size={16} />
              <span>Leave a Review</span>
            </h4>

            {isLoggedIn ? (
              <form onSubmit={handleSubmitReview} className="review-submit-form">
                {/* Star rating selector */}
                <div className="star-rating-selector-wrapper">
                  <label className="rating-label">Your Rating:</label>
                  <div className="interactive-stars">
                    {[1, 2, 3, 4, 5].map((starVal) => {
                      const isFilled = (hoverRating || rating) >= starVal;
                      return (
                        <button
                          key={starVal}
                          type="button"
                          className={`star-select-btn ${isFilled ? "active" : ""}`}
                          onClick={() => setRating(starVal)}
                          onMouseEnter={() => setHoverRating(starVal)}
                          onMouseLeave={() => setHoverRating(0)}
                          title={`${starVal} Star - ${RATING_LABELS[starVal]}`}
                        >
                          <Star size={24} className={isFilled ? "star-filled" : "star-empty"} />
                        </button>
                      );
                    })}
                    <span className="rating-text-hint">
                      {RATING_LABELS[hoverRating || rating]}
                    </span>
                  </div>
                </div>

                {/* Comment textarea */}
                <div className="comment-textarea-wrapper">
                  <textarea
                    rows={3}
                    placeholder="Share your experience with this product (optional)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="review-textarea"
                  />
                </div>

                {errorMsg && (
                  <div className="review-alert error">
                    <AlertCircle size={15} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="review-alert success">
                    <CheckCircle2 size={15} />
                    <span>{successMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="review-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <span>Submit Review</span>
                      <Send size={15} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="review-login-prompt">
                <p>Sign in to submit your rating and review for this product.</p>
                <Link to="/login" className="review-login-btn" onClick={onClose}>
                  <LogIn size={15} />
                  <span>Sign In</span>
                </Link>
              </div>
            )}
          </div>

          {/* Existing Reviews List */}
          <div className="reviews-list-section">
            <h4 className="section-subtitle">
              <span>Customer Reviews ({reviewCount})</span>
            </h4>

            {loading && reviewsList.length === 0 ? (
              <div className="reviews-loading">Loading reviews...</div>
            ) : reviewsList.length === 0 ? (
              <div className="reviews-empty">
                <Star size={32} className="empty-star" />
                <p>No customer reviews yet.</p>
                <span>Be the first to share your thoughts on this product!</span>
              </div>
            ) : (
              <div className="reviews-items-container">
                {reviewsList.map((rev) => (
                  <div key={rev.id} className="review-item-card">
                    <div className="review-item-header">
                      <div className="reviewer-info">
                        <div className="reviewer-avatar">
                          {(rev.user_name || "C").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong className="reviewer-name">{rev.user_name || "Customer"}</strong>
                          <div className="review-date">
                            <Clock size={12} />
                            <span>{rev.created_at ? rev.created_at.split("T")[0].split(" ")[0] : "Recently"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="review-stars-badge">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={13}
                            className={s <= rev.rating ? "star-icon filled" : "star-icon empty"}
                          />
                        ))}
                      </div>
                    </div>

                    {rev.comment && (
                      <p className="review-item-comment">{rev.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

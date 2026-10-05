const express = require("express");
const passport = require("passport");
const {
  register,
  login,
  verifyEmail,
  resendVerificationOtp,
  forgotPassword,
  resetPassword,
  getMe,
  googleCallback,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

const isGoogleConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const requireGoogleConfig = (req, res, next) => {
  if (!isGoogleConfigured()) {
    const returnTo = req.query.return_to || req.query.redirect_uri;
    if (returnTo) {
      const sep = returnTo.includes("?") ? "&" : "?";
      return res.redirect(`${returnTo}${sep}error=google_not_configured`);
    }
    return res.redirect(`${process.env.CLIENT_URL}/login?error=google_not_configured`);
  }
  next();
};

router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", protect, getMe);

router.get("/google", requireGoogleConfig, (req, res, next) => {
  const returnTo = req.query.return_to || req.query.redirect_uri || "";
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: returnTo,
    session: false,
  })(req, res, next);
});

router.get(
  "/google/callback",
  requireGoogleConfig,
  (req, res, next) => {
    const returnTo = req.query.state || "";
    const isMobile = returnTo.startsWith("chatapp://") || returnTo.startsWith("exp://");
    const failureRedirect = isMobile
      ? `${returnTo}${returnTo.includes("?") ? "&" : "?"}error=google_failed`
      : `${process.env.CLIENT_URL}/login?error=google_failed`;

    passport.authenticate("google", {
      session: false,
      failureRedirect,
    })(req, res, next);
  },
  googleCallback
);

module.exports = router;

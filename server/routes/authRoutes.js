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
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
});

router.get(
  "/google/callback",
  requireGoogleConfig,
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed`,
  }),
  googleCallback
);

module.exports = router;

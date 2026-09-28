const rateLimit = require("express-rate-limit");

const rateLimitHandler = (message, code = "RATE_LIMIT_EXCEEDED") => (req, res) => {
  res.status(429).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many requests from this IP, please try again after 15 minutes"),
  skip: (req) => process.env.NODE_ENV === "test",
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 authentication requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many authentication attempts, please try again after 15 minutes", "AUTH_RATE_LIMIT"),
  skip: (req) => process.env.NODE_ENV === "test",
});

const paymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each IP to 20 payment attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many payment attempts, please try again in a few minutes", "PAYMENT_RATE_LIMIT"),
  skip: (req) => process.env.NODE_ENV === "test",
});

module.exports = {
  apiLimiter,
  authLimiter,
  paymentLimiter,
};

const { AppError } = require("./errorHandler");

/**
 * Higher-order validation middleware that checks required fields and types.
 * @param {Object} schema - e.g. { body: { amount: { required: true, type: 'number', min: 1 } } }
 */
const validate = (schema) => (req, res, next) => {
  const errors = [];

  for (const [location, rules] of Object.entries(schema)) {
    const data = req[location] || {};

    for (const [field, rule] of Object.entries(rules)) {
      const val = data[field];

      if (rule.required && (val === undefined || val === null || val === "")) {
        errors.push({ field, message: `${field} is required in ${location}` });
        continue;
      }

      if (val !== undefined && val !== null && val !== "") {
        if (rule.type === "number" && (typeof val !== "number" || isNaN(val))) {
          errors.push({ field, message: `${field} must be a valid number` });
        } else if (rule.type === "string" && typeof val !== "string") {
          errors.push({ field, message: `${field} must be a string` });
        } else if (rule.type === "array" && !Array.isArray(val)) {
          errors.push({ field, message: `${field} must be an array` });
        }

        if (rule.type === "number") {
          if (rule.min !== undefined && val < rule.min) {
            errors.push({ field, message: `${field} must be at least ${rule.min}` });
          }
          if (rule.max !== undefined && val > rule.max) {
            errors.push({ field, message: `${field} cannot exceed ${rule.max}` });
          }
        }

        if (rule.type === "string") {
          if (rule.minLength && val.trim().length < rule.minLength) {
            errors.push({ field, message: `${field} must be at least ${rule.minLength} characters` });
          }
          if (rule.maxLength && val.trim().length > rule.maxLength) {
            errors.push({ field, message: `${field} cannot exceed ${rule.maxLength} characters` });
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    return next(new AppError("Validation failed", 400, "VALIDATION_ERROR", errors));
  }

  next();
};

module.exports = { validate };

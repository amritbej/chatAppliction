const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmail = (email = "") => emailPattern.test(email.trim());

module.exports = { isValidEmail };

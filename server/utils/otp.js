const crypto = require("crypto");

const OTP_TTL_MINUTES = 10;

const createOtp = () => crypto.randomInt(100000, 1000000).toString();

const hashOtp = (otp) =>
  crypto.createHash("sha256").update(otp.toString()).digest("hex");

const isOtpExpired = (expiresAt) => !expiresAt || expiresAt.getTime() < Date.now();

const setOtpFields = (user, hashField, expiresField, otp) => {
  user[hashField] = hashOtp(otp);
  user[expiresField] = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
};

const matchesOtp = (otp, otpHash) => Boolean(otp && otpHash && hashOtp(otp) === otpHash);

module.exports = {
  OTP_TTL_MINUTES,
  createOtp,
  hashOtp,
  isOtpExpired,
  setOtpFields,
  matchesOtp,
};

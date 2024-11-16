const { ENV } = require("./constants");
const crypto = require("crypto");

function hashPassword(password) {
  const hash = crypto
    .createHash("sha256", ENV.JWT_SECRET)
    .update(password)
    .digest("hex");
  return hash;
}

function comparePassword(plainPassword, hashedPassword) {
  return hashPassword(plainPassword) === hashedPassword;
}

module.exports = { hashPassword, comparePassword };

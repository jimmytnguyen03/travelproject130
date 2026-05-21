const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "dev-only-fallback-secret-do-not-use-in-prod";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET not set. Using insecure fallback. Set it in .env.");
}

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };

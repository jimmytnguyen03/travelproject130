// Authentication middleware — gatekeeper for every protected route.
// Applied to all /api/bookings routes. Implements the JWT half of Spec §3.4.

const { verifyToken } = require("../utils/jwt"); // wraps jsonwebtoken.verify with our secret

// requireAuth(req, res, next)
// Express middleware: runs BEFORE the controller. If the request carries a valid
// Bearer JWT, it attaches { userId, tenantId } to req.user and calls next().
// Otherwise it short-circuits with 401 and the controller never runs.
function requireAuth(req, res, next) {
  // 1. Read the Authorization header. Expected format: "Bearer <token>".
  //    The "Bearer" scheme is the standard chosen by RFC 6750 for OAuth/JWT.
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  // 2. Reject anything that isn't a Bearer header with a token. This is the
  //    "no key, no entry" gate — without it, a request to /api/bookings would
  //    have no userId or tenantId, so the controller couldn't enforce isolation.
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing or malformed Authorization header" });
  }

  try {
    // 3. Verify the signature against JWT_SECRET. This proves WE issued the token.
    //    verifyToken also checks the "exp" claim — expired tokens throw here.
    //    A tampered payload (e.g. attacker swapping tenantId) fails the signature
    //    check, so this single line enforces both authenticity and integrity.
    const payload = verifyToken(token);

    // 4. Attach trusted identity to the request. Downstream controllers read
    //    req.user instead of req.body for these fields — that's how we keep
    //    tenant_id authoritative (Phase 1 AC 4.2). Anything in req.body could be
    //    forged by the client; req.user came from a token we cryptographically signed.
    req.user = { userId: payload.userId, tenantId: payload.tenantId };
    return next();
  } catch (err) {
    // verifyToken throws on invalid signature OR expired token. We don't leak
    // which one happened — clients just see a generic 401.
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { requireAuth };

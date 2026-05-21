// Authentication controller — signup and login for the multi-tenant SaaS.
// Maps to Phase 1 User Story 4 (multi-tenant SaaS)

const bcrypt = require("bcryptjs");              // password hashing — slow + auto-salted
const { Tenant, User } = require("../models");
const { signToken } = require("../utils/jwt");   // wraps jsonwebtoken.sign with our secret + expiry


// POST /api/auth/signup
// Registers a new customer under a specific travel agency (tenant) and returns a JWT.
async function signup(req, res) {
  try {
    // 1. Read input. `tenantDomain` is what makes signup multi-tenant — the same
    //    email can exist under different agencies as separate accounts.
    const { email, password, name, tenantDomain } = req.body || {};

    // 2. Reject missing fields with 400 BEFORE saving the database.
    if (!email || !password || !name || !tenantDomain) {
      return res.status(400).json({
        message: "email, password, name, and tenantDomain are required",
      });
    }

    // 3. Resolve the tenant by its domain. Unknown agency → 400 (client mistake),
    const tenant = await Tenant.findOne({ where: { domain: tenantDomain } });
    if (!tenant) {
      return res.status(400).json({ message: "Unknown tenantDomain" });
    }

    // 4. Enforce the composite unique index (tenantId, email).
    //    Same e-mail exist in different agency but not at the same agency.
    const existing = await User.findOne({ where: { tenantId: tenant.id, email } });
    if (existing) {
      return res.status(409).json({ message: "Email already registered for this tenant" });
    }

    // 5. Hash the password with bcrypt (cost factor 10).
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      tenantId: tenant.id,
      email,
      passwordHash,
      name,
      role: "customer",
    });

    // 6. Issue a JWT carrying { userId, tenantId }. create a signed token 
    //    that has the user's ID and tenant's ID inside it, and give it to the client.
    const token = signToken({ userId: user.id, tenantId: tenant.id });

    // 7. Return 201 Created. We intentionally omit passwordHash and role so internal
    //    fields never leak to the client.
    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, tenantId: tenant.id },
    });
  } catch (err) {
    // Catch-all for unexpected DB / bcrypt failures. The detailed error stays in the
    // server log; the client only sees a generic 500.
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Signup failed" });
  }
}


// POST /api/auth/login
// Verifies credentials within a tenant scope and returns a fresh JWT.
async function login(req, res) {
  try {
    const { email, password, tenantDomain } = req.body || {};

    // Same up-front validation pattern as signup.
    if (!email || !password || !tenantDomain) {
      return res.status(400).json({
        message: "email, password, and tenantDomain are required",
      });
    }

    // Login is also tenant-scoped — we look up the user *within* the agency.
    const tenant = await Tenant.findOne({ where: { domain: tenantDomain } });
    if (!tenant) {
      return res.status(400).json({ message: "Unknown tenantDomain" });
    }

    // If the user doesn't exist we DO NOT reveal that fact — fall through to the
    // same generic 401 below.
    const user = await User.findOne({ where: { tenantId: tenant.id, email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // bcrypt.compare is timing-safe and re-runs the same hash used at signup.
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      // SECURITY: same 401 message whether the email was unknown or the password
      // was wrong. Blocks email-enumeration attacks where an attacker probes
      // "does this email exist?" by watching error responses.
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Fresh JWT on every login. Same payload shape as signup so downstream
    // middleware doesn't care which entry point produced the token.
    const token = signToken({ userId: user.id, tenantId: tenant.id });

    return res.status(200).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, tenantId: tenant.id },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
}

module.exports = { signup, login };

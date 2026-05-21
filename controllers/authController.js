const bcrypt = require("bcryptjs");
const { Tenant, User } = require("../models");
const { signToken } = require("../utils/jwt");

async function signup(req, res) {
  try {
    const { email, password, name, tenantDomain } = req.body || {};

    if (!email || !password || !name || !tenantDomain) {
      return res.status(400).json({
        message: "email, password, name, and tenantDomain are required",
      });
    }

    const tenant = await Tenant.findOne({ where: { domain: tenantDomain } });
    if (!tenant) {
      return res.status(400).json({ message: "Unknown tenantDomain" });
    }

    const existing = await User.findOne({ where: { tenantId: tenant.id, email } });
    if (existing) {
      return res.status(409).json({ message: "Email already registered for this tenant" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      tenantId: tenant.id,
      email,
      passwordHash,
      name,
      role: "customer",
    });

    const token = signToken({ userId: user.id, tenantId: tenant.id });

    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, tenantId: tenant.id },
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Signup failed" });
  }
}

async function login(req, res) {
  try {
    const { email, password, tenantDomain } = req.body || {};

    if (!email || !password || !tenantDomain) {
      return res.status(400).json({
        message: "email, password, and tenantDomain are required",
      });
    }

    const tenant = await Tenant.findOne({ where: { domain: tenantDomain } });
    if (!tenant) {
      return res.status(400).json({ message: "Unknown tenantDomain" });
    }

    const user = await User.findOne({ where: { tenantId: tenant.id, email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

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

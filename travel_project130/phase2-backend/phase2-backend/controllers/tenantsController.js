const { Tenant } = require("../models");

async function getBranding(req, res) {
  try {
    const { domain } = req.params;
    const tenant = await Tenant.findOne({ where: { domain } });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    res.json({
      name: tenant.name,
      logoUrl: tenant.logoUrl || null,
      themeColor: tenant.themeColor || "#0057b8",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = { getBranding };

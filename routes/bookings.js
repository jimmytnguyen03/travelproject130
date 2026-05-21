const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { create, list, getById, cancel } = require("../controllers/bookingsController");

router.use(requireAuth);

router.post("/", create);
router.get("/", list);
router.get("/:id", getById);
router.patch("/:id/cancel", cancel);

module.exports = router;

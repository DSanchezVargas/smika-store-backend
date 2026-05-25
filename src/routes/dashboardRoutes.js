const express = require("express");

const {
  getDashboardSummary
} = require("../controllers/dashboardController");

const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get(
  "/summary",
  protect,
  authorizeRoles("admin"),
  getDashboardSummary
);

module.exports = router;
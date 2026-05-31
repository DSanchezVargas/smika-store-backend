const express = require("express");

const {
  getAvailabilities,
  getAvailabilityById,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  syncAvailabilities
} = require("../controllers/availabilityController");

const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/", getAvailabilities);
router.get("/:id", getAvailabilityById);

router.post(
  "/sync",
  protect,
  authorizeRoles("admin", "subadmin"),
  syncAvailabilities
);

router.post(
  "/",
  protect,
  authorizeRoles("admin", "subadmin"),
  createAvailability
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "subadmin"),
  updateAvailability
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "subadmin"),
  deleteAvailability
);

module.exports = router;
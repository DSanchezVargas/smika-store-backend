const express = require("express");

const {
  getEventTypes,
  getEventTypeById,
  createEventType,
  updateEventType,
  deleteEventType
} = require("../controllers/eventTypeController");

const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/", getEventTypes);
router.get("/:id", getEventTypeById);

router.post(
  "/",
  protect,
  authorizeRoles("admin", "subadmin"),
  createEventType
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "subadmin"),
  updateEventType
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "subadmin"),
  deleteEventType
);

module.exports = router;
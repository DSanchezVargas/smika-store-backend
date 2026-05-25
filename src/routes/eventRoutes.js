const express = require("express");

const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
} = require("../controllers/eventController");

const {
  createEventValidator,
  updateEventValidator
} = require("../validators/eventValidator");

const { validateFields } = require("../middlewares/validateMiddleware");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/", getEvents);
router.get("/:id", getEventById);

router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  createEventValidator,
  validateFields,
  createEvent
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin"),
  updateEventValidator,
  validateFields,
  updateEvent
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  deleteEvent
);

module.exports = router;
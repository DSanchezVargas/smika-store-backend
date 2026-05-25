const express = require("express");

const {
  getMyNotifications,
  createNotification,
  getNotificationsForAdmin,
  markNotificationAsRead,
  markAllMyNotificationsAsRead,
  deactivateNotification
} = require("../controllers/notificationController");

const {
  createNotificationValidator,
  notificationIdValidator
} = require("../validators/notificationValidator");

const { validateFields } = require("../middlewares/validateMiddleware");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/me", protect, getMyNotifications);

router.patch(
  "/read-all",
  protect,
  markAllMyNotificationsAsRead
);

router.patch(
  "/:id/read",
  protect,
  notificationIdValidator,
  validateFields,
  markNotificationAsRead
);

router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  createNotificationValidator,
  validateFields,
  createNotification
);

router.get(
  "/admin",
  protect,
  authorizeRoles("admin"),
  getNotificationsForAdmin
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  notificationIdValidator,
  validateFields,
  deactivateNotification
);

module.exports = router;
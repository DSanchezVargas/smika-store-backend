const express = require("express");

const {
  getUsers,
  getUserById,
  createSubadmin,
  updateUserRole,
  updateUserData,
  deactivateUser
} = require("../controllers/userController");

const {
  userIdValidator,
  createSubadminValidator,
  updateUserRoleValidator,
  updateUserDataValidator
} = require("../validators/userValidator");

const { validateFields } = require("../middlewares/validateMiddleware");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("admin"),
  getUsers
);

router.post(
  "/subadmins",
  protect,
  authorizeRoles("admin"),
  createSubadminValidator,
  validateFields,
  createSubadmin
);

router.get(
  "/:id",
  protect,
  authorizeRoles("admin"),
  userIdValidator,
  validateFields,
  getUserById
);

router.patch(
  "/:id/role",
  protect,
  authorizeRoles("admin"),
  updateUserRoleValidator,
  validateFields,
  updateUserRole
);

router.patch(
  "/:id",
  protect,
  authorizeRoles("admin"),
  updateUserDataValidator,
  validateFields,
  updateUserData
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  userIdValidator,
  validateFields,
  deactivateUser
);

module.exports = router;
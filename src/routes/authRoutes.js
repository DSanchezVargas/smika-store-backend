const express = require("express");

const {
  register,
  login,
  profile,
  changePassword,
  forgotPassword,
  resetPassword,
  googleLogin
} = require("../controllers/authController");

const {
  registerValidator,
  loginValidator
} = require("../validators/authValidator");

const { validateFields } = require("../middlewares/validateMiddleware");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post(
  "/register",
  registerValidator,
  validateFields,
  register
);

router.post(
  "/login",
  loginValidator,
  validateFields,
  login
);

router.get(
  "/profile",
  protect,
  profile
);

router.patch(
  "/change-password",
  protect,
  changePassword
);

router.post(
  "/forgot-password",
  forgotPassword
);

router.post(
  "/reset-password",
  resetPassword
);

router.post(
  "/google",
  googleLogin
);

module.exports = router;

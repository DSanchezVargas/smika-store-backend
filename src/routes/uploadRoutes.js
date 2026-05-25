const express = require("express");

const {
  uploadSingleImage,
  uploadMultipleImages
} = require("../controllers/uploadController");

const upload = require("../middlewares/uploadMiddleware");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.post(
  "/single",
  protect,
  authorizeRoles("admin"),
  upload.single("image"),
  uploadSingleImage
);

router.post(
  "/multiple",
  protect,
  authorizeRoles("admin"),
  upload.array("images", 10),
  uploadMultipleImages
);

module.exports = router;
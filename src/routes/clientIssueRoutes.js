const express = require("express");

const {
  createClientIssue,
  getMyClientIssues,
  getClientIssues,
  updateClientIssue,
  deleteClientIssue
} = require("../controllers/clientIssueController");

const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.post("/", protect, createClientIssue);
router.get("/mine", protect, getMyClientIssues);

router.get(
  "/",
  protect,
  authorizeRoles("admin", "subadmin"),
  getClientIssues
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "subadmin"),
  updateClientIssue
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "subadmin"),
  deleteClientIssue
);

module.exports = router;

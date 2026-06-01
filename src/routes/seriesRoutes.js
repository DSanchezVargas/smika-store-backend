const express = require("express");

const {
  getSeries,
  getSeriesById,
  createSeries,
  updateSeries,
  deleteSeries
} = require("../controllers/seriesController");

const {
  createSerieValidator,
  updateSerieValidator
} = require("../validators/serieValidator");

const { validateFields } = require("../middlewares/validateMiddleware");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/", getSeries);
router.get("/:id", getSeriesById);

router.post(
  "/",
  protect,
  authorizeRoles("admin", "subadmin"),
  createSerieValidator,
  validateFields,
  createSeries
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "subadmin"),
  updateSerieValidator,
  validateFields,
  updateSeries
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "subadmin"),
  deleteSeries
);

module.exports = router;
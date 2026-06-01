const express = require("express");

const {
  getSeries,
  getSeriesById,
  createSeries,
  updateSeries,
  deleteSeries,
  deleteRemovedSeries
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


router.delete(
  "/cleanup/unwanted",
  protect,
  authorizeRoles("admin", "subadmin"),
  deleteRemovedSeries
);

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
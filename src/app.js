const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const originRoutes = require("./routes/originRoutes");
const creatorRoutes = require("./routes/creatorRoutes");
const characterRoutes = require("./routes/characterRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const seriesRoutes = require("./routes/seriesRoutes");
const productRoutes = require("./routes/productRoutes");
const productTypeRoutes = require("./routes/productTypeRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const eventRoutes = require("./routes/eventRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const userRoutes = require("./routes/userRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const preferenceRoutes = require("./routes/preferenceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");

const { notFound, errorHandler } = require("./middlewares/errorMiddleware");

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(
  express.json({
    limit: "25mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "25mb"
  })
);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (req, res) => {
  res.json({
    message: "API de Smika Store funcionando correctamente",
    project: "E-commerce con lista de pedido y redirección a WhatsApp"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend de Smika Store activo"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/origins", originRoutes);
app.use("/api/creators", creatorRoutes);
app.use("/api/characters", characterRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/series", seriesRoutes);
app.use("/api/products", productRoutes);
app.use("/api/product-types", productTypeRoutes);
app.use("/api/availabilities", availabilityRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/preferences", preferenceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/recommendations", recommendationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
const { param, body } = require("express-validator");

const mongoIdParam = (fieldName, message) => {
  return param(fieldName)
    .isMongoId()
    .withMessage(message);
};

const toggleSeriesValidator = [
  mongoIdParam("serieId", "La serie debe ser un ID válido")
];

const toggleCategoryValidator = [
  mongoIdParam("categoryId", "La categoría debe ser un ID válido")
];

const toggleProductValidator = [
  mongoIdParam("productId", "El producto debe ser un ID válido")
];

const updateNotificationPreferenceValidator = [
  body("recibirNotificaciones")
    .isBoolean()
    .withMessage("La preferencia de notificaciones debe ser verdadera o falsa")
];

module.exports = {
  toggleSeriesValidator,
  toggleCategoryValidator,
  toggleProductValidator,
  updateNotificationPreferenceValidator
};
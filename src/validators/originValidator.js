const { body } = require("express-validator");

const createOriginValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El país u origen es obligatorio")
    .isLength({ min: 2 })
    .withMessage("El país u origen debe tener al menos 2 caracteres"),

  body("descripcion")
    .optional()
    .isString()
    .withMessage("La descripción debe ser texto")
];

const updateOriginValidator = createOriginValidator;

module.exports = {
  createOriginValidator,
  updateOriginValidator
};
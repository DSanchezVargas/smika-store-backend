const { body } = require("express-validator");

const createSerieValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre de la serie es obligatorio")
    .isLength({ min: 2 })
    .withMessage("El nombre debe tener al menos 2 caracteres"),

  body("descripcion")
    .optional()
    .isString()
    .withMessage("La descripción debe ser texto"),

  body("imagen")
    .optional()
    .isString()
    .withMessage("La imagen debe ser una ruta generada por el sistema"),

  body("categoriaPrincipal")
    .notEmpty()
    .withMessage("La categoría principal es obligatoria")
    .isMongoId()
    .withMessage("La categoría principal debe ser un ID válido"),

  body("subcategoria")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("La subcategoría debe ser un ID válido"),

  body("origen")
    .notEmpty()
    .withMessage("El país u origen de la serie es obligatorio")
    .isMongoId()
    .withMessage("El país u origen debe ser un ID válido"),

  body("creadores")
    .optional()
    .isArray()
    .withMessage("Los creadores deben enviarse como un arreglo"),

  body("creadores.*")
    .optional()
    .isMongoId()
    .withMessage("Cada creador debe ser un ID válido"),

  body("destacada")
    .optional()
    .isBoolean()
    .withMessage("El campo destacada debe ser verdadero o falso"),

  body("orden")
    .optional()
    .isNumeric()
    .withMessage("El orden debe ser numérico")
];

const updateSerieValidator = createSerieValidator;

module.exports = {
  createSerieValidator,
  updateSerieValidator
};
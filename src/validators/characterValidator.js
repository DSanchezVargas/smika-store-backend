const { body } = require("express-validator");

const optionalText = (field, message) =>
  body(field).optional({ nullable: true, checkFalsy: true }).isString().withMessage(message);

const optionalBoolean = (field, message) =>
  body(field).optional().isBoolean().withMessage(message);

const createCharacterValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre del personaje es obligatorio")
    .isLength({ min: 2 })
    .withMessage("El nombre debe tener al menos 2 caracteres"),

  optionalText("tipo", "El tipo debe ser texto"),
  optionalText("descripcion", "La descripción debe ser texto"),
  optionalText("imagen", "La imagen debe ser texto"),
  optionalText("serie", "La serie debe enviarse como texto o ID"),
  optionalText("serieNombre", "El nombre de la serie debe ser texto"),
  optionalText("estado", "El estado debe ser texto"),
  optionalBoolean("needsReview", "El campo needsReview debe ser verdadero o falso"),
  optionalBoolean("activo", "El campo activo debe ser verdadero o falso")
];

const updateCharacterValidator = [
  body("nombre")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 2 })
    .withMessage("El nombre debe tener al menos 2 caracteres"),

  optionalText("tipo", "El tipo debe ser texto"),
  optionalText("descripcion", "La descripción debe ser texto"),
  optionalText("imagen", "La imagen debe ser texto"),
  optionalText("serie", "La serie debe enviarse como texto o ID"),
  optionalText("serieNombre", "El nombre de la serie debe ser texto"),
  optionalText("estado", "El estado debe ser texto"),
  optionalBoolean("needsReview", "El campo needsReview debe ser verdadero o falso"),
  optionalBoolean("activo", "El campo activo debe ser verdadero o falso")
];

module.exports = {
  createCharacterValidator,
  updateCharacterValidator
};
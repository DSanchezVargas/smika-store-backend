const { body } = require("express-validator");

const optionalText = (field, message) =>
  body(field)
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(message);

const optionalBoolean = (field, message) =>
  body(field).optional().isBoolean().withMessage(message);

const optionalNumber = (field, message) =>
  body(field)
    .optional({ nullable: true, checkFalsy: true })
    .isNumeric()
    .withMessage(message);

const optionalMongoId = (field, message) =>
  body(field)
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage(message);

const optionalArray = (field, message) =>
  body(field).optional().isArray().withMessage(message);

const createSerieValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre de la serie es obligatorio")
    .isLength({ min: 2 })
    .withMessage("El nombre debe tener al menos 2 caracteres"),

  optionalText("descripcion", "La descripción debe ser texto"),
  optionalText("imagen", "La imagen debe ser texto"),

  optionalArray("imagenes", "Las imágenes deben enviarse como arreglo"),

  optionalBoolean(
    "imagenesTouched",
    "El campo imagenesTouched debe ser verdadero o falso"
  ),

  optionalBoolean(
    "imagesTouched",
    "El campo imagesTouched debe ser verdadero o falso"
  ),

  optionalBoolean(
    "replaceImages",
    "El campo replaceImages debe ser verdadero o falso"
  ),

  optionalBoolean(
    "reemplazarImagenes",
    "El campo reemplazarImagenes debe ser verdadero o falso"
  ),

  optionalMongoId(
    "categoriaPrincipal",
    "La categoría principal debe ser un ID válido"
  ),

  optionalText("categoriaPrincipalNombre", "El nombre de categoría debe ser texto"),
  optionalText("categoriaNombre", "El nombre de categoría debe ser texto"),

  optionalMongoId("subcategoria", "La subcategoría debe ser un ID válido"),
  optionalText("subcategoriaNombre", "El nombre de subcategoría debe ser texto"),

  optionalMongoId("origen", "El origen debe ser un ID válido"),
  optionalText("origenNombre", "El nombre de origen debe ser texto"),
  optionalText("pais", "El país debe ser texto"),

  optionalText("tipo", "El tipo debe ser texto"),
  optionalText("genero", "El género debe ser texto"),
  optionalText("autor", "El autor debe ser texto"),

  optionalArray("creadores", "Los creadores deben enviarse como arreglo"),

  body("creadores.*")
    .optional()
    .isMongoId()
    .withMessage("Cada creador debe ser un ID válido"),

  optionalArray(
    "creadoresNombre",
    "Los nombres de creadores deben enviarse como arreglo"
  ),

  optionalBoolean("destacada", "El campo destacada debe ser verdadero o falso"),
  optionalBoolean("activa", "El campo activa debe ser verdadero o falso"),
  optionalBoolean("activo", "El campo activo debe ser verdadero o falso"),
  optionalNumber("orden", "El orden debe ser numérico")
];

const updateSerieValidator = [
  body("nombre")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 2 })
    .withMessage("El nombre debe tener al menos 2 caracteres"),

  ...createSerieValidator.filter((validator, index) => index !== 0)
];

module.exports = {
  createSerieValidator,
  updateSerieValidator
};
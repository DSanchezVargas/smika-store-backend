const { body } = require("express-validator");

const optionalText = (field, message) =>
  body(field)
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(message);

const optionalBoolean = (field, message) =>
  body(field).optional().isBoolean().withMessage(message);

const optionalDate = (field, message) =>
  body(field)
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage(message);

const optionalMongoId = (field, message) =>
  body(field)
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage(message);

const optionalArray = (field, message) =>
  body(field).optional().isArray().withMessage(message);

const createEventValidator = [
  body("titulo")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 2 })
    .withMessage("El título debe tener al menos 2 caracteres"),

  body("nombre")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 2 })
    .withMessage("El nombre debe tener al menos 2 caracteres"),

  optionalText("descripcion", "La descripción del evento debe ser texto"),
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

  optionalMongoId("categoria", "La categoría debe ser un ID válido"),
  optionalText("categoriaNombre", "El nombre de la categoría debe ser texto"),

  optionalText("serie", "La serie debe enviarse como texto o ID"),
  optionalText("serieNombre", "El nombre de la serie debe ser texto"),

  optionalArray("series", "Las series deben enviarse como arreglo"),
  optionalArray(
    "seriesNombre",
    "Los nombres de series deben enviarse como arreglo"
  ),
  optionalArray(
    "seriesTexto",
    "Los textos de series deben enviarse como arreglo"
  ),

  optionalMongoId("origen", "El origen debe ser un ID válido"),
  optionalText("origenNombre", "El nombre de origen debe ser texto"),
  optionalText("pais", "El país debe ser texto"),

  optionalText("tipoEvento", "El tipo de evento debe ser texto"),
  optionalText("tipo", "El tipo debe ser texto"),

  optionalDate("fechaInicio", "La fecha de inicio debe tener un formato válido"),
  optionalDate("fechaFin", "La fecha de fin debe tener un formato válido"),

  body("estado")
    .optional()
    .isIn(["proximo", "activo", "finalizado", "cancelado"])
    .withMessage("El estado del evento no es válido"),

  optionalBoolean("destacado", "El campo destacado debe ser verdadero o falso"),
  optionalBoolean("activo", "El campo activo debe ser verdadero o falso"),

  optionalArray("productos", "Los productos deben enviarse como arreglo"),

  body("productos.*")
    .optional()
    .isMongoId()
    .withMessage("Cada producto debe ser un ID válido")
];

const updateEventValidator = createEventValidator;

module.exports = {
  createEventValidator,
  updateEventValidator
};
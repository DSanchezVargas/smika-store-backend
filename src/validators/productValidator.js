const { body } = require("express-validator");
const mongoose = require("mongoose");

const isMongoIdOrEmpty = (value) => {
  if (value === undefined || value === null || value === "") return true;
  return mongoose.Types.ObjectId.isValid(value);
};

const hasValidPrice = (value, { req }) => {
  const price = req.body.precioReferencial ?? req.body.precio ?? req.body.price;

  if (price === undefined || price === null || price === "") {
    throw new Error("El precio referencial es obligatorio");
  }

  if (Number(price) < 0) {
    throw new Error("El precio no puede ser negativo");
  }

  return true;
};

const hasValidProductType = (value, { req }) => {
  const type = req.body.tipoProducto || req.body.tipo || req.body.type;

  if (!type || !type.toString().trim()) {
    throw new Error("El tipo de producto es obligatorio");
  }

  return true;
};

const createProductValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre del producto es obligatorio")
    .isLength({ min: 2 })
    .withMessage("El nombre debe tener al menos 2 caracteres"),

  body("descripcion")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("La descripción debe ser texto"),

  body("precioReferencial").custom(hasValidPrice),
  body("precio").optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }),
  body("price").optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }),

  body("precioAnterior")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage("El precio anterior no puede ser negativo"),

  body("imagenes")
    .optional()
    .isArray()
    .withMessage("Las imágenes deben enviarse como un arreglo"),

  body("categoria")
    .optional({ nullable: true, checkFalsy: true })
    .custom(isMongoIdOrEmpty)
    .withMessage("La categoría debe ser un ID válido"),

  body("subcategoria")
    .optional({ nullable: true, checkFalsy: true })
    .custom(isMongoIdOrEmpty)
    .withMessage("La subcategoría debe ser un ID válido"),

  body("serie")
    .optional({ nullable: true, checkFalsy: true })
    .custom(isMongoIdOrEmpty)
    .withMessage("La serie debe ser un ID válido"),

  body("evento")
    .optional({ nullable: true, checkFalsy: true })
    .custom(isMongoIdOrEmpty)
    .withMessage("El evento debe ser un ID válido"),

  body("origen")
    .optional({ nullable: true, checkFalsy: true })
    .custom(isMongoIdOrEmpty)
    .withMessage("El país u origen debe ser un ID válido"),

  body("personajes")
    .optional()
    .isArray()
    .withMessage("Los personajes deben enviarse como un arreglo"),

  body("personajes.*")
    .optional({ nullable: true, checkFalsy: true })
    .custom(isMongoIdOrEmpty)
    .withMessage("Cada personaje debe ser un ID válido"),

  body("tipoProducto").custom(hasValidProductType),

  body("marca")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("La marca debe ser texto"),

  body("material")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("El material debe ser texto"),

  body("tamano")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("El tamaño debe ser texto"),

  body("disponibilidad")
    .optional({ nullable: true, checkFalsy: true })
    .isIn(["stock", "preventa", "por_pedido", "agotado"])
    .withMessage("La disponibilidad no es válida"),

  body("estado")
    .optional({ nullable: true, checkFalsy: true })
    .isIn(["Activo", "Preventa", "Por pedido", "Agotado", "Inactivo"])
    .withMessage("El estado no es válido"),

  body("stock")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("El stock no puede ser negativo"),

  body("tiempoEstimado")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("El tiempo estimado debe ser texto"),

  body("adulto")
    .optional()
    .isBoolean()
    .withMessage("El campo adulto debe ser verdadero o falso"),

  body("esNuevo")
    .optional()
    .isBoolean()
    .withMessage("El campo esNuevo debe ser verdadero o falso"),

  body("esDestacado")
    .optional()
    .isBoolean()
    .withMessage("El campo esDestacado debe ser verdadero o falso"),

  body("activo")
    .optional()
    .isBoolean()
    .withMessage("El campo activo debe ser verdadero o falso")
];

const updateProductValidator = createProductValidator.map((validation) =>
  validation.optional({ nullable: true, checkFalsy: true })
);

module.exports = {
  createProductValidator,
  updateProductValidator
};
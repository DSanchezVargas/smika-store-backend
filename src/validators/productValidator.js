const { body } = require("express-validator");

const createProductValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre del producto es obligatorio")
    .isLength({ min: 2 })
    .withMessage("El nombre debe tener al menos 2 caracteres"),

  body("descripcion")
    .notEmpty()
    .withMessage("La descripción del producto es obligatoria"),

  body("precioReferencial")
    .notEmpty()
    .withMessage("El precio referencial es obligatorio")
    .isFloat({ min: 0 })
    .withMessage("El precio referencial no puede ser negativo"),

  body("precioAnterior")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage("El precio anterior no puede ser negativo"),

  body("imagenes")
    .optional()
    .isArray()
    .withMessage("Las imágenes deben enviarse como un arreglo de rutas generadas por el sistema"),

  body("categoria")
    .notEmpty()
    .withMessage("La categoría es obligatoria")
    .isMongoId()
    .withMessage("La categoría debe ser un ID válido"),

  body("subcategoria")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("La subcategoría debe ser un ID válido"),

  body("serie")
    .notEmpty()
    .withMessage("La serie del producto es obligatoria")
    .isMongoId()
    .withMessage("La serie debe ser un ID válido"),

  body("evento")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("El evento debe ser un ID válido"),

  body("origen")
    .notEmpty()
    .withMessage("El país u origen del producto es obligatorio")
    .isMongoId()
    .withMessage("El país u origen debe ser un ID válido"),

  body("personajes")
    .optional()
    .isArray()
    .withMessage("Los personajes deben enviarse como un arreglo"),

  body("personajes.*")
    .optional()
    .isMongoId()
    .withMessage("Cada personaje debe ser un ID válido"),

  body("marca")
    .optional()
    .isString()
    .withMessage("La marca debe ser texto"),

  body("tipoProducto")
    .notEmpty()
    .withMessage("El tipo de producto es obligatorio"),

  body("disponibilidad")
    .optional()
    .isIn(["stock", "preventa", "por_pedido", "agotado"])
    .withMessage("La disponibilidad no es válida"),

  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("El stock no puede ser negativo"),

  body("tiempoEstimado")
    .optional()
    .isString()
    .withMessage("El tiempo estimado debe ser texto"),

  body("esNuevo")
    .optional()
    .isBoolean()
    .withMessage("El campo esNuevo debe ser verdadero o falso"),

  body("esDestacado")
    .optional()
    .isBoolean()
    .withMessage("El campo esDestacado debe ser verdadero o falso")
];

const updateProductValidator = createProductValidator;

module.exports = {
  createProductValidator,
  updateProductValidator
};
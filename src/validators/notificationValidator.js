const { body, param } = require("express-validator");

const createNotificationValidator = [
  body("titulo")
    .notEmpty()
    .withMessage("El título de la notificación es obligatorio")
    .isLength({ min: 2 })
    .withMessage("El título debe tener al menos 2 caracteres"),

  body("mensaje")
    .notEmpty()
    .withMessage("El mensaje de la notificación es obligatorio")
    .isLength({ min: 5 })
    .withMessage("El mensaje debe tener al menos 5 caracteres"),

  body("tipo")
    .optional()
    .isIn([
      "manual",
      "stock_bajo",
      "producto_agotado",
      "producto_restock",
      "evento_proximo",
      "novedad",
      "producto",
      "serie",
      "categoria",
      "pedido_actualizado",
      "pago_pendiente",
      "pedido_confirmado",
      "pedido_empaquetado",
      "pedido_enviado",
      "tracking_disponible",
      "pedido_entregado"
    ])
    .withMessage("El tipo de notificación no es válido"),

  body("destinatarioTipo")
    .optional()
    .isIn([
      "todos",
      "usuarios_especificos",
      "por_preferencias",
      "por_lista_deseos",
      "por_pedido"
    ])
    .withMessage("El tipo de destinatario no es válido"),

  body("usuarios")
    .optional()
    .isArray()
    .withMessage("Los usuarios deben enviarse como un arreglo"),

  body("usuarios.*")
    .optional()
    .isMongoId()
    .withMessage("Cada usuario debe ser un ID válido"),

  body("producto")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("El producto debe ser un ID válido"),

  body("serie")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("La serie debe ser un ID válido"),

  body("categoria")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("La categoría debe ser un ID válido"),

  body("evento")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("El evento debe ser un ID válido"),

  body("pedido")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("El pedido debe ser un ID válido")
];

const notificationIdValidator = [
  param("id")
    .isMongoId()
    .withMessage("La notificación debe ser un ID válido")
];

module.exports = {
  createNotificationValidator,
  notificationIdValidator
};
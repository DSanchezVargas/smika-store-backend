const mongoose = require("mongoose");

const readBySchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    fechaLectura: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: false
  }
);

const notificationSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: [true, "El título de la notificación es obligatorio"],
      trim: true
    },

    mensaje: {
      type: String,
      required: [true, "El mensaje de la notificación es obligatorio"],
      trim: true
    },

    tipo: {
      type: String,
      enum: [
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
      ],
      default: "manual"
    },

    destinatarioTipo: {
      type: String,
      enum: [
        "todos",
        "usuarios_especificos",
        "por_preferencias",
        "por_lista_deseos",
        "por_pedido"
      ],
      default: "todos"
    },

    usuarios: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    producto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null
    },

    serie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series",
      default: null
    },

    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null
    },

    evento: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null
    },

    pedido: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null
    },

    creadaPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    notaWhatsapp: {
      type: String,
      trim: true,
      default:
        "Si deseas recibir estos datos directamente por WhatsApp, comunícate con la administradora de Smika Store para coordinarlo."
    },

    leidaPor: {
      type: [readBySchema],
      default: []
    },

    activa: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
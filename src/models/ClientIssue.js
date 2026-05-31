const mongoose = require("mongoose");

const clientIssueSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    usuarioNombre: {
      type: String,
      trim: true,
      default: ""
    },

    usuarioEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },

    tipo: {
      type: String,
      enum: [
        "comentario_pagina",
        "algo_no_carga",
        "falla_producto",
        "falla_pedido",
        "problema_visual",
        "otro"
      ],
      default: "comentario_pagina"
    },

    titulo: {
      type: String,
      trim: true,
      default: ""
    },

    descripcion: {
      type: String,
      required: [true, "La descripción de la incidencia es obligatoria"],
      trim: true
    },

    pagina: {
      type: String,
      trim: true,
      default: ""
    },

    estado: {
      type: String,
      enum: ["pendiente", "revisado", "resuelto", "descartado"],
      default: "pendiente"
    },

    prioridad: {
      type: String,
      enum: ["baja", "media", "alta"],
      default: "media"
    },

    respuestaAdmin: {
      type: String,
      trim: true,
      default: ""
    },

    revisadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    activo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("ClientIssue", clientIssueSchema);

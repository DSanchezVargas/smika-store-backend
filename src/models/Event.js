const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: [true, "El título del evento es obligatorio"],
      trim: true
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    descripcion: {
      type: String,
      required: [true, "La descripción del evento es obligatoria"],
      trim: true
    },

    imagen: {
      type: String,
      default: ""
    },

    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "La categoría del evento es obligatoria"]
    },

    serie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series",
      required: [true, "La serie relacionada al evento es obligatoria"]
    },

    origen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Origin",
      required: [true, "El país u origen del evento es obligatorio"]
    },

    tipoEvento: {
      type: String,
      trim: true,
      default: "Otro"
    },

    fechaInicio: {
      type: Date,
      default: null
    },

    fechaFin: {
      type: Date,
      default: null
    },

    estado: {
      type: String,
      enum: ["proximo", "activo", "finalizado", "cancelado"],
      default: "proximo"
    },

    destacado: {
      type: Boolean,
      default: false
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

module.exports = mongoose.model("Event", eventSchema);
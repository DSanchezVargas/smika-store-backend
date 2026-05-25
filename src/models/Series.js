const mongoose = require("mongoose");

const seriesSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre de la serie es obligatorio"],
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
      trim: true,
      default: ""
    },

    imagen: {
      type: String,
      default: ""
    },

    categoriaPrincipal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "La categoría principal es obligatoria"]
    },

    subcategoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null
    },

    origen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Origin",
      required: [true, "El país u origen de la serie es obligatorio"]
    },

    creadores: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Creator"
      }
    ],

    destacada: {
      type: Boolean,
      default: false
    },

    activa: {
      type: Boolean,
      default: true
    },

    orden: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Series", seriesSchema);
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
      default: null
    },

    categoriaPrincipalNombre: {
      type: String,
      trim: true,
      default: "Series"
    },

    subcategoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null
    },

    subcategoriaNombre: {
      type: String,
      trim: true,
      default: ""
    },

    origen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Origin",
      default: null
    },

    origenNombre: {
      type: String,
      trim: true,
      default: "Variado"
    },

    pais: {
      type: String,
      trim: true,
      default: "V"
    },

    creadores: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Creator"
      }
    ],

    creadoresNombre: {
      type: [String],
      default: []
    },

    destacada: {
      type: Boolean,
      default: false
    },

    activa: {
      type: Boolean,
      default: true
    },

    activo: {
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

seriesSchema.set("toJSON", {
  virtuals: true
});

seriesSchema.set("toObject", {
  virtuals: true
});

module.exports = mongoose.model("Series", seriesSchema);
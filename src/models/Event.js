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
      trim: true,
      default: ""
    },

    imagen: {
      type: String,
      default: ""
    },

    imagenes: {
      type: [String],
      default: []
    },

    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null
    },

    categoriaNombre: {
      type: String,
      trim: true,
      default: "Eventos"
    },

    serie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series",
      default: null
    },

    serieNombre: {
      type: String,
      trim: true,
      default: ""
    },

    series: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Series"
      }
    ],

    seriesNombre: {
      type: [String],
      default: []
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
      enum: ["proximo", "preventa", "activo", "finalizado", "cancelado"],
      default: "proximo"
    },

    destacado: {
      type: Boolean,
      default: false
    },

    productos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      }
    ],

    activo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

eventSchema.set("toJSON", {
  virtuals: true
});

eventSchema.set("toObject", {
  virtuals: true
});

module.exports = mongoose.model("Event", eventSchema);
const mongoose = require("mongoose");

const EVENT_STATES = ["proximo", "preventa", "activo", "finalizado", "cancelado"];

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

    series: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Series"
        }
      ],
      default: []
    },

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
      enum: EVENT_STATES,
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

eventSchema.pre("validate", function syncLegacySeriesFields(next) {
  if (Array.isArray(this.series) && this.series.length > 0 && !this.serie) {
    this.serie = this.series[0];
  }

  if (
    Array.isArray(this.seriesNombre) &&
    this.seriesNombre.length > 0 &&
    !this.serieNombre
  ) {
    this.serieNombre = this.seriesNombre[0];
  }

  next();
});

eventSchema.set("toJSON", {
  virtuals: true
});

eventSchema.set("toObject", {
  virtuals: true
});

module.exports = mongoose.model("Event", eventSchema);
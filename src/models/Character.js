const mongoose = require("mongoose");

const characterSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre del personaje es obligatorio"],
      trim: true
    },

    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    tipo: {
      type: String,
      trim: true,
      default: "Personaje"
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

    serie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series",
      default: null
    },

    serieNombre: {
      type: String,
      trim: true,
      default: "Sin serie definida"
    },

    estado: {
      type: String,
      trim: true,
      default: "Completo"
    },

    needsReview: {
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

characterSchema.index(
  {
    nombre: 1,
    serie: 1,
    serieNombre: 1
  },
  {
    unique: true
  }
);

characterSchema.set("toJSON", {
  virtuals: true
});

characterSchema.set("toObject", {
  virtuals: true
});

module.exports = mongoose.model("Character", characterSchema);
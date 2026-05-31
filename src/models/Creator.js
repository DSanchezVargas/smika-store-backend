const mongoose = require("mongoose");

const creatorSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre del autor o creador es obligatorio"],
      trim: true
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    tipo: {
      type: String,
      trim: true,
      default: "Autor"
    },

    descripcion: {
      type: String,
      trim: true,
      default: ""
    },

    paisOrigen: {
      type: String,
      trim: true,
      default: ""
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

creatorSchema.set("toJSON", {
  virtuals: true
});

creatorSchema.set("toObject", {
  virtuals: true
});

module.exports = mongoose.model("Creator", creatorSchema);
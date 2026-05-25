const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true
    },

    apellido: {
      type: String,
      required: [true, "El apellido es obligatorio"],
      trim: true
    },

    alias: {
      type: String,
      trim: true,
      default: ""
    },

    pais: {
      type: String,
      trim: true,
      default: "PE"
    },

    codigoPais: {
      type: String,
      trim: true,
      default: "+51"
    },

    telefono: {
      type: String,
      trim: true,
      default: ""
    },

    telefonoCompleto: {
      type: String,
      trim: true,
      default: ""
    },

    email: {
      type: String,
      required: [true, "El correo es obligatorio"],
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: [true, "La contraseña es obligatoria"],
      minlength: 6
    },

    role: {
      type: String,
      enum: ["cliente", "admin"],
      default: "cliente"
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

module.exports = mongoose.model("User", userSchema);
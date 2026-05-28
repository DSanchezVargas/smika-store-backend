require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB conectado para crear admin.");

    const adminEmail = "soporte.smika@gmail.com";
    const adminPassword = "Smika_Supp26";

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      existingAdmin.nombre = "Smika";
      existingAdmin.apellido = "Support";
      existingAdmin.alias = "smika_admin";
      existingAdmin.email = adminEmail;
      existingAdmin.password = hashedPassword;
      existingAdmin.role = "admin";
      existingAdmin.authProvider = "local";
      existingAdmin.emailVerified = true;
      existingAdmin.activo = true;

      await existingAdmin.save();

      console.log("Admin actualizado correctamente.");
    } else {
      await User.create({
        nombre: "Smika",
        apellido: "Support",
        alias: "smika_admin",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        authProvider: "local",
        emailVerified: true,
        activo: true,
        pais: "PE",
        codigoPais: "+51",
        telefono: "",
        telefonoCompleto: ""
      });

      console.log("Admin creado correctamente.");
    }

    console.log("Credenciales admin:");
    console.log("Correo:", adminEmail);
    console.log("Contraseña:", adminPassword);

    process.exit(0);
  } catch (error) {
    console.error("Error al crear admin:", error.message);
    process.exit(1);
  }
};

seedAdmin();
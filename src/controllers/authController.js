const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { normalizePhoneData } = require("../utils/phoneHelper");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
};

const buildUserResponse = (user) => {
  return {
    id: user._id,
    nombre: user.nombre,
    apellido: user.apellido,
    alias: user.alias,
    pais: user.pais,
    codigoPais: user.codigoPais,
    telefono: user.telefono,
    telefonoCompleto: user.telefonoCompleto,
    email: user.email,
    role: user.role
  };
};

const register = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      alias,
      pais,
      codigoPais,
      telefono,
      email,
      password,
      role
    } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        message: "El correo ya está registrado."
      });
    }

    const phoneData = normalizePhoneData({
      pais,
      codigoPais,
      telefono
    });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const totalUsers = await User.countDocuments();

    const user = await User.create({
      nombre,
      apellido,
      alias,
      pais: phoneData.pais,
      codigoPais: phoneData.codigoPais,
      telefono: phoneData.telefono,
      telefonoCompleto: phoneData.telefonoCompleto,
      email,
      password: hashedPassword,
      role: totalUsers === 0 ? "admin" : role || "cliente"
    });

    res.status(201).json({
      message: "Usuario registrado correctamente",
      user: buildUserResponse(user),
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al registrar usuario",
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Correo o contraseña incorrectos."
      });
    }

    if (!user.activo) {
      return res.status(403).json({
        message: "Usuario inactivo."
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Correo o contraseña incorrectos."
      });
    }

    res.json({
      message: "Inicio de sesión correcto",
      user: buildUserResponse(user),
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al iniciar sesión",
      error: error.message
    });
  }
};

const profile = async (req, res) => {
  res.json({
    message: "Perfil del usuario autenticado",
    user: buildUserResponse(req.user)
  });
};

module.exports = {
  register,
  login,
  profile
};
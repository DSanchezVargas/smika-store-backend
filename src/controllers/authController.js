const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");
const { sendPasswordResetCode } = require("../services/emailService");
const {
  generateResetCode,
  hashResetCode,
  compareResetCode,
  getResetCodeExpiration
} = require("../utils/resetCodeHelper");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const createToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
};

const buildUserResponse = (user) => {
  return {
    id: user._id,
    nombre: user.nombre,
    apellido: user.apellido,
    alias: user.alias,
    genero: user.genero,
    pais: user.pais,
    codigoPais: user.codigoPais,
    telefono: user.telefono,
    telefonoCompleto: user.telefonoCompleto,
    email: user.email,
    role: user.role,
    authProvider: user.authProvider,
    emailVerified: user.emailVerified
  };
};

const register = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      alias = "",
      genero = "",
      pais = "PE",
      codigoPais = "+51",
      telefono = "",
      email,
      password
    } = req.body;

    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({
        message: "Nombre, apellido, correo y contraseña son obligatorios."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "La contraseña debe tener al menos 6 caracteres."
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({
        message: "Ya existe una cuenta registrada con ese correo."
      });
    }

    let cleanPhone = "";

    if (telefono) {
      cleanPhone = telefono.replace(/\D/g, "");

      if (pais === "PE" && !/^9\d{8}$/.test(cleanPhone)) {
        return res.status(400).json({
          message: "El teléfono peruano debe tener 9 dígitos y empezar con 9."
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      nombre,
      apellido,
      alias,
      genero,
      pais,
      codigoPais,
      telefono: cleanPhone,
      telefonoCompleto: cleanPhone ? `${codigoPais}${cleanPhone}` : "",
      email: normalizedEmail,
      password: hashedPassword,
      authProvider: "local",
      emailVerified: false
    });

    const token = createToken(user._id);

    return res.status(201).json({
      message: "Cuenta creada correctamente.",
      token,
      user: buildUserResponse(user)
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al registrar usuario.",
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Correo y contraseña son obligatorios."
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.activo) {
      return res.status(401).json({
        message: "Credenciales incorrectas."
      });
    }

    if (!user.password) {
      return res.status(401).json({
        message: "Esta cuenta fue creada con Google. Inicia sesión con Google."
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Credenciales incorrectas."
      });
    }

    const token = createToken(user._id);

    return res.json({
      message: "Inicio de sesión correcto.",
      token,
      user: buildUserResponse(user)
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al iniciar sesión.",
      error: error.message
    });
  }
};

const profile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.userId;

    if (!userId) {
      return res.status(401).json({
        message: "No autorizado."
      });
    }

    const user = await User.findById(userId).select("-password");

    if (!user || !user.activo) {
      return res.status(404).json({
        message: "Usuario no encontrado."
      });
    }

    return res.json({
      message: "Perfil obtenido correctamente.",
      user: buildUserResponse(user)
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener el perfil.",
      error: error.message
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "El correo es obligatorio."
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.activo) {
      return res.json({
        message:
          "Si el correo está registrado, recibirás un código de recuperación."
      });
    }

    const code = generateResetCode();
    const codeHash = await hashResetCode(code);

    user.resetPasswordCodeHash = codeHash;
    user.resetPasswordExpires = getResetCodeExpiration();
    user.resetPasswordAttempts = 0;

    await user.save();

    await sendPasswordResetCode({
      to: user.email,
      code,
      nombre: user.nombre
    });

    return res.json({
      message:
        "Si el correo está registrado, recibirás un código de recuperación."
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al enviar el código de recuperación.",
      error: error.message
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        message: "Correo, código y nueva contraseña son obligatorios."
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "La nueva contraseña debe tener al menos 6 caracteres."
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (
      !user ||
      !user.resetPasswordCodeHash ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      return res.status(400).json({
        message: "El código es inválido o ya venció."
      });
    }

    if (user.resetPasswordAttempts >= 5) {
      return res.status(429).json({
        message: "Demasiados intentos. Solicita un nuevo código."
      });
    }

    const isCodeValid = await compareResetCode(
      code,
      user.resetPasswordCodeHash
    );

    if (!isCodeValid) {
      user.resetPasswordAttempts += 1;
      await user.save();

      return res.status(400).json({
        message: "El código es inválido o ya venció."
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordCodeHash = "";
    user.resetPasswordExpires = null;
    user.resetPasswordAttempts = 0;

    if (!user.authProvider) {
      user.authProvider = "local";
    }

    await user.save();

    return res.json({
      message: "Contraseña actualizada correctamente."
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al restablecer contraseña.",
      error: error.message
    });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "La credencial de Google es obligatoria."
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    const googleId = payload.sub;
    const email = payload.email?.toLowerCase().trim();
    const emailVerified = Boolean(payload.email_verified);
    const nombre = payload.given_name || payload.name || "Usuario";
    const apellido = payload.family_name || "Google";

    if (!email) {
      return res.status(400).json({
        message: "No se pudo obtener el correo de Google."
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        nombre,
        apellido,
        alias: email.split("@")[0],
        email,
        password: "",
        authProvider: "google",
        googleId,
        emailVerified,
        activo: true
      });
    } else {
      user.googleId = user.googleId || googleId;
      user.emailVerified = user.emailVerified || emailVerified;

      if (!user.authProvider) {
        user.authProvider = "google";
      }

      await user.save();
    }

    const token = createToken(user._id);

    return res.json({
      message: "Inicio de sesión con Google correcto.",
      token,
      user: buildUserResponse(user)
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al iniciar sesión con Google.",
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  profile,
  forgotPassword,
  resetPassword,
  googleLogin
};
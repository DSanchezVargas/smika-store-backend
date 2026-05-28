const jwt = require("jsonwebtoken");
const User = require("../models/User");

const getTokenFromRequest = (req) => {
  const authorization = req.headers.authorization || "";

  if (authorization.startsWith("Bearer ")) {
    return authorization.split(" ")[1];
  }

  return "";
};

const protect = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        message: "No autorizado. Token no proporcionado."
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded._id || decoded.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Token inválido. No contiene usuario."
      });
    }

    const userDocument = await User.findById(userId).select("-password");

    if (!userDocument || userDocument.activo === false) {
      return res.status(401).json({
        message: "Usuario no válido o inactivo."
      });
    }

    const user = userDocument.toObject();

    req.user = {
      ...user,
      id: user._id.toString(),
      _id: user._id
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token inválido o expirado.",
      error: error.message
    });
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const role = req.user?.role || req.user?.rol;

    if (!req.user) {
      return res.status(401).json({
        message: "No autorizado. Debes iniciar sesión."
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        message: "No tienes permisos para realizar esta acción."
      });
    }

    next();
  };
};

module.exports = {
  protect,
  authorizeRoles
};
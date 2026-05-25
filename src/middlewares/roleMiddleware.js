const authorizeRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "No autorizado. Usuario no autenticado."
      });
    }

    if (!rolesPermitidos.includes(req.user.role)) {
      return res.status(403).json({
        message: "Acceso denegado. No tienes permiso para esta acción."
      });
    }

    next();
  };
};

module.exports = { authorizeRoles };
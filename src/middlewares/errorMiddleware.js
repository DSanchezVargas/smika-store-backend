const multer = require("multer");

const notFound = (req, res, next) => {
  const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (error, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  if (error.name === "CastError") {
    statusCode = 400;
    error.message = "El ID enviado no tiene un formato válido";
  }

  if (error.code === 11000) {
    statusCode = 400;
    error.message = "Ya existe un registro con esos datos";
  }

  if (error instanceof multer.MulterError) {
    statusCode = 400;

    if (error.code === "LIMIT_FILE_SIZE") {
      error.message = "La imagen no debe superar los 5 MB";
    } else {
      error.message = "Error al subir el archivo";
    }
  }

  res.status(statusCode).json({
    message: error.message || "Error interno del servidor",
    stack: process.env.NODE_ENV === "production" ? null : error.stack
  });
};

module.exports = {
  notFound,
  errorHandler
};
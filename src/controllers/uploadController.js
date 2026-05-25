const uploadSingleImage = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No se subió ninguna imagen"
      });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    res.status(201).json({
      message: "Imagen subida correctamente",
      image: {
        filename: req.file.filename,
        path: imageUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al subir imagen",
      error: error.message
    });
  }
};

const uploadMultipleImages = (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "No se subió ninguna imagen"
      });
    }

    const images = req.files.map((file) => ({
      filename: file.filename,
      path: `/uploads/${file.filename}`
    }));

    res.status(201).json({
      message: "Imágenes subidas correctamente",
      images
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al subir imágenes",
      error: error.message
    });
  }
};

module.exports = {
  uploadSingleImage,
  uploadMultipleImages
};
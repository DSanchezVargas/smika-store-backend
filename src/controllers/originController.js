const Origin = require("../models/Origin");
const { createSlug } = require("../utils/slugHelper");

const getOrigins = async (req, res) => {
  try {
    const { search, activos } = req.query;

    const filter = {};

    if (activos !== "false") {
      filter.activo = true;
    }

    if (search) {
      filter.nombre = { $regex: search, $options: "i" };
    }

    const origins = await Origin.find(filter).sort({ nombre: 1 });

    res.json({
      message: "Lista de países u orígenes obtenida correctamente",
      total: origins.length,
      origins
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener países u orígenes",
      error: error.message
    });
  }
};

const getOriginById = async (req, res) => {
  try {
    const origin = await Origin.findById(req.params.id);

    if (!origin) {
      return res.status(404).json({
        message: "País u origen no encontrado"
      });
    }

    res.json({
      message: "País u origen obtenido correctamente",
      origin
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener país u origen",
      error: error.message
    });
  }
};

const createOrigin = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;

    const slug = createSlug(nombre);

    const originExists = await Origin.findOne({ slug });

    if (originExists) {
      return res.status(400).json({
        message: "Este país u origen ya existe"
      });
    }

    const origin = await Origin.create({
      nombre,
      slug,
      descripcion
    });

    res.status(201).json({
      message: "País u origen creado correctamente",
      origin
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear país u origen",
      error: error.message
    });
  }
};

const updateOrigin = async (req, res) => {
  try {
    const { nombre, descripcion, activo } = req.body;

    const origin = await Origin.findById(req.params.id);

    if (!origin) {
      return res.status(404).json({
        message: "País u origen no encontrado"
      });
    }

    if (nombre) {
      const slug = createSlug(nombre);

      const duplicatedOrigin = await Origin.findOne({
        slug,
        _id: { $ne: origin._id }
      });

      if (duplicatedOrigin) {
        return res.status(400).json({
          message: "Ya existe otro país u origen con ese nombre"
        });
      }

      origin.nombre = nombre;
      origin.slug = slug;
    }

    if (descripcion !== undefined) origin.descripcion = descripcion;
    if (activo !== undefined) origin.activo = activo;

    await origin.save();

    res.json({
      message: "País u origen actualizado correctamente",
      origin
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar país u origen",
      error: error.message
    });
  }
};

const deleteOrigin = async (req, res) => {
  try {
    const origin = await Origin.findById(req.params.id);

    if (!origin) {
      return res.status(404).json({
        message: "País u origen no encontrado"
      });
    }

    origin.activo = false;
    await origin.save();

    res.json({
      message: "País u origen desactivado correctamente"
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al desactivar país u origen",
      error: error.message
    });
  }
};

module.exports = {
  getOrigins,
  getOriginById,
  createOrigin,
  updateOrigin,
  deleteOrigin
};
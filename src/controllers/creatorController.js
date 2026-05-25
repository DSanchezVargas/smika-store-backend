const Creator = require("../models/Creator");
const { createSlug } = require("../utils/slugHelper");

const getCreators = async (req, res) => {
  try {
    const { search, activos } = req.query;

    const filter = {};

    if (activos !== "false") {
      filter.activo = true;
    }

    if (search) {
      filter.nombre = { $regex: search, $options: "i" };
    }

    const creators = await Creator.find(filter).sort({ nombre: 1 });

    res.json({
      message: "Lista de autores o creadores obtenida correctamente",
      total: creators.length,
      creators
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener autores o creadores",
      error: error.message
    });
  }
};

const getCreatorById = async (req, res) => {
  try {
    const creator = await Creator.findById(req.params.id);

    if (!creator) {
      return res.status(404).json({
        message: "Autor o creador no encontrado"
      });
    }

    res.json({
      message: "Autor o creador obtenido correctamente",
      creator
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener autor o creador",
      error: error.message
    });
  }
};

const createCreator = async (req, res) => {
  try {
    const { nombre, tipo, descripcion, paisOrigen } = req.body;

    const slug = createSlug(nombre);

    const creatorExists = await Creator.findOne({ slug });

    if (creatorExists) {
      return res.status(400).json({
        message: "Este autor o creador ya existe"
      });
    }

    const creator = await Creator.create({
      nombre,
      slug,
      tipo,
      descripcion,
      paisOrigen
    });

    res.status(201).json({
      message: "Autor o creador creado correctamente",
      creator
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear autor o creador",
      error: error.message
    });
  }
};

const updateCreator = async (req, res) => {
  try {
    const { nombre, tipo, descripcion, paisOrigen, activo } = req.body;

    const creator = await Creator.findById(req.params.id);

    if (!creator) {
      return res.status(404).json({
        message: "Autor o creador no encontrado"
      });
    }

    if (nombre) {
      const slug = createSlug(nombre);

      const duplicatedCreator = await Creator.findOne({
        slug,
        _id: { $ne: creator._id }
      });

      if (duplicatedCreator) {
        return res.status(400).json({
          message: "Ya existe otro autor o creador con ese nombre"
        });
      }

      creator.nombre = nombre;
      creator.slug = slug;
    }

    if (tipo !== undefined) creator.tipo = tipo;
    if (descripcion !== undefined) creator.descripcion = descripcion;
    if (paisOrigen !== undefined) creator.paisOrigen = paisOrigen;
    if (activo !== undefined) creator.activo = activo;

    await creator.save();

    res.json({
      message: "Autor o creador actualizado correctamente",
      creator
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar autor o creador",
      error: error.message
    });
  }
};

const deleteCreator = async (req, res) => {
  try {
    const creator = await Creator.findById(req.params.id);

    if (!creator) {
      return res.status(404).json({
        message: "Autor o creador no encontrado"
      });
    }

    creator.activo = false;
    await creator.save();

    res.json({
      message: "Autor o creador desactivado correctamente"
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al desactivar autor o creador",
      error: error.message
    });
  }
};

module.exports = {
  getCreators,
  getCreatorById,
  createCreator,
  updateCreator,
  deleteCreator
};
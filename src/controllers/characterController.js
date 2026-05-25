const Character = require("../models/Character");
const { createSlug } = require("../utils/slugHelper");

const getCharacters = async (req, res) => {
  try {
    const { search, serie, activos } = req.query;

    const filter = {};

    if (activos !== "false") {
      filter.activo = true;
    }

    if (search) {
      filter.nombre = { $regex: search, $options: "i" };
    }

    if (serie) {
      filter.serie = serie;
    }

    const characters = await Character.find(filter)
      .populate("serie", "nombre slug")
      .sort({ nombre: 1 });

    res.json({
      message: "Lista de personajes o criaturas obtenida correctamente",
      total: characters.length,
      characters
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener personajes o criaturas",
      error: error.message
    });
  }
};

const getCharacterById = async (req, res) => {
  try {
    const character = await Character.findById(req.params.id).populate(
      "serie",
      "nombre slug"
    );

    if (!character) {
      return res.status(404).json({
        message: "Personaje o criatura no encontrado"
      });
    }

    res.json({
      message: "Personaje o criatura obtenido correctamente",
      character
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener personaje o criatura",
      error: error.message
    });
  }
};

const createCharacter = async (req, res) => {
  try {
    const { nombre, tipo, descripcion, imagen, serie } = req.body;

    const slug = createSlug(nombre);

    const characterExists = await Character.findOne({
      nombre: { $regex: `^${nombre}$`, $options: "i" },
      serie: serie || null
    });

    if (characterExists) {
      return res.status(400).json({
        message: "Este personaje o criatura ya existe para esta serie"
      });
    }

    const character = await Character.create({
      nombre,
      slug,
      tipo,
      descripcion,
      imagen,
      serie: serie || null
    });

    res.status(201).json({
      message: "Personaje o criatura creado correctamente",
      character
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear personaje o criatura",
      error: error.message
    });
  }
};

const updateCharacter = async (req, res) => {
  try {
    const { nombre, tipo, descripcion, imagen, serie, activo } = req.body;

    const character = await Character.findById(req.params.id);

    if (!character) {
      return res.status(404).json({
        message: "Personaje o criatura no encontrado"
      });
    }

    if (nombre || serie !== undefined) {
      const newName = nombre || character.nombre;
      const newSerie = serie !== undefined ? serie || null : character.serie;

      const duplicatedCharacter = await Character.findOne({
        nombre: { $regex: `^${newName}$`, $options: "i" },
        serie: newSerie,
        _id: { $ne: character._id }
      });

      if (duplicatedCharacter) {
        return res.status(400).json({
          message: "Ya existe otro personaje o criatura con ese nombre para esta serie"
        });
      }

      character.nombre = newName;
      character.slug = createSlug(newName);
      character.serie = newSerie;
    }

    if (tipo !== undefined) character.tipo = tipo;
    if (descripcion !== undefined) character.descripcion = descripcion;
    if (imagen !== undefined) character.imagen = imagen;
    if (activo !== undefined) character.activo = activo;

    await character.save();

    res.json({
      message: "Personaje o criatura actualizado correctamente",
      character
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar personaje o criatura",
      error: error.message
    });
  }
};

const deleteCharacter = async (req, res) => {
  try {
    const character = await Character.findById(req.params.id);

    if (!character) {
      return res.status(404).json({
        message: "Personaje o criatura no encontrado"
      });
    }

    character.activo = false;
    await character.save();

    res.json({
      message: "Personaje o criatura desactivado correctamente"
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al desactivar personaje o criatura",
      error: error.message
    });
  }
};

module.exports = {
  getCharacters,
  getCharacterById,
  createCharacter,
  updateCharacter,
  deleteCharacter
};
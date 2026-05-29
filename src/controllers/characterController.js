const mongoose = require("mongoose");

const Character = require("../models/Character");
const Series = require("../models/Series");
const { createSlug } = require("../utils/slugHelper");

const isValidObjectId = (value) => {
  return value && mongoose.Types.ObjectId.isValid(value);
};

const getTextValue = (...values) => {
  const found = values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );

  return found ? found.toString().trim() : "";
};

const normalizeCharacterResponse = (character) => {
  const plainCharacter = character?.toObject ? character.toObject() : character;

  if (!plainCharacter) return null;

  return {
    ...plainCharacter,
    id: plainCharacter._id,
    _id: plainCharacter._id,
    nombre: plainCharacter.nombre,
    serieNombre:
      plainCharacter.serie?.nombre ||
      plainCharacter.serieNombre ||
      "Sin serie definida",
    serie:
      plainCharacter.serie?._id ||
      plainCharacter.serie ||
      null,
    activo: plainCharacter.activo !== false
  };
};

const resolveSerieData = async (serieValue, serieNombreValue = "") => {
  if (isValidObjectId(serieValue)) {
    const serie = await Series.findById(serieValue);

    return {
      serie: serie?._id || serieValue,
      serieNombre: serieNombreValue || serie?.nombre || "Sin serie definida"
    };
  }

  return {
    serie: null,
    serieNombre: getTextValue(serieNombreValue, serieValue, "Sin serie definida")
  };
};

const populateCharacter = (query) => {
  return query.populate("serie", "nombre slug");
};

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
      if (isValidObjectId(serie)) {
        filter.serie = serie;
      } else {
        filter.serieNombre = { $regex: serie, $options: "i" };
      }
    }

    const characters = await populateCharacter(
      Character.find(filter).sort({ nombre: 1 })
    );

    res.json({
      message: "Lista de personajes o criaturas obtenida correctamente",
      total: characters.length,
      characters: characters.map(normalizeCharacterResponse)
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
    const query = isValidObjectId(req.params.id)
      ? { _id: req.params.id }
      : { slug: req.params.id };

    const character = await populateCharacter(Character.findOne(query));

    if (!character) {
      return res.status(404).json({
        message: "Personaje o criatura no encontrado"
      });
    }

    res.json({
      message: "Personaje o criatura obtenido correctamente",
      character: normalizeCharacterResponse(character)
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
    const {
      nombre,
      tipo,
      descripcion,
      imagen,
      serie,
      serieNombre,
      estado,
      needsReview,
      activo
    } = req.body;

    const cleanName = getTextValue(nombre);

    if (!cleanName) {
      return res.status(400).json({
        message: "El nombre del personaje es obligatorio"
      });
    }

    const serieData = await resolveSerieData(serie, serieNombre);
    const slug = createSlug(cleanName);

    const characterExists = await Character.findOne({
      nombre: { $regex: `^${cleanName}$`, $options: "i" },
      serie: serieData.serie,
      serieNombre: serieData.serieNombre
    });

    if (characterExists) {
      return res.status(400).json({
        message: "Este personaje o criatura ya existe para esta serie"
      });
    }

    const character = await Character.create({
      nombre: cleanName,
      slug,
      tipo: getTextValue(tipo, "Personaje"),
      descripcion: getTextValue(descripcion),
      imagen: getTextValue(imagen),
      serie: serieData.serie,
      serieNombre: serieData.serieNombre,
      estado: getTextValue(estado, needsReview ? "Faltan detalles" : "Completo"),
      needsReview: Boolean(needsReview),
      activo: activo !== undefined ? Boolean(activo) : true
    });

    const populatedCharacter = await populateCharacter(
      Character.findById(character._id)
    );

    res.status(201).json({
      message: "Personaje o criatura creado correctamente",
      character: normalizeCharacterResponse(populatedCharacter)
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
    const {
      nombre,
      tipo,
      descripcion,
      imagen,
      serie,
      serieNombre,
      estado,
      needsReview,
      activo
    } = req.body;

    const character = await Character.findById(req.params.id);

    if (!character) {
      return res.status(404).json({
        message: "Personaje o criatura no encontrado"
      });
    }

    const cleanName = getTextValue(nombre, character.nombre);
    const serieData =
      serie !== undefined || serieNombre !== undefined
        ? await resolveSerieData(serie, serieNombre)
        : {
            serie: character.serie,
            serieNombre: character.serieNombre
          };

    if (nombre !== undefined || serie !== undefined || serieNombre !== undefined) {
      const duplicatedCharacter = await Character.findOne({
        nombre: { $regex: `^${cleanName}$`, $options: "i" },
        serie: serieData.serie,
        serieNombre: serieData.serieNombre,
        _id: { $ne: character._id }
      });

      if (duplicatedCharacter) {
        return res.status(400).json({
          message:
            "Ya existe otro personaje o criatura con ese nombre para esta serie"
        });
      }

      character.nombre = cleanName;
      character.slug = createSlug(cleanName);
      character.serie = serieData.serie;
      character.serieNombre = serieData.serieNombre;
    }

    if (tipo !== undefined) character.tipo = tipo;
    if (descripcion !== undefined) character.descripcion = descripcion;
    if (imagen !== undefined) character.imagen = imagen;
    if (estado !== undefined) character.estado = estado;
    if (needsReview !== undefined) character.needsReview = Boolean(needsReview);
    if (activo !== undefined) character.activo = Boolean(activo);

    await character.save();

    const populatedCharacter = await populateCharacter(
      Character.findById(character._id)
    );

    res.json({
      message: "Personaje o criatura actualizado correctamente",
      character: normalizeCharacterResponse(populatedCharacter)
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
      message: "Personaje o criatura desactivado correctamente",
      character: normalizeCharacterResponse(character)
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
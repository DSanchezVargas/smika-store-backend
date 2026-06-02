const mongoose = require("mongoose");

const Series = require("../models/Series");
const Creator = require("../models/Creator");
const Event = require("../models/Event");
const Product = require("../models/Product");
const { createSlug } = require("../utils/slugHelper");

const isValidObjectId = (value) => {
  return value && mongoose.Types.ObjectId.isValid(value);
};

const OBJECT_ID_TEXT_PATTERN = /^[a-f0-9]{24}$/i;

const isSuspiciousObjectIdName = (value = "") => {
  const cleanValue = value.toString().trim();

  return OBJECT_ID_TEXT_PATTERN.test(cleanValue) && mongoose.Types.ObjectId.isValid(cleanValue);
};

const cleanupSeriesReferences = async (series = null) => {
  if (!series) return;

  const seriesId = series._id?.toString?.() || series.id?.toString?.() || "";
  const seriesName = getTextValue(series.nombre);

  if (!seriesId) return;

  const namesToRemove = [seriesId, seriesName].filter(Boolean);

  await Event.updateMany(
    {
      $or: [
        { serie: series._id },
        { series: series._id },
        { serieNombre: { $in: namesToRemove } },
        { seriesNombre: { $in: namesToRemove } }
      ]
    },
    {
      $pull: {
        series: series._id,
        seriesNombre: { $in: namesToRemove }
      },
      $set: {
        serie: null,
        serieNombre: ""
      }
    }
  );

  await Product.updateMany(
    {
      $or: [
        { serie: series._id },
        { serieNombre: { $in: namesToRemove } }
      ]
    },
    {
      $set: {
        serie: null,
        serieNombre: ""
      }
    }
  );
};

const cleanupSuspiciousSeriesRecords = async () => {
  const suspiciousSeries = await Series.find({
    nombre: { $regex: OBJECT_ID_TEXT_PATTERN }
  });

  for (const serie of suspiciousSeries) {
    if (!isSuspiciousObjectIdName(serie.nombre)) continue;

    await cleanupSeriesReferences(serie);
    await Series.findByIdAndDelete(serie._id);
  }
};

const getOptionalObjectId = (value) => {
  return isValidObjectId(value) ? value : null;
};

const getTextValue = (...values) => {
  const found = values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );

  if (Array.isArray(found)) return found.join(", ").trim();

  if (found && typeof found === "object") {
    return found.nombre || found.titulo || found.name || "";
  }

  return found ? found.toString().trim() : "";
};

const getImageSource = (image) => {
  if (!image) return "";

  if (typeof image === "string") return image.trim();

  if (image && typeof image === "object") {
    return (
      image.finalPreview ||
      image.url ||
      image.preview ||
      image.src ||
      image.imagen ||
      ""
    ).trim();
  }

  return "";
};

const normalizeImages = (images = []) => {
  if (!Array.isArray(images)) return [];

  const seen = new Set();

  return images
    .map(getImageSource)
    .filter(Boolean)
    .filter((image) => {
      if (seen.has(image)) return false;

      seen.add(image);
      return true;
    });
};

const normalizeStringArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => getTextValue(item)).filter(Boolean);
  }

  const text = getTextValue(value);

  if (!text) return [];

  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};


const uniqueTextList = (values = []) => {
  const map = new Map();

  values
    .map((value) => getTextValue(value))
    .filter(Boolean)
    .forEach((value) => {
      const key = createSlug(value) || value.toLowerCase();

      if (!map.has(key)) {
        map.set(key, value);
      }
    });

  return [...map.values()];
};

const upsertCreatorByName = async (creatorName = "", seriePayload = {}) => {
  const cleanName = getTextValue(creatorName);

  if (!cleanName) return null;

  const slug = createSlug(cleanName);

  if (!slug) return null;

  let creator = await Creator.findOne({ slug });

  if (creator) {
    if (creator.activo === false) {
      creator.activo = true;
      await creator.save();
    }

    return creator;
  }

  try {
    return await Creator.create({
      nombre: cleanName,
      slug,
      tipo: "Autor",
      descripcion: "Autor/creador agregado automáticamente desde una serie o historia.",
      paisOrigen: getTextValue(seriePayload.origenNombre, seriePayload.pais),
      activo: true
    });
  } catch (error) {
    if (error?.code === 11000) {
      return await Creator.findOne({ slug });
    }

    throw error;
  }
};

const resolveSeriesCreators = async (payload = {}) => {
  const creatorIds = Array.isArray(payload.creadores)
    ? payload.creadores.filter(isValidObjectId)
    : [];

  const creatorNames = uniqueTextList(payload.creadoresNombre || []);
  const creatorsBySlug = new Map();

  if (creatorIds.length > 0) {
    const existingCreators = await Creator.find({
      _id: { $in: creatorIds }
    });

    existingCreators.forEach((creator) => {
      const key = creator.slug || createSlug(creator.nombre);

      if (key && !creatorsBySlug.has(key)) {
        creatorsBySlug.set(key, creator);
      }
    });
  }

  for (const creatorName of creatorNames) {
    const creator = await upsertCreatorByName(creatorName, payload);

    if (!creator) continue;

    const key = creator.slug || createSlug(creator.nombre);

    if (key && !creatorsBySlug.has(key)) {
      creatorsBySlug.set(key, creator);
    }
  }

  const linkedCreators = [...creatorsBySlug.values()];

  payload.creadores = linkedCreators.map((creator) => creator._id);
  payload.creadoresNombre = linkedCreators.map((creator) => creator.nombre);

  return linkedCreators;
};

const shouldReplaceImages = (body = {}, includeImages = false) => {
  if (includeImages) return true;

  return (
    body.imagenesTouched === true ||
    body.imagesTouched === true ||
    body.replaceImages === true ||
    body.reemplazarImagenes === true
  );
};

const normalizeSerieResponse = (serie) => {
  const plainSerie = serie?.toObject ? serie.toObject() : serie;

  if (!plainSerie) return null;

  const coverImage = getImageSource(plainSerie.imagen);

  const carouselImages = normalizeImages(plainSerie.imagenes).filter(
    (image) => image !== coverImage
  );

  const categoriaPrincipalNombre =
    plainSerie.categoriaPrincipalNombre ||
    plainSerie.categoriaNombre ||
    plainSerie.categoria ||
    "Series";

  const origenNombre =
    plainSerie.origenNombre ||
    plainSerie.paisNombre ||
    plainSerie.country ||
    "Variado";

  const creadoresDesdeReferencias = Array.isArray(plainSerie.creadores)
    ? plainSerie.creadores.map((creator) => getTextValue(creator)).filter(Boolean)
    : [];

  const creadoresNombre = uniqueTextList([
    ...creadoresDesdeReferencias,
    ...(Array.isArray(plainSerie.creadoresNombre)
      ? plainSerie.creadoresNombre
      : []),
    ...normalizeStringArray(plainSerie.autor)
  ]);

  return {
    ...plainSerie,

    id: plainSerie._id,
    _id: plainSerie._id,

    nombre: plainSerie.nombre,
    slug: plainSerie.slug,

    imagen: coverImage,
    imagenes: carouselImages,

    categoriaPrincipalNombre,
    categoriaNombre: categoriaPrincipalNombre,

    subcategoriaNombre: plainSerie.subcategoriaNombre || "",

    origenNombre,
    pais: plainSerie.pais || "V",

    tipo: plainSerie.tipo || categoriaPrincipalNombre || "Historia",
    genero: plainSerie.genero || "",

    creadoresNombre,
    autor: creadoresNombre.join(", "),

    destacada: Boolean(plainSerie.destacada),

    activa: plainSerie.activa !== false && plainSerie.activo !== false,
    activo: plainSerie.activa !== false && plainSerie.activo !== false,

    orden: Number(plainSerie.orden || 0)
  };
};

const buildSeriesPayload = (body = {}, options = {}) => {
  const categoriaPrincipalValue =
    body.categoriaPrincipal || body.categoria || "";

  const subcategoriaValue = body.subcategoria || "";
  const origenValue = body.origen || "";

  const categoriaPrincipalNombre = getTextValue(
    body.categoriaPrincipalNombre,
    body.categoriaNombre,
    isValidObjectId(categoriaPrincipalValue) ? "" : categoriaPrincipalValue,
    "Series"
  );

  const subcategoriaNombre = getTextValue(
    body.subcategoriaNombre,
    isValidObjectId(subcategoriaValue) ? "" : subcategoriaValue
  );

  const origenNombre = getTextValue(
    body.origenNombre,
    body.paisNombre,
    body.country,
    isValidObjectId(origenValue) ? "" : origenValue,
    "Variado"
  );

  const creadoresNombre = normalizeStringArray(
    body.creadoresNombre || body.autor
  );

  const payload = {
    nombre: getTextValue(body.nombre, body.name),
    descripcion: getTextValue(body.descripcion, body.description),

    categoriaPrincipal: getOptionalObjectId(categoriaPrincipalValue),
    categoriaPrincipalNombre,
    categoriaNombre: categoriaPrincipalNombre,

    subcategoria: getOptionalObjectId(subcategoriaValue),
    subcategoriaNombre,

    origen: getOptionalObjectId(origenValue),
    origenNombre,

    pais: getTextValue(body.pais, body.countryCode, origenNombre, "V"),

    tipo: getTextValue(body.tipo, categoriaPrincipalNombre, "Historia"),
    genero: getTextValue(body.genero),

    creadores: Array.isArray(body.creadores)
      ? body.creadores.filter(isValidObjectId)
      : [],

    creadoresNombre,

    destacada: Boolean(body.destacada),

    activa:
      body.activa !== undefined
        ? Boolean(body.activa)
        : body.activo !== undefined
        ? Boolean(body.activo)
        : true,

    activo:
      body.activo !== undefined
        ? Boolean(body.activo)
        : body.activa !== undefined
        ? Boolean(body.activa)
        : true,

    orden:
      body.orden !== undefined && body.orden !== ""
        ? Number(body.orden)
        : 0
  };

  if (shouldReplaceImages(body, options.includeImages === true)) {
    const coverImage = getImageSource(body.imagen || body.image);

    const carouselImages = normalizeImages(body.imagenes).filter(
      (image) => image !== coverImage
    );

    payload.imagen = coverImage;
    payload.imagenes = carouselImages;
  }

  return payload;
};

const getSeries = async (req, res) => {
  try {
    await cleanupSuspiciousSeriesRecords();

    const { search, categoriaPrincipal, subcategoria, origen, activos } =
      req.query;

    const filter = {};
    const andConditions = [
      { nombre: { $not: OBJECT_ID_TEXT_PATTERN } }
    ];

    if (activos !== "false") {
      filter.activa = true;
      filter.activo = true;
    }

    if (search) {
      andConditions.push({ nombre: { $regex: search, $options: "i" } });
    }

    if (categoriaPrincipal) {
      if (isValidObjectId(categoriaPrincipal)) {
        filter.categoriaPrincipal = categoriaPrincipal;
      } else {
        filter.categoriaPrincipalNombre = {
          $regex: categoriaPrincipal,
          $options: "i"
        };
      }
    }

    if (subcategoria) {
      if (isValidObjectId(subcategoria)) {
        filter.subcategoria = subcategoria;
      } else {
        filter.subcategoriaNombre = {
          $regex: subcategoria,
          $options: "i"
        };
      }
    }

    if (origen) {
      if (isValidObjectId(origen)) {
        filter.origen = origen;
      } else {
        filter.origenNombre = {
          $regex: origen,
          $options: "i"
        };
      }
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const series = await Series.find(filter)
      .populate("creadores", "nombre slug tipo paisOrigen activo")
      .sort({
        orden: 1,
        nombre: 1
      });

    res.json({
      message: "Lista de series obtenida correctamente",
      total: series.length,
      series: series.map(normalizeSerieResponse)
    });
  } catch (error) {
    console.error("Error al obtener series:", error);

    res.status(500).json({
      message: "Error al obtener series",
      error: error.message
    });
  }
};

const getSeriesById = async (req, res) => {
  try {
    const query = isValidObjectId(req.params.id)
      ? { _id: req.params.id }
      : { slug: req.params.id };

    const serie = await Series.findOne(query).populate(
      "creadores",
      "nombre slug tipo paisOrigen activo"
    );

    if (!serie) {
      return res.status(404).json({
        message: "Serie no encontrada"
      });
    }

    res.json({
      message: "Serie obtenida correctamente",
      serie: normalizeSerieResponse(serie)
    });
  } catch (error) {
    console.error("Error al obtener serie:", error);

    res.status(500).json({
      message: "Error al obtener serie",
      error: error.message
    });
  }
};

const createSeries = async (req, res) => {
  try {
    const payload = buildSeriesPayload(req.body, {
      includeImages: true
    });

    if (!payload.nombre) {
      return res.status(400).json({
        message: "El nombre de la serie es obligatorio"
      });
    }

    if (isSuspiciousObjectIdName(payload.nombre)) {
      return res.status(400).json({
        message: "El nombre de la serie no puede ser un ID interno"
      });
    }

    await resolveSeriesCreators(payload);

    const slug = createSlug(payload.nombre);

    const seriesExists = await Series.findOne({ slug });

    if (seriesExists) {
      return res.status(400).json({
        message: "Esta serie ya existe"
      });
    }

    const serie = await Series.create({
      ...payload,
      slug
    });

    res.status(201).json({
      message: "Serie creada correctamente",
      serie: normalizeSerieResponse(serie)
    });
  } catch (error) {
    console.error("Error al crear serie:", error);

    res.status(500).json({
      message: "Error al crear serie",
      error: error.message
    });
  }
};

const updateSeries = async (req, res) => {
  try {
    const payload = buildSeriesPayload(req.body, {
      includeImages: false
    });

    const serie = await Series.findById(req.params.id);

    if (!serie) {
      return res.status(404).json({
        message: "Serie no encontrada"
      });
    }

    if (payload.nombre && isSuspiciousObjectIdName(payload.nombre)) {
      return res.status(400).json({
        message: "El nombre de la serie no puede ser un ID interno"
      });
    }

    await resolveSeriesCreators(payload);

    if (payload.nombre) {
      const slug = createSlug(payload.nombre);

      const duplicatedSeries = await Series.findOne({
        slug,
        _id: { $ne: serie._id }
      });

      if (duplicatedSeries) {
        return res.status(400).json({
          message: "Ya existe otra serie con ese nombre"
        });
      }

      serie.nombre = payload.nombre;
      serie.slug = slug;
    }

    Object.entries(payload).forEach(([key, value]) => {
      if (key !== "nombre" && value !== undefined) {
        serie[key] = value;
      }
    });

    await serie.save();

    res.json({
      message: "Serie actualizada correctamente",
      serie: normalizeSerieResponse(serie)
    });
  } catch (error) {
    console.error("Error al actualizar serie:", error);

    res.status(500).json({
      message: "Error al actualizar serie",
      error: error.message
    });
  }
};

const deleteSeries = async (req, res) => {
  try {
    const serie = await Series.findById(req.params.id).populate(
      "creadores",
      "nombre slug tipo paisOrigen activo"
    );

    if (!serie) {
      return res.status(404).json({
        message: "Serie no encontrada"
      });
    }

    await cleanupSeriesReferences(serie);
    await Series.findByIdAndDelete(serie._id);

    res.json({
      message: "Serie borrada definitivamente y referencias limpiadas",
      serie: normalizeSerieResponse(serie)
    });
  } catch (error) {
    console.error("Error al borrar serie:", error);

    res.status(500).json({
      message: "Error al borrar serie",
      error: error.message
    });
  }
};

module.exports = {
  getSeries,
  getSeriesById,
  createSeries,
  updateSeries,
  deleteSeries
};
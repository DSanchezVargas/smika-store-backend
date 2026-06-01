const mongoose = require("mongoose");

const Series = require("../models/Series");
const { createSlug } = require("../utils/slugHelper");

const REMOVED_SERIES_NAMES = [
  "solo leveling",
  "erha",
  "jujutsu kaisen",
  "fan merch colección especial",
  "bungou stray dogs",
  "given",
  "haikyuu"
];

const normalizeSeriesName = (value = "") => {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
};

const removedSeriesNameSet = new Set(
  REMOVED_SERIES_NAMES.map(normalizeSeriesName)
);

const isRemovedSeriesName = (value = "") => {
  return removedSeriesNameSet.has(normalizeSeriesName(value));
};

const findRemovedSeries = async () => {
  const allSeries = await Series.find({}, "_id nombre slug");

  return allSeries.filter((serie) => isRemovedSeriesName(serie.nombre));
};

const isValidObjectId = (value) => {
  return value && mongoose.Types.ObjectId.isValid(value);
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

  const creadoresNombre = Array.isArray(plainSerie.creadoresNombre)
    ? plainSerie.creadoresNombre.filter(Boolean)
    : plainSerie.autor
    ? plainSerie.autor
        .split(",")
        .map((creator) => creator.trim())
        .filter(Boolean)
    : [];

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
    const { search, categoriaPrincipal, subcategoria, origen, activos } =
      req.query;

    const filter = {};

    if (activos !== "false") {
      filter.activa = true;
      filter.activo = true;
    }

    if (search) {
      filter.nombre = { $regex: search, $options: "i" };
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

    const series = await Series.find(filter).sort({
      orden: 1,
      nombre: 1
    });

    const visibleSeries = series.filter(
      (serie) => !isRemovedSeriesName(serie.nombre)
    );

    res.json({
      message: "Lista de series obtenida correctamente",
      total: visibleSeries.length,
      series: visibleSeries.map(normalizeSerieResponse)
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

    const serie = await Series.findOne(query);

    if (!serie || isRemovedSeriesName(serie.nombre)) {
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

    if (isRemovedSeriesName(payload.nombre)) {
      return res.status(400).json({
        message: "Esta serie fue retirada y no puede volver a registrarse."
      });
    }

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

    if (payload.nombre) {
      if (isRemovedSeriesName(payload.nombre)) {
        return res.status(400).json({
          message: "Esta serie fue retirada y no puede volver a registrarse."
        });
      }

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
    const serie = await Series.findByIdAndDelete(req.params.id);

    if (!serie) {
      return res.status(404).json({
        message: "Serie no encontrada"
      });
    }

    res.json({
      message: "Serie borrada definitivamente",
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

const deleteRemovedSeries = async (req, res) => {
  try {
    const removedSeries = await findRemovedSeries();

    if (removedSeries.length === 0) {
      return res.json({
        message: "No se encontraron series no deseadas para borrar.",
        deletedCount: 0,
        names: []
      });
    }

    const ids = removedSeries.map((serie) => serie._id);
    const names = removedSeries.map((serie) => serie.nombre);

    const result = await Series.deleteMany({
      _id: { $in: ids }
    });

    res.json({
      message: "Series no deseadas borradas definitivamente.",
      deletedCount: result.deletedCount || 0,
      names
    });
  } catch (error) {
    console.error("Error al borrar series no deseadas:", error);

    res.status(500).json({
      message: "Error al borrar series no deseadas",
      error: error.message
    });
  }
};

module.exports = {
  getSeries,
  getSeriesById,
  createSeries,
  updateSeries,
  deleteSeries,
  deleteRemovedSeries
};
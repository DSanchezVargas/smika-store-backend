const mongoose = require("mongoose");

const Series = require("../models/Series");
const { createSlug } = require("../utils/slugHelper");

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

  return found ? found.toString().trim() : "";
};

const populateSeries = (query) => {
  return query
    .populate("categoriaPrincipal", "nombre slug")
    .populate("subcategoria", "nombre slug")
    .populate("origen", "nombre slug code")
    .populate("creadores", "nombre slug tipo");
};

const normalizeSerieResponse = (serie) => {
  const plainSerie = serie?.toObject ? serie.toObject() : serie;

  if (!plainSerie) return null;

  return {
    ...plainSerie,
    id: plainSerie._id,
    _id: plainSerie._id,
    nombre: plainSerie.nombre,
    slug: plainSerie.slug,
    categoriaPrincipalNombre:
      plainSerie.categoriaPrincipal?.nombre ||
      plainSerie.categoriaPrincipalNombre ||
      "Series",
    subcategoriaNombre:
      plainSerie.subcategoria?.nombre || plainSerie.subcategoriaNombre || "",
    origenNombre:
      plainSerie.origen?.nombre || plainSerie.origenNombre || "Variado",
    pais: plainSerie.pais || "V",
    creadoresNombre:
      plainSerie.creadoresNombre ||
      plainSerie.creadores?.map((creator) => creator.nombre).filter(Boolean) ||
      [],
    activa: plainSerie.activa !== false,
    activo: plainSerie.activo !== false && plainSerie.activa !== false
  };
};

const buildSeriesPayload = (body = {}) => {
  const categoriaPrincipalValue =
    body.categoriaPrincipal || body.categoria || "";

  const subcategoriaValue = body.subcategoria || "";
  const origenValue = body.origen || body.pais || "";

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

  return {
    nombre: getTextValue(body.nombre, body.name),
    descripcion: getTextValue(body.descripcion, body.description),
    imagen: getTextValue(body.imagen, body.image),

    categoriaPrincipal: getOptionalObjectId(categoriaPrincipalValue),
    categoriaPrincipalNombre,

    subcategoria: getOptionalObjectId(subcategoriaValue),
    subcategoriaNombre,

    origen: getOptionalObjectId(origenValue),
    origenNombre,
    pais: getTextValue(body.pais, body.countryCode, "V"),

    creadores: Array.isArray(body.creadores)
      ? body.creadores.filter(isValidObjectId)
      : [],

    creadoresNombre: Array.isArray(body.creadoresNombre)
      ? body.creadoresNombre.filter(Boolean)
      : [],

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

    const series = await populateSeries(
      Series.find(filter).sort({ orden: 1, nombre: 1 })
    );

    res.json({
      message: "Lista de series obtenida correctamente",
      total: series.length,
      series: series.map(normalizeSerieResponse)
    });
  } catch (error) {
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

    const serie = await populateSeries(Series.findOne(query));

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
    res.status(500).json({
      message: "Error al obtener serie",
      error: error.message
    });
  }
};

const createSeries = async (req, res) => {
  try {
    const payload = buildSeriesPayload(req.body);

    if (!payload.nombre) {
      return res.status(400).json({
        message: "El nombre de la serie es obligatorio"
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

    const populatedSerie = await populateSeries(Series.findById(serie._id));

    res.status(201).json({
      message: "Serie creada correctamente",
      serie: normalizeSerieResponse(populatedSerie)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear serie",
      error: error.message
    });
  }
};

const updateSeries = async (req, res) => {
  try {
    const payload = buildSeriesPayload(req.body);

    const serie = await Series.findById(req.params.id);

    if (!serie) {
      return res.status(404).json({
        message: "Serie no encontrada"
      });
    }

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

    const populatedSerie = await populateSeries(Series.findById(serie._id));

    res.json({
      message: "Serie actualizada correctamente",
      serie: normalizeSerieResponse(populatedSerie)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar serie",
      error: error.message
    });
  }
};

const deleteSeries = async (req, res) => {
  try {
    const serie = await Series.findById(req.params.id);

    if (!serie) {
      return res.status(404).json({
        message: "Serie no encontrada"
      });
    }

    serie.activa = false;
    serie.activo = false;

    await serie.save();

    res.json({
      message: "Serie desactivada correctamente",
      serie: normalizeSerieResponse(serie)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al desactivar serie",
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
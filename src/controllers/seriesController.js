const Series = require("../models/Series");
const { createSlug } = require("../utils/slugHelper");

const getSeries = async (req, res) => {
  try {
    const { search, categoriaPrincipal, subcategoria, origen, activos } = req.query;

    const filter = {};

    if (activos !== "false") {
      filter.activa = true;
    }

    if (search) {
      filter.nombre = { $regex: search, $options: "i" };
    }

    if (categoriaPrincipal) {
      filter.categoriaPrincipal = categoriaPrincipal;
    }

    if (subcategoria) {
      filter.subcategoria = subcategoria;
    }

    if (origen) {
      filter.origen = origen;
    }

    const series = await Series.find(filter)
      .populate("categoriaPrincipal", "nombre slug")
      .populate("subcategoria", "nombre slug")
      .populate("origen", "nombre slug")
      .populate("creadores", "nombre slug tipo")
      .sort({ orden: 1, nombre: 1 });

    res.json({
      message: "Lista de series obtenida correctamente",
      total: series.length,
      series
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
    const serie = await Series.findById(req.params.id)
      .populate("categoriaPrincipal", "nombre slug")
      .populate("subcategoria", "nombre slug")
      .populate("origen", "nombre slug")
      .populate("creadores", "nombre slug tipo");

    if (!serie) {
      return res.status(404).json({
        message: "Serie no encontrada"
      });
    }

    res.json({
      message: "Serie obtenida correctamente",
      serie
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
    const {
      nombre,
      descripcion,
      imagen,
      categoriaPrincipal,
      subcategoria,
      origen,
      creadores,
      destacada,
      orden
    } = req.body;

    const slug = createSlug(nombre);

    const seriesExists = await Series.findOne({ slug });

    if (seriesExists) {
      return res.status(400).json({
        message: "Esta serie ya existe"
      });
    }

    const serie = await Series.create({
      nombre,
      slug,
      descripcion,
      imagen,
      categoriaPrincipal,
      subcategoria: subcategoria || null,
      origen,
      creadores: creadores || [],
      destacada,
      orden
    });

    res.status(201).json({
      message: "Serie creada correctamente",
      serie
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
    const {
      nombre,
      descripcion,
      imagen,
      categoriaPrincipal,
      subcategoria,
      origen,
      creadores,
      destacada,
      activa,
      orden
    } = req.body;

    const serie = await Series.findById(req.params.id);

    if (!serie) {
      return res.status(404).json({
        message: "Serie no encontrada"
      });
    }

    if (nombre) {
      const slug = createSlug(nombre);

      const duplicatedSeries = await Series.findOne({
        slug,
        _id: { $ne: serie._id }
      });

      if (duplicatedSeries) {
        return res.status(400).json({
          message: "Ya existe otra serie con ese nombre"
        });
      }

      serie.nombre = nombre;
      serie.slug = slug;
    }

    if (descripcion !== undefined) serie.descripcion = descripcion;
    if (imagen !== undefined) serie.imagen = imagen;
    if (categoriaPrincipal !== undefined) serie.categoriaPrincipal = categoriaPrincipal;
    if (subcategoria !== undefined) serie.subcategoria = subcategoria || null;
    if (origen !== undefined) serie.origen = origen;
    if (creadores !== undefined) serie.creadores = creadores;
    if (destacada !== undefined) serie.destacada = destacada;
    if (activa !== undefined) serie.activa = activa;
    if (orden !== undefined) serie.orden = orden;

    await serie.save();

    res.json({
      message: "Serie actualizada correctamente",
      serie
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
    await serie.save();

    res.json({
      message: "Serie desactivada correctamente"
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
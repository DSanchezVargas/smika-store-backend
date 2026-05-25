const Category = require("../models/Category");
const { createSlug } = require("../utils/slugHelper");

const getCategories = async (req, res) => {
  try {
    const { search, tipo, categoriaPadre, activos } = req.query;

    const filter = {};

    if (activos !== "false") {
      filter.activa = true;
    }

    if (search) {
      filter.nombre = { $regex: search, $options: "i" };
    }

    if (tipo) {
      filter.tipo = tipo;
    }

    if (categoriaPadre) {
      filter.categoriaPadre = categoriaPadre;
    }

    const categories = await Category.find(filter)
      .populate("categoriaPadre", "nombre slug")
      .sort({ orden: 1, nombre: 1 });

    res.json({
      message: "Lista de categorías obtenida correctamente",
      total: categories.length,
      categories
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener categorías",
      error: error.message
    });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate(
      "categoriaPadre",
      "nombre slug"
    );

    if (!category) {
      return res.status(404).json({
        message: "Categoría no encontrada"
      });
    }

    res.json({
      message: "Categoría obtenida correctamente",
      category
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener categoría",
      error: error.message
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      tipo,
      categoriaPadre,
      imagen,
      orden
    } = req.body;

    const slug = createSlug(nombre);

    const categoryExists = await Category.findOne({ slug });

    if (categoryExists) {
      return res.status(400).json({
        message: "Esta categoría ya existe"
      });
    }

    const category = await Category.create({
      nombre,
      slug,
      descripcion,
      tipo,
      categoriaPadre: categoriaPadre || null,
      imagen,
      orden
    });

    res.status(201).json({
      message: "Categoría creada correctamente",
      category
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear categoría",
      error: error.message
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      tipo,
      categoriaPadre,
      imagen,
      orden,
      activa
    } = req.body;

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: "Categoría no encontrada"
      });
    }

    if (nombre) {
      const slug = createSlug(nombre);

      const duplicatedCategory = await Category.findOne({
        slug,
        _id: { $ne: category._id }
      });

      if (duplicatedCategory) {
        return res.status(400).json({
          message: "Ya existe otra categoría con ese nombre"
        });
      }

      category.nombre = nombre;
      category.slug = slug;
    }

    if (descripcion !== undefined) category.descripcion = descripcion;
    if (tipo !== undefined) category.tipo = tipo;
    if (categoriaPadre !== undefined) {
      category.categoriaPadre = categoriaPadre || null;
    }
    if (imagen !== undefined) category.imagen = imagen;
    if (orden !== undefined) category.orden = orden;
    if (activa !== undefined) category.activa = activa;

    await category.save();

    res.json({
      message: "Categoría actualizada correctamente",
      category
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar categoría",
      error: error.message
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: "Categoría no encontrada"
      });
    }

    category.activa = false;
    await category.save();

    res.json({
      message: "Categoría desactivada correctamente"
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al desactivar categoría",
      error: error.message
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
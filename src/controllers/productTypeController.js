const ProductType = require("../models/ProductType");
const { createSlug } = require("../utils/slugHelper");

const normalizeProductTypeResponse = (productType) => {
  const plainProductType = productType?.toObject
    ? productType.toObject()
    : productType;

  if (!plainProductType) return null;

  return {
    ...plainProductType,
    id: plainProductType._id,
    _id: plainProductType._id,
    nombre: plainProductType.nombre,
    slug: plainProductType.slug,
    descripcion: plainProductType.descripcion || "",
    orden: Number(plainProductType.orden || 0),
    activo: plainProductType.activo !== false
  };
};

const getProductTypes = async (req, res) => {
  try {
    const { search, activos } = req.query;

    const filter = {};

    if (activos !== "false") {
      filter.activo = true;
    }

    if (search) {
      filter.nombre = {
        $regex: search,
        $options: "i"
      };
    }

    const productTypes = await ProductType.find(filter).sort({
      orden: 1,
      nombre: 1
    });

    res.json({
      message: "Tipos de producto obtenidos correctamente",
      total: productTypes.length,
      productTypes: productTypes.map(normalizeProductTypeResponse)
    });
  } catch (error) {
    console.error("Error al obtener tipos de producto:", error);

    res.status(500).json({
      message: "Error al obtener tipos de producto",
      error: error.message
    });
  }
};

const getProductTypeById = async (req, res) => {
  try {
    const productType = await ProductType.findById(req.params.id);

    if (!productType) {
      return res.status(404).json({
        message: "Tipo de producto no encontrado"
      });
    }

    res.json({
      message: "Tipo de producto obtenido correctamente",
      productType: normalizeProductTypeResponse(productType)
    });
  } catch (error) {
    console.error("Error al obtener tipo de producto:", error);

    res.status(500).json({
      message: "Error al obtener tipo de producto",
      error: error.message
    });
  }
};

const createProductType = async (req, res) => {
  try {
    const nombre = req.body.nombre?.trim();

    if (!nombre) {
      return res.status(400).json({
        message: "El nombre del tipo de producto es obligatorio"
      });
    }

    const slug = createSlug(nombre);

    const existingProductType = await ProductType.findOne({
      $or: [{ slug }, { nombre: { $regex: `^${nombre}$`, $options: "i" } }]
    });

    if (existingProductType) {
      return res.status(400).json({
        message: "Este tipo de producto ya existe"
      });
    }

    const productType = await ProductType.create({
      nombre,
      slug,
      descripcion: req.body.descripcion?.trim() || "",
      orden: Number(req.body.orden || 0),
      activo:
        req.body.activo !== undefined
          ? Boolean(req.body.activo)
          : true
    });

    res.status(201).json({
      message: "Tipo de producto creado correctamente",
      productType: normalizeProductTypeResponse(productType)
    });
  } catch (error) {
    console.error("Error al crear tipo de producto:", error);

    res.status(error.name === "ValidationError" ? 400 : 500).json({
      message: "Error al crear tipo de producto",
      error: error.message
    });
  }
};

const updateProductType = async (req, res) => {
  try {
    const productType = await ProductType.findById(req.params.id);

    if (!productType) {
      return res.status(404).json({
        message: "Tipo de producto no encontrado"
      });
    }

    if (req.body.nombre !== undefined) {
      const nombre = req.body.nombre.trim();

      if (!nombre) {
        return res.status(400).json({
          message: "El nombre del tipo de producto es obligatorio"
        });
      }

      const slug = createSlug(nombre);

      const duplicatedProductType = await ProductType.findOne({
        slug,
        _id: { $ne: productType._id }
      });

      if (duplicatedProductType) {
        return res.status(400).json({
          message: "Ya existe otro tipo de producto con ese nombre"
        });
      }

      productType.nombre = nombre;
      productType.slug = slug;
    }

    if (req.body.descripcion !== undefined) {
      productType.descripcion = req.body.descripcion?.trim() || "";
    }

    if (req.body.orden !== undefined) {
      productType.orden = Number(req.body.orden || 0);
    }

    if (req.body.activo !== undefined) {
      productType.activo = Boolean(req.body.activo);
    }

    await productType.save();

    res.json({
      message: "Tipo de producto actualizado correctamente",
      productType: normalizeProductTypeResponse(productType)
    });
  } catch (error) {
    console.error("Error al actualizar tipo de producto:", error);

    res.status(error.name === "ValidationError" ? 400 : 500).json({
      message: "Error al actualizar tipo de producto",
      error: error.message
    });
  }
};

const deleteProductType = async (req, res) => {
  try {
    const productType = await ProductType.findById(req.params.id);

    if (!productType) {
      return res.status(404).json({
        message: "Tipo de producto no encontrado"
      });
    }

    productType.activo = false;
    await productType.save();

    res.json({
      message: "Tipo de producto desactivado correctamente",
      productType: normalizeProductTypeResponse(productType)
    });
  } catch (error) {
    console.error("Error al desactivar tipo de producto:", error);

    res.status(500).json({
      message: "Error al desactivar tipo de producto",
      error: error.message
    });
  }
};

module.exports = {
  getProductTypes,
  getProductTypeById,
  createProductType,
  updateProductType,
  deleteProductType
};
const Cart = require("../models/Cart");
const Product = require("../models/Product");

const calculateCartTotal = (items) => {
  return items.reduce((total, item) => {
    return total + item.cantidad * item.precioReferencialUnitario;
  }, 0);
};

const findActiveCart = async (sessionId) => {
  return await Cart.findOne({
    sessionId,
    estado: "activo"
  }).populate("items.producto", "nombre slug precioReferencial imagenes disponibilidad stock");
};

const getCart = async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        message: "El sessionId es obligatorio para obtener la lista"
      });
    }

    let cart = await findActiveCart(sessionId);

    if (!cart) {
      cart = await Cart.create({
        sessionId,
        items: [],
        totalReferencial: 0
      });
    }

    res.json({
      message: "Lista de pedido obtenida correctamente",
      cart
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener la lista de pedido",
      error: error.message
    });
  }
};

const addToCart = async (req, res) => {
  try {
    const { sessionId, producto, cantidad } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        message: "El sessionId es obligatorio"
      });
    }

    const product = await Product.findById(producto);

    if (!product || !product.activo) {
      return res.status(404).json({
        message: "Producto no encontrado o no disponible"
      });
    }

    let cart = await Cart.findOne({
      sessionId,
      estado: "activo"
    });

    if (!cart) {
      cart = await Cart.create({
        sessionId,
        items: [],
        totalReferencial: 0
      });
    }

    const existingItem = cart.items.find(
      (item) => item.producto.toString() === producto
    );

    if (existingItem) {
      existingItem.cantidad += cantidad || 1;
    } else {
      cart.items.push({
        producto,
        cantidad: cantidad || 1,
        precioReferencialUnitario: product.precioReferencial
      });
    }

    cart.totalReferencial = calculateCartTotal(cart.items);

    await cart.save();

    const updatedCart = await findActiveCart(sessionId);

    res.status(201).json({
      message: "Producto agregado a la lista correctamente",
      cart: updatedCart
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al agregar producto a la lista",
      error: error.message
    });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const { sessionId, producto, cantidad } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        message: "El sessionId es obligatorio"
      });
    }

    if (!producto || cantidad < 1) {
      return res.status(400).json({
        message: "Debe enviar un producto válido y una cantidad mayor a 0"
      });
    }

    const cart = await Cart.findOne({
      sessionId,
      estado: "activo"
    });

    if (!cart) {
      return res.status(404).json({
        message: "Lista de pedido no encontrada"
      });
    }

    const item = cart.items.find(
      (item) => item.producto.toString() === producto
    );

    if (!item) {
      return res.status(404).json({
        message: "Producto no encontrado dentro de la lista"
      });
    }

    item.cantidad = cantidad;
    cart.totalReferencial = calculateCartTotal(cart.items);

    await cart.save();

    const updatedCart = await findActiveCart(sessionId);

    res.json({
      message: "Cantidad actualizada correctamente",
      cart: updatedCart
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar producto de la lista",
      error: error.message
    });
  }
};

const removeCartItem = async (req, res) => {
  try {
    const { sessionId, producto } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        message: "El sessionId es obligatorio"
      });
    }

    const cart = await Cart.findOne({
      sessionId,
      estado: "activo"
    });

    if (!cart) {
      return res.status(404).json({
        message: "Lista de pedido no encontrada"
      });
    }

    cart.items = cart.items.filter(
      (item) => item.producto.toString() !== producto
    );

    cart.totalReferencial = calculateCartTotal(cart.items);

    await cart.save();

    const updatedCart = await findActiveCart(sessionId);

    res.json({
      message: "Producto eliminado de la lista correctamente",
      cart: updatedCart
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar producto de la lista",
      error: error.message
    });
  }
};

const clearCart = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        message: "El sessionId es obligatorio"
      });
    }

    const cart = await Cart.findOne({
      sessionId,
      estado: "activo"
    });

    if (!cart) {
      return res.status(404).json({
        message: "Lista de pedido no encontrada"
      });
    }

    cart.items = [];
    cart.totalReferencial = 0;

    await cart.save();

    res.json({
      message: "Lista de pedido vaciada correctamente",
      cart
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al vaciar la lista de pedido",
      error: error.message
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
};
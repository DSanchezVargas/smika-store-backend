const User = require("../models/User");
const { normalizePhoneData } = require("../utils/phoneHelper");

const buildUserResponse = (user) => {
  return {
    id: user._id,
    nombre: user.nombre,
    apellido: user.apellido,
    alias: user.alias,
    pais: user.pais,
    codigoPais: user.codigoPais,
    telefono: user.telefono,
    telefonoCompleto: user.telefonoCompleto,
    email: user.email,
    role: user.role,
    activo: user.activo,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

const getUsers = async (req, res) => {
  try {
    const { search, role, activos, pais } = req.query;

    const filter = {};

    if (activos !== "false") {
      filter.activo = true;
    }

    if (role) {
      filter.role = role;
    }

    if (pais) {
      filter.pais = pais;
    }

    if (search) {
      filter.$or = [
        { nombre: { $regex: search, $options: "i" } },
        { apellido: { $regex: search, $options: "i" } },
        { alias: { $regex: search, $options: "i" } },
        { telefono: { $regex: search, $options: "i" } },
        { telefonoCompleto: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      message: "Lista de usuarios obtenida correctamente",
      total: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener usuarios",
      error: error.message
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    res.json({
      message: "Usuario obtenido correctamente",
      user
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener usuario",
      error: error.message
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    if (!["cliente", "admin"].includes(role)) {
      return res.status(400).json({
        message: "El rol no es válido"
      });
    }

    user.role = role;
    await user.save();

    res.json({
      message: "Rol de usuario actualizado correctamente",
      user: buildUserResponse(user)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar rol de usuario",
      error: error.message
    });
  }
};

const updateUserData = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      alias,
      pais,
      codigoPais,
      telefono,
      email,
      activo
    } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    if (email && email !== user.email) {
      const emailExists = await User.findOne({
        email,
        _id: { $ne: user._id }
      });

      if (emailExists) {
        return res.status(400).json({
          message: "Ya existe otro usuario con ese correo"
        });
      }

      user.email = email;
    }

    if (nombre !== undefined) user.nombre = nombre;
    if (apellido !== undefined) user.apellido = apellido;
    if (alias !== undefined) user.alias = alias;

    if (
      pais !== undefined ||
      codigoPais !== undefined ||
      telefono !== undefined
    ) {
      const phoneData = normalizePhoneData({
        pais: pais !== undefined ? pais : user.pais,
        codigoPais: codigoPais !== undefined ? codigoPais : user.codigoPais,
        telefono: telefono !== undefined ? telefono : user.telefono
      });

      user.pais = phoneData.pais;
      user.codigoPais = phoneData.codigoPais;
      user.telefono = phoneData.telefono;
      user.telefonoCompleto = phoneData.telefonoCompleto;
    }

    if (activo !== undefined) user.activo = activo;

    await user.save();

    res.json({
      message: "Usuario actualizado correctamente",
      user: buildUserResponse(user)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar usuario",
      error: error.message
    });
  }
};

const deactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    user.activo = false;
    await user.save();

    res.json({
      message: "Usuario desactivado correctamente"
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al desactivar usuario",
      error: error.message
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUserRole,
  updateUserData,
  deactivateUser
};
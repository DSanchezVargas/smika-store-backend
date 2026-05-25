require("dotenv").config();

const connectDB = require("../config/db");
const Category = require("../models/Category");
const Origin = require("../models/Origin");
const { createSlug } = require("../utils/slugHelper");

const createOriginIfNotExists = async (nombre, descripcion = "") => {
  const slug = createSlug(nombre);

  const exists = await Origin.findOne({ slug });

  if (!exists) {
    await Origin.create({
      nombre,
      slug,
      descripcion
    });

    console.log(`Origen creado: ${nombre}`);
  }
};

const createCategoryIfNotExists = async ({
  nombre,
  descripcion = "",
  tipo = "principal",
  categoriaPadre = null,
  orden = 0
}) => {
  const slug = createSlug(
    categoriaPadre ? `${categoriaPadre.nombre}-${nombre}` : nombre
  );

  const exists = await Category.findOne({ slug });

  if (exists) {
    return exists;
  }

  const category = await Category.create({
    nombre,
    slug,
    descripcion,
    tipo,
    categoriaPadre: categoriaPadre ? categoriaPadre._id : null,
    orden
  });

  console.log(`Categoría creada: ${nombre}`);

  return category;
};

const seedData = async () => {
  try {
    await connectDB();

    await createOriginIfNotExists("China");
    await createOriginIfNotExists("Corea");
    await createOriginIfNotExists("Japón");
    await createOriginIfNotExists("Taiwán");
    await createOriginIfNotExists("Perú");
    await createOriginIfNotExists("Variado");
    await createOriginIfNotExists("Otro");

    const series = await createCategoryIfNotExists({
      nombre: "Series",
      descripcion: "Sección principal para series chinas, coreanas, japonesas y variadas.",
      orden: 1
    });

    await createCategoryIfNotExists({
      nombre: "Chinas",
      descripcion: "Series de origen chino.",
      tipo: "subcategoria",
      categoriaPadre: series,
      orden: 1
    });

    await createCategoryIfNotExists({
      nombre: "Coreanas",
      descripcion: "Series de origen coreano.",
      tipo: "subcategoria",
      categoriaPadre: series,
      orden: 2
    });

    await createCategoryIfNotExists({
      nombre: "Japonesas",
      descripcion: "Series de origen japonés.",
      tipo: "subcategoria",
      categoriaPadre: series,
      orden: 3
    });

    await createCategoryIfNotExists({
      nombre: "Variado",
      descripcion: "Series de distintos orígenes.",
      tipo: "subcategoria",
      categoriaPadre: series,
      orden: 4
    });

    const eventos = await createCategoryIfNotExists({
      nombre: "Eventos",
      descripcion: "Sección para eventos, cafés, pop ups y especiales.",
      orden: 2
    });

    await createCategoryIfNotExists({
      nombre: "Café",
      tipo: "subcategoria",
      categoriaPadre: eventos,
      orden: 1
    });

    await createCategoryIfNotExists({
      nombre: "Pop up",
      tipo: "subcategoria",
      categoriaPadre: eventos,
      orden: 2
    });

    await createCategoryIfNotExists({
      nombre: "Lebom",
      tipo: "subcategoria",
      categoriaPadre: eventos,
      orden: 3
    });

    await createCategoryIfNotExists({
      nombre: "Especiales",
      tipo: "subcategoria",
      categoriaPadre: eventos,
      orden: 4
    });

    const libros = await createCategoryIfNotExists({
      nombre: "Libros",
      descripcion: "Sección para tomos y libros.",
      orden: 3
    });

    await createCategoryIfNotExists({
      nombre: "Tomos China",
      tipo: "subcategoria",
      categoriaPadre: libros,
      orden: 1
    });

    await createCategoryIfNotExists({
      nombre: "Tomos KR",
      tipo: "subcategoria",
      categoriaPadre: libros,
      orden: 2
    });

    await createCategoryIfNotExists({
      nombre: "Tomos JP",
      tipo: "subcategoria",
      categoriaPadre: libros,
      orden: 3
    });

    await createCategoryIfNotExists({
      nombre: "Tomos TW",
      tipo: "subcategoria",
      categoriaPadre: libros,
      orden: 4
    });

    const preventa = await createCategoryIfNotExists({
      nombre: "Preventa",
      descripcion: "Sección para productos en preventa.",
      orden: 4
    });

    await createCategoryIfNotExists({
      nombre: "China",
      tipo: "subcategoria",
      categoriaPadre: preventa,
      orden: 1
    });

    await createCategoryIfNotExists({
      nombre: "Corea",
      tipo: "subcategoria",
      categoriaPadre: preventa,
      orden: 2
    });

    await createCategoryIfNotExists({
      nombre: "Japón",
      tipo: "subcategoria",
      categoriaPadre: preventa,
      orden: 3
    });

    await createCategoryIfNotExists({
      nombre: "Variado",
      tipo: "subcategoria",
      categoriaPadre: preventa,
      orden: 4
    });

    await createCategoryIfNotExists({
      nombre: "Personalizados",
      descripcion: "Sección para productos personalizados.",
      orden: 5
    });

    console.log("Carga inicial completada correctamente");
    process.exit();
  } catch (error) {
    console.error("Error al ejecutar la carga inicial:", error.message);
    process.exit(1);
  }
};

seedData();
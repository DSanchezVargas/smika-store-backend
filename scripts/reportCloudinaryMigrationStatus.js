require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../src/models/Product");

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL;

if (!MONGO_URI) {
  console.error("❌ Falta MONGO_URI, MONGODB_URI o DATABASE_URL en tu .env");
  process.exit(1);
}

function getImageSource(image = {}) {
  if (typeof image === "string") return image;

  return (
    image.finalPreview ||
    image.url ||
    image.preview ||
    image.src ||
    image.imagen ||
    ""
  );
}

function formatMB(bytes = 0) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  console.log("🔌 Conectando a MongoDB...");

  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 15000
  });

  console.log("✅ Conectado.");
  console.log("🔎 Revisando productos e imágenes...");

  const products = await Product.find({})
    .select("nombre slug imagenes")
    .lean();

  console.log(`✅ Productos encontrados: ${products.length}`);
  console.log("📊 Calculando estado de imágenes...");

  let totalImages = 0;
  let base64Images = 0;
  let cloudinaryImages = 0;
  let externalImages = 0;
  let emptyImages = 0;
  let base64TextBytes = 0;

  const rows = products.map((product) => {
    const images = Array.isArray(product.imagenes) ? product.imagenes : [];

    const row = {
      producto: product.nombre || product.slug || product._id.toString(),
      total: images.length,
      base64: 0,
      cloudinary: 0,
      externas: 0,
      vacias: 0
    };

    images.forEach((image) => {
      totalImages += 1;

      const source = getImageSource(image);

      if (!source) {
        emptyImages += 1;
        row.vacias += 1;
        return;
      }

      if (source.startsWith("data:image/")) {
        base64Images += 1;
        row.base64 += 1;
        base64TextBytes += Buffer.byteLength(source, "utf8");
        return;
      }

      if (source.includes("res.cloudinary.com") || image.storage === "cloudinary") {
        cloudinaryImages += 1;
        row.cloudinary += 1;
        return;
      }

      externalImages += 1;
      row.externas += 1;
    });

    return row;
  });

  console.table(rows.filter((row) => row.total > 0));

  console.log("");
  console.log("📦 RESUMEN");
  console.log(`Productos revisados: ${products.length}`);
  console.log(`Imágenes totales: ${totalImages}`);
  console.log(`Imágenes en base64: ${base64Images}`);
  console.log(`Imágenes en Cloudinary: ${cloudinaryImages}`);
  console.log(`Imágenes externas: ${externalImages}`);
  console.log(`Imágenes vacías: ${emptyImages}`);
  console.log(`Peso texto base64 aproximado restante: ${formatMB(base64TextBytes)}`);
  console.log("");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("❌ Error:");
  console.error(error.message || error);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});
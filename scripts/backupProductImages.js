require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Product = require("../src/models/Product");

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL;

if (!MONGO_URI) {
  console.error("❌ No se encontró MONGO_URI, MONGODB_URI o DATABASE_URL en el .env");
  process.exit(1);
}

const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(
  process.cwd(),
  "backups",
  `product-images-${stamp}`
);

function sanitizeName(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80) || "sin-nombre";
}

function parseDataUrl(dataUrl = "") {
  if (typeof dataUrl !== "string") return null;

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) return null;

  const mime = match[1];
  const base64 = match[2];

  const extensionMap = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif"
  };

  const extension = extensionMap[mime] || "jpg";

  return {
    mime,
    base64,
    extension
  };
}

function getImageSource(image = {}) {
  if (!image) return "";

  if (typeof image === "string") return image;

  return image.finalPreview || image.url || image.preview || image.src || "";
}

async function main() {
  console.log("🔌 Conectando a MongoDB...");
  await mongoose.connect(MONGO_URI);

  console.log("✅ MongoDB conectado");
  console.log("📁 Carpeta de respaldo:");
  console.log(BACKUP_DIR);

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const products = await Product.find({
    "imagenes.0": { $exists: true }
  })
    .select("nombre slug imagenes updatedAt createdAt")
    .lean();

  console.log(`🔎 Productos con campo imagenes: ${products.length}`);

  const manifest = [];
  let exportedImages = 0;
  let skippedImages = 0;

  for (const product of products) {
    const productId = product._id.toString();
    const productName = product.nombre || product.slug || productId;
    const productFolderName = `${sanitizeName(productName)}-${productId}`;
    const productFolder = path.join(BACKUP_DIR, productFolderName);

    fs.mkdirSync(productFolder, { recursive: true });

    const productManifest = {
      productId,
      nombre: product.nombre || "",
      slug: product.slug || "",
      createdAt: product.createdAt || null,
      updatedAt: product.updatedAt || null,
      exported: [],
      skipped: []
    };

    const images = Array.isArray(product.imagenes) ? product.imagenes : [];

    images.forEach((image, index) => {
      const source = getImageSource(image);
      const parsed = parseDataUrl(source);

      if (!parsed) {
        skippedImages += 1;

        productManifest.skipped.push({
          index,
          reason: source ? "No es base64 data:image" : "Imagen sin fuente",
          storage: image?.storage || "",
          name: image?.name || "",
          originalName: image?.originalName || "",
          publicId: image?.publicId || ""
        });

        return;
      }

      const safeImageName = sanitizeName(
        image?.name ||
          image?.originalName ||
          `imagen-${index + 1}`
      );

      const fileName = `${String(index + 1).padStart(2, "0")}-${safeImageName}.${parsed.extension}`;
      const filePath = path.join(productFolder, fileName);

      fs.writeFileSync(filePath, Buffer.from(parsed.base64, "base64"));

      exportedImages += 1;

      productManifest.exported.push({
        index,
        fileName,
        relativePath: path.relative(BACKUP_DIR, filePath),
        mime: parsed.mime,
        storage: image?.storage || "",
        name: image?.name || "",
        originalName: image?.originalName || "",
        size: image?.size || 0,
        finalSize: image?.finalSize || 0
      });
    });

    manifest.push(productManifest);
  }

  const manifestPath = path.join(BACKUP_DIR, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  console.log("");
  console.log("✅ Respaldo terminado");
  console.log(`🖼️ Imágenes exportadas: ${exportedImages}`);
  console.log(`⚠️ Imágenes omitidas: ${skippedImages}`);
  console.log(`📄 Manifest: ${manifestPath}`);
  console.log("");
  console.log("IMPORTANTE: no subas la carpeta backups a GitHub.");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("❌ Error al respaldar imágenes:");
  console.error(error);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});
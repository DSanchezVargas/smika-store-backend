require("dotenv").config();

const { configureCloudinary } = require("../src/config/cloudinary");

const TINY_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

function getArgValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

async function main() {
  const cloudinary = configureCloudinary();
  const folder = getArgValue("folder", process.env.CLOUDINARY_FOLDER || "smika/test");
  const keep = process.argv.includes("--keep");

  console.log("🔌 Probando conexión con Cloudinary...");
  console.log(`📁 Carpeta: ${folder}`);

  const result = await cloudinary.uploader.upload(TINY_PNG_DATA_URL, {
    folder,
    resource_type: "image",
    public_id: `smika-test-${Date.now()}`,
    overwrite: false
  });

  console.log("✅ Cloudinary funciona correctamente.");
  console.log(`secure_url: ${result.secure_url}`);
  console.log(`public_id: ${result.public_id}`);
  console.log(`format: ${result.format}`);
  console.log(`bytes: ${result.bytes}`);

  if (!keep) {
    await cloudinary.uploader.destroy(result.public_id, {
      resource_type: "image"
    });

    console.log("🧹 Imagen de prueba eliminada de Cloudinary.");
    console.log("Si quieres verla en Cloudinary, ejecuta otra vez con: node scripts/testCloudinaryUpload.js --keep");
  } else {
    console.log("📌 Imagen de prueba conservada en Cloudinary porque usaste --keep.");
  }
}

main().catch((error) => {
  console.error("❌ Error probando Cloudinary:");
  console.error(error.message || error);
  process.exit(1);
});

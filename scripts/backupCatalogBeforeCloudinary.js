require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL;

if (!MONGO_URI) {
  console.error("Falta MONGO_URI, MONGODB_URI o DATABASE_URL en tu .env");
  process.exit(1);
}

const COLLECTIONS = [
  {
    name: "products",
    label: "productos",
    imageMode: "product"
  },
  {
    name: "series",
    label: "series",
    imageMode: "simple"
  },
  {
    name: "events",
    label: "eventos",
    imageMode: "simple"
  }
];

function safeDateName() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function formatMB(bytes = 0) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getProductImageSource(image = {}) {
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

function getSimpleImageSources(doc = {}) {
  const sources = [];

  if (typeof doc.imagen === "string" && doc.imagen.trim()) {
    sources.push(doc.imagen.trim());
  }

  if (Array.isArray(doc.imagenes)) {
    doc.imagenes.forEach((image) => {
      if (typeof image === "string" && image.trim()) {
        sources.push(image.trim());
      }

      if (image && typeof image === "object") {
        const source =
          image.finalPreview ||
          image.url ||
          image.preview ||
          image.src ||
          image.imagen ||
          "";

        if (source) sources.push(source);
      }
    });
  }

  return sources;
}

function getProductImageSources(doc = {}) {
  if (!Array.isArray(doc.imagenes)) return [];

  return doc.imagenes
    .map((image) => getProductImageSource(image))
    .filter(Boolean);
}

function analyzeSources(sources = []) {
  let total = 0;
  let base64 = 0;
  let cloudinary = 0;
  let externas = 0;
  let vacias = 0;
  let base64Bytes = 0;

  sources.forEach((source) => {
    total += 1;

    if (!source) {
      vacias += 1;
      return;
    }

    if (source.startsWith("data:image/")) {
      base64 += 1;
      base64Bytes += Buffer.byteLength(source, "utf8");
      return;
    }

    if (source.includes("res.cloudinary.com")) {
      cloudinary += 1;
      return;
    }

    externas += 1;
  });

  return {
    total,
    base64,
    cloudinary,
    externas,
    vacias,
    base64Bytes
  };
}

async function backupCollection({ db, backupDir, collectionConfig }) {
  const { name, label, imageMode } = collectionConfig;
  const collection = db.collection(name);

  const outputFile = path.join(backupDir, `${name}-backup.json`);
  const stream = fs.createWriteStream(outputFile, {
    encoding: "utf8"
  });

  console.log("");
  console.log(`Creando backup de ${label}...`);

  stream.write("[\n");

  const cursor = collection.find({}).batchSize(1);

  let first = true;
  let documents = 0;

  const summary = {
    collection: name,
    label,
    documents: 0,
    imagesTotal: 0,
    imagesBase64: 0,
    imagesCloudinary: 0,
    imagesExternal: 0,
    imagesEmpty: 0,
    base64TextBytes: 0,
    file: outputFile
  };

  for await (const doc of cursor) {
    documents += 1;

    const sources =
      imageMode === "product"
        ? getProductImageSources(doc)
        : getSimpleImageSources(doc);

    const imageStats = analyzeSources(sources);

    summary.imagesTotal += imageStats.total;
    summary.imagesBase64 += imageStats.base64;
    summary.imagesCloudinary += imageStats.cloudinary;
    summary.imagesExternal += imageStats.externas;
    summary.imagesEmpty += imageStats.vacias;
    summary.base64TextBytes += imageStats.base64Bytes;

    if (!first) {
      stream.write(",\n");
    }

    stream.write(JSON.stringify(doc, null, 2));
    first = false;

    const title =
      doc.nombre ||
      doc.titulo ||
      doc.slug ||
      doc._id?.toString?.() ||
      `documento-${documents}`;

    console.log(`OK ${label} ${documents}: ${title}`);
  }

  stream.write("\n]\n");

  await new Promise((resolve, reject) => {
    stream.end(resolve);
    stream.on("error", reject);
  });

  summary.documents = documents;

  console.log(`Backup de ${label} terminado: ${documents} registros`);

  return summary;
}

async function main() {
  console.log("Conectando a MongoDB...");

  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 15000
  });

  console.log("Conectado.");

  const db = mongoose.connection.db;

  const backupDir = path.join(
    process.cwd(),
    "backups",
    `catalog-before-cloudinary-${safeDateName()}`
  );

  fs.mkdirSync(backupDir, {
    recursive: true
  });

  const summaries = [];

  for (const collectionConfig of COLLECTIONS) {
    const summary = await backupCollection({
      db,
      backupDir,
      collectionConfig
    });

    summaries.push(summary);
  }

  const globalSummary = summaries.reduce(
    (accumulator, summary) => {
      accumulator.documents += summary.documents;
      accumulator.imagesTotal += summary.imagesTotal;
      accumulator.imagesBase64 += summary.imagesBase64;
      accumulator.imagesCloudinary += summary.imagesCloudinary;
      accumulator.imagesExternal += summary.imagesExternal;
      accumulator.imagesEmpty += summary.imagesEmpty;
      accumulator.base64TextBytes += summary.base64TextBytes;

      return accumulator;
    },
    {
      date: new Date().toISOString(),
      backupDir,
      documents: 0,
      imagesTotal: 0,
      imagesBase64: 0,
      imagesCloudinary: 0,
      imagesExternal: 0,
      imagesEmpty: 0,
      base64TextBytes: 0,
      collections: summaries
    }
  );

  const summaryFile = path.join(backupDir, "summary.json");

  fs.writeFileSync(
    summaryFile,
    JSON.stringify(
      {
        ...globalSummary,
        base64TextMB: formatMB(globalSummary.base64TextBytes)
      },
      null,
      2
    ),
    "utf8"
  );

  console.log("");
  console.log("BACKUP COMPLETO CREADO");
  console.log(`Carpeta: ${backupDir}`);
  console.log(`Resumen: ${summaryFile}`);
  console.log("");
  console.log("RESUMEN GENERAL");
  console.log(`Registros respaldados: ${globalSummary.documents}`);
  console.log(`Imagenes totales detectadas: ${globalSummary.imagesTotal}`);
  console.log(`Imagenes base64: ${globalSummary.imagesBase64}`);
  console.log(`Imagenes Cloudinary: ${globalSummary.imagesCloudinary}`);
  console.log(`Imagenes externas: ${globalSummary.imagesExternal}`);
  console.log(`Imagenes vacias: ${globalSummary.imagesEmpty}`);
  console.log(`Peso texto base64 aprox: ${formatMB(globalSummary.base64TextBytes)}`);
  console.log("");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Error creando backup:");
  console.error(error.message || error);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});
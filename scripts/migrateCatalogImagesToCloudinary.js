require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { v2: cloudinary } = require("cloudinary");

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL;

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!MONGO_URI) {
  console.error("Falta MONGO_URI, MONGODB_URI o DATABASE_URL en tu .env");
  process.exit(1);
}

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error("Faltan variables de Cloudinary en tu .env");
  console.error("Revisa CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET");
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});

const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");

const limitArg = args.find((arg) => arg.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.replace("--limit=", "")) : 0;

const COLLECTIONS = [
  {
    name: "products",
    label: "productos",
    folder: "smika/products",
    mode: "products"
  },
  {
    name: "series",
    label: "series",
    folder: "smika/series",
    mode: "simple"
  },
  {
    name: "events",
    label: "eventos",
    folder: "smika/events",
    mode: "simple"
  }
];

function safeDateName() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function createSlug(text = "") {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || "smika";
}

function isBase64Image(source = "") {
  return typeof source === "string" && source.startsWith("data:image/");
}

function isCloudinaryImage(source = "") {
  return typeof source === "string" && source.includes("res.cloudinary.com");
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

function getSimpleImageSource(image = "") {
  if (typeof image === "string") return image;

  if (image && typeof image === "object") {
    return (
      image.finalPreview ||
      image.url ||
      image.preview ||
      image.src ||
      image.imagen ||
      ""
    );
  }

  return "";
}

async function uploadBase64ToCloudinary(source, options = {}) {
  const { folder, publicId } = options;

  const result = await cloudinary.uploader.upload(source, {
    folder,
    public_id: publicId,
    resource_type: "image",
    overwrite: false
  });

  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height
  };
}

function buildPublicId(doc = {}, index = 0) {
  const title =
    doc.nombre ||
    doc.titulo ||
    doc.slug ||
    doc._id?.toString?.() ||
    "imagen";

  return `${createSlug(title)}-${doc._id?.toString?.() || Date.now()}-${index + 1}-${Date.now()}`;
}

async function migrateProductImages(doc, collectionConfig, stats) {
  const images = Array.isArray(doc.imagenes) ? doc.imagenes : [];

  if (images.length === 0) {
    return {
      changed: false,
      update: null
    };
  }

  const nextImages = [];
  let changed = false;

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const source = getProductImageSource(image);

    if (!source) {
      nextImages.push(image);
      continue;
    }

    if (!isBase64Image(source)) {
      nextImages.push(image);
      continue;
    }

    stats.base64Found += 1;
    changed = true;

    console.log(`   Subiendo imagen producto ${index + 1}/${images.length}...`);

    if (!EXECUTE) {
      nextImages.push(image);
      continue;
    }

    const uploaded = await uploadBase64ToCloudinary(source, {
      folder: collectionConfig.folder,
      publicId: buildPublicId(doc, index)
    });

    stats.uploaded += 1;

    const nextImage =
      image && typeof image === "object"
        ? {
            ...image,
            url: uploaded.secureUrl,
            preview: uploaded.secureUrl,
            finalPreview: uploaded.secureUrl,
            publicId: uploaded.publicId,
            storage: "cloudinary",
            migratedFromBase64: true,
            oldStorage: image.storage || "local-data-url",
            format: uploaded.format,
            size: uploaded.bytes,
            finalSize: uploaded.bytes,
            width: uploaded.width,
            height: uploaded.height,
            finalWidth: uploaded.width,
            finalHeight: uploaded.height
          }
        : {
            url: uploaded.secureUrl,
            preview: uploaded.secureUrl,
            finalPreview: uploaded.secureUrl,
            publicId: uploaded.publicId,
            storage: "cloudinary",
            migratedFromBase64: true,
            oldStorage: "local-data-url",
            format: uploaded.format,
            size: uploaded.bytes,
            finalSize: uploaded.bytes,
            width: uploaded.width,
            height: uploaded.height,
            finalWidth: uploaded.width,
            finalHeight: uploaded.height
          };

    nextImages.push(nextImage);

    console.log(`   OK ${uploaded.secureUrl}`);
  }

  if (!changed) {
    return {
      changed: false,
      update: null
    };
  }

  return {
    changed: true,
    update: {
      $set: {
        imagenes: nextImages
      }
    }
  };
}

async function migrateSimpleImages(doc, collectionConfig, stats) {
  let changed = false;
  const setPayload = {};

  const mainImage = getSimpleImageSource(doc.imagen);

  if (isBase64Image(mainImage)) {
    stats.base64Found += 1;
    changed = true;

    console.log("   Subiendo imagen principal...");

    if (EXECUTE) {
      const uploaded = await uploadBase64ToCloudinary(mainImage, {
        folder: collectionConfig.folder,
        publicId: buildPublicId(doc, 0)
      });

      stats.uploaded += 1;
      setPayload.imagen = uploaded.secureUrl;

      console.log(`   OK ${uploaded.secureUrl}`);
    }
  }

  if (Array.isArray(doc.imagenes)) {
    const nextImages = [];

    for (let index = 0; index < doc.imagenes.length; index += 1) {
      const image = doc.imagenes[index];
      const source = getSimpleImageSource(image);

      if (!source) {
        nextImages.push(image);
        continue;
      }

      if (!isBase64Image(source)) {
        nextImages.push(image);
        continue;
      }

      stats.base64Found += 1;
      changed = true;

      console.log(`   Subiendo imagen galería ${index + 1}/${doc.imagenes.length}...`);

      if (!EXECUTE) {
        nextImages.push(image);
        continue;
      }

      const uploaded = await uploadBase64ToCloudinary(source, {
        folder: collectionConfig.folder,
        publicId: buildPublicId(doc, index + 1)
      });

      stats.uploaded += 1;

      if (typeof image === "string") {
        nextImages.push(uploaded.secureUrl);
      } else {
        nextImages.push({
          ...image,
          url: uploaded.secureUrl,
          preview: uploaded.secureUrl,
          finalPreview: uploaded.secureUrl,
          publicId: uploaded.publicId,
          storage: "cloudinary",
          migratedFromBase64: true,
          format: uploaded.format,
          size: uploaded.bytes,
          width: uploaded.width,
          height: uploaded.height
        });
      }

      console.log(`   OK ${uploaded.secureUrl}`);
    }

    if (changed && EXECUTE) {
      setPayload.imagenes = nextImages;
    }
  }

  if (!changed) {
    return {
      changed: false,
      update: null
    };
  }

  return {
    changed: true,
    update: EXECUTE
      ? {
          $set: setPayload
        }
      : null
  };
}

async function backupChangedDoc(backupDir, collectionName, doc) {
  const collectionDir = path.join(backupDir, collectionName);

  fs.mkdirSync(collectionDir, {
    recursive: true
  });

  const file = path.join(collectionDir, `${doc._id.toString()}.json`);

  fs.writeFileSync(file, JSON.stringify(doc, null, 2), "utf8");
}

async function migrateCollection(db, collectionConfig, backupDir, globalStats) {
  const collection = db.collection(collectionConfig.name);

  console.log("");
  console.log(`Procesando ${collectionConfig.label}...`);
  console.log(`Carpeta Cloudinary: ${collectionConfig.folder}`);

  const cursor = collection.find({}).batchSize(1);

  let reviewed = 0;
  let changedDocs = 0;
  let migratedDocs = 0;
  let skippedDocs = 0;

  for await (const doc of cursor) {
    if (LIMIT > 0 && changedDocs >= LIMIT) {
      break;
    }

    reviewed += 1;

    const title =
      doc.nombre ||
      doc.titulo ||
      doc.slug ||
      doc._id?.toString?.() ||
      `${collectionConfig.label}-${reviewed}`;

    const docStats = {
      base64Found: 0,
      uploaded: 0
    };

    const result =
      collectionConfig.mode === "products"
        ? await migrateProductImages(doc, collectionConfig, docStats)
        : await migrateSimpleImages(doc, collectionConfig, docStats);

    if (!result.changed) {
      skippedDocs += 1;
      continue;
    }

    changedDocs += 1;
    globalStats.base64Found += docStats.base64Found;

    console.log("");
    console.log(`${collectionConfig.label}: ${title}`);
    console.log(`   Imagenes base64 detectadas: ${docStats.base64Found}`);

    await backupChangedDoc(backupDir, collectionConfig.name, doc);

    if (!EXECUTE) {
      continue;
    }

    if (result.update) {
      await collection.updateOne(
        {
          _id: doc._id
        },
        result.update
      );

      migratedDocs += 1;
      globalStats.uploaded += docStats.uploaded;

      console.log("   Registro actualizado en MongoDB.");
    }
  }

  return {
    collection: collectionConfig.name,
    label: collectionConfig.label,
    reviewed,
    changedDocs,
    migratedDocs,
    skippedDocs
  };
}

async function main() {
  console.log(EXECUTE ? "MODO EJECUCION REAL" : "MODO PRUEBA / DRY RUN");

  if (!EXECUTE) {
    console.log("No se modificará MongoDB. Para migrar de verdad usa --execute.");
  }

  if (LIMIT > 0) {
    console.log(`Límite por colección: ${LIMIT} registros con base64`);
  }

  console.log("Conectando a MongoDB...");

  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 15000
  });

  console.log("Conectado.");

  const db = mongoose.connection.db;

  const backupDir = path.join(
    process.cwd(),
    "backups",
    `catalog-cloudinary-migration-${safeDateName()}`
  );

  fs.mkdirSync(backupDir, {
    recursive: true
  });

  const globalStats = {
    base64Found: 0,
    uploaded: 0
  };

  const collectionSummaries = [];

  for (const collectionConfig of COLLECTIONS) {
    const summary = await migrateCollection(
      db,
      collectionConfig,
      backupDir,
      globalStats
    );

    collectionSummaries.push(summary);
  }

  const summaryFile = path.join(backupDir, "migration-summary.json");

  fs.writeFileSync(
    summaryFile,
    JSON.stringify(
      {
        date: new Date().toISOString(),
        execute: EXECUTE,
        limit: LIMIT,
        base64Found: globalStats.base64Found,
        uploaded: globalStats.uploaded,
        collections: collectionSummaries
      },
      null,
      2
    ),
    "utf8"
  );

  console.log("");
  console.log("RESUMEN");
  console.log(`Imagenes base64 encontradas: ${globalStats.base64Found}`);
  console.log(`Imagenes subidas a Cloudinary: ${globalStats.uploaded}`);
  console.log(`Backup de registros tocados: ${backupDir}`);
  console.log(`Resumen: ${summaryFile}`);
  console.log("");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Error en migracion:");
  console.error(error.message || error);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});
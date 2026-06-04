require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL;

if (!MONGO_URI) {
  console.error("❌ Falta MONGO_URI, MONGODB_URI o DATABASE_URL en tu .env");
  process.exit(1);
}

function formatMB(bytes = 0) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  console.log("🔌 Conectando a MongoDB...");

  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 15000
  });

  console.log("✅ Conectado. Calculando peso de imágenes...");

  const db = mongoose.connection.db;
  const collection = db.collection("products");

  const result = await collection
    .aggregate(
      [
        {
          $project: {
            nombre: 1,
            imagenes: {
              $ifNull: ["$imagenes", []]
            }
          }
        },
        {
          $project: {
            nombre: 1,
            cantidadImagenes: {
              $size: "$imagenes"
            },
            pesoTextoBase64: {
              $sum: {
                $map: {
                  input: "$imagenes",
                  as: "img",
                  in: {
                    $add: [
                      {
                        $strLenBytes: {
                          $ifNull: ["$$img.url", ""]
                        }
                      },
                      {
                        $strLenBytes: {
                          $ifNull: ["$$img.preview", ""]
                        }
                      },
                      {
                        $strLenBytes: {
                          $ifNull: ["$$img.finalPreview", ""]
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        },
        {
          $sort: {
            pesoTextoBase64: -1
          }
        }
      ],
      {
        allowDiskUse: true
      }
    )
    .toArray();

  let totalImagenes = 0;
  let totalTextoBase64 = 0;

  const tabla = result.map((product) => {
    totalImagenes += product.cantidadImagenes || 0;
    totalTextoBase64 += product.pesoTextoBase64 || 0;

    return {
      producto: product.nombre,
      imagenes: product.cantidadImagenes,
      "peso base64 en Mongo": formatMB(product.pesoTextoBase64)
    };
  });

  console.table(tabla);

  console.log("");
  console.log("📦 RESUMEN");
  console.log(`Productos revisados: ${result.length}`);
  console.log(`Imágenes registradas: ${totalImagenes}`);
  console.log(`Peso aproximado en MongoDB: ${formatMB(totalTextoBase64)}`);
  console.log(`Peso aproximado como JPG/PNG real: ${formatMB(totalTextoBase64 * 0.75)}`);
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
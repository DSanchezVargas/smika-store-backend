const { v2: cloudinary } = require("cloudinary");

let configured = false;

const getCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  return {
    cloudName,
    apiKey,
    apiSecret
  };
};

const configureCloudinary = () => {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Faltan variables de Cloudinary: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET. No se guardó la imagen en MongoDB para evitar base64."
    );
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret
    });

    configured = true;
  }

  return cloudinary;
};

const isDataImage = (value = "") => {
  return typeof value === "string" && value.startsWith("data:image/");
};

const isCloudinaryUrl = (value = "") => {
  return typeof value === "string" && value.includes("res.cloudinary.com");
};

const getImageSource = (image = {}) => {
  if (!image) return "";

  if (typeof image === "string") return image.trim();

  return (
    image.finalPreview ||
    image.url ||
    image.preview ||
    image.src ||
    image.imagen ||
    ""
  ).trim();
};

const createSafeSlug = (value = "smika") => {
  return (
    value
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "") || "smika"
  );
};

const buildPublicId = ({ title = "smika", ownerId = "", index = 0 } = {}) => {
  const cleanTitle = createSafeSlug(title);
  const cleanOwner = ownerId ? ownerId.toString() : Date.now().toString();

  return `${cleanTitle}-${cleanOwner}-${index + 1}-${Date.now()}`;
};

const uploadDataImageToCloudinary = async (source, options = {}) => {
  if (!isDataImage(source)) {
    return null;
  }

  const client = configureCloudinary();

  const result = await client.uploader.upload(source, {
    folder: options.folder || "smika/uploads",
    public_id: options.publicId || buildPublicId(options),
    resource_type: "image",
    overwrite: false
  });

  return {
    url: result.secure_url,
    secureUrl: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height
  };
};

const ensureProductImagesOnCloudinary = async (imagenes = [], options = {}) => {
  if (!Array.isArray(imagenes)) return [];

  const nextImages = [];

  for (let index = 0; index < imagenes.length; index += 1) {
    const rawImage = imagenes[index];
    const image = rawImage?.toObject ? rawImage.toObject() : rawImage;
    const source = getImageSource(image);

    if (!source) continue;

    if (!isDataImage(source)) {
      if (typeof image === "string") {
        nextImages.push({
          url: source,
          preview: source,
          finalPreview: source,
          storage: isCloudinaryUrl(source) ? "cloudinary" : "external"
        });
      } else {
        nextImages.push({
          ...image,
          url: source,
          preview: image.preview || source,
          finalPreview: image.finalPreview || source,
          storage: image.storage || (isCloudinaryUrl(source) ? "cloudinary" : "external")
        });
      }

      continue;
    }

    const uploaded = await uploadDataImageToCloudinary(source, {
      folder: options.folder || "smika/products",
      title: options.title,
      ownerId: options.ownerId,
      index
    });

    nextImages.push({
      ...(typeof image === "object" ? image : {}),
      url: uploaded.secureUrl,
      preview: uploaded.secureUrl,
      finalPreview: uploaded.secureUrl,
      publicId: uploaded.publicId,
      storage: "cloudinary",
      migratedFromBase64: true,
      oldStorage: typeof image === "object" ? image.storage || "local-data-url" : "local-data-url",
      format: uploaded.format,
      size: uploaded.bytes,
      finalSize: uploaded.bytes,
      width: uploaded.width,
      height: uploaded.height,
      finalWidth: uploaded.width,
      finalHeight: uploaded.height
    });
  }

  return nextImages;
};

const ensureStringImageOnCloudinary = async (image = "", options = {}) => {
  const source = getImageSource(image);

  if (!source) return "";
  if (!isDataImage(source)) return source;

  const uploaded = await uploadDataImageToCloudinary(source, options);

  return uploaded.secureUrl;
};

const ensureStringImagesOnCloudinary = async (payload = {}, options = {}) => {
  const imagen = await ensureStringImageOnCloudinary(payload.imagen, {
    ...options,
    index: 0
  });

  const imagenes = [];

  if (Array.isArray(payload.imagenes)) {
    for (let index = 0; index < payload.imagenes.length; index += 1) {
      const image = payload.imagenes[index];
      const uploadedOrExisting = await ensureStringImageOnCloudinary(image, {
        ...options,
        index: index + 1
      });

      if (uploadedOrExisting && uploadedOrExisting !== imagen) {
        imagenes.push(uploadedOrExisting);
      }
    }
  }

  return {
    imagen,
    imagenes
  };
};

const assertNoBase64Images = (value, path = "imagen") => {
  if (typeof value === "string" && isDataImage(value)) {
    throw new Error(`No se permite guardar base64 en MongoDB (${path}). La imagen debe subirse a Cloudinary.`);
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoBase64Images(item, `${path}[${index}]`));
    return;
  }

  if (value && typeof value === "object") {
    ["url", "preview", "finalPreview", "src", "imagen"].forEach((key) => {
      if (isDataImage(value[key])) {
        throw new Error(`No se permite guardar base64 en MongoDB (${path}.${key}). La imagen debe subirse a Cloudinary.`);
      }
    });
  }
};

module.exports = {
  isDataImage,
  isCloudinaryUrl,
  getImageSource,
  uploadDataImageToCloudinary,
  ensureProductImagesOnCloudinary,
  ensureStringImagesOnCloudinary,
  assertNoBase64Images
};

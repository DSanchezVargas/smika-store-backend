const { v2: cloudinary } = require("cloudinary");

function getCloudinaryConfig() {
  return {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  };
}

function validateCloudinaryEnv() {
  const config = getCloudinaryConfig();
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key.toUpperCase());

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de Cloudinary en .env: ${missing.join(", ")}`
    );
  }

  return config;
}

function configureCloudinary() {
  const config = validateCloudinaryEnv();

  cloudinary.config({
    cloud_name: config.cloud_name,
    api_key: config.api_key,
    api_secret: config.api_secret,
    secure: true
  });

  return cloudinary;
}

module.exports = {
  cloudinary,
  configureCloudinary,
  validateCloudinaryEnv
};

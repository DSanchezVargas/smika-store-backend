const bcrypt = require("bcryptjs");

const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashResetCode = async (code) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(code, salt);
};

const compareResetCode = async (code, hash) => {
  return bcrypt.compare(code, hash);
};

const getResetCodeExpiration = () => {
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + 15);
  return expiration;
};

module.exports = {
  generateResetCode,
  hashResetCode,
  compareResetCode,
  getResetCodeExpiration
};
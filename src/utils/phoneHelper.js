const DEFAULT_COUNTRY = "PE";
const DEFAULT_COUNTRY_CODE = "+51";

const onlyNumbers = (value = "") => {
  return value.toString().replace(/\D/g, "");
};

const normalizeCountryCode = (codigoPais = DEFAULT_COUNTRY_CODE) => {
  const cleanCode = codigoPais.toString().trim();

  if (!cleanCode) {
    return DEFAULT_COUNTRY_CODE;
  }

  if (cleanCode.startsWith("+")) {
    return cleanCode;
  }

  return `+${onlyNumbers(cleanCode)}`;
};

const normalizePhoneData = ({
  pais = DEFAULT_COUNTRY,
  codigoPais = DEFAULT_COUNTRY_CODE,
  telefono = ""
}) => {
  const finalPais = pais || DEFAULT_COUNTRY;
  const finalCodigoPais = normalizeCountryCode(codigoPais);
  const finalTelefono = onlyNumbers(telefono);

  const telefonoCompleto = finalTelefono
    ? `${finalCodigoPais}${finalTelefono}`
    : "";

  return {
    pais: finalPais,
    codigoPais: finalCodigoPais,
    telefono: finalTelefono,
    telefonoCompleto
  };
};

const isValidPeruPhone = (telefono = "") => {
  const cleanPhone = onlyNumbers(telefono);

  if (!cleanPhone) {
    return true;
  }

  return /^9\d{8}$/.test(cleanPhone);
};

module.exports = {
  DEFAULT_COUNTRY,
  DEFAULT_COUNTRY_CODE,
  onlyNumbers,
  normalizeCountryCode,
  normalizePhoneData,
  isValidPeruPhone
};
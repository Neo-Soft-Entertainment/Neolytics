export const defaultCountryCode = "US";
export const defaultLanguage = "en";

export const countryOptions = [
  { value: "US", label: "United States" },
  { value: "BR", label: "Brazil" },
  { value: "CA", label: "Canada" },
  { value: "MX", label: "Mexico" },
  { value: "GB", label: "United Kingdom" },
  { value: "IE", label: "Ireland" },
  { value: "FR", label: "France" },
  { value: "DE", label: "Germany" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "NL", label: "Netherlands" },
  { value: "SE", label: "Sweden" },
  { value: "PL", label: "Poland" },
  { value: "PT", label: "Portugal" },
  { value: "AU", label: "Australia" },
  { value: "NZ", label: "New Zealand" },
  { value: "JP", label: "Japan" },
  { value: "KR", label: "South Korea" },
  { value: "CN", label: "China" },
  { value: "SG", label: "Singapore" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "IN", label: "India" },
  { value: "AR", label: "Argentina" },
  { value: "CL", label: "Chile" },
  { value: "CO", label: "Colombia" }
] as const;

export const languageOptions = [
  { value: "en", label: "English" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "nl", label: "Dutch" },
  { value: "sv", label: "Swedish" },
  { value: "pl", label: "Polish" },
  { value: "tr", label: "Turkish" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh-CN", label: "Chinese (Simplified)" }
] as const;

const documentTypeLabels: Record<string, string> = {
  CNPJ_CARD: "Business registration",
  ARTICLES_OF_ASSOCIATION: "Articles of association",
  CONTRACT_AMENDMENT: "Contract amendment",
  STATE_REGISTRATION: "State registration",
  MUNICIPAL_REGISTRATION: "Local registration",
  TAX_CERTIFICATE: "Tax certificate",
  TRADEMARK: "Trademark",
  LICENSE: "License",
  NDA: "NDA",
  PUBLISHING_CONTRACT: "Publishing contract",
  INVESTMENT_CONTRACT: "Investment contract",
  ACCOUNTING_RECORD: "Accounting record",
  OTHER: "Other"
};

function normalizeCountryCode(countryCode?: string | null) {
  return countryCode?.trim().toUpperCase() || defaultCountryCode;
}

export function getCountryLabel(countryCode?: string | null) {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  return countryOptions.find((option) => option.value === normalizedCountryCode)?.label ?? normalizedCountryCode;
}

export function getLanguageLabel(languageCode?: string | null) {
  const normalizedLanguageCode = languageCode?.trim() || defaultLanguage;
  return languageOptions.find((option) => option.value === normalizedLanguageCode)?.label ?? normalizedLanguageCode;
}

export function getRegistrationLabel(countryCode?: string | null) {
  if (normalizeCountryCode(countryCode) === "BR") {
    return "CNPJ";
  }

  return "Business registration number";
}

export function getRegistrationPlaceholder(countryCode?: string | null) {
  if (normalizeCountryCode(countryCode) === "BR") {
    return "00.000.000/0001-00";
  }

  return "Optional registration or tax ID";
}

export function getRegistrationPendingLabel(countryCode?: string | null) {
  if (normalizeCountryCode(countryCode) === "BR") {
    return "CNPJ pending";
  }

  return "Registration pending";
}

export function getBusinessActivityLabel(countryCode?: string | null) {
  if (normalizeCountryCode(countryCode) === "BR") {
    return "Primary CNAE";
  }

  return "Primary business activity code";
}

export function getBusinessActivityPlaceholder(countryCode?: string | null) {
  if (normalizeCountryCode(countryCode) === "BR") {
    return "6201-5/01";
  }

  return "Optional industry classification";
}

export function getDocumentTypeLabel(documentType: string) {
  return documentTypeLabels[documentType] ?? documentType;
}

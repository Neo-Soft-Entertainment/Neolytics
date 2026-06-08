export type SensitiveFieldClass =
  | "credential"
  | "financial"
  | "business"
  | "studio_operations"
  | "personal";

export type SensitiveFieldDefinition = {
  model: string;
  field: string;
  classification: SensitiveFieldClass;
  encryptedAtRest: boolean;
  notes?: string;
};

export const sensitiveFieldRegistry: SensitiveFieldDefinition[] = [
  { model: "Account", field: "access_token", classification: "credential", encryptedAtRest: true },
  { model: "Account", field: "refresh_token", classification: "credential", encryptedAtRest: true },
  { model: "Account", field: "id_token", classification: "credential", encryptedAtRest: true },
  { model: "Account", field: "session_state", classification: "credential", encryptedAtRest: true },
  { model: "Organization", field: "discordWebhookUrl", classification: "credential", encryptedAtRest: true },
  { model: "LegalEntity", field: "cnpj", classification: "business", encryptedAtRest: false, notes: "Indexed today; migrate with blind index before encrypting." },
  { model: "LegalEntityShareholder", field: "documentNumber", classification: "personal", encryptedAtRest: false, notes: "Indexed today; migrate with blind index before encrypting." },
  { model: "LegalEntityOfficer", field: "documentNumber", classification: "personal", encryptedAtRest: false },
  { model: "PayableTitle", field: "supplierIdentifier", classification: "financial", encryptedAtRest: false },
  { model: "PayablePayment", field: "bank", classification: "financial", encryptedAtRest: false },
  { model: "PayablePayment", field: "branch", classification: "financial", encryptedAtRest: false },
  { model: "PayablePayment", field: "account", classification: "financial", encryptedAtRest: false },
  { model: "Contract", field: "notes", classification: "business", encryptedAtRest: false },
  { model: "IssuedInvoice", field: "notes", classification: "financial", encryptedAtRest: false },
  { model: "ReceivedInvoice", field: "notes", classification: "financial", encryptedAtRest: false },
  { model: "Project", field: "description", classification: "studio_operations", encryptedAtRest: false },
  { model: "ProjectGdd", field: "content", classification: "studio_operations", encryptedAtRest: false },
  { model: "AiReport", field: "content", classification: "business", encryptedAtRest: false }
];

export function getSensitiveFieldsByModel(model: string) {
  return sensitiveFieldRegistry.filter((field) => field.model === model);
}

export function isSensitiveField(model: string, field: string) {
  return sensitiveFieldRegistry.some((entry) => entry.model === model && entry.field === field);
}

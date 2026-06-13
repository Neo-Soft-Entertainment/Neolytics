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
  { model: "LegalEntity", field: "cnpj", classification: "business", encryptedAtRest: true },
  { model: "LegalEntity", field: "email", classification: "business", encryptedAtRest: true },
  { model: "LegalEntity", field: "phone", classification: "business", encryptedAtRest: true },
  { model: "LegalEntity", field: "addressLine1", classification: "business", encryptedAtRest: true },
  { model: "LegalEntityShareholder", field: "name", classification: "personal", encryptedAtRest: true },
  { model: "LegalEntityShareholder", field: "documentNumber", classification: "personal", encryptedAtRest: true },
  { model: "LegalEntityOfficer", field: "name", classification: "personal", encryptedAtRest: true },
  { model: "LegalEntityOfficer", field: "documentNumber", classification: "personal", encryptedAtRest: true },
  { model: "PayableTitle", field: "supplierIdentifier", classification: "financial", encryptedAtRest: true },
  { model: "PayableTitle", field: "supplierName", classification: "financial", encryptedAtRest: true },
  { model: "PayablePayment", field: "bank", classification: "financial", encryptedAtRest: true },
  { model: "PayablePayment", field: "branch", classification: "financial", encryptedAtRest: true },
  { model: "PayablePayment", field: "account", classification: "financial", encryptedAtRest: true },
  { model: "ReceivableTitle", field: "sourceDescription", classification: "financial", encryptedAtRest: true },
  { model: "ReceivableTitle", field: "customerIdentifier", classification: "financial", encryptedAtRest: true },
  { model: "ReceivableTitle", field: "customerName", classification: "financial", encryptedAtRest: true },
  { model: "ReceivableTitle", field: "notes", classification: "financial", encryptedAtRest: true },
  { model: "ReceivablePayment", field: "bank", classification: "financial", encryptedAtRest: true },
  { model: "ReceivablePayment", field: "branch", classification: "financial", encryptedAtRest: true },
  { model: "ReceivablePayment", field: "account", classification: "financial", encryptedAtRest: true },
  { model: "ReceivablePayment", field: "history", classification: "financial", encryptedAtRest: true },
  { model: "Contract", field: "counterpartyName", classification: "business", encryptedAtRest: true },
  { model: "Contract", field: "notes", classification: "business", encryptedAtRest: true },
  { model: "IssuedInvoice", field: "customerName", classification: "financial", encryptedAtRest: true },
  { model: "IssuedInvoice", field: "notes", classification: "financial", encryptedAtRest: true },
  { model: "ReceivedInvoice", field: "vendorName", classification: "financial", encryptedAtRest: true },
  { model: "ReceivedInvoice", field: "notes", classification: "financial", encryptedAtRest: true },
  { model: "Project", field: "description", classification: "studio_operations", encryptedAtRest: true },
  { model: "Project", field: "coreLoop", classification: "studio_operations", encryptedAtRest: true },
  { model: "Project", field: "differentiator", classification: "studio_operations", encryptedAtRest: true },
  { model: "ProjectGdd", field: "content", classification: "studio_operations", encryptedAtRest: true },
  { model: "CommunityPost", field: "title", classification: "business", encryptedAtRest: true },
  { model: "CommunityPost", field: "content", classification: "business", encryptedAtRest: true },
  { model: "CommunityPostComment", field: "content", classification: "business", encryptedAtRest: true },
  { model: "AiReport", field: "content", classification: "business", encryptedAtRest: false }
];

export function getSensitiveFieldsByModel(model: string) {
  return sensitiveFieldRegistry.filter((field) => field.model === model);
}

export function isSensitiveField(model: string, field: string) {
  return sensitiveFieldRegistry.some((entry) => entry.model === model && entry.field === field);
}

import { DataClassification } from "@/lib/privacy/constants";

const blockedExportClassifications = new Set<DataClassification>([
  DataClassification.PERSONAL,
  DataClassification.SENSITIVE_PERSONAL,
  DataClassification.CHILD_OR_TEEN_DATA,
  DataClassification.PSEUDONYMOUS_IDENTIFIER,
  DataClassification.BLOCKED_FOR_EXPORT
]);

const fieldClassificationRegistry: Record<string, DataClassification[]> = {
  email: [DataClassification.PERSONAL, DataClassification.BLOCKED_FOR_EXPORT],
  phone: [DataClassification.PERSONAL, DataClassification.BLOCKED_FOR_EXPORT],
  cpf: [DataClassification.PERSONAL, DataClassification.BLOCKED_FOR_EXPORT],
  ip_address: [DataClassification.PERSONAL, DataClassification.PSEUDONYMOUS_IDENTIFIER, DataClassification.BLOCKED_FOR_EXPORT],
  user_id: [DataClassification.PSEUDONYMOUS_IDENTIFIER, DataClassification.BLOCKED_FOR_EXPORT],
  userId: [DataClassification.PSEUDONYMOUS_IDENTIFIER, DataClassification.BLOCKED_FOR_EXPORT],
  device_id: [DataClassification.PSEUDONYMOUS_IDENTIFIER, DataClassification.BLOCKED_FOR_EXPORT],
  session_id: [DataClassification.PSEUDONYMOUS_IDENTIFIER, DataClassification.BLOCKED_FOR_EXPORT],
  cookie_id: [DataClassification.PSEUDONYMOUS_IDENTIFIER, DataClassification.BLOCKED_FOR_EXPORT],
  event_id: [DataClassification.PSEUDONYMOUS_IDENTIFIER, DataClassification.BLOCKED_FOR_EXPORT],
  exact_location: [DataClassification.PERSONAL, DataClassification.BLOCKED_FOR_EXPORT],
  location: [DataClassification.PERSONAL, DataClassification.BLOCKED_FOR_EXPORT],
  health_data: [DataClassification.SENSITIVE_PERSONAL, DataClassification.BLOCKED_FOR_EXPORT],
  biometric_data: [DataClassification.SENSITIVE_PERSONAL, DataClassification.BLOCKED_FOR_EXPORT],
  political_opinion: [DataClassification.SENSITIVE_PERSONAL, DataClassification.BLOCKED_FOR_EXPORT],
  individual_behavior_profile: [DataClassification.PERSONAL, DataClassification.BLOCKED_FOR_EXPORT],
  child_birthdate: [DataClassification.CHILD_OR_TEEN_DATA, DataClassification.BLOCKED_FOR_EXPORT],
  teen_segment: [DataClassification.CHILD_OR_TEEN_DATA, DataClassification.BLOCKED_FOR_EXPORT],
  weekly_region_segment_metrics: [DataClassification.AGGREGATED],
  generated_market_dataset: [DataClassification.SYNTHETIC],
  country: [DataClassification.PUBLIC],
  state: [DataClassification.PUBLIC],
  macro_region: [DataClassification.AGGREGATED],
  month_bucket: [DataClassification.AGGREGATED],
  week_bucket: [DataClassification.AGGREGATED],
  day_bucket: [DataClassification.AGGREGATED],
  timestamp: [DataClassification.AGGREGATED],
  created_at: [DataClassification.AGGREGATED],
  updated_at: [DataClassification.AGGREGATED],
  cohort_size: [DataClassification.AGGREGATED],
  installs: [DataClassification.AGGREGATED],
  revenue: [DataClassification.AGGREGATED],
  conversion_rate: [DataClassification.AGGREGATED]
};

const heuristicClassifications: Array<{ pattern: RegExp; classifications: DataClassification[] }> = [
  { pattern: /(^|_)(email|phone|cpf|name|birthdate|address)$/, classifications: [DataClassification.PERSONAL, DataClassification.BLOCKED_FOR_EXPORT] },
  { pattern: /(^|_)(ip|device|session|cookie|event|user)(_?id)?$/, classifications: [DataClassification.PSEUDONYMOUS_IDENTIFIER, DataClassification.BLOCKED_FOR_EXPORT] },
  { pattern: /(^|_)(health|biometric|political)(_.*)?$/, classifications: [DataClassification.SENSITIVE_PERSONAL, DataClassification.BLOCKED_FOR_EXPORT] },
  { pattern: /(exact_location|latitude|longitude|lat|lng)/, classifications: [DataClassification.PERSONAL, DataClassification.BLOCKED_FOR_EXPORT] },
  { pattern: /(timestamp|_at|day_bucket|week_bucket|month_bucket|cohort_size)/, classifications: [DataClassification.AGGREGATED] },
  { pattern: /(daily|weekly|monthly|region|cohort|aggregate|aggregated|count|revenue|metric)/, classifications: [DataClassification.AGGREGATED] },
  { pattern: /(synthetic|simulated|generated_dataset)/, classifications: [DataClassification.SYNTHETIC] }
];

function uniqueClassifications(classifications: DataClassification[]) {
  return Array.from(new Set(classifications));
}

export function getFieldClassificationRegistry() {
  return fieldClassificationRegistry;
}

export function getFieldClassifications(fieldName: string) {
  const direct = fieldClassificationRegistry[fieldName] ?? fieldClassificationRegistry[fieldName.toLowerCase()];

  if (direct) {
    return direct;
  }

  const normalized = fieldName.trim().toLowerCase();
  const derived = heuristicClassifications
    .filter((entry) => entry.pattern.test(normalized))
    .flatMap((entry) => entry.classifications);

    let resolvedValue0: any;
  if (derived.length > 0) {
    resolvedValue0 = uniqueClassifications(derived);
  } else {
    resolvedValue0 = null;
  }
return resolvedValue0;
}

export function validateFieldClassificationRegistry(fieldNames: string[]) {
  const unclassifiedFields = fieldNames.filter((fieldName) => !getFieldClassifications(fieldName));

  return {
    valid: unclassifiedFields.length === 0,
    unclassifiedFields
  };
}

export function filterBlockedExportFields(fieldNames: string[]) {
  return fieldNames.filter((fieldName) => {
    const classifications = getFieldClassifications(fieldName);

    if (!classifications) {
      return true;
    }

    return classifications.some((classification: any) => blockedExportClassifications.has(classification));
  });
}

export function assertExportableFields(fieldNames: string[]) {
  const blockedFields = filterBlockedExportFields(fieldNames);

  if (blockedFields.length === 0) {
    return;
  }

  throw new Error(`Blocked export fields: ${blockedFields.join(", ")}`);
}

export function getExportableFields(fieldNames: string[]) {
  return fieldNames.filter((fieldName) => !filterBlockedExportFields([fieldName]).includes(fieldName));
}

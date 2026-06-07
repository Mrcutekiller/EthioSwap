// Phone number utilities for Ethiopian and international numbers

export type PhoneNormalizationResult = {
  ok: boolean;
  e164: string;          // E.164 format: +2519XXXXXXXX
  national: string;      // National format: 09XXXXXXXX
  country: string;       // ISO country code: ET
  carrier: string;       // Mobile carrier hint: ethio_telecom / safaricom
  error?: string;
};

/**
 * Normalize an Ethiopian phone number to E.164 (+251XXXXXXXXX).
 * Accepts: +2519XXXXXXXX, 2519XXXXXXXX, 09XXXXXXXX, 9XXXXXXXX, 07XXXXXXXX, 7XXXXXXXX
 */
export function normalizeEthiopianPhone(input: string): PhoneNormalizationResult {
  const raw = (input || "").trim();
  if (!raw) {
    return { ok: false, e164: "", national: "", country: "ET", carrier: "unknown", error: "Phone number is required" };
  }

  // Strip everything except digits and leading +
  let cleaned = raw.replace(/[^\d+]/g, "");

  // Drop leading + for processing, remember it
  const hasPlus = cleaned.startsWith("+");
  let digits = cleaned.replace(/\+/g, "");

  // Drop leading 00 (international prefix)
  if (digits.startsWith("00")) digits = digits.substring(2);

  // Case 1: already has country code 251
  if (digits.startsWith("251")) {
    if (digits.length === 12 && (digits.startsWith("2519") || digits.startsWith("2517"))) {
      const national = "0" + digits.substring(3);
      return {
        ok: true,
        e164: "+" + digits,
        national,
        country: "ET",
        carrier: digits.startsWith("2519") ? "ethio_telecom" : "safaricom",
      };
    }
    // Looks like a foreign number, keep as-is with +
    if (hasPlus) {
      return { ok: true, e164: "+" + digits, national: digits, country: "INTL", carrier: "international" };
    }
  }

  // Case 2: starts with 0 (national format) — strip the 0
  if (digits.startsWith("0") && digits.length === 10) {
    const local = digits.substring(1);
    if (local.startsWith("9") || local.startsWith("7")) {
      return {
        ok: true,
        e164: "+251" + local,
        national: digits,
        country: "ET",
        carrier: local.startsWith("9") ? "ethio_telecom" : "safaricom",
      };
    }
  }

  // Case 3: 9-digit local number starting with 9 or 7
  if (digits.length === 9 && (digits.startsWith("9") || digits.startsWith("7"))) {
    return {
      ok: true,
      e164: "+251" + digits,
      national: "0" + digits,
      country: "ET",
      carrier: digits.startsWith("9") ? "ethio_telecom" : "safaricom",
    };
  }

  // Case 4: 12-digit number starting with 2519 / 2517 but missing +
  if (digits.length === 12 && (digits.startsWith("2519") || digits.startsWith("2517"))) {
    return {
      ok: true,
      e164: "+" + digits,
      national: "0" + digits.substring(3),
      country: "ET",
      carrier: digits.startsWith("2519") ? "ethio_telecom" : "safaricom",
    };
  }

  return {
    ok: false,
    e164: "",
    national: raw,
    country: "UNKNOWN",
    carrier: "unknown",
    error: "Please enter a valid Ethiopian phone number (e.g. 0912345678 or +251912345678).",
  };
}

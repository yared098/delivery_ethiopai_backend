const ETHIOPIAN_COUNTRY_CODE = '251';
const MOBILE_PREFIX = '9';
const LOCAL_MOBILE_LENGTH = 10; // 09XXXXXXXX
const NATIONAL_MOBILE_LENGTH = 9; // 9XXXXXXXX
const INTERNATIONAL_MOBILE_LENGTH = 12; // 2519XXXXXXXX

/**
 * Normalises an Ethiopian mobile number to 251XXXXXXXXX.
 * Returns null when the input is not a valid Ethiopian mobile number.
 */
export function normalizeEthiopianPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');

  if (digits.length === INTERNATIONAL_MOBILE_LENGTH && digits.startsWith(ETHIOPIAN_COUNTRY_CODE + MOBILE_PREFIX)) {
    return digits;
  }
  if (digits.length === LOCAL_MOBILE_LENGTH && digits.startsWith('0' + MOBILE_PREFIX)) {
    return ETHIOPIAN_COUNTRY_CODE + digits.slice(1);
  }
  if (digits.length === NATIONAL_MOBILE_LENGTH && digits.startsWith(MOBILE_PREFIX)) {
    return ETHIOPIAN_COUNTRY_CODE + digits;
  }
  return null;
}

export function isValidEthiopianPhone(raw: string | null | undefined): boolean {
  return normalizeEthiopianPhone(raw) !== null;
}

/** 251912345678 -> 0912345678 (display form). */
export function toLocalPhone(normalized: string): string {
  if (normalized.startsWith(ETHIOPIAN_COUNTRY_CODE) && normalized.length === INTERNATIONAL_MOBILE_LENGTH) {
    return '0' + normalized.slice(ETHIOPIAN_COUNTRY_CODE.length);
  }
  return normalized;
}

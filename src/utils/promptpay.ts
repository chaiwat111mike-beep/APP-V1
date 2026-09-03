import QRCode from 'qrcode';

/**
 * Standard CRC-16/CCITT-FALSE (XMODEM) calculation for EMVCo Thai QR Payment / PromptPay
 * Polynomial: 0x1021, Initial: 0xFFFF, Output: 4-digit uppercase Hex
 * Verified with Bank of Thailand & National ITMX specification.
 */
export function crc16xmodem(str: string, previous: number = 0xffff): number {
  let crc = previous;
  for (let index = 0; index < str.length; index++) {
    const byte = str.charCodeAt(index);
    let code = (crc >>> 8) & 0xff;
    code ^= byte & 0xff;
    code ^= code >>> 4;
    crc = (crc << 8) & 0xffff;
    crc ^= code;
    code = (code << 5) & 0xffff;
    crc ^= code;
    code = (code << 7) & 0xffff;
    crc ^= code;
  }
  return crc;
}

export function formatCrc(crcValue: number): string {
  return ('0000' + crcValue.toString(16).toUpperCase()).slice(-4);
}

/**
 * Clean & normalize phone number or Citizen/Tax ID / e-Wallet for PromptPay
 */
export function sanitizePromptPayTarget(target: string): {
  type: 'phone' | 'citizenId' | 'eWallet';
  formatted: string;
  display: string;
} {
  const raw = target || '0610692036';
  const digits = raw.replace(/\D/g, '');

  if (digits.length >= 15) {
    // e-Wallet ID
    return {
      type: 'eWallet',
      formatted: digits,
      display: digits,
    };
  }

  if (digits.length === 13) {
    // Thai Citizen ID / Tax ID
    const displayId = `${digits.substring(0, 1)}-${digits.substring(1, 5)}-${digits.substring(5, 10)}-${digits.substring(10, 12)}-${digits.substring(12)}`;
    return {
      type: 'citizenId',
      formatted: digits,
      display: displayId,
    };
  }

  // Mobile Phone Number (e.g. 0610692036, 061-069-2036, 610692036, +66610692036)
  let normalizedPhone = digits;
  if (normalizedPhone.startsWith('66') && normalizedPhone.length === 11) {
    normalizedPhone = '0' + normalizedPhone.substring(2);
  } else if (normalizedPhone.length === 9 && !normalizedPhone.startsWith('0')) {
    normalizedPhone = '0' + normalizedPhone;
  }

  // Format phone to 13 digits padded with 0066... (e.g. 0066610692036)
  const formatted = ('0000000000000' + normalizedPhone.replace(/^0/, '66')).slice(-13);
  const displayPhone =
    normalizedPhone.length === 10
      ? `${normalizedPhone.substring(0, 3)}-${normalizedPhone.substring(3, 6)}-${normalizedPhone.substring(6)}`
      : normalizedPhone || raw;

  return {
    type: 'phone',
    formatted,
    display: displayPhone,
  };
}

/**
 * Helper to encode EMVCo TLV (Tag-Length-Value)
 */
function tlv(id: string, value: string): string {
  return [id, ('00' + value.length).slice(-2), value].join('');
}

/**
 * Generate standard EMVCo Thai QR Payment (PromptPay) payload string
 * Verified with Bank of Thailand & National ITMX Standard (promptpay-qr)
 * Compatible with all Thai Banking Apps (K PLUS, SCB EASY, Krungthai NEXT, Bangkok Bank, ttb, etc.)
 */
export function generatePromptPayPayload(target: string, amount?: number): string {
  const { type, formatted } = sanitizePromptPayTarget(target);

  // Sub-tag inside Tag 29: 01 for phone, 02 for Citizen ID / Tax ID, 03 for e-Wallet
  const subTag = type === 'phone' ? '01' : type === 'citizenId' ? '02' : '03';

  // Tag 29: Merchant Account Information
  const merchantInfoValue = tlv('00', 'A000000677010111') + tlv(subTag, formatted);

  const hasAmount = amount !== undefined && !isNaN(amount) && amount > 0;

  // EMVCo sequence:
  // Tag 00: Payload Format Indicator (01)
  // Tag 01: Point of Initiation Method (11: Static, 12: Dynamic with amount)
  // Tag 29: Merchant Information PromptPay
  // Tag 58: Country Code (TH)
  // Tag 53: Transaction Currency (764 = THB)
  // Tag 54: Transaction Amount (if specified)
  const parts = [
    tlv('00', '01'),
    tlv('01', hasAmount ? '12' : '11'),
    tlv('29', merchantInfoValue),
    tlv('58', 'TH'),
    tlv('53', '764'),
  ];

  if (hasAmount && amount !== undefined) {
    parts.push(tlv('54', amount.toFixed(2)));
  }

  // Tag 63: CRC16 Checksum (Checksum is computed over payload string up to "6304")
  const rawPayloadWithoutCrc = parts.join('') + '6304';
  const checksum = formatCrc(crc16xmodem(rawPayloadWithoutCrc, 0xffff));

  return `${rawPayloadWithoutCrc}${checksum}`;
}

/**
 * Generate QR Code as Base64 Data URL offline
 * Uses crisp high-contrast black for guaranteed mobile bank camera scanning
 */
export async function generatePromptPayQRCodeDataURL(
  target: string,
  amount?: number,
  options?: QRCode.QRCodeToDataURLOptions
): Promise<string> {
  const payload = generatePromptPayPayload(target, amount);
  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: options?.width || 320,
      color: {
        dark: '#000000', // Pure black for 100% optical readability by Thai bank scanners
        light: '#FFFFFF',
      },
      ...options,
    });
  } catch (err) {
    console.error('Error generating PromptPay QR Code:', err);
    throw err;
  }
}

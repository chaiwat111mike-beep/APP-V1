/**
 * Convert number to standard Thai Baht text format (BahtText)
 * Commonly used in Thai tax invoices, receipts, and quotations (e.g. SMEMOVE, FlowAccount).
 * Example: 1250.50 -> "หนึ่งพันสองร้อยห้าสิบบาทห้าสิบสตางค์"
 * Example: 3500 -> "สามพันห้าร้อยบาทถ้วน"
 */

const THAI_DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_POSITIONS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

function convertGroup(numberStr: string): string {
  let result = '';
  const len = numberStr.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(numberStr.charAt(i), 10);
    const pos = len - i - 1;

    if (digit !== 0) {
      if (pos === 0 && digit === 1 && len > 1) {
        // Special case: "เอ็ด" in units place if preceded by tens
        result += 'เอ็ด';
      } else if (pos === 1 && digit === 1) {
        // Special case: "สิบ" instead of "หนึ่งสิบ"
        result += 'สิบ';
      } else if (pos === 1 && digit === 2) {
        // Special case: "ยี่สิบ" instead of "สองสิบ"
        result += 'ยี่สิบ';
      } else {
        result += THAI_DIGITS[digit] + THAI_POSITIONS[pos];
      }
    }
  }

  return result;
}

export function thaiBahtText(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return 'ศูนย์บาทถ้วน';
  }

  const num = Math.round(Number(amount) * 100) / 100;
  if (num === 0) {
    return 'ศูนย์บาทถ้วน';
  }

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const parts = absNum.toFixed(2).split('.');
  const integerPart = parts[0];
  const satangPart = parts[1];

  let bahtStr = '';

  // Process integer part in chunks of 6 digits (for million multiples)
  const chunks: string[] = [];
  let remaining = integerPart;

  while (remaining.length > 6) {
    chunks.unshift(remaining.slice(-6));
    remaining = remaining.slice(0, -6);
  }
  chunks.unshift(remaining);

  chunks.forEach((chunk, index) => {
    const groupText = convertGroup(chunk);
    if (groupText) {
      bahtStr += groupText;
      if (index < chunks.length - 1) {
        bahtStr += 'ล้าน';
      }
    }
  });

  if (!bahtStr) {
    bahtStr = 'ศูนย์';
  }

  let satangStr = '';
  const satangNum = parseInt(satangPart, 10);
  if (satangNum === 0) {
    satangStr = 'ถ้วน';
  } else {
    satangStr = convertGroup(satangPart) + 'สตางค์';
  }

  const prefix = isNegative ? 'ลบ' : '';
  if (bahtStr === 'ศูนย์' && satangNum > 0) {
    return `${prefix}${satangStr}`;
  }

  return `${prefix}${bahtStr}บาท${satangStr}`;
}

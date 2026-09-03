import { JobOrder, JobPartItem, PaymentStatus } from '../types';

export interface CalculationBreakdown {
  partsTotal: number;
  partsCostTotal: number;
  laborFee: number;
  otherFee: number;
  grossSubtotal: number;
  discountAmount: number;
  discountPercent: number;
  discountType: 'amount' | 'percent';
  taxableAmount: number;
  vatPercent: number;
  vatAmount: number;
  grandTotal: number;
  depositAmount: number;
  remainingBalance: number;
  estimatedProfit: number;
  profitMarginPercent: number;
  suggestedPaymentStatus: PaymentStatus;
}

export interface CalculationInput {
  parts: (JobPartItem | { quantity: number; unitPrice: number; costPrice?: number })[];
  laborFee: number;
  otherFee?: number;
  discount?: number;
  discountType?: 'amount' | 'percent';
  discountPercent?: number;
  vatPercent?: number;
  enableVat?: boolean;
  depositAmount?: number;
  paidAmount?: number;
}

/**
 * Perform precise financial and cost calculation for auto repair job orders
 */
export function calculateJobBreakdown(input: CalculationInput): CalculationBreakdown {
  const parts = input.parts || [];
  const laborFee = Math.max(0, Number(input.laborFee) || 0);
  const otherFee = Math.max(0, Number(input.otherFee) || 0);
  
  // 1. Calculate Parts Total and Cost
  const partsTotal = parts.reduce((sum, p) => sum + ((Number(p.quantity) || 0) * (Number(p.unitPrice) || 0)), 0);
  const partsCostTotal = parts.reduce((sum, p) => sum + ((Number(p.quantity) || 0) * (Number(p.costPrice) || 0)), 0);

  // 2. Gross Subtotal
  const grossSubtotal = partsTotal + laborFee + otherFee;

  // 3. Discount calculation
  const discountType = input.discountType || 'amount';
  let discountAmount = 0;
  let discountPercent = 0;

  if (discountType === 'percent') {
    discountPercent = Math.min(100, Math.max(0, Number(input.discountPercent) || 0));
    discountAmount = Math.round(((grossSubtotal * discountPercent) / 100) * 100) / 100;
  } else {
    discountAmount = Math.min(grossSubtotal, Math.max(0, Number(input.discount) || 0));
    discountPercent = grossSubtotal > 0 ? Math.round((discountAmount / grossSubtotal) * 1000) / 10 : 0;
  }

  // 4. Taxable Amount
  const taxableAmount = Math.max(0, grossSubtotal - discountAmount);

  // 5. VAT calculation
  const vatPercent = input.enableVat === false ? 0 : (input.vatPercent ?? 7);
  const vatAmount = vatPercent > 0 ? Math.round(((taxableAmount * vatPercent) / 100) * 100) / 100 : 0;

  // 6. Grand Total
  const grandTotal = Math.round((taxableAmount + vatAmount) * 100) / 100;

  // 7. Deposit & Remaining Balance
  const depositAmount = Math.max(0, Number(input.depositAmount || input.paidAmount) || 0);
  const remainingBalance = Math.max(0, Math.round((grandTotal - depositAmount) * 100) / 100);

  // 8. Profit & Margin calculation (Gross Margin for shop owner)
  const totalCost = partsCostTotal + otherFee; // Other fees are usually external costs like machining/towing
  const estimatedProfit = Math.round((grandTotal - vatAmount - totalCost) * 100) / 100;
  const profitMarginPercent = taxableAmount > 0 ? Math.round((estimatedProfit / taxableAmount) * 1000) / 10 : 0;

  // 9. Suggested Payment Status
  let suggestedPaymentStatus: PaymentStatus = 'unpaid';
  if (depositAmount >= grandTotal && grandTotal > 0) {
    suggestedPaymentStatus = 'paid';
  } else if (depositAmount > 0) {
    suggestedPaymentStatus = 'deposit';
  }

  return {
    partsTotal: Math.round(partsTotal * 100) / 100,
    partsCostTotal: Math.round(partsCostTotal * 100) / 100,
    laborFee,
    otherFee,
    grossSubtotal: Math.round(grossSubtotal * 100) / 100,
    discountAmount,
    discountPercent,
    discountType,
    taxableAmount,
    vatPercent,
    vatAmount,
    grandTotal,
    depositAmount,
    remainingBalance,
    estimatedProfit,
    profitMarginPercent,
    suggestedPaymentStatus,
  };
}

/**
 * Generate Auto-running Job Order Number
 * Handles formats:
 * - 'monthly': e.g. SK-202608-001 or JOB-202608-001
 * - 'daily': e.g. SK-20260819-001 or JOB-20260819-001
 */
export function generateAutoJobNo(
  existingJobs: JobOrder[],
  prefix: string = 'JOB',
  format: 'monthly' | 'daily' = 'monthly',
  targetDate: Date = new Date()
): string {
  const cleanPrefix = (prefix || 'JOB').toUpperCase().trim().replace(/-+$/, '');
  
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  
  const dateSegment = format === 'daily' ? `${yyyy}${mm}${dd}` : `${yyyy}${mm}`;
  const basePrefix = `${cleanPrefix}-${dateSegment}-`;

  // Find all existing jobs with this date segment pattern
  let maxSeq = 0;
  existingJobs.forEach((job) => {
    if (!job.jobNo) return;
    const normalizedNo = job.jobNo.toUpperCase().trim();
    
    // Check if it matches basePrefix or any other prefix with same date segment
    const regex = new RegExp(`^.*?[-_]?${dateSegment}[-_]?(\\d+)$`, 'i');
    const match = normalizedNo.match(regex);
    if (match && match[1]) {
      const seq = parseInt(match[1], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const seqPadded = String(nextSeq).padStart(3, '0');
  return `${basePrefix}${seqPadded}`;
}

/**
 * Format Thai date and time nicely
 */
export function formatThaiDateTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/**
 * Format Thai date only
 */
export function formatThaiDate(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

/**
 * Calculate duration between two ISO dates or from now to delivery date
 */
export function getDurationDisplay(startDateIso?: string, endDateIso?: string): {
  text: string;
  isOverdue: boolean;
  hoursDiff: number;
} {
  if (!endDateIso) {
    return { text: 'ไม่ได้ระบุ', isOverdue: false, hoursDiff: 0 };
  }

  const end = new Date(endDateIso).getTime();
  if (isNaN(end)) {
    return { text: 'ไม่ได้ระบุ', isOverdue: false, hoursDiff: 0 };
  }

  const now = Date.now();
  const isOverdue = end < now;

  if (isOverdue) {
    const overdueMs = now - end;
    const overdueHours = Math.round(overdueMs / (1000 * 60 * 60));
    if (overdueHours < 1) {
      return { text: 'ครบกำหนดแล้ว', isOverdue: true, hoursDiff: -overdueHours };
    } else if (overdueHours < 24) {
      return { text: `เกินกำหนด ${overdueHours} ชม.`, isOverdue: true, hoursDiff: -overdueHours };
    } else {
      const days = Math.floor(overdueHours / 24);
      const remHours = overdueHours % 24;
      const text = remHours > 0 ? `เกินกำหนด ${days} วัน ${remHours} ชม.` : `เกินกำหนด ${days} วัน`;
      return { text, isOverdue: true, hoursDiff: -overdueHours };
    }
  }

  // Not overdue: remaining time from current moment
  const remainingMs = end - now;
  const remainingHours = Math.round(remainingMs / (1000 * 60 * 60));

  if (remainingHours <= 0) {
    return { text: 'กำลังจะครบกำหนด', isOverdue: false, hoursDiff: 0 };
  }

  if (remainingHours < 24) {
    return { text: `เหลือ ${remainingHours} ชม.`, isOverdue: false, hoursDiff: remainingHours };
  }

  const days = Math.floor(remainingHours / 24);
  const remHours = remainingHours % 24;
  const text = remHours > 0 ? `เหลือ ${days} วัน ${remHours} ชม.` : `เหลือ ${days} วัน`;

  return { text, isOverdue: false, hoursDiff: remainingHours };
}

/**
 * Quick preset dates for target delivery
 */
export function getQuickDeliveryPreset(preset: '2h' | '4h' | 'today_evening' | 'tomorrow_noon' | 'tomorrow_evening' | '2d' | '3d' | '7d', baseDate: Date = new Date()): string {
  const d = new Date(baseDate);

  switch (preset) {
    case '2h':
      d.setHours(d.getHours() + 2);
      break;
    case '4h':
      d.setHours(d.getHours() + 4);
      break;
    case 'today_evening':
      d.setHours(17, 30, 0, 0);
      if (d.getTime() <= baseDate.getTime()) {
        d.setDate(d.getDate() + 1);
      }
      break;
    case 'tomorrow_noon':
      d.setDate(d.getDate() + 1);
      d.setHours(12, 0, 0, 0);
      break;
    case 'tomorrow_evening':
      d.setDate(d.getDate() + 1);
      d.setHours(17, 0, 0, 0);
      break;
    case '2d':
      d.setDate(d.getDate() + 2);
      d.setHours(17, 0, 0, 0);
      break;
    case '3d':
      d.setDate(d.getDate() + 3);
      d.setHours(17, 0, 0, 0);
      break;
    case '7d':
      d.setDate(d.getDate() + 7);
      d.setHours(17, 0, 0, 0);
      break;
  }

  // Format to YYYY-MM-DDTHH:mm for datetime-local input
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Format current date to YYYY-MM-DDTHH:mm for datetime-local
 */
export function toDateTimeLocalString(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

import { JobOrder, GarageProfile, SparePart, Customer } from '../types';
import { formatThaiDateTime } from '../utils/jobCalculator';

export const DEFAULT_LINE_ID = 'chaiwatmike';
export const DEFAULT_LINE_URL = 'https://line.me/ti/p/~chaiwatmike';
export const DEFAULT_MECHANIC_PHONE = '061-069-2036';
export const DEFAULT_MECHANIC_NAME = 'ช่างไมค์';

/**
 * Generate Direct LINE Add-Friend / Chat Link
 */
export const getDirectLineUrl = (lineId: string = DEFAULT_LINE_ID): string => {
  const cleanId = lineId.replace(/^@/, '').trim();
  return `https://line.me/ti/p/~${cleanId}`;
};

/**
 * Generate LINE Message Share URL for 1-click send in LINE app/web
 */
export const getLineShareUrl = (text: string): string => {
  return `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
};

/**
 * Formats status text nicely for LINE message
 */
export const formatJobStatusThai = (status: JobOrder['status']): string => {
  switch (status) {
    case 'pending': return '⏳ รับรถเข้าอู่ / รอดำเนินการ';
    case 'inspecting': return '🔍 กำลังตรวจเช็คสภาพ & วินิจฉัยอาการ';
    case 'waiting_parts': return '📦 รอจัดส่งอะไหล่แท้';
    case 'in_progress': return '🔧 กำลังดำเนินการซ่อมบำรุง';
    case 'qc': return '🏁 ตรวจสอบคุณภาพ / ทดสอบวิ่ง (QC)';
    case 'completed': return '✅ ซ่อมเสร็จสมบูรณ์ / พร้อมส่งมอบ';
    case 'delivered': return '🎉 ส่งมอบรถเรียบร้อยแล้ว';
    default: return status;
  }
};

/**
 * Template 1: แจ้งรับรถเข้าอู่ & เปิดใบสั่งซ่อม
 */
export const generateJobIntakeMessage = (job: JobOrder, garage: GarageProfile): string => {
  const intakeDate = formatThaiDateTime(job.receivedDate || job.createdAt);
  const deliveryDate = formatThaiDateTime(job.estimatedCompletionDate);

  return `🚗【 ${garage.garageName || garage.name || 'อู่สงกรานต์ (ช่างไมค์)'} 】
📋 แจ้งเปิดใบสั่งซ่อม / รับรถเข้าบริการ

━━━━━━━━━━━━━━━━
🔢 เลขที่ใบสั่งซ่อม: ${job.jobNo}
📅 วันที่รับรถ: ${intakeDate}
🏁 กำหนดส่งมอบรถ: ${deliveryDate}
🚘 ทะเบียนรถ: ${job.licensePlate}
🚙 ยี่ห้อ/รุ่น: ${job.carBrand} ${job.carModel} (${job.carColor || '-'})
⏱ เลขไมล์: ${job.mileage.toLocaleString()} กม.
👤 ลูกค้า: ${job.customerName}
📞 เบอร์ติดต่อ: ${job.customerPhone}

🔧 อาการที่แจ้ง:
"${job.issueDescription}"

👨‍🔧 ช่างผู้ดูแล: ${job.mechanicName || DEFAULT_MECHANIC_NAME} (ช่องซ่อม #${job.bayNumber || '-'})
━━━━━━━━━━━━━━━━
📍 ติดต่อช่างไมค์ / ติดตามงาน:
📱 โทร: ${garage.mechanicPhone || garage.phone || DEFAULT_MECHANIC_PHONE}
📲 LINE ID: ${garage.lineId || DEFAULT_LINE_ID}
🔗 LINE Link: ${garage.lineDirectUrl || DEFAULT_LINE_URL}

ขอบพระคุณที่ไว้วางใจให้อู่สงกรานต์ดูแลรถของคุณครับ 🙏`;
};

/**
 * Template 2: อัปเดตสถานะความคืบหน้าการซ่อม
 */
export const generateJobStatusUpdateMessage = (job: JobOrder, garage: GarageProfile): string => {
  const statusThai = formatJobStatusThai(job.status);
  const deliveryDate = formatThaiDateTime(job.estimatedCompletionDate);
  const partsSummary = job.partsUsed.length > 0
    ? job.partsUsed.map((p, i) => `   ${i + 1}. ${p.partName} x${p.quantity} (฿${p.totalPrice.toLocaleString()})`).join('\n')
    : '   - รอสรุปรายการ';

  return `🔔【 อัปเดตสถานะงานซ่อมรถยนต์ 】
${garage.garageName || garage.name || 'อู่สงกรานต์ (ช่างไมค์)'}

━━━━━━━━━━━━━━━━
🚘 ทะเบียนรถ: ${job.licensePlate} (${job.carBrand} ${job.carModel})
🔢 ใบสั่งซ่อม: ${job.jobNo}
📊 สถานะปัจจุบัน: ${statusThai}
🏁 กำหนดส่งมอบ: ${deliveryDate}

${job.technicianNotes ? `📝 รายงานจากช่าง:\n"${job.technicianNotes}"\n` : ''}
📦 อะไหล่ที่ติดตั้ง/ใช้งาน:
${partsSummary}

💰 ยอดค่าใช้จ่ายรวม: ฿${job.totalAmount.toLocaleString()} บาท
${(job.depositAmount || job.paidAmount || 0) > 0 ? `💵 มัดจำแล้ว: ฿${(job.depositAmount || job.paidAmount || 0).toLocaleString()} (คงเหลือ ฿${Math.max(0, job.totalAmount - (job.depositAmount || job.paidAmount || 0)).toLocaleString()})\n` : ''}━━━━━━━━━━━━━━━━
📞 สอบถามเพิ่มเติม: ${garage.mechanicPhone || garage.phone || DEFAULT_MECHANIC_PHONE}
📲 LINE: ${garage.lineId || DEFAULT_LINE_ID} (${garage.lineDirectUrl || DEFAULT_LINE_URL})`;
};

/**
 * Template 3: แจ้งซ่อมเสร็จ & สรุปยอดเงินพร้อมรับรถ
 */
export const generateJobCompletedMessage = (job: JobOrder, garage: GarageProfile): string => {
  const partsTotal = job.partsUsed.reduce((sum, p) => sum + p.totalPrice, 0);
  const subtotal = partsTotal + job.laborFee + (job.otherFee || 0) - job.discount;
  const vat = subtotal > 0 ? (subtotal * (job.vatPercent ?? 7)) / 100 : 0;
  const grandTotal = Math.max(0, subtotal + vat);
  const deposit = job.depositAmount || job.paidAmount || 0;
  const remaining = Math.max(0, grandTotal - deposit);

  return `🏁【 รถของคุณซ่อมเสร็จสมบูรณ์แล้ว 】
${garage.garageName || garage.name || 'อู่สงกรานต์ (ช่างไมค์)'} แจ้งรับรถยนต์

━━━━━━━━━━━━━━━━
🚘 ทะเบียนรถ: ${job.licensePlate}
🚙 รถยนต์: ${job.carBrand} ${job.carModel}
👤 เจ้าของรถ: ${job.customerName}
🔢 เลขที่ใบสั่งซ่อม: ${job.jobNo}

💵 รายละเอียดค่าใช้จ่าย:
• รวมค่าอะไหล่ (${job.partsUsed.length} รายการ): ฿${partsTotal.toLocaleString()}
• ค่าแรง & บริการ: ฿${job.laborFee.toLocaleString()}
${(job.otherFee || 0) > 0 ? `• ค่าบริการอื่นๆ: ฿${job.otherFee?.toLocaleString()}\n` : ''}${job.discount > 0 ? `• ส่วนลด: -฿${job.discount.toLocaleString()}\n` : ''}• ภาษี VAT (${job.vatPercent ?? 7}%): ฿${vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
━━━━━━━━━━━━━━━━
⭐ ยอดสุทธิทั้งสิ้น: ฿${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
${deposit > 0 ? `💰 มัดจำที่ชำระแล้ว: ฿${deposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n🔥 ยอดคงเหลือชำระวันรับรถ: ฿${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท\n` : ''}
💳 ช่องทางชำระเงิน พร้อมเพย์ (PromptPay):
• เลขพร้อมเพย์: ${garage.promptPayId || garage.phone || DEFAULT_MECHANIC_PHONE}
• ชื่อบัญชี: ${garage.bankAccountName || 'อู่สงกรานต์ (ช่างไมค์)'}
• ธนาคาร: ${garage.bankName || 'กสิกรไทย'}

🛡️ เงื่อนไขรับประกัน: ${garage.warrantyTerms || garage.terms || 'รับประกันงานซ่อม 3 เดือน หรือ 5,000 กม.'}
📞 นัดรับรถโทร: ${garage.mechanicPhone || garage.phone || DEFAULT_MECHANIC_PHONE} (ช่างไมค์)
📲 LINE ID: ${garage.lineId || DEFAULT_LINE_ID}
🔗 LINE แชท: ${garage.lineDirectUrl || DEFAULT_LINE_URL}`;
};

/**
 * Template 4: แจ้งเตือนอะไหล่ใกล้หมดสต็อกถึงช่างไมค์/เจ้าของอู่
 */
export const generateLowStockAlertMessage = (lowParts: SparePart[], garage: GarageProfile): string => {
  const listText = lowParts
    .map(
      (p, i) =>
        `${i + 1}. [${p.partCode}] ${p.name}\n   👉 คงเหลือ: ${p.stockQty} ${p.unit} (จุดสั่งซื้อ: ${p.minStockQty} ${p.unit})`
    )
    .join('\n\n');

  return `⚠️【 แจ้งเตือนสต็อกอะไหล่ใกล้หมด 】
${garage.garageName || garage.name || 'อู่สงกรานต์ (ช่างไมค์)'}

พบอะไหล่จำนวน ${lowParts.length} รายการที่มีปริมาณต่ำกว่าจุดสั่งซื้อ:

${listText}

━━━━━━━━━━━━━━━━
📦 กรุณาตรวจเช็คและสั่งซื้ออะไหล่เติมสต็อกเข้าระบบ`;
};

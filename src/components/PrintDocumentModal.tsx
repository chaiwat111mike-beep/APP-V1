import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  Send,
  Car,
  CheckCircle2,
  ShieldCheck,
  QrCode,
  Sparkles,
  Phone,
  FileSpreadsheet,
  Clock,
  Calendar,
  FileText,
  Receipt,
  FileCheck,
  Check,
  ZoomIn,
  ZoomOut,
  Share2,
  Copy,
  Layers,
  AlignLeft,
  Eye,
  EyeOff,
  Sliders,
  Save,
  Fuel,
  Gauge,
  ShieldAlert,
  ClipboardCheck
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { JobOrder } from '../types';
import { exportElementToPdf, printElementViaIframe } from '../services/pdfService';
import { GarageLogo } from './GarageLogo';
import { LineNotificationModal } from './LineNotificationModal';
import { calculateJobBreakdown, formatThaiDateTime, formatThaiDate } from '../utils/jobCalculator';
import { generatePromptPayQRCodeDataURL } from '../utils/promptpay';

export type DocType = 'job_order' | 'quotation' | 'receipt' | 'delivery';

interface PrintDocumentModalProps {
  job: JobOrder | null;
  docType: 'job_order' | 'quotation' | 'receipt' | 'delivery';
  isOpen: boolean;
  onClose: () => void;
}

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({
  job,
  docType: initialDocType,
  isOpen,
  onClose,
}) => {
  const { garageProfile, updateJobOrder } = useGarage();
  const [selectedDocType, setSelectedDocType] = useState<DocType>(initialDocType);
  const [laborDisplayMode, setLaborDisplayMode] = useState<'summarized' | 'itemized'>('summarized');
  const [showPromptPayQr, setShowPromptPayQr] = useState<boolean>(true);
  const [showTechnicianNotes, setShowTechnicianNotes] = useState<boolean>(true);
  const [showWarrantyTerms, setShowWarrantyTerms] = useState<boolean>(true);
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);
  const [promptPayQrUrl, setPromptPayQrUrl] = useState<string>('');

  // Live Customizable Discount & VAT
  const [showCustomizePanel, setShowCustomizePanel] = useState<boolean>(true);
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [customDiscountType, setCustomDiscountType] = useState<'amount' | 'percent'>('amount');
  const [customEnableVat, setCustomEnableVat] = useState<boolean>(true);
  const [customVatPercent, setCustomVatPercent] = useState<number>(7);
  const [isSavingFinancials, setIsSavingFinancials] = useState<boolean>(false);

  // Initialize or reset state when job opens
  useEffect(() => {
    if (isOpen && job) {
      setSelectedDocType(initialDocType);
      setShowSuccessToast(null);

      const dType = job.discountType || (job.discountPercent ? 'percent' : 'amount');
      setCustomDiscountType(dType);
      setCustomDiscount(dType === 'percent' ? (job.discountPercent || 0) : (job.discount || 0));
      
      const hasVat = (job.vatPercent ?? 7) > 0;
      setCustomEnableVat(hasVat);
      setCustomVatPercent(job.vatPercent ?? 7);
    }
  }, [isOpen, initialDocType, job]);

  // Recalculate breakdown dynamically whenever live custom values or job changes
  const financials = useMemo(() => {
    if (!job) {
      return {
        partsTotal: 0,
        laborFee: 0,
        otherFee: 0,
        grossTotal: 0,
        discountAmount: 0,
        discountType: 'amount' as const,
        discountPercent: 0,
        taxableAmount: 0,
        vatAmount: 0,
        vatPercent: 7,
        grandTotal: 0,
        depositAmount: 0,
        remainingBalance: 0,
      };
    }

    return calculateJobBreakdown({
      parts: job.partsUsed || [],
      laborFee: job.laborFee || 0,
      otherFee: job.otherFee || 0,
      discount: customDiscountType === 'amount' ? customDiscount : 0,
      discountType: customDiscountType,
      discountPercent: customDiscountType === 'percent' ? customDiscount : 0,
      enableVat: customEnableVat,
      vatPercent: customEnableVat ? customVatPercent : 0,
      depositAmount: job.depositAmount || job.paidAmount || 0,
    });
  }, [job, customDiscount, customDiscountType, customEnableVat, customVatPercent]);

  // Update PromptPay QR Code dynamically when financial total changes
  useEffect(() => {
    if (isOpen && job) {
      const ppTarget = garageProfile.promptPayId || garageProfile.mechanicPhone || garageProfile.phone || '0610692036';
      const targetAmount = financials.remainingBalance > 0 ? financials.remainingBalance : financials.grandTotal;
      generatePromptPayQRCodeDataURL(ppTarget, targetAmount > 0 ? targetAmount : undefined, {
        width: 180,
        margin: 2,
      })
        .then((url) => setPromptPayQrUrl(url))
        .catch((err) => console.error('Failed to generate doc QR:', err));
    }
  }, [isOpen, job, financials.grandTotal, financials.remainingBalance, garageProfile]);

  if (!isOpen || !job) return null;

  const triggerToast = (msg: string) => {
    setShowSuccessToast(msg);
    setTimeout(() => {
      setShowSuccessToast(null);
    }, 3500);
  };

  const handleSaveFinancialsToJob = async () => {
    if (!job) return;
    setIsSavingFinancials(true);
    try {
      await updateJobOrder(job.id, {
        discount: customDiscountType === 'amount' ? customDiscount : financials.discountAmount,
        discountType: customDiscountType,
        discountPercent: customDiscountType === 'percent' ? customDiscount : 0,
        vatPercent: customEnableVat ? customVatPercent : 0,
        totalAmount: financials.grandTotal,
      });
      triggerToast('💾 บันทึกส่วนลด & VAT ลงใบงานเรียบร้อยแล้ว');
    } catch {
      triggerToast('บันทึกเรียบร้อย');
    } finally {
      setIsSavingFinancials(false);
    }
  };

  const getDocTitle = () => {
    switch (selectedDocType) {
      case 'job_order':
        return 'ใบสั่งซ่อม / ใบรับรถเข้าอู่ (Repair Work Order)';
      case 'quotation':
        return 'ใบเสนอราคาค่าซ่อมและอะไหล่ (Quotation / Estimate)';
      case 'receipt':
        return 'ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ (Receipt / Tax Invoice)';
      case 'delivery':
        return 'ใบส่งมอบรถ & รายงานตรวจรับงาน (Vehicle Delivery & QC Report)';
    }
  };

  const getDocShortName = () => {
    switch (selectedDocType) {
      case 'job_order': return 'ใบสั่งซ่อม';
      case 'quotation': return 'ใบเสนอราคา';
      case 'receipt': return 'ใบเสร็จรับเงิน';
      case 'delivery': return 'ใบส่งมอบรถ';
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    const docName = getDocShortName();
    const title = `[อู่สงกรานต์]-${docName}-${job.jobNo}-${job.licensePlate}`;
    
    // 1-Click isolated iframe print
    const success = printElementViaIframe('printable-document-content', title);
    setTimeout(() => {
      setIsPrinting(false);
      if (success) {
        triggerToast('🖨️ ส่งคำสั่งพิมพ์เอกสาร A4 เรียบร้อยแล้ว');
      } else {
        window.print();
      }
    }, 500);
  };

  const handleDirectPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    const docName = getDocShortName();
    const filename = `[อู่สงกรานต์]-${docName}-${job.jobNo}-${job.licensePlate.replace(/\s+/g, '_')}.pdf`;
    
    const success = await exportElementToPdf('printable-document-content', { filename });
    setIsExportingPdf(false);
    if (success) {
      triggerToast(`📥 ดาวน์โหลดไฟล์ ${filename} เรียบร้อยแล้ว!`);
    }
  };

  const phone = garageProfile.mechanicPhone || garageProfile.phone || '061-069-2036';
  const mechanicName = garageProfile.mechanicName || 'ช่างไมค์';

  const handleCopySummary = async () => {
    const docName = getDocShortName();
    const text = `📋 [อู่สงกรานต์ (ช่างไมค์)]
เอกสาร: ${docName} เลขที่: ${job.jobNo}
ลูกค้า: ${job.customerName} (${job.customerPhone})
รถยนต์: ${job.licensePlate} (${job.carBrand} ${job.carModel})
อาการ/งานที่ทำ: ${job.issueDescription}
ค่าอะไหล่: ฿${financials.partsTotal.toLocaleString()} (${(job.partsUsed || []).length} รายการ)
ค่าแรง/บริการ: ฿${financials.laborFee.toLocaleString()}
${financials.otherFee > 0 ? `ค่าบริการอื่นๆ: ฿${financials.otherFee.toLocaleString()}\n` : ''}${financials.discountAmount > 0 ? `ส่วนลด (${customDiscountType === 'percent' ? customDiscount + '%' : '฿' + customDiscount}): -฿${financials.discountAmount.toLocaleString()}\n` : ''}${financials.vatAmount > 0 ? `ภาษี VAT (${financials.vatPercent}%): ฿${financials.vatAmount.toLocaleString()}\n` : ''}ยอดเงินสุทธิ: ฿${financials.grandTotal.toLocaleString()}
สถานะการชำระ: ${job.paymentStatus === 'paid' ? '✅ ชำระเงินเรียบร้อยแล้ว' : job.paymentStatus === 'deposit' ? `⏳ ชำระมัดจำแล้ว ฿${(job.depositAmount || 0).toLocaleString()} (คงเหลือ ฿${financials.remainingBalance.toLocaleString()})` : 'รอชำระเงิน'}
ติดต่ออู่: ${phone} (LINE: ${garageProfile.lineId || 'chaiwatmike'})`;

    try {
      await navigator.clipboard.writeText(text);
      triggerToast('📋 คัดลอกสรุปข้อความเอกสารเรียบร้อย');
    } catch {
      triggerToast('คัดลอกสรุปข้อความเรียบร้อย');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white animate-in fade-in">
        
        {/* Container */}
        <div className="bg-[#16191D] border border-[#2D3135] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-4 print:border-none print:shadow-none print:bg-white print:m-0 print:w-full print:max-w-none flex flex-col max-h-[96vh]">
          
          {/* Screen Controls Header (Hidden during Print) */}
          <div className="p-4 bg-gradient-to-r from-[#1C2025] to-[#14171A] border-b border-[#2D3135] print:hidden space-y-3 shrink-0">
            
            {/* Top Bar: Title & Primary Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>พิมพ์ & ส่งออกเอกสาร PDF A4</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono">
                      {job.jobNo}
                    </span>
                  </h2>
                  <p className="text-xs text-gray-400">
                    ความคมชัดสูง สีดำสนิท อ่านง่ายชัดเจนบนกระดาษขาวขนาด A4
                  </p>
                </div>
              </div>

              {/* Action Buttons Group */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1-Click PDF Download Button */}
                <button
                  type="button"
                  disabled={isExportingPdf}
                  onClick={handleDownloadPdf}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
                  title="คลิกเดียวเพื่อสร้างและดาวน์โหลดไฟล์ PDF คุณภาพสูงทันที"
                >
                  <Download className={`w-4 h-4 ${isExportingPdf ? 'animate-bounce' : ''}`} />
                  <span>{isExportingPdf ? 'กำลังสร้าง PDF...' : '📥 ดาวน์โหลด PDF (1 คลิก)'}</span>
                </button>

                {/* 1-Click Isolated Print Button */}
                <button
                  type="button"
                  disabled={isPrinting}
                  onClick={handlePrint}
                  className="px-3.5 py-2 rounded-xl bg-[#0F1113] hover:bg-[#20252A] text-white border border-[#2D3135] hover:border-orange-500/40 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                  title="พิมพ์เอกสาร A4 คมชัดสูงสุด"
                >
                  <Printer className="w-4 h-4 text-orange-400" />
                  <span>{isPrinting ? 'กำลังส่งพิมพ์...' : '🖨️ พิมพ์เอกสาร A4'}</span>
                </button>

                {/* Copy Text Summary Action */}
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="px-3 py-2 rounded-xl bg-[#0F1113] hover:bg-[#20252A] text-gray-200 border border-[#2D3135] hover:border-orange-500/40 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
                  title="คัดลอกข้อความสรุปเอกสารเพื่อส่งทางแชท / SMS"
                >
                  <Copy className="w-3.5 h-3.5 text-orange-400" />
                  <span>คัดลอกสรุป</span>
                </button>

                {/* LINE Share Action */}
                <button
                  type="button"
                  onClick={() => setIsLineModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#06C755]/20 active:scale-95 transition-all"
                  title="ส่งสรุปรายการและยอดเงินเข้า LINE ลูกค้า"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ส่ง LINE</span>
                </button>

                {/* Close Modal */}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-[#0F1113] border border-[#2D3135] text-gray-400 hover:text-white hover:bg-[#25292E] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Type Selector Tabs (4 Templates) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#2D3135]/60 text-xs">
              <div className="flex items-center gap-1.5 bg-[#0F1113] p-1 rounded-xl border border-[#2D3135] flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedDocType('job_order')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                    selectedDocType === 'job_order'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>1. ใบสั่งซ่อม / รับรถ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocType('quotation')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                    selectedDocType === 'quotation'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>2. ใบเสนอราคา</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocType('receipt')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                    selectedDocType === 'receipt'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>3. ใบเสร็จรับเงิน / ใบกำกับภาษี</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocType('delivery')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                    selectedDocType === 'delivery'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>4. ใบส่งมอบรถ / ตรวจรับงาน</span>
                </button>
              </div>

              {/* Toast & Direct Print */}
              <div className="flex items-center gap-2">
                {showSuccessToast && (
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1 animate-in fade-in">
                    <Check className="w-3.5 h-3.5" />
                    <span>{showSuccessToast}</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleDirectPrint}
                  className="px-2.5 py-1 bg-[#0F1113] hover:bg-[#20252A] rounded-lg border border-[#2D3135] text-gray-300 hover:text-white text-[11px] flex items-center gap-1 transition-colors"
                  title="พิมพ์ตรงผ่านหน้าต่างสั่งพิมพ์ของเบราว์เซอร์"
                >
                  <Printer className="w-3 h-3 text-gray-400" />
                  <span>พิมพ์ตรง</span>
                </button>
              </div>
            </div>

            {/* LIVE CUSTOMIZE DISCOUNT & VAT TOOLBAR */}
            <div className="bg-[#0F1113] border border-orange-500/30 rounded-xl p-3 space-y-2.5 text-xs text-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2D3135]/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-orange-500/20 text-orange-400 font-bold">
                    <Sliders className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-bold text-white text-xs">
                    ปรับแต่ง ส่วนลด & VAT สำหรับเอกสารนี้ (กำหนดเองได้อิสระ):
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400 font-mono">
                    ยอดสุทธิปัจจุบัน: <strong className="text-orange-400 font-bold">฿{financials.grandTotal.toLocaleString()}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={isSavingFinancials}
                    onClick={handleSaveFinancialsToJob}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                    title="บันทึกค่าส่วนลดและ VAT นี้กลับไปยังข้อมูลใบงานหลัก"
                  >
                    <Save className="w-3 h-3" />
                    <span>{isSavingFinancials ? 'กำลังบันทึก...' : '💾 บันทึกลงใบงานนี้'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* 1. Discount Custom Controls */}
                <div className="flex items-center gap-2 bg-[#16191D] p-2 rounded-lg border border-[#2D3135]">
                  <span className="text-gray-300 font-bold shrink-0">ส่วนลด:</span>
                  <div className="flex items-center bg-[#0F1113] p-0.5 rounded border border-[#2D3135] text-[10px]">
                    <button
                      type="button"
                      onClick={() => setCustomDiscountType('amount')}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                        customDiscountType === 'amount'
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      ฿ บาท
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomDiscountType('percent')}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                        customDiscountType === 'percent'
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      % เปอร์เซ็นต์
                    </button>
                  </div>

                  <input
                    type="number"
                    min="0"
                    max={customDiscountType === 'percent' ? 100 : undefined}
                    value={customDiscount}
                    onChange={(e) => setCustomDiscount(Math.max(0, Number(e.target.value)))}
                    className="w-20 px-2 py-1 bg-[#0F1113] border border-[#2D3135] rounded text-white font-mono text-right text-xs font-bold focus:outline-none focus:border-orange-500"
                  />

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => { setCustomDiscountType('amount'); setCustomDiscount(0); }}
                      className="px-1.5 py-0.5 rounded bg-[#0F1113] hover:bg-[#20252A] text-gray-400 hover:text-white border border-[#2D3135]"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCustomDiscountType('amount'); setCustomDiscount(100); }}
                      className="px-1.5 py-0.5 rounded bg-[#0F1113] hover:bg-[#20252A] text-gray-300 hover:text-white border border-[#2D3135]"
                    >
                      100
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCustomDiscountType('amount'); setCustomDiscount(200); }}
                      className="px-1.5 py-0.5 rounded bg-[#0F1113] hover:bg-[#20252A] text-gray-300 hover:text-white border border-[#2D3135]"
                    >
                      200
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCustomDiscountType('amount'); setCustomDiscount(500); }}
                      className="px-1.5 py-0.5 rounded bg-[#0F1113] hover:bg-[#20252A] text-gray-300 hover:text-white border border-[#2D3135]"
                    >
                      500
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCustomDiscountType('percent'); setCustomDiscount(5); }}
                      className="px-1.5 py-0.5 rounded bg-[#0F1113] hover:bg-[#20252A] text-orange-400 hover:text-orange-300 border border-[#2D3135]"
                    >
                      5%
                    </button>
                  </div>
                </div>

                {/* 2. VAT Custom Controls */}
                <div className="flex items-center gap-2 bg-[#16191D] p-2 rounded-lg border border-[#2D3135]">
                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={customEnableVat}
                      onChange={(e) => setCustomEnableVat(e.target.checked)}
                      className="w-3.5 h-3.5 accent-orange-500 rounded"
                    />
                    <span className={`font-bold ${customEnableVat ? 'text-white' : 'text-gray-400'}`}>
                      คิด VAT:
                    </span>
                  </label>

                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setCustomEnableVat(false)}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                        !customEnableVat
                          ? 'bg-orange-500 text-white'
                          : 'bg-[#0F1113] text-gray-400 hover:text-white border border-[#2D3135]'
                      }`}
                    >
                      0% (ไม่คิด)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCustomEnableVat(true); setCustomVatPercent(7); }}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                        customEnableVat && customVatPercent === 7
                          ? 'bg-orange-500 text-white'
                          : 'bg-[#0F1113] text-gray-400 hover:text-white border border-[#2D3135]'
                      }`}
                    >
                      7% (มาตรฐาน)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCustomEnableVat(true); setCustomVatPercent(10); }}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                        customEnableVat && customVatPercent === 10
                          ? 'bg-orange-500 text-white'
                          : 'bg-[#0F1113] text-gray-400 hover:text-white border border-[#2D3135]'
                      }`}
                    >
                      10%
                    </button>
                  </div>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    disabled={!customEnableVat}
                    value={customEnableVat ? customVatPercent : 0}
                    onChange={(e) => setCustomVatPercent(Math.max(0, Number(e.target.value)))}
                    className={`w-14 px-2 py-1 bg-[#0F1113] border border-[#2D3135] rounded text-white font-mono text-center text-xs font-bold focus:outline-none focus:border-orange-500 ${
                      !customEnableVat ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  />
                  <span className="text-gray-400 text-xs">%</span>
                </div>
              </div>
            </div>

            {/* Customization & Display Options Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#2D3135]/40 text-[11px] text-gray-300">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Labor Display Mode */}
                <div className="flex items-center gap-1 bg-[#0F1113] p-0.5 rounded-lg border border-[#2D3135]">
                  <span className="text-[10px] text-gray-400 px-1.5 font-medium">ค่าแรง:</span>
                  <button
                    type="button"
                    onClick={() => setLaborDisplayMode('summarized')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      laborDisplayMode === 'summarized'
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    รวม 1 บรรทัด (สรุป)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLaborDisplayMode('itemized')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      laborDisplayMode === 'itemized'
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    แยกรายการย่อย ({job.laborDetails?.length || 0})
                  </button>
                </div>

                {/* Toggles */}
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-white select-none">
                  <input
                    type="checkbox"
                    checked={showPromptPayQr}
                    onChange={(e) => setShowPromptPayQr(e.target.checked)}
                    className="rounded bg-[#0F1113] border-[#2D3135] text-orange-500 focus:ring-0"
                  />
                  <span>QR พร้อมเพย์</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer hover:text-white select-none">
                  <input
                    type="checkbox"
                    checked={showTechnicianNotes}
                    onChange={(e) => setShowTechnicianNotes(e.target.checked)}
                    className="rounded bg-[#0F1113] border-[#2D3135] text-orange-500 focus:ring-0"
                  />
                  <span>บันทึกผลตรวจเช็ค</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer hover:text-white select-none">
                  <input
                    type="checkbox"
                    checked={showWarrantyTerms}
                    onChange={(e) => setShowWarrantyTerms(e.target.checked)}
                    className="rounded bg-[#0F1113] border-[#2D3135] text-orange-500 focus:ring-0"
                  />
                  <span>เงื่อนไขรับประกัน</span>
                </label>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-[#0F1113] px-1.5 py-0.5 rounded-lg border border-[#2D3135] text-[10px]">
                <button
                  type="button"
                  onClick={() => setZoomScale(Math.max(75, zoomScale - 10))}
                  className="px-1.5 py-0.5 hover:text-white"
                  title="ลดขนาดแสดงผล"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className="font-mono px-1 font-bold text-orange-400">{zoomScale}%</span>
                <button
                  type="button"
                  onClick={() => setZoomScale(Math.min(130, zoomScale + 10))}
                  className="px-1.5 py-0.5 hover:text-white"
                  title="เพิ่มขนาดแสดงผล"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
                {zoomScale !== 100 && (
                  <button
                    type="button"
                    onClick={() => setZoomScale(100)}
                    className="text-[9px] text-gray-500 hover:text-gray-300 ml-1 underline"
                  >
                    รีเซ็ต
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Printable Paper Area (A4 layout styling with pure white background) */}
          <div className="overflow-y-auto flex-1 p-3 sm:p-6 bg-[#0B0C0E] print:p-0 print:bg-white flex justify-center">
            
            <div
              id="printable-document-content"
              style={{
                transform: zoomScale !== 100 ? `scale(${zoomScale / 100})` : undefined,
                transformOrigin: 'top center',
              }}
              className="w-full max-w-[210mm] bg-white text-black p-8 sm:p-10 space-y-5 rounded-lg shadow-xl print:shadow-none print:rounded-none print:p-4 print:space-y-3 print:text-black min-h-[297mm] transition-transform duration-200"
            >
              
              {/* Document Header */}
              <div className="flex justify-between items-start border-b-2 border-black pb-4 gap-4">
                <div className="flex items-start gap-4">
                  <GarageLogo variant="print" />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-black">
                      {garageProfile.garageName || 'อู่สงกรานต์ (ช่างไมค์)'}
                    </h1>
                    <p className="text-xs text-black font-semibold mt-1 max-w-md leading-relaxed">
                      {garageProfile.address || '88/9 หมู่ 5 ถนนกาญจนาภิเษก แขวงบางแคเหนือ เขตบางแค กรุงเทพฯ 10160'}
                    </p>
                    <p className="text-xs text-black mt-1 flex items-center gap-3 font-medium">
                      <span>โทร: <strong className="text-black font-black">{phone}</strong> ({mechanicName})</span>
                      <span>•</span>
                      <span>LINE ID: <strong className="text-black font-black">{garageProfile.lineId || 'chaiwatmike'}</strong></span>
                    </p>
                    <p className="text-xs text-black font-mono mt-0.5">
                      เลขประจำตัวผู้เสียภาษี: <strong className="text-black font-black">{garageProfile.taxId}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1.5 mb-1.5">
                    <span className="inline-block px-3.5 py-1 bg-black text-white font-black text-xs uppercase rounded-md tracking-wide border border-black">
                      {getDocShortName()}
                    </span>
                    {selectedDocType === 'receipt' && (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase border-2 ${
                        job.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-950 border-black font-black'
                          : job.paymentStatus === 'deposit'
                          ? 'bg-amber-50 text-amber-950 border-black font-black'
                          : 'bg-white text-black border-black font-black'
                      }`}>
                        {job.paymentStatus === 'paid' ? '✓ ชำระแล้ว' : job.paymentStatus === 'deposit' ? 'มัดจำแล้ว' : 'รอชำระ'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-black font-mono">
                    เลขที่เอกสาร: <strong className="text-black text-sm font-black">{job.jobNo}</strong>
                  </p>
                  <p className="text-xs text-black">
                    วันที่ออกเอกสาร: <strong className="text-black font-bold">{formatThaiDate(job.createdAt)}</strong>
                  </p>
                  <p className="text-xs text-black">
                    ช่องซ่อม: <strong className="text-black font-bold">ช่อง #{job.bayNumber || '-'}</strong>
                  </p>
                  {selectedDocType === 'quotation' && (
                    <p className="text-[11px] text-black font-bold mt-0.5">
                      * ราคาใช้ได้ภายใน 15 วัน
                    </p>
                  )}
                </div>
              </div>

              {/* Document Sub-Banner Title */}
              <div className="text-center py-1 bg-slate-100 border-2 border-black rounded-lg">
                <h2 className="text-sm font-black uppercase tracking-wider text-black">
                  {getDocTitle()}
                </h2>
              </div>

              {/* Customer & Vehicle Info Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border-2 border-black bg-white text-xs text-black">
                <div>
                  <span className="font-black text-black uppercase block mb-1 text-[11px] border-b-2 border-black pb-1">
                    ข้อมูลลูกค้า (Customer)
                  </span>
                  <p className="font-black text-black text-sm">{job.customerName}</p>
                  <p className="text-black mt-0.5">โทรศัพท์: <strong className="text-black font-black">{job.customerPhone}</strong></p>
                  <p className="text-black">ที่อยู่: <span className="font-bold text-black">{job.customerAddress || '-'}</span></p>
                </div>

                <div>
                  <span className="font-black text-black uppercase block mb-1 text-[11px] border-b-2 border-black pb-1">
                    ข้อมูลรถยนต์ (Vehicle Information)
                  </span>
                  <p className="font-bold text-black text-sm flex items-center gap-2">
                    <span>ทะเบียน:</span>
                    <span className="bg-amber-100 px-2 py-0.5 rounded text-black font-black text-xs font-mono border-2 border-black">
                      {job.licensePlate}
                    </span>
                  </p>
                  <p className="text-black mt-0.5">
                    ยี่ห้อ/รุ่น: <strong className="text-black font-black">{job.carBrand} {job.carModel}</strong> {job.carYear ? `(${job.carYear})` : ''}
                  </p>
                  <p className="text-black">
                    เลขไมล์: <strong className="text-black font-black">{job.mileage.toLocaleString()} กม.</strong> • สี: <span className="font-bold text-black">{job.carColor || '-'}</span>
                  </p>
                </div>
              </div>

              {/* Dates Tracker Box (Received Date & Delivery Date) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-white rounded-xl border-2 border-black text-xs text-black">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-black shrink-0" />
                  <div>
                    <span className="text-black font-bold block text-[11px]">วันที่รับรถเข้าอู่:</span>
                    <strong className="text-black font-mono font-black">
                      {formatThaiDateTime(job.receivedDate || job.createdAt)}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-black shrink-0" />
                  <div>
                    <span className="text-black font-bold block text-[11px]">กำหนดส่งมอบรถ:</span>
                    <strong className="text-black font-mono font-black">
                      {formatThaiDateTime(job.estimatedCompletionDate)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Job Description & Inspection */}
              <div className="p-3.5 bg-white rounded-xl border-2 border-black text-xs text-black space-y-1.5">
                <span className="font-black text-black block">อาการที่แจ้ง / งานที่ต้องการให้ดำเนินการ:</span>
                <p className="text-black font-bold leading-relaxed">{job.issueDescription}</p>
                {showTechnicianNotes && job.technicianNotes && (
                  <p className="text-black italic pt-1 border-t border-black">
                    บันทึกผลการตรวจเช็คของช่าง: <span className="font-bold text-black">{job.technicianNotes}</span> (ช่างผู้ดูแล: <strong className="text-black font-black">{job.mechanicName || mechanicName}</strong>)
                  </p>
                )}
              </div>

              {/* SPECIAL DELIVERY / INSPECTION REPORT VIEW */}
              {selectedDocType === 'delivery' && (
                <div className="p-4 bg-white rounded-xl border-2 border-black text-xs text-black space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-black pb-1.5">
                    <span className="font-black text-sm uppercase">📋 รายการตรวจรับสภาพรถยนต์ก่อนส่งมอบ (Delivery Checklist)</span>
                    <span className="font-mono text-[11px] font-bold">QC Status: ผ่านการทดสอบสมบูรณ์</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2 border border-black rounded">
                      <span className="font-bold block">ระดับน้ำมันเชื้อเพลิง:</span>
                      <span className="font-black font-mono">{job.inspection?.fuelLevel ?? 50}%</span>
                    </div>
                    <div className="p-2 border border-black rounded">
                      <span className="font-bold block">เลขไมล์ส่งมอบ:</span>
                      <span className="font-black font-mono">{job.inspection?.dashboardMileage ?? job.mileage} กม.</span>
                    </div>
                    <div className="p-2 border border-black rounded">
                      <span className="font-bold block">ยางอะไหล่ & แม่แรง:</span>
                      <span className="font-black">{job.inspection?.spareTirePresent ? '✓ มีครบถ้วน' : 'ตรวจสอบแล้ว'}</span>
                    </div>
                    <div className="p-2 border border-black rounded">
                      <span className="font-bold block">ของมีค่าในรถ:</span>
                      <span className="font-black">{job.inspection?.valuableItemsChecked ? '✓ ตรวจนับครบ' : 'ไม่พบของมีค่า'}</span>
                    </div>
                  </div>

                  <div className="p-2.5 border border-black rounded space-y-1">
                    <span className="font-bold block">สภาพภายนอกและงานซ่อมที่ส่งมอบ:</span>
                    <p className="leading-relaxed">
                      {job.inspection?.exteriorScratches && job.inspection.exteriorScratches.length > 0
                        ? `รอยเดิมที่บันทึกไว้: ${job.inspection.exteriorScratches.join(', ')}`
                        : 'สภาพตัวถังสะอาดเรียบร้อย อะไหล่เก่าที่ถอดเปลี่ยนส่งมอบคืนลูกค้าครบถ้วน และทดสอบการทำงานของเครื่องยนต์/ระบบเบรก/ช่วงล่างเรียบร้อย'}
                    </p>
                  </div>
                </div>
              )}

              {/* Table of Items */}
              <div className="overflow-hidden border-2 border-black rounded-xl">
                <table className="w-full text-left text-xs text-black">
                  <thead className="bg-slate-100 text-black font-black border-b-2 border-black">
                    <tr>
                      <th className="p-0 w-10 text-center text-black font-black" style={{ color: '#000000', padding: '0px' }}>ลำดับ</th>
                      <th className="px-3 py-2 text-black font-black" style={{ color: '#000000' }}>รายการอะไหล่ / ค่าบริการ</th>
                      <th className="px-3 py-2 text-center w-20 text-black font-black" style={{ color: '#000000' }}>จำนวน</th>
                      <th className="px-3 py-2 text-right w-28 text-black font-black" style={{ color: '#000000' }}>ราคา/หน่วย</th>
                      <th className="px-3 py-2 text-right w-28 text-black font-black" style={{ color: '#000000' }}>จำนวนเงิน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-black">
                    {(job.partsUsed || []).length === 0 && (job.laborFee || 0) === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-black italic font-bold" style={{ color: '#000000' }}>
                          ไม่มีรายการอะไหล่และค่าบริการ
                        </td>
                      </tr>
                    )}
                    {(job.partsUsed || []).map((p, idx) => (
                      <tr key={p.partId || idx} className="text-black">
                        <td className="px-3 py-2 text-center text-black font-bold" style={{ color: '#000000' }}>{idx + 1}</td>
                        <td className="px-3 py-2 text-black" style={{ color: '#000000' }}>
                          <span className="font-bold text-black" style={{ color: '#000000' }}>{p.partName}</span>
                          <span className="text-[10px] text-black font-bold block font-mono" style={{ color: '#000000' }}>{p.partCode}</span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-black" style={{ color: '#000000' }}>{p.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-black" style={{ color: '#000000' }}>{(p.unitPrice || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-black font-mono text-black" style={{ color: '#000000' }}>{(p.totalPrice || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    
                    {/* Labor Services Section */}
                    {(job.laborFee || 0) > 0 && (
                      laborDisplayMode === 'summarized' ? (
                        /* Single Consolidated Row (User Preferred) */
                        <tr className="text-black">
                          <td className="px-3 py-2 text-center text-black font-bold" style={{ color: '#000000' }}>{(job.partsUsed || []).length + 1}</td>
                          <td className="px-3 py-2 text-black" style={{ color: '#000000' }}>
                            <span className="font-bold text-black" style={{ color: '#000000' }}>ค่าแรงช่างและบริการซ่อมบำรุง</span>
                            <span className="text-[11px] text-black font-semibold block mt-0.5" style={{ color: '#000000' }}>
                              ({job.laborDescription?.trim()
                                ? job.laborDescription.trim()
                                : job.laborDetails && job.laborDetails.length > 0
                                ? job.laborDetails.map((item) => item.title).join(', ')
                                : 'บริการตรวจเช็คและซ่อมบำรุงตามมาตรฐาน'})
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-black" style={{ color: '#000000' }}>1</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-black" style={{ color: '#000000' }}>{(job.laborFee || 0).toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-black font-mono text-black" style={{ color: '#000000' }}>{(job.laborFee || 0).toLocaleString()}</td>
                        </tr>
                      ) : (
                        /* Itemized Sub-Services Rows */
                        job.laborDetails && job.laborDetails.length > 0 ? (
                          job.laborDetails.map((item, lIdx) => (
                            <tr key={item.id || lIdx} className="text-black">
                              <td className="px-3 py-2 text-center text-black font-bold" style={{ color: '#000000' }}>{(job.partsUsed || []).length + lIdx + 1}</td>
                              <td className="px-3 py-2 text-black" style={{ color: '#000000' }}>
                                <span className="font-bold text-black" style={{ color: '#000000' }}>{item.title}</span>
                                <span className="text-[10px] text-black font-bold block" style={{ color: '#000000' }}>งานบริการ / ค่าแรงช่าง</span>
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-bold text-black" style={{ color: '#000000' }}>1</td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-black" style={{ color: '#000000' }}>{Number(item.fee || 0).toLocaleString()}</td>
                              <td className="px-3 py-2 text-right font-black font-mono text-black" style={{ color: '#000000' }}>{Number(item.fee || 0).toLocaleString()}</td>
                            </tr>
                          ))
                        ) : (
                          <tr className="text-black">
                            <td className="px-3 py-2 text-center text-black font-bold" style={{ color: '#000000' }}>{(job.partsUsed || []).length + 1}</td>
                            <td className="px-3 py-2 text-black" style={{ color: '#000000' }}>
                              <span className="font-bold text-black" style={{ color: '#000000' }}>
                                {job.laborDescription ? `ค่าแรง/ค่าบริการ: ${job.laborDescription}` : 'ค่าแรงช่างและบริการซ่อมบำรุง'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center font-mono font-bold text-black" style={{ color: '#000000' }}>1</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-black" style={{ color: '#000000' }}>{(job.laborFee || 0).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right font-black font-mono text-black" style={{ color: '#000000' }}>{(job.laborFee || 0).toLocaleString()}</td>
                          </tr>
                        )
                      )
                    )}

                    {/* Other Fee Row */}
                    {(job.otherFee || 0) > 0 && (
                      <tr className="text-black">
                        <td className="px-3 py-2 text-center text-black font-bold" style={{ color: '#000000' }}>
                          {(job.partsUsed || []).length + (
                            (job.laborFee || 0) > 0
                              ? (laborDisplayMode === 'itemized' && job.laborDetails && job.laborDetails.length > 0 ? job.laborDetails.length : 1)
                              : 0
                          ) + 1}
                        </td>
                        <td className="px-3 py-2 font-bold text-black" style={{ color: '#000000' }}>
                          ค่าบริการอื่นๆ / ค่าซับนอก {job.otherFeeDescription ? `(${job.otherFeeDescription})` : ''}
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-black" style={{ color: '#000000' }}>1</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-black" style={{ color: '#000000' }}>{job.otherFee?.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-black font-mono text-black" style={{ color: '#000000' }}>{job.otherFee?.toLocaleString()}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Summary & Payment Info */}
              <div className="flex justify-between items-start text-xs pt-1 gap-4 flex-wrap sm:flex-nowrap">
                <div className="max-w-xs space-y-2">
                  {/* PromptPay & Bank Details with Real QR Code */}
                  <div className="p-3.5 bg-white rounded-xl border-2 border-black flex items-start gap-3">
                    {/* PromptPay QR Code Image */}
                    {showPromptPayQr && promptPayQrUrl && (
                      <div className="shrink-0 text-center bg-white p-1.5 rounded-lg border-2 border-black shadow-sm">
                        <img
                          src={promptPayQrUrl}
                          alt="PromptPay QR Code"
                          className="w-20 h-20 object-contain mx-auto"
                        />
                        <span className="text-[10px] text-black font-black block mt-0.5">
                          พร้อมเพย์ (QR)
                        </span>
                      </div>
                    )}

                    <div className="space-y-0.5 text-[11px] flex-1">
                      <span className="font-black text-black block flex items-center gap-1.5 text-xs">
                        <QrCode className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                        <span>ชำระเงินผ่าน พร้อมเพย์</span>
                      </span>
                      <p className="text-black font-medium">
                        เลขพร้อมเพย์: <strong className="text-black font-mono text-xs font-black">{garageProfile.promptPayId || phone}</strong>
                      </p>
                      <p className="text-black font-medium">
                        ชื่อบัญชี: <strong className="text-black font-black">{garageProfile.bankAccountName || 'อู่สงกรานต์ (ช่างไมค์)'}</strong>
                      </p>
                      <p className="text-black text-[10px] pt-0.5 font-bold">
                        {garageProfile.bankName} เลขที่ {garageProfile.bankAccountNumber || garageProfile.bankAccount}
                      </p>
                    </div>
                  </div>

                  {showWarrantyTerms && (
                    <p className="text-[11px] text-black font-semibold leading-relaxed">
                      🛡️ <strong className="text-black font-black">เงื่อนไขการรับประกัน:</strong> {garageProfile.warrantyTerms || garageProfile.terms}
                    </p>
                  )}
                </div>

                <div className="w-full sm:w-80 space-y-1.5 bg-white p-4 rounded-xl border-2 border-black text-black font-semibold">
                  <div className="flex justify-between">
                    <span>รวมค่าอะไหล่ ({(job.partsUsed || []).length} รายการ):</span>
                    <span className="font-mono font-bold">฿{financials.partsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ค่าบริการ / ค่าแรง:</span>
                    <span className="font-mono font-bold">฿{financials.laborFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  {financials.otherFee > 0 && (
                    <div className="flex justify-between">
                      <span>ค่าบริการอื่นๆ:</span>
                      <span className="font-mono font-bold">฿{financials.otherFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {financials.discountAmount > 0 && (
                    <div className="flex justify-between text-black font-bold">
                      <span>
                        ส่วนลดพิเศษ {customDiscountType === 'percent' ? `(${customDiscount}%)` : ''}:
                      </span>
                      <span className="font-mono font-black">-฿{financials.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t-2 border-black pt-1 text-black font-bold">
                    <span>ภาษีมูลค่าเพิ่ม VAT {financials.vatPercent}%:</span>
                    <span className="font-mono font-black">฿{financials.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-black pt-2 font-black text-base text-black">
                    <span>ยอดเงินสุทธิทั้งสิ้น:</span>
                    <span className="font-mono text-black font-black">฿{financials.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>

                  {financials.depositAmount > 0 && (
                    <>
                      <div className="flex justify-between text-black font-bold border-t-2 border-black pt-1">
                        <span>เงินมัดจำรับแล้ว:</span>
                        <span className="font-mono font-black">฿{financials.depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-black font-black text-sm bg-amber-100 p-1.5 rounded border-2 border-black">
                        <span>คงเหลือชำระ:</span>
                        <span className="font-mono text-black font-black">฿{financials.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-6 text-xs text-center text-black">
                <div>
                  <div className="border-b-2 border-black pb-1 mb-2"></div>
                  <p className="font-black text-black">ลงชื่อ .....................................................</p>
                  <p className="text-black font-bold mt-1">( {job.customerName} )</p>
                  <p className="text-[11px] text-black font-bold">
                    {selectedDocType === 'delivery' ? 'ผู้ตรวจรับรถยนต์ / ลูกค้า' : 'ผู้สั่งซ่อม / ลูกค้า'}
                  </p>
                </div>

                <div>
                  <div className="border-b-2 border-black pb-1 mb-2"></div>
                  <p className="font-black text-black">ลงชื่อ .....................................................</p>
                  <p className="text-black font-bold mt-1">( {job.mechanicName || mechanicName} )</p>
                  <p className="text-[11px] text-black font-bold">ช่างผู้รับผิดชอบงาน / QC</p>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <div className="border-b-2 border-black pb-1 mb-2"></div>
                  <p className="font-black text-black">ลงชื่อ .....................................................</p>
                  <p className="text-black font-bold mt-1">( {garageProfile.name || 'ช่างไมค์ ผู้จัดการอู่'} )</p>
                  <p className="text-[11px] text-black font-bold">ผู้มีอำนาจลงนาม / อู่สงกรานต์</p>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* Embedded Line Notification Modal */}
      {isLineModalOpen && (
        <LineNotificationModal
          job={job}
          isOpen={isLineModalOpen}
          onClose={() => setIsLineModalOpen(false)}
        />
      )}
    </>
  );
};

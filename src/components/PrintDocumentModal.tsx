import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  Send,
  Car,
  FileText,
  Receipt,
  FileCheck,
  Check,
  ZoomIn,
  ZoomOut,
  Copy,
  ClipboardCheck,
  User,
  Calendar,
  Clock,
  QrCode,
  ShieldCheck
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { JobOrder } from '../types';
import { exportElementToPdf, printElementViaIframe } from '../services/pdfService';
import { LineNotificationModal } from './LineNotificationModal';
import { calculateJobBreakdown, formatThaiDateTime, formatThaiDate } from '../utils/jobCalculator';
import { thaiBahtText } from '../utils/thaiBahtText';
import { generatePromptPayQRCodeDataURL } from '../utils/promptpay';

export type DocType = 'job_order' | 'quotation' | 'receipt' | 'delivery';
export type DocCopyType = 'original' | 'copy';

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
  const [docCopyType, setDocCopyType] = useState<DocCopyType>('original');
  const [showTechnicianNotes, setShowTechnicianNotes] = useState<boolean>(true);
  const [showWarrantyTerms, setShowWarrantyTerms] = useState<boolean>(true);
  const [showBankDetails, setShowBankDetails] = useState<boolean>(true);
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Initialize or reset state when job opens
  useEffect(() => {
    if (isOpen && job) {
      setSelectedDocType(initialDocType);
      setShowSuccessToast(null);
    }
  }, [isOpen, initialDocType, job]);

  // Financial breakdown calculation
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

    const dType = job.discountType || (job.discountPercent ? 'percent' : 'amount');
    const dVal = dType === 'percent' ? (job.discountPercent || 0) : (job.discount || 0);
    const hasVat = (job.vatPercent ?? 7) > 0;
    const vatP = hasVat ? (job.vatPercent ?? 7) : 0;

    return calculateJobBreakdown({
      parts: job.partsUsed || [],
      laborFee: job.laborFee || 0,
      otherFee: job.otherFee || 0,
      discount: dType === 'amount' ? dVal : 0,
      discountType: dType,
      discountPercent: dType === 'percent' ? dVal : 0,
      enableVat: hasVat,
      vatPercent: vatP,
      depositAmount: job.depositAmount || job.paidAmount || 0,
    });
  }, [job]);

  const phone = garageProfile.mechanicPhone || garageProfile.phone || '061-069-2036';
  const mechanicName = garageProfile.mechanicName || 'ช่างไมค์';

  // Generate dynamic PromptPay QR code
  useEffect(() => {
    if (job && garageProfile) {
      const pId = garageProfile.promptPayId || phone;
      generatePromptPayQRCodeDataURL(pId, financials.grandTotal > 0 ? financials.grandTotal : undefined, {
        width: 180,
        margin: 1,
      })
        .then((url) => setQrCodeUrl(url))
        .catch(() => setQrCodeUrl(''));
    }
  }, [job, garageProfile, financials.grandTotal, phone]);

  if (!isOpen || !job) return null;

  const triggerToast = (msg: string) => {
    setShowSuccessToast(msg);
    setTimeout(() => {
      setShowSuccessToast(null);
    }, 3500);
  };

  // Document Title and Subtitle in Thai & English
  const getDocHeaders = () => {
    switch (selectedDocType) {
      case 'receipt':
        return {
          titleThai: 'ใบเสร็จรับเงิน',
          titleEng: 'RECEIPT / TAX INVOICE',
          shortName: 'ใบเสร็จรับเงิน',
        };
      case 'quotation':
        return {
          titleThai: 'ใบเสนอราคา',
          titleEng: 'QUOTATION',
          shortName: 'ใบเสนอราคา',
        };
      case 'job_order':
        return {
          titleThai: 'ใบสั่งซ่อม',
          titleEng: 'REPAIR WORK ORDER',
          shortName: 'ใบสั่งซ่อม',
        };
      case 'delivery':
        return {
          titleThai: 'ใบส่งมอบรถ',
          titleEng: 'VEHICLE DELIVERY & QC SLIP',
          shortName: 'ใบส่งมอบรถ',
        };
    }
  };

  const docHeaders = getDocHeaders();

  const handlePrint = () => {
    setIsPrinting(true);
    const title = `[อู่สงกรานต์]-${docHeaders.shortName}-${job.jobNo}-${job.licensePlate}`;
    
    // 1-Click isolated iframe print with high-fidelity formatting
    const success = printElementViaIframe('printable-document-content', title);
    setTimeout(() => {
      setIsPrinting(false);
      if (success) {
        triggerToast('ส่งคำสั่งพิมพ์เอกสาร A4 เรียบร้อยแล้ว');
      } else {
        window.print();
      }
    }, 700);
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    const filename = `[อู่สงกรานต์]-${docHeaders.shortName}-${job.jobNo}-${job.licensePlate.replace(/\s+/g, '_')}.pdf`;
    
    const success = await exportElementToPdf('printable-document-content', { 
      filename,
      fitToOnePage: true 
    });
    setIsExportingPdf(false);
    if (success) {
      triggerToast('ดาวน์โหลดไฟล์ PDF A4 เรียบร้อยแล้ว!');
    }
  };

  const handleCopySummary = async () => {
    const text = `📋 [อู่สงกรานต์ (ช่างไมค์)]
เอกสาร: ${docHeaders.shortName} (${docCopyType === 'original' ? 'ต้นฉบับ' : 'สำเนา'})
เลขที่: ${job.jobNo} วันที่: ${formatThaiDate(job.createdAt)}
ลูกค้า: ${job.customerName} (${job.customerPhone})
รถยนต์: ${job.licensePlate} (${job.carBrand} ${job.carModel})
อาการ/งานที่ทำ: ${job.issueDescription}
------------------------------------
ค่าอะไหล่: ฿${financials.partsTotal.toLocaleString()} (${(job.partsUsed || []).length} รายการ)
ค่าแรง/บริการ: ฿${financials.laborFee.toLocaleString()}
${financials.otherFee > 0 ? `ค่าบริการอื่นๆ: ฿${financials.otherFee.toLocaleString()}\n` : ''}${financials.discountAmount > 0 ? `ส่วนลด (${financials.discountType === 'percent' ? financials.discountPercent + '%' : '฿' + financials.discountAmount}): -฿${financials.discountAmount.toLocaleString()}\n` : ''}${financials.vatAmount > 0 ? `ภาษี VAT (${financials.vatPercent}%): ฿${financials.vatAmount.toLocaleString()}\n` : ''}ยอดเงินสุทธิ: ฿${financials.grandTotal.toLocaleString()} (${thaiBahtText(financials.grandTotal)})
สถานะการชำระ: ${job.paymentStatus === 'paid' ? 'ชำระเงินเรียบร้อยแล้ว' : job.paymentStatus === 'deposit' ? `ชำระมัดจำแล้ว ฿${(job.depositAmount || 0).toLocaleString()} (คงเหลือ ฿${financials.remainingBalance.toLocaleString()})` : 'รอชำระเงิน'}
------------------------------------
ติดต่ออู่: ${phone} (LINE: ${garageProfile.lineId || 'chaiwatmike'})`;

    try {
      await navigator.clipboard.writeText(text);
      triggerToast('คัดลอกสรุปข้อความเอกสารเรียบร้อย');
    } catch {
      triggerToast('คัดลอกสรุปข้อความเรียบร้อย');
    }
  };

  const partsCount = (job.partsUsed || []).length;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 bg-black/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white animate-in fade-in">
        
        {/* Modal Window Container */}
        <div className="bg-slate-900 border-2 border-blue-900 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-2 print:border-none print:shadow-none print:bg-white print:m-0 print:w-full print:max-w-none flex flex-col max-h-[98vh]">
          
          {/* COMPACT SCREEN CONTROLS HEADER (Clean Toolbar) */}
          <div className="p-2.5 sm:p-3 bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 border-b-2 border-blue-800 print:hidden space-y-2 shrink-0">
            
            {/* Row 1: Document title & primary action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                <div className="p-1.5 rounded-lg bg-orange-500 text-black shadow-xs font-black">
                  <Printer className="w-4 h-4" />
                </div>
                <span className="font-black text-white text-xs sm:text-sm">ระบบพิมพ์เอกสาร & ส่งออก PDF (คมชัดสูง พอดี A4 ในแผ่นเดียว 100%)</span>
              </div>

              {/* Action Buttons Group */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isPrinting ? 'กำลังเตรียมพิมพ์...' : 'พิมพ์เอกสาร (Print)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExportingPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsLineModalOpen(true)}
                  className="px-2.5 py-1.5 bg-[#06C755] hover:bg-[#05b34c] active:scale-95 text-white font-black text-xs rounded-lg shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ส่ง LINE</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                  title="คัดลอกข้อความสรุป"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">คัดลอกสรุป</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Row 2: Document selector pills & preview zoom */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-blue-900/60 text-xs">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-slate-300 font-bold text-[11px] mr-1">เลือกประเภทเอกสาร:</span>
                {(['receipt', 'quotation', 'job_order', 'delivery'] as DocType[]).map((type) => {
                  const labels: Record<DocType, string> = {
                    receipt: 'ใบเสร็จรับเงิน',
                    quotation: 'ใบเสนอราคา',
                    job_order: 'ใบสั่งซ่อม',
                    delivery: 'ใบส่งมอบรถ',
                  };
                  const active = selectedDocType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedDocType(type)}
                      className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
                        active
                          ? 'bg-orange-500 text-black shadow-xs font-black'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {labels[type]}
                    </button>
                  );
                })}
              </div>

              {/* Copy Type & Zoom Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-800 rounded-md p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDocCopyType('original')}
                    className={`px-2 py-0.5 rounded font-bold ${
                      docCopyType === 'original'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    ต้นฉบับ
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocCopyType('copy')}
                    className={`px-2 py-0.5 rounded font-bold ${
                      docCopyType === 'copy'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    สำเนา
                  </button>
                </div>

                <div className="flex items-center gap-1 text-slate-400">
                  <button
                    type="button"
                    onClick={() => setZoomScale((prev) => Math.max(70, prev - 10))}
                    className="p-1 hover:text-white cursor-pointer"
                    title="ย่อขนาด"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[10px] w-9 text-center text-white">{zoomScale}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomScale((prev) => Math.min(130, prev + 10))}
                    className="p-1 hover:text-white cursor-pointer"
                    title="ขยายขนาด"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Success Toast */}
          {showSuccessToast && (
            <div className="bg-emerald-600 text-white text-center py-1.5 px-3 text-xs font-black border-b border-emerald-500 animate-in fade-in flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-white" />
              <span>{showSuccessToast}</span>
            </div>
          )}

          {/* DOCUMENT PREVIEW CONTAINER (SCROLLABLE ON SCREEN, CLEAN WHITE BACKGROUND) */}
          <div className="flex-1 overflow-y-auto bg-slate-900/90 p-2 sm:p-5 flex justify-center print:p-0 print:bg-white print:overflow-visible">
            
            {/* PRINTABLE DOCUMENT PAGE (Single Page A4 100% Fit, Spec-Compliant Palette) */}
            <div
              id="printable-document-content"
              style={{ transform: zoomScale !== 100 ? `scale(${zoomScale / 100})` : undefined, transformOrigin: 'top center' }}
              className="bg-white text-black w-full max-w-[210mm] min-h-[296mm] max-h-[297mm] p-5 sm:p-6 shadow-2xl border-2 border-slate-300 rounded-sm print:border-none print:shadow-none print:m-0 print:p-5 print:w-full print:max-w-none print:h-auto flex flex-col justify-between font-sans relative overflow-hidden"
            >
              
              <div className="space-y-1.5">
                {/* 1. เอกสาร (ส่วนหัว): ชื่อประเภทเอกสารสีกรมท่า/น้ำเงินเข้มเงาคมชัด, ช่องบริการแถบสีส้ม, เส้นคั่นสีกรมท่าลึก */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2.5 pb-1">
                  
                  {/* Left: Logo block: อู่สงกรานต์ (ช่างไมค์) */}
                  <div className="flex items-start gap-2">
                    <div className="border-2 border-orange-500 bg-white rounded-lg p-1.5 text-center min-w-[68px] shadow-xs">
                      <div className="font-black text-blue-950 text-sm tracking-tight leading-none mb-0.5">
                        อู่
                      </div>
                      <div className="font-black text-blue-950 text-sm tracking-tight leading-none mb-1">
                        สงกรานต์
                      </div>
                      <div className="bg-orange-500 text-black text-[9.5px] font-black px-1.5 py-0.5 rounded shadow-xs">
                        ช่างไมค์
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-[11px] text-black font-bold">
                        โทร: <strong className="font-mono text-black font-black">{phone}</strong>
                      </div>
                      <div className="text-[11px] text-black font-bold">
                        LINE: <strong className="text-emerald-700 font-black">{garageProfile.lineId || 'chaiwatmike'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Garage Name, Subtitle & Address */}
                  <div className="text-left sm:text-center flex-1 px-1 sm:px-2 space-y-0.5">
                    <h1 className="text-base sm:text-lg font-black text-blue-950 tracking-tight leading-tight">
                      อู่สงกรานต์ (ช่างไมค์)
                    </h1>
                    <h2 className="text-xs sm:text-sm font-black text-slate-800 leading-tight">
                      ศูนย์บริการและซ่อมบำรุงรถยนต์
                    </h2>
                    <p className="text-[10.5px] text-black font-bold leading-tight">
                      {garageProfile.address || '121/1 หมู่.2 ต.แม่งอน อ.ฝาง จ.เชียงใหม่ 50320'}
                    </p>
                    <div className="flex flex-wrap items-center justify-start sm:justify-center gap-2 pt-0.5 font-bold text-[10.5px] text-black">
                      <span>โทร: <strong className="text-black font-mono font-black">{phone}</strong> ({mechanicName})</span>
                      <span className="text-orange-500 font-black">•</span>
                      <span>LINE ID: <strong className="text-emerald-700 font-black">{garageProfile.lineId || 'chaiwatmike'}</strong></span>
                    </div>
                    <div className="text-[10.5px] text-black font-bold">
                      เลขประจำตัวผู้เสียภาษี: <strong className="font-mono text-black font-black">{garageProfile.taxId || '1500900176249'}</strong>
                    </div>
                  </div>

                  {/* Right: Document Heading Pill (สีกรมท่า/น้ำเงินเข้มเงาความคมชัด) & ช่องบริการ (แถบสีส้ม) */}
                  <div className="text-right shrink-0">
                    <span className="inline-block bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 text-white font-black text-xs px-4 py-1 rounded-full shadow-xs border-2 border-blue-700 mb-1">
                      {docHeaders.shortName}
                    </span>
                    <div className="text-[10.5px] text-black font-bold space-y-0.5">
                      <div>เลขที่เอกสาร: <strong className="font-mono text-black font-black">{job.jobNo}</strong></div>
                      <div>วันที่ออกเอกสาร: <strong className="text-black font-black">{formatThaiDate(job.createdAt)}</strong></div>
                      <div className="flex items-center justify-end gap-1 pt-0.5">
                        <span>ช่องบริการ:</span>
                        <span className="bg-orange-500 text-black px-2 py-0.2 rounded font-black text-[10px] border border-orange-600 shadow-xs">
                          ช่องซ่อม #{job.bayNumber || 1}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* เส้นคั่นเวลา: สีกรมท่าลึก เสริมความคมเข้ม */}
                <div className="border-b-2 border-blue-900 my-1"></div>

                {/* 2. ข้อมูลลูกค้า & ข้อมูลรถยนต์ (ลูกค้า & ยานพาหนะ) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  
                  {/* กล่องข้อมูลลูกค้า: สีดำ (แถบหัวสีดำเข้ม ไอคอนสีฟ้า ล้อมสีดำ ตัวหนังสือสีดำสนิท) */}
                  <div className="border-2 border-black rounded-lg overflow-hidden bg-white shadow-xs">
                    <div className="bg-neutral-950 text-white px-2.5 py-0.5 flex items-center justify-between border-b-2 border-black">
                      <span className="font-black flex items-center gap-1.5 uppercase tracking-wide text-xs">
                        <User className="w-3.5 h-3.5 text-sky-400" />
                        <span>ข้อมูลลูกค้า (CUSTOMER)</span>
                      </span>
                    </div>
                    <div className="p-2 space-y-0.5 text-black font-bold text-[11px]">
                      <div className="flex">
                        <span className="text-black font-bold w-18 shrink-0">ชื่อลูกค้า:</span>
                        <strong className="text-black font-black text-xs">{job.customerName}</strong>
                      </div>
                      <div className="flex">
                        <span className="text-black font-bold w-18 shrink-0">เบอร์โทร:</span>
                        <strong className="text-black font-mono font-black text-xs">{job.customerPhone}</strong>
                      </div>
                      <div className="flex">
                        <span className="text-black font-bold w-18 shrink-0">ที่อยู่:</span>
                        <span className="text-black">{job.customerAddress || 'แม่สูนหลวง'}</span>
                      </div>
                    </div>
                  </div>

                  {/* กล่องข้อมูลรถยนต์: โทนสีฟ้า (แถบหัวสีฟ้าสดใส ป้ายทะเบียนกรอบสีส้ม-ดำสะดุดตา ตัวหนังสือสีดำสนิท) */}
                  <div className="border-2 border-sky-500 rounded-lg overflow-hidden bg-white shadow-xs">
                    <div className="bg-gradient-to-r from-sky-700 via-sky-600 to-sky-700 text-white px-2.5 py-0.5 flex items-center justify-between border-b-2 border-sky-400">
                      <span className="font-black flex items-center gap-1.5 uppercase tracking-wide text-xs">
                        <Car className="w-3.5 h-3.5 text-white" />
                        <span>ข้อมูลรถยนต์ (VEHICLE INFORMATION)</span>
                      </span>
                      <span className="px-2 py-0.2 rounded bg-black text-orange-400 font-mono font-black text-xs border border-orange-500 shadow-xs">
                        {job.licensePlate}
                      </span>
                    </div>
                    <div className="p-2 space-y-0.5 text-black font-bold text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-black font-bold">ยี่ห้อ / รุ่น / ปี:</span>
                        <strong className="text-black font-black">{job.carBrand} {job.carModel} {job.carYear ? `(${job.carYear})` : ''}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black font-bold">เลขไมล์ / สี:</span>
                        <span className="text-black font-black">{job.mileage.toLocaleString()} กม. {job.carColor ? `• สี${job.carColor}` : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. กล่องวันที่รับรถ & บันทึกการส่งมอบ (วันที่) */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* วันที่รับรถ: กล่องโทนสีขาวพร้อมไอคอนปฏิทินสีฟ้า */}
                  <div className="border-2 border-slate-300 rounded-lg p-1.5 bg-white flex items-center gap-2 shadow-xs">
                    <div className="p-1 rounded-lg bg-sky-100 text-sky-600 border border-sky-200 shrink-0">
                      <Calendar className="w-4 h-4 text-sky-600" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-700 font-bold">วันที่รับรถเข้าอู่:</div>
                      <div className="text-xs font-black text-black font-mono">
                        {formatThaiDateTime(job.receivedDate || job.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* กำหนดการจัดส่ง: กล่องโทนสีขาวพร้อมไอคอนนาฬิกาสีส้ม */}
                  <div className="border-2 border-slate-300 rounded-lg p-1.5 bg-white flex items-center gap-2 shadow-xs">
                    <div className="p-1 rounded-lg bg-orange-100 text-orange-600 border border-orange-200 shrink-0">
                      <Clock className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-700 font-bold">กำหนดส่งมอบรถ:</div>
                      <div className="text-xs font-black text-black font-mono">
                        {formatThaiDateTime(job.estimatedCompletionDate || job.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. กล่องอาการที่แจ้ง (ขอบเขตงาน): สีขาว ตัวหนังสือสีดำหนาอ่านง่าย */}
                <div className="border-2 border-slate-300 rounded-lg p-1.5 bg-white text-xs shadow-xs space-y-0.5">
                  <div className="flex items-start gap-1.5">
                    <span className="font-black text-black shrink-0">อาการที่แจ้ง / งานที่ต้องการให้ดำเนินการ:</span>
                    <p className="text-black font-bold leading-snug">{job.issueDescription || '-'}</p>
                  </div>
                </div>

                {/* 5. ตารางรายการอะไหล่และค่าบริการ (ตารางรายการ) */}
                <div className="border-2 border-neutral-900 rounded-lg overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    {/* สีหัวตาราง: สีน้ำเงินเข้มตัดขอบล่างด้วยสีดำ */}
                    <thead className="bg-blue-950 text-white font-black border-b-2 border-black">
                      <tr>
                        <th className="py-2 px-2 text-center w-12 text-white font-black border-r border-blue-900">ลำดับ</th>
                        <th className="py-2 px-3 text-white font-black border-r border-blue-900">รายการอะไหล่ / ค่าบริการ</th>
                        <th className="py-2 px-2 text-center w-16 text-white font-black border-r border-blue-900">จำนวน</th>
                        <th className="py-2 px-3 text-right w-24 text-white font-black border-r border-blue-900">ราคา/หน่วย</th>
                        <th className="py-2 px-3 text-right w-28 text-white font-black">จำนวนเงิน (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 text-black bg-white font-black">
                      {(job.partsUsed || []).length === 0 && (job.laborFee || 0) === 0 && (
                        <tr>
                          <td colSpan={5} className="py-3 text-center text-black font-black italic">
                            ไม่มีรายการอะไหล่และค่าบริการในเอกสารนี้
                          </td>
                        </tr>
                      )}
                      
                      {/* แถวรายการอะไหล่: ตัวเลขและตัวหนังสือสีดำเข้มชัดเจน อ่านง่าย บนพื้นกระดาษขาว A4 */}
                      {(job.partsUsed || []).map((p, idx) => (
                        <tr key={p.partId || idx} className="bg-white">
                          <td className="py-1.5 px-2 text-center font-mono font-black border-r border-slate-300 text-black" style={{ color: '#000000' }}>
                            <span className="font-mono font-black text-black inline-block" style={{ color: '#000000' }}>{idx + 1}</span>
                          </td>
                          <td className="py-1.5 px-3 border-r border-slate-300 text-black">
                            <span className="font-black text-black block text-xs leading-snug">{p.partName}</span>
                            {p.partCode && (
                              <span className="text-[10px] text-black font-mono font-black block mt-0.5">
                                รหัส: {p.partCode}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono font-black text-xs border-r border-slate-300 text-black" style={{ color: '#000000' }}>{p.quantity}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-black text-xs border-r border-slate-300 text-black" style={{ color: '#000000' }}>
                            {(p.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-black text-xs text-black" style={{ color: '#000000' }}>
                            {(p.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}

                      {/* แถวค่าแรงช่าง: สำรวจด้วยแถบสีและป้ายสีขาว ตัวเลขสีดำเข้ม บนพื้นขาว */}
                      {(job.laborFee || 0) > 0 && (
                        <tr className="bg-white border-t border-slate-300">
                          <td className="py-1.5 px-2 text-center font-mono font-black text-black border-r border-slate-300" style={{ color: '#000000' }}>
                            {partsCount + 1}
                          </td>
                          <td className="py-1.5 px-3 border-r border-slate-300 font-black text-black">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-black text-xs">ค่าแรงและบริการซ่อมบำรุงตรวจเช็ค</span>
                              <span className="bg-white text-black border border-slate-400 px-1.5 py-0.2 rounded font-black text-[9.5px] shadow-xs">
                                ค่าแรงช่าง
                              </span>
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono font-black text-black text-xs border-r border-slate-300" style={{ color: '#000000' }}>
                            1
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-black text-black text-xs border-r border-slate-300" style={{ color: '#000000' }}>
                            {(job.laborFee || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-black text-black text-xs" style={{ color: '#000000' }}>
                            {(job.laborFee || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )}

                      {/* แถวค่าบริการอื่นๆ: ตรวจสอบด้วยแถบสีและป้ายสีส้ม ตัวเลขสีดำเข้ม บนพื้นขาว */}
                      {(job.otherFee || 0) > 0 && (
                        <tr className="bg-white border-t border-slate-300">
                          <td className="py-1.5 px-2 text-center font-mono font-black text-black border-r border-slate-300" style={{ color: '#000000' }}>
                            {partsCount + ((job.laborFee || 0) > 0 ? 2 : 1)}
                          </td>
                          <td className="py-1.5 px-3 border-r border-slate-300 font-black text-black">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-black text-xs">ค่าบริการอื่นๆ / เบ็ดเตล็ด</span>
                              <span className="bg-orange-500 text-black px-1.5 py-0.2 rounded font-black text-[9.5px] shadow-xs">
                                อื่นๆ
                              </span>
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono font-black text-black text-xs border-r border-slate-300" style={{ color: '#000000' }}>
                            1
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-black text-black text-xs border-r border-slate-300" style={{ color: '#000000' }}>
                            {(job.otherFee || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-black text-black text-xs" style={{ color: '#000000' }}>
                            {(job.otherFee || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 6. ความคืบหน้า & การชำระเงิน & สรุปทางการเงิน */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5 text-xs">
                  
                  {/* Left Column: พร้อมเพย์ QR Code (โทนสีน้ำเงินพร้อมหัวข้อสีกรมท่า) & เงื่อนไขการรับประกัน (โทนสีชมพู) */}
                  <div className="space-y-1.5">
                    
                    {/* พร้อมเพย์ QR Code: การ์ดโทนสีน้ำเงินพร้อมหัวข้อสีกรมท่า */}
                    <div className="border-2 border-blue-600 rounded-lg p-2 bg-blue-50/40 flex items-center gap-2.5 shadow-xs">
                      {/* QR Box */}
                      <div className="w-18 h-18 p-1 bg-white border border-blue-300 rounded shrink-0 flex flex-col items-center justify-center">
                        <div className="w-14 h-14 flex items-center justify-center overflow-hidden">
                          {qrCodeUrl ? (
                            <img
                              src={qrCodeUrl}
                              alt="พร้อมเพย์ QR"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <QrCode className="w-12 h-12 text-blue-800" />
                          )}
                        </div>
                        <span className="text-[9px] text-blue-950 font-black mt-0.5">
                          พร้อมเพย์ (QR)
                        </span>
                      </div>

                      {/* Bank Details Text */}
                      <div className="space-y-0.5 text-[10.5px] leading-tight text-black font-bold">
                        <div className="bg-blue-950 text-white px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1 w-fit mb-0.5 shadow-xs">
                          <QrCode className="w-3 h-3 text-sky-300" />
                          <span>ชำระเงินผ่าน พร้อมเพย์</span>
                        </div>
                        <div>
                          เลขพร้อมเพย์: <strong className="font-mono font-black text-black text-xs">{garageProfile.promptPayId || phone}</strong>
                        </div>
                        <div>
                          ชื่อบัญชี: <strong className="font-black text-black">{garageProfile.bankAccountName || 'นายชัยวัฒน์ วงค์ตา (อู่สงกรานต์ Service)'}</strong>
                        </div>
                        <div className="text-black">
                          {garageProfile.bankName || 'ธนาคารกสิกรไทย (KBANK)'} เลขที่ <strong className="font-mono font-black text-black">{garageProfile.bankAccountNumber || garageProfile.bankAccount || '103-2-19120-5 กสิกร'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* เงื่อนไขการรับประกัน: ข้อความและเนื้อหาโทนสีชมพู */}
                    <div className="border-2 border-pink-400 rounded-lg p-1.5 bg-pink-50/80 text-[9.5px] text-black font-bold leading-tight shadow-xs flex items-start gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-pink-600 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-pink-900 font-black">เงื่อนไขการรับประกัน:</strong> {garageProfile.warrantyTerms || 'รับประกันงานซ่อม/อะไหล่แท้ 3 เดือน หรือ 10000 กม. (อย่างใดอย่างหนึ่งถึงก่อน) รับประกันตามเงื่อนไขของผู้ผลิต(เท่านั้น)'}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: สรุปยอดเงิน (สีดำเข้ม พร้อมกล่องยอดเงินสุทธิสีส้มตัวเลขสีดำขนาดใหญ่ ในส่วนลดพิเศษแสดงด้วยสีแดงเข้ม) */}
                  <div className="border-2 border-neutral-900 rounded-lg p-2 bg-white space-y-1 text-xs text-black font-bold shadow-xs">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-black font-bold">รวมค่าอะไหล่ ({(job.partsUsed || []).length} รายการ):</span>
                      <span className="font-mono font-black text-black">
                        ฿{financials.partsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-black font-bold">ค่าบริการ / ค่าแรง:</span>
                      <span className="font-mono font-black text-black">
                        ฿{financials.laborFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {financials.discountAmount > 0 && (
                      <div className="flex justify-between items-center text-red-600 font-black text-[11px]">
                        <span>ส่วนลดพิเศษ:</span>
                        <span className="font-mono">
                          -฿{financials.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-black font-bold text-[11px]">
                      <span>ภาษีมูลค่าเพิ่ม VAT {financials.vatPercent}%:</span>
                      <span className="font-mono font-black text-black">
                        ฿{financials.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="border-t-2 border-slate-200 my-0.5"></div>

                    {/* กล่องยอดเงินสุทธิทั้งสิ้น: สีส้มสะดุดตา ตัวเลขสีดำขนาดใหญ่ */}
                    <div className="bg-orange-100 border-2 border-orange-500 p-2 rounded-lg flex justify-between items-center shadow-xs">
                      <span className="font-black text-black text-xs uppercase tracking-wide">
                        ยอดเงินสุทธิทั้งสิ้น:
                      </span>
                      <span className="font-mono font-black text-xl text-black">
                        ฿{financials.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 7. ช่องเขียน (ลายเซ็น): ฝั่งลูกค้าไม่ใช้โทนสี, ฝั่งผู้ตรวจเช็คไม่ใช้พื้นหลัง วางพอดีกับหน้ากระดาษ A4 ในแผ่นเดียว 100% */}
              <div className="grid grid-cols-2 gap-4 pt-2 pb-0.5 text-xs">
                
                {/* ฝั่งลูกค้า: ไม่ใช้โทนสี (คลีน พื้นหลังขาว กรอบเรียบ) */}
                <div className="border-2 border-slate-300 rounded-lg p-1.5 text-center bg-white shadow-xs space-y-1">
                  <span className="font-black text-black bg-slate-100 py-0.5 px-2.5 rounded text-[9.5px] inline-block border border-slate-300">
                    ผู้สั่งซ่อม / ลูกค้า
                  </span>
                  <div className="pt-1.5">
                    <div className="border-b-2 border-dotted border-slate-400 w-3/4 mx-auto mb-1"></div>
                    <p className="font-black text-black text-[11px] leading-tight">( {job.customerName} )</p>
                    <p className="text-[9.5px] text-black font-bold mt-0.5">ผู้สั่งซ่อม / ลูกค้า</p>
                    <p className="text-[9.5px] text-black font-bold mt-0.5">วันที่ ........ / ........ / ................</p>
                  </div>
                </div>

                {/* ฝั่งผู้ตรวจสอบ/ผู้ตรวจเช็ค: ไม่ใช้พื้นหลัง (คลีน พื้นหลังขาว กรอบเรียบ) */}
                <div className="border-2 border-slate-300 rounded-lg p-1.5 text-center bg-white shadow-xs space-y-1">
                  <span className="font-black text-black bg-slate-100 py-0.5 px-2.5 rounded text-[9.5px] inline-block border border-slate-300">
                    ผู้ตรวจเช็ค / ผู้มีอำนาจลงนาม
                  </span>
                  <div className="pt-1.5">
                    <div className="border-b-2 border-dotted border-slate-400 w-3/4 mx-auto mb-1"></div>
                    <p className="font-black text-black text-[11px] leading-tight">( .................................................. )</p>
                    <p className="text-[9.5px] text-black font-bold mt-0.5">ผู้ตรวจเช็ค / ช่างผู้รับผิดชอบ / อู่สงกรานต์</p>
                    <p className="text-[9.5px] text-black font-bold mt-0.5">วันที่ ........ / ........ / ................</p>
                  </div>
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

import React, { useState, useEffect } from 'react';
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
  Share2
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { JobOrder } from '../types';
import { exportElementToPdf, printElementViaIframe } from '../services/pdfService';
import { GarageLogo } from './GarageLogo';
import { LineNotificationModal } from './LineNotificationModal';
import { calculateJobBreakdown, formatThaiDateTime, formatThaiDate } from '../utils/jobCalculator';

interface PrintDocumentModalProps {
  job: JobOrder | null;
  docType: 'job_order' | 'quotation' | 'receipt';
  isOpen: boolean;
  onClose: () => void;
}

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({
  job,
  docType: initialDocType,
  isOpen,
  onClose,
}) => {
  const { garageProfile } = useGarage();
  const [selectedDocType, setSelectedDocType] = useState<'job_order' | 'quotation' | 'receipt'>(initialDocType);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(100);

  useEffect(() => {
    if (isOpen) {
      setSelectedDocType(initialDocType);
      setShowSuccessToast(null);
    }
  }, [isOpen, initialDocType]);

  if (!isOpen || !job) return null;

  const triggerToast = (msg: string) => {
    setShowSuccessToast(msg);
    setTimeout(() => {
      setShowSuccessToast(null);
    }, 3500);
  };

  const handlePrint = () => {
    setIsPrinting(true);
    const docName = selectedDocType === 'job_order' ? 'ใบสั่งซ่อม' : selectedDocType === 'quotation' ? 'ใบเสนอราคา' : 'ใบเสร็จรับเงิน';
    const title = `[อู่สงกรานต์]-${docName}-${job.jobNo}-${job.licensePlate}`;
    
    // 1-Click isolated iframe print
    const success = printElementViaIframe('printable-document-content', title);
    setTimeout(() => {
      setIsPrinting(false);
      if (success) {
        triggerToast('🖨️ ส่งคำสั่งพิมพ์เอกสาร A4 เรียบร้อยแล้ว');
      }
    }, 500);
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    const docName = selectedDocType === 'job_order' ? 'ใบสั่งซ่อม' : selectedDocType === 'quotation' ? 'ใบเสนอราคา' : 'ใบเสร็จรับเงิน';
    const filename = `[อู่สงกรานต์]-${docName}-${job.jobNo}-${job.licensePlate.replace(/\s+/g, '_')}.pdf`;
    
    const success = await exportElementToPdf('printable-document-content', { filename });
    setIsExportingPdf(false);
    if (success) {
      triggerToast(`📥 ดาวน์โหลดไฟล์ ${filename} เรียบร้อยแล้ว!`);
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
    }
  };

  const getDocShortName = () => {
    switch (selectedDocType) {
      case 'job_order': return 'ใบสั่งซ่อม';
      case 'quotation': return 'ใบเสนอราคา';
      case 'receipt': return 'ใบเสร็จรับเงิน';
    }
  };

  const financials = calculateJobBreakdown({
    parts: job.partsUsed || [],
    laborFee: job.laborFee || 0,
    otherFee: job.otherFee || 0,
    discount: job.discount || 0,
    discountType: job.discountType || 'amount',
    discountPercent: job.discountPercent || 0,
    enableVat: (job.vatPercent ?? 7) > 0,
    vatPercent: job.vatPercent ?? 7,
    depositAmount: job.depositAmount || job.paidAmount || 0,
  });

  const phone = garageProfile.mechanicPhone || garageProfile.phone || '061-069-2036';
  const mechanicName = garageProfile.mechanicName || 'ช่างไมค์';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white animate-in fade-in">
        
        {/* Container */}
        <div className="bg-[#16191D] border border-[#2D3135] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-4 print:border-none print:shadow-none print:bg-white print:m-0 print:w-full print:max-w-none flex flex-col max-h-[95vh]">
          
          {/* Screen Controls Header (Hidden during Print) */}
          <div className="p-4 bg-gradient-to-r from-[#1C2025] to-[#14171A] border-b border-[#2D3135] print:hidden space-y-3 shrink-0">
            
            {/* Top Bar: Title & Primary 1-Click Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>พิมพ์ & ส่งออกเอกสาร PDF</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono">
                      {job.jobNo}
                    </span>
                  </h2>
                  <p className="text-xs text-gray-400">
                    กดปุ่มเดียวเพื่อบันทึกเป็น PDF หรือพิมพ์ขนาด A4 อัตโนมัติ
                  </p>
                </div>
              </div>

              {/* 1-Click Actions Group */}
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

                {/* 1-Click Print Button */}
                <button
                  type="button"
                  disabled={isPrinting}
                  onClick={handlePrint}
                  className="px-3.5 py-2 rounded-xl bg-[#0F1113] hover:bg-[#20252A] text-gray-100 border border-[#2D3135] hover:border-orange-500/50 font-bold text-xs sm:text-sm flex items-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
                  title="สั่งพิมพ์เอกสาร A4 คมชัดทันที"
                >
                  <Printer className="w-4 h-4 text-orange-400" />
                  <span>{isPrinting ? 'กำลังส่งพิมพ์...' : '🖨️ พิมพ์เอกสาร'}</span>
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

            {/* Document Type Selector Tabs (1-Click Switch) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#2D3135]/60 text-xs">
              <div className="flex items-center gap-1.5 bg-[#0F1113] p-1 rounded-xl border border-[#2D3135]">
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
              </div>

              {/* Toast & Zoom */}
              <div className="flex items-center gap-2">
                {showSuccessToast && (
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1 animate-in fade-in">
                    <Check className="w-3.5 h-3.5" />
                    <span>{showSuccessToast}</span>
                  </span>
                )}

                <div className="hidden sm:flex items-center gap-1 bg-[#0F1113] px-2 py-1 rounded-lg border border-[#2D3135] text-gray-400 text-[11px]">
                  <span>ขนาด A4 100%</span>
                </div>
              </div>
            </div>

          </div>

          {/* Printable Paper Area (A4 layout styling with pure white background) */}
          <div className="overflow-y-auto flex-1 p-3 sm:p-6 bg-[#0B0C0E] print:p-0 print:bg-white flex justify-center">
            
            <div
              id="printable-document-content"
              className="w-full max-w-[210mm] bg-white text-slate-900 p-8 sm:p-10 space-y-5 rounded-lg shadow-xl print:shadow-none print:rounded-none print:p-4 print:space-y-3 print:text-black min-h-[297mm]"
            >
              
              {/* Document Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 gap-4">
                <div className="flex items-start gap-4">
                  <GarageLogo variant="print" />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                      {garageProfile.garageName || 'อู่สงกรานต์ (ช่างไมค์)'}
                    </h1>
                    <p className="text-xs text-slate-700 mt-1 max-w-md leading-relaxed">
                      {garageProfile.address || '88/9 หมู่ 5 ถนนกาญจนาภิเษก แขวงบางแคเหนือ เขตบางแค กรุงเทพฯ 10160'}
                    </p>
                    <p className="text-xs text-slate-800 mt-1 flex items-center gap-3">
                      <span>โทร: <strong className="text-slate-950 font-bold">{phone}</strong> ({mechanicName})</span>
                      <span>•</span>
                      <span>LINE ID: <strong className="text-emerald-700">{garageProfile.lineId || 'chaiwatmike'}</strong></span>
                    </p>
                    <p className="text-xs text-slate-700 font-mono mt-0.5">
                      เลขประจำตัวผู้เสียภาษี: <strong>{garageProfile.taxId}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-3.5 py-1 bg-slate-900 text-amber-300 font-black text-xs uppercase rounded-md mb-2 tracking-wide">
                    {getDocShortName()}
                  </span>
                  <p className="text-xs text-slate-600 font-mono">
                    เลขที่เอกสาร: <strong className="text-slate-950 text-sm">{job.jobNo}</strong>
                  </p>
                  <p className="text-xs text-slate-600">
                    วันที่ออกเอกสาร: <strong>{formatThaiDate(job.createdAt)}</strong>
                  </p>
                  <p className="text-xs text-slate-600">
                    ช่องซ่อม: <strong>ช่อง #{job.bayNumber || '-'}</strong>
                  </p>
                </div>
              </div>

              {/* Customer & Vehicle Info Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-300 bg-slate-50 text-xs">
                <div>
                  <span className="font-bold text-slate-800 uppercase block mb-1 text-[11px] border-b border-slate-300 pb-1">
                    ข้อมูลลูกค้า (Customer)
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{job.customerName}</p>
                  <p className="text-slate-700 mt-0.5">โทรศัพท์: <strong className="text-slate-950">{job.customerPhone}</strong></p>
                  <p className="text-slate-700">ที่อยู่: {job.customerAddress || '-'}</p>
                </div>

                <div>
                  <span className="font-bold text-slate-800 uppercase block mb-1 text-[11px] border-b border-slate-300 pb-1">
                    ข้อมูลรถยนต์ (Vehicle Information)
                  </span>
                  <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>ทะเบียน:</span>
                    <span className="bg-amber-200 px-2 py-0.5 rounded text-slate-950 font-black text-xs font-mono border border-amber-300">
                      {job.licensePlate}
                    </span>
                  </p>
                  <p className="text-slate-700 mt-0.5">
                    ยี่ห้อ/รุ่น: <strong>{job.carBrand} {job.carModel}</strong> {job.carYear ? `(${job.carYear})` : ''}
                  </p>
                  <p className="text-slate-700">
                    เลขไมล์: <strong>{job.mileage.toLocaleString()} กม.</strong> • สี: {job.carColor || '-'}
                  </p>
                </div>
              </div>

              {/* Dates Tracker Box (Received Date & Delivery Date) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <span className="text-slate-600 block text-[11px]">วันที่รับรถเข้าอู่:</span>
                    <strong className="text-slate-900 font-mono">
                      {formatThaiDateTime(job.receivedDate || job.createdAt)}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <span className="text-slate-600 block text-[11px]">กำหนดส่งมอบรถ:</span>
                    <strong className="text-slate-900 font-mono">
                      {formatThaiDateTime(job.estimatedCompletionDate)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Job Description & Inspection */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-300 text-xs space-y-1.5">
                <span className="font-bold text-slate-800 block">อาการที่แจ้ง / งานที่ต้องการให้ดำเนินการ:</span>
                <p className="text-slate-900 font-medium leading-relaxed">{job.issueDescription}</p>
                {job.technicianNotes && (
                  <p className="text-slate-700 italic pt-1 border-t border-slate-200">
                    บันทึกผลการตรวจเช็คของช่าง: {job.technicianNotes} (ช่างผู้ดูแล: <strong>{job.mechanicName || mechanicName}</strong>)
                  </p>
                )}
              </div>

              {/* Table of Items */}
              <div className="overflow-hidden border border-slate-300 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <tr>
                      <th className="px-3 py-2 w-10 text-center">ลำดับ</th>
                      <th className="px-3 py-2">รายการอะไหล่ / ค่าบริการ</th>
                      <th className="px-3 py-2 text-center w-20">จำนวน</th>
                      <th className="px-3 py-2 text-right w-28">ราคา/หน่วย</th>
                      <th className="px-3 py-2 text-right w-28">จำนวนเงิน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {job.partsUsed.length === 0 && job.laborFee === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-slate-500 italic">
                          ไม่มีรายการอะไหล่และค่าบริการ
                        </td>
                      </tr>
                    )}
                    {job.partsUsed.map((p, idx) => (
                      <tr key={p.partId}>
                        <td className="px-3 py-2 text-center">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <span className="font-semibold">{p.partName}</span>
                          <span className="text-[10px] text-slate-500 block font-mono">{p.partCode}</span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono">{p.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono">{p.unitPrice.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-semibold font-mono">{p.totalPrice.toLocaleString()}</td>
                      </tr>
                    ))}
                    
                    {/* Labor Row */}
                    {job.laborFee > 0 && (
                      <tr>
                        <td className="px-3 py-2 text-center">{job.partsUsed.length + 1}</td>
                        <td className="px-3 py-2 font-semibold">ค่าแรงช่างและบริการซ่อมบำรุงตรวจเช็ค</td>
                        <td className="px-3 py-2 text-center font-mono">1</td>
                        <td className="px-3 py-2 text-right font-mono">{job.laborFee.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-semibold font-mono">{job.laborFee.toLocaleString()}</td>
                      </tr>
                    )}

                    {/* Other Fee Row */}
                    {(job.otherFee || 0) > 0 && (
                      <tr>
                        <td className="px-3 py-2 text-center">{job.partsUsed.length + (job.laborFee > 0 ? 2 : 1)}</td>
                        <td className="px-3 py-2 font-semibold">
                          ค่าบริการอื่นๆ / ค่าซับนอก {job.otherFeeDescription ? `(${job.otherFeeDescription})` : ''}
                        </td>
                        <td className="px-3 py-2 text-center font-mono">1</td>
                        <td className="px-3 py-2 text-right font-mono">{job.otherFee?.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-semibold font-mono">{job.otherFee?.toLocaleString()}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Summary & Payment Info */}
              <div className="flex justify-between items-start text-xs pt-1 gap-4 flex-wrap sm:flex-nowrap">
                <div className="max-w-xs space-y-2">
                  {/* PromptPay & Bank Details */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-300 space-y-1">
                    <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-slate-800" />
                      <span>ช่องทางชำระเงิน พร้อมเพย์ (PromptPay)</span>
                    </span>
                    <p className="text-slate-800">
                      เลขพร้อมเพย์: <strong className="text-slate-950 font-mono">{garageProfile.promptPayId || phone}</strong>
                    </p>
                    <p className="text-slate-700">
                      ชื่อบัญชี: <strong>{garageProfile.bankAccountName || 'อู่สงกรานต์ (ช่างไมค์)'}</strong>
                    </p>
                    <p className="text-slate-600 text-[11px]">
                      {garageProfile.bankName} เลขที่ {garageProfile.bankAccountNumber || garageProfile.bankAccount}
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    🛡️ <strong>เงื่อนไขการรับประกัน:</strong> {garageProfile.warrantyTerms || garageProfile.terms}
                  </p>
                </div>

                <div className="w-full sm:w-80 space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-300 text-slate-800">
                  <div className="flex justify-between">
                    <span>รวมค่าอะไหล่ ({job.partsUsed.length} รายการ):</span>
                    <span className="font-mono">฿{financials.partsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ค่าบริการ / ค่าแรง:</span>
                    <span className="font-mono">฿{financials.laborFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  {financials.otherFee > 0 && (
                    <div className="flex justify-between">
                      <span>ค่าบริการอื่นๆ:</span>
                      <span className="font-mono">฿{financials.otherFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {financials.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>
                        ส่วนลดพิเศษ {financials.discountType === 'percent' ? `(${financials.discountPercent}%)` : ''}:
                      </span>
                      <span className="font-mono">-฿{financials.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-1 text-slate-600">
                    <span>ภาษีมูลค่าเพิ่ม VAT {financials.vatPercent}%:</span>
                    <span className="font-mono">฿{financials.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-slate-900 pt-2 font-black text-base text-slate-950">
                    <span>ยอดเงินสุทธิทั้งสิ้น:</span>
                    <span className="font-mono">฿{financials.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>

                  {financials.depositAmount > 0 && (
                    <>
                      <div className="flex justify-between text-amber-800 font-bold border-t border-slate-200 pt-1">
                        <span>เงินมัดจำรับแล้ว:</span>
                        <span className="font-mono">฿{financials.depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-slate-950 font-black text-sm bg-amber-100 p-1.5 rounded border border-amber-300">
                        <span>คงเหลือชำระ:</span>
                        <span className="font-mono text-amber-900">฿{financials.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-12 pt-6 text-xs text-center">
                <div>
                  <div className="border-b border-slate-400 pb-1 mb-2"></div>
                  <p className="font-bold text-slate-800">ลงชื่อ .....................................................</p>
                  <p className="text-slate-700 mt-1">( {job.customerName} )</p>
                  <p className="text-[11px] text-slate-500">ผู้สั่งซ่อม / ลูกค้า</p>
                </div>

                <div>
                  <div className="border-b border-slate-400 pb-1 mb-2"></div>
                  <p className="font-bold text-slate-800">ลงชื่อ .....................................................</p>
                  <p className="text-slate-700 mt-1">( {job.mechanicName || mechanicName} )</p>
                  <p className="text-[11px] text-slate-500">ผู้ตรวจเช็ค / ช่างผู้รับผิดชอบ / อู่สงกรานต์</p>
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
          initialTemplate={selectedDocType === 'job_order' ? 'intake' : selectedDocType === 'quotation' ? 'status' : 'completed'}
        />
      )}
    </>
  );
};

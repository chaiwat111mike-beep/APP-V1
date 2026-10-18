import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Phone,
  FileText,
  AlertTriangle,
  UserCheck,
  QrCode,
  Laptop,
  Smartphone,
  CheckCircle2,
  Info,
  CheckCheck
} from 'lucide-react';
import QRCode from 'qrcode';
import { useGarage } from '../context/GarageContext';
import { JobOrder } from '../types';
import {
  DEFAULT_LINE_ID,
  DEFAULT_LINE_URL,
  DEFAULT_MECHANIC_PHONE,
  generateJobIntakeMessage,
  generateJobStatusUpdateMessage,
  generateJobCompletedMessage,
  generateJobIntakeConcise,
  generateJobStatusUpdateConcise,
  generateJobCompletedConcise,
  getDirectLineUrl,
  getLineShareUrl,
  getLineAppProtocolUrl,
  openLineShare,
  copyToClipboard
} from '../services/lineService';

interface LineNotificationModalProps {
  job: JobOrder | null;
  isOpen: boolean;
  onClose: () => void;
  initialTemplate?: 'intake' | 'status' | 'completed';
}

export const LineNotificationModal: React.FC<LineNotificationModalProps> = ({
  job,
  isOpen,
  onClose,
  initialTemplate = 'status',
}) => {
  const { garageProfile, customers } = useGarage();
  const [templateType, setTemplateType] = useState<'intake' | 'status' | 'completed'>(initialTemplate);
  const [messageMode, setMessageMode] = useState<'concise' | 'full'>('concise');
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [showMobileQr, setShowMobileQr] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Find matching customer from phone or name
  const matchedCustomer = job
    ? customers.find(
        (c) =>
          (job.customerPhone && (c.phone || '').replace(/\D/g, '') === (job.customerPhone || '').replace(/\D/g, '')) ||
          (!!c.name && !!job.customerName && (c.name || '').trim().toLowerCase() === (job.customerName || '').trim().toLowerCase())
      )
    : undefined;

  const customerLineId = matchedCustomer?.lineId;

  // Generate message based on template & mode
  useEffect(() => {
    if (!job) return;

    if (messageMode === 'concise') {
      if (templateType === 'intake') {
        setMessageText(generateJobIntakeConcise(job, garageProfile));
      } else if (templateType === 'status') {
        setMessageText(generateJobStatusUpdateConcise(job, garageProfile));
      } else if (templateType === 'completed') {
        setMessageText(generateJobCompletedConcise(job, garageProfile));
      }
    } else {
      if (templateType === 'intake') {
        setMessageText(generateJobIntakeMessage(job, garageProfile));
      } else if (templateType === 'status') {
        setMessageText(generateJobStatusUpdateMessage(job, garageProfile));
      } else if (templateType === 'completed') {
        setMessageText(generateJobCompletedMessage(job, garageProfile));
      }
    }
  }, [job, templateType, messageMode, garageProfile]);

  // Generate mobile QR code for sharing if requested
  useEffect(() => {
    if (showMobileQr && messageText) {
      const shareUrl = getLineShareUrl(messageText);
      QRCode.toDataURL(shareUrl, {
        margin: 2,
        width: 220,
        color: { dark: '#000000', light: '#FFFFFF' },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((e) => console.warn('QR code generation failed', e));
    }
  }, [showMobileQr, messageText]);

  if (!isOpen || !job) return null;

  const handleCopy = async () => {
    const ok = await copyToClipboard(messageText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenLineShare = async (mode: 'web' | 'app' | 'auto' = 'auto') => {
    setIsSending(true);
    try {
      const res = await openLineShare(messageText, { mode });
      if (res.copied) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to open LINE share:', err);
    } finally {
      setIsSending(false);
    }
  };

  const directLineChatUrl = garageProfile.lineDirectUrl || getDirectLineUrl(garageProfile.lineId || DEFAULT_LINE_ID);
  const customerDirectChatUrl = customerLineId ? getDirectLineUrl(customerLineId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-[#16191D] border border-[#2D3135] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-4 sm:my-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-[#1A1D21] to-[#121417] border-b border-[#2D3135]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#06C755] text-white flex items-center justify-center shadow-lg shadow-[#06C755]/20">
              <MessageSquare className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                <span>ส่งข้อความแจ้งเตือนผ่าน LINE</span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#06C755]/20 text-[#06C755] border border-[#06C755]/30">
                  LINE ID ช่างไมค์: {garageProfile.lineId || DEFAULT_LINE_ID}
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                แจ้งเตือนลูกค้า: <strong className="text-gray-200">{job.customerName}</strong> ({job.licensePlate})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#0F1113] border border-[#2D3135] text-gray-400 hover:text-white transition-colors"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs">
          
          {/* Template Selector Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-300 font-bold">เลือกรูปแบบข้อความแจ้งเตือน:</label>
              
              {/* Length Mode Toggle */}
              <div className="flex items-center bg-[#0F1113] p-0.5 rounded-lg border border-[#2D3135]">
                <button
                  type="button"
                  onClick={() => setMessageMode('concise')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    messageMode === 'concise'
                      ? 'bg-[#06C755] text-white font-bold shadow'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title="ข้อความกระชับ ส่งเข้าแอป LINE ได้ทันที 100%"
                >
                  ⚡ แบบกระชับ (ส่งไว)
                </button>
                <button
                  type="button"
                  onClick={() => setMessageMode('full')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    messageMode === 'full'
                      ? 'bg-orange-500 text-white font-bold shadow'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title="ข้อความละเอียดเต็มรูปแบบ"
                >
                  📄 แบบละเอียด
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTemplateType('intake')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  templateType === 'intake'
                    ? 'bg-[#06C755]/15 border-[#06C755] text-white font-bold shadow-md'
                    : 'bg-[#0F1113] border-[#2D3135] text-gray-400 hover:border-gray-500 hover:text-gray-200'
                }`}
              >
                <div className="text-xs">🚗 1. รับรถเข้าอู่</div>
                <div className="text-[10px] text-gray-400 mt-0.5">เปิดใบสั่งซ่อม</div>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('status')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  templateType === 'status'
                    ? 'bg-[#06C755]/15 border-[#06C755] text-white font-bold shadow-md'
                    : 'bg-[#0F1113] border-[#2D3135] text-gray-400 hover:border-gray-500 hover:text-gray-200'
                }`}
              >
                <div className="text-xs">🔧 2. อัปเดตงานซ่อม</div>
                <div className="text-[10px] text-gray-400 mt-0.5">สถานะ & อะไหล่</div>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('completed')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  templateType === 'completed'
                    ? 'bg-[#06C755]/15 border-[#06C755] text-white font-bold shadow-md'
                    : 'bg-[#0F1113] border-[#2D3135] text-gray-400 hover:border-gray-500 hover:text-gray-200'
                }`}
              >
                <div className="text-xs">🏁 3. ซ่อมเสร็จ/รับรถ</div>
                <div className="text-[10px] text-gray-400 mt-0.5">สรุปยอด & พร้อมเพย์</div>
              </button>
            </div>
          </div>

          {/* Editable Message Textarea with LINE-style styling */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <label className="text-gray-300 font-bold flex items-center gap-1.5">
                <span>ข้อความที่จะส่งไปยัง LINE:</span>
                <span className="text-[10px] text-gray-400 font-normal">({messageText.length} ตัวอักษร)</span>
              </label>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMobileQr(!showMobileQr)}
                  className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                  title="สแกนด้วยมือถือเพื่อส่ง LINE"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{showMobileQr ? 'ซ่อน QR ส่งผ่านมือถือ' : 'สแกน QR ผ่านมือถือ'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-xs text-[#06C755] hover:underline flex items-center gap-1 font-semibold"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'คัดลอกสำเร็จแล้ว!' : 'คัดลอกข้อความ'}</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                rows={9}
                value={messageText || ''}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full p-3.5 bg-[#0D0F12] border border-[#2D3135] rounded-xl text-gray-200 text-xs font-sans focus:outline-none focus:border-[#06C755] focus:ring-1 focus:ring-[#06C755] leading-relaxed transition-all"
                placeholder="ระบุข้อความที่ต้องการส่งผ่าน LINE..."
              />
            </div>
          </div>

          {/* Optional Mobile QR Scan Drawer */}
          {showMobileQr && (
            <div className="p-4 bg-[#0F1113] border border-[#06C755]/30 rounded-xl flex flex-col sm:flex-row items-center gap-4 animate-in fade-in">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="Scan to send LINE"
                  className="w-28 h-28 bg-white p-2 rounded-lg shadow-md border border-gray-200 shrink-0"
                />
              ) : (
                <div className="w-28 h-28 bg-black/40 rounded-lg flex items-center justify-center text-gray-500">
                  กำลังสร้าง QR...
                </div>
              )}
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="flex items-center gap-1.5 font-bold text-white text-xs justify-center sm:justify-start">
                  <Smartphone className="w-4 h-4 text-[#06C755]" />
                  <span>สแกนด้วยกล้องมือถือ เพื่อส่งผ่าน LINE ในโทรศัพท์</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  หากใช้งานผ่านคอมพิวเตอร์ที่ไม่ได้ล็อกอิน LINE ไว้ สามารถเปิดกล้องโทรศัพท์สแกน QR Code นี้เพื่อเปิดแอป LINE บนมือถือแล้วเลือกเพื่อนหรือลูกค้าเพื่อส่งข้อความนี้ได้ทันที
                </p>
              </div>
            </div>
          )}

          {/* Quick Contact & Customer Info Bar */}
          <div className="p-3 bg-[#0F1113] border border-[#2D3135] rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#06C755] animate-pulse"></span>
              <span className="text-gray-300">
                ลูกค้า: <strong className="text-white">{job.customerName}</strong> ({job.customerPhone})
              </span>
              {customerLineId && (
                <span className="text-[11px] font-mono text-[#06C755] bg-[#06C755]/10 px-2 py-0.5 rounded border border-[#06C755]/30">
                  LINE: @{customerLineId}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {customerDirectChatUrl && (
                <a
                  href={customerDirectChatUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#06C755] hover:underline flex items-center gap-1 font-bold text-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>แชทตรงกับลูกค้า</span>
                </a>
              )}

              <a
                href={directLineChatUrl}
                target="_blank"
                rel="noreferrer"
                className="text-gray-400 hover:text-[#06C755] flex items-center gap-1 text-xs"
              >
                <span>LINE อู่ ({garageProfile.lineId || DEFAULT_LINE_ID})</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Send Success Banner Notice */}
          {sendSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-[11px] leading-tight">
                <strong>คัดลอกข้อความแล้ว และเปิดแอป LINE เรียบร้อย!</strong>
                <p className="text-emerald-400/80 text-[10px] mt-0.5">
                  เลือกผู้รับใน LINE แล้วกดส่งได้ทันที (หรือกด Ctrl+V / วางข้อความเพื่อส่งฉบับเต็ม)
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-[#121417] border-t border-[#2D3135] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1C2025] hover:bg-[#252A30] text-gray-300 text-xs font-semibold transition-colors"
            >
              ปิดหน้าต่าง
            </button>

            {/* Direct LINE PC app scheme option */}
            <button
              type="button"
              onClick={() => handleOpenLineShare('app')}
              className="px-3 py-2 rounded-xl bg-[#1C2025] hover:bg-[#252A30] text-gray-300 text-xs font-medium border border-[#2D3135] flex items-center gap-1.5 transition-all"
              title="เปิดผ่านโปรแกรม LINE PC สำหรับเครื่องคอมพิวเตอร์"
            >
              <Laptop className="w-3.5 h-3.5 text-blue-400" />
              <span>เปิด LINE PC</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2.5 rounded-xl bg-[#1C2025] hover:bg-[#252A30] text-gray-200 text-xs font-bold border border-[#2D3135] flex items-center gap-1.5 transition-all active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
              <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}</span>
            </button>

            {/* Primary Action Button: เปิด LINE ส่งทันที */}
            <button
              id="line-send-instant-btn"
              type="button"
              onClick={() => handleOpenLineShare('web')}
              disabled={isSending}
              className={`px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
                sendSuccess
                  ? 'bg-emerald-600 shadow-emerald-600/30'
                  : 'bg-[#06C755] hover:bg-[#05b34c] shadow-[#06C755]/25'
              }`}
            >
              {sendSuccess ? (
                <>
                  <CheckCheck className="w-4 h-4 text-white" />
                  <span>เปิด LINE แล้ว!</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>เปิด LINE ส่งทันที (Send via LINE)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};


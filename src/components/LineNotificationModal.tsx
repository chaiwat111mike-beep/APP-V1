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
  UserCheck
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { JobOrder } from '../types';
import {
  DEFAULT_LINE_ID,
  DEFAULT_LINE_URL,
  DEFAULT_MECHANIC_PHONE,
  generateJobIntakeMessage,
  generateJobStatusUpdateMessage,
  generateJobCompletedMessage,
  getDirectLineUrl,
  getLineShareUrl
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
  const { garageProfile } = useGarage();
  const [templateType, setTemplateType] = useState<'intake' | 'status' | 'completed'>(initialTemplate);
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!job) return;
    if (templateType === 'intake') {
      setMessageText(generateJobIntakeMessage(job, garageProfile));
    } else if (templateType === 'status') {
      setMessageText(generateJobStatusUpdateMessage(job, garageProfile));
    } else if (templateType === 'completed') {
      setMessageText(generateJobCompletedMessage(job, garageProfile));
    }
  }, [job, templateType, garageProfile]);

  if (!isOpen || !job) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  const handleOpenLineShare = () => {
    const url = getLineShareUrl(messageText);
    window.open(url, '_blank');
  };

  const directLineChatUrl = garageProfile.lineDirectUrl || getDirectLineUrl(garageProfile.lineId || DEFAULT_LINE_ID);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-[#16191D] border border-[#2D3135] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-[#1A1D21] to-[#121417] border-b border-[#2D3135]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#06C755] text-white flex items-center justify-center shadow-lg shadow-[#06C755]/20">
              <MessageSquare className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>ส่งข้อความแจ้งเตือนผ่าน LINE</span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#06C755]/20 text-[#06C755] border border-[#06C755]/30">
                  LINE ID: {garageProfile.lineId || DEFAULT_LINE_ID}
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
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 text-xs">
          
          {/* Template Selector Tabs */}
          <div>
            <label className="block text-gray-300 font-bold mb-2">เลือกรูปแบบข้อความแจ้งเตือน:</label>
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-gray-300 font-bold flex items-center gap-1.5">
                <span>ข้อความที่จะส่งไปยัง LINE:</span>
                <span className="text-[10px] text-gray-400 font-normal">(แก้ไขเพิ่มเติมได้)</span>
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-[#06C755] hover:underline flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'คัดลอกสำเร็จแล้ว!' : 'คัดลอกข้อความ'}</span>
              </button>
            </div>

            <div className="relative">
              <textarea
                rows={11}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full p-3.5 bg-[#0D0F12] border border-[#2D3135] rounded-xl text-gray-200 text-xs font-sans focus:outline-none focus:border-[#06C755] focus:ring-1 focus:ring-[#06C755] leading-relaxed transition-all"
              />
            </div>
          </div>

          {/* Quick Contact & Line Info Banner */}
          <div className="p-3 bg-[#0F1113] border border-[#2D3135] rounded-xl flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#06C755] animate-pulse"></span>
              <span className="text-gray-300">
                LINE ID อู่: <strong className="text-white font-mono">{garageProfile.lineId || DEFAULT_LINE_ID}</strong> (ช่างไมค์ {garageProfile.mechanicPhone || DEFAULT_MECHANIC_PHONE})
              </span>
            </div>

            <a
              href={directLineChatUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#06C755] hover:underline flex items-center gap-1 font-bold"
            >
              <span>เปิดแชทกับช่างไมค์ (Direct Chat)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-[#121417] border-t border-[#2D3135] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1C2025] hover:bg-[#252A30] text-gray-300 text-xs font-semibold transition-colors"
          >
            ปิดหน้าต่าง
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-[#1C2025] hover:bg-[#252A30] text-gray-200 text-xs font-bold border border-[#2D3135] flex items-center gap-1.5 transition-all active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
              <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenLineShare}
              className="px-5 py-2 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold shadow-lg shadow-[#06C755]/25 flex items-center gap-2 transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>เปิด LINE ส่งทันที (Send via LINE)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

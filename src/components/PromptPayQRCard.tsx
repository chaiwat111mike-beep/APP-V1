import React, { useEffect, useState } from 'react';
import { generatePromptPayQRCodeDataURL, sanitizePromptPayTarget } from '../utils/promptpay';
import { Copy, Check, Download, QrCode, ShieldCheck, Sparkles } from 'lucide-react';

interface PromptPayQRCardProps {
  promptPayId: string;
  accountName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  amount?: number;
  shopName?: string;
  referenceNo?: string;
  className?: string;
  showActions?: boolean;
}

export const PromptPayQRCard: React.FC<PromptPayQRCardProps> = ({
  promptPayId,
  accountName = 'อู่สงกรานต์ (ช่างไมค์)',
  bankName = 'ธนาคารกสิกรไทย (KBANK)',
  bankAccountNumber,
  amount,
  shopName = 'อู่สงกรานต์ การช่าง (ช่างไมค์)',
  referenceNo,
  className = '',
  showActions = true,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { display, type } = sanitizePromptPayTarget(promptPayId || '0610692036');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    generatePromptPayQRCodeDataURL(promptPayId || '0610692036', amount && amount > 0 ? amount : undefined, {
      width: 320,
      margin: 2,
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [promptPayId, amount]);

  const handleCopy = () => {
    const rawDigits = promptPayId.replace(/\D/g, '');
    navigator.clipboard.writeText(rawDigits);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    const filename = `PromptPay-QR-${amount ? `${amount}THB-` : ''}${referenceNo || Date.now()}.png`;
    link.href = qrDataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-slate-900 flex flex-col ${className}`}
    >
      {/* Authentic Thai PromptPay Header Banner */}
      <div className="bg-[#0D3880] px-4 py-3 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* PromptPay stylized emblem badge */}
          <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shadow">
            <div className="w-full h-full bg-[#0D3880] rounded flex items-center justify-center font-black text-white text-[9px] tracking-tighter">
              PP
            </div>
          </div>
          <div>
            <div className="text-xs font-black tracking-wide leading-none flex items-center gap-1.5">
              <span>พร้อมเพย์</span>
              <span className="text-[10px] text-blue-200 font-normal">| PromptPay</span>
            </div>
            <div className="text-[10px] text-blue-100/90 font-medium truncate max-w-[200px] mt-0.5">
              {shopName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] font-semibold bg-blue-900/60 px-2 py-1 rounded-full border border-blue-400/30">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>QR มาตรฐาน</span>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5 flex flex-col items-center text-center space-y-4">
        {/* Amount Display */}
        {amount !== undefined && amount > 0 ? (
          <div className="bg-blue-50/80 w-full py-2.5 px-3 rounded-xl border border-blue-100">
            <span className="text-[11px] text-slate-500 font-medium block">จำนวนเงินที่ต้องชำระ (Total Amount)</span>
            <div className="text-2xl font-black text-[#0D3880] font-mono tracking-tight flex items-center justify-center gap-1">
              <span>฿{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-xs text-slate-500 font-sans font-normal">บาท</span>
            </div>
            {referenceNo && (
              <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                อ้างอิง: {referenceNo}
              </span>
            )}
          </div>
        ) : (
          <div className="bg-slate-50 w-full py-1.5 px-3 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-600 font-medium">
              สแกนระบุจำนวนเงินตามต้องการ (Dynamic Amount)
            </span>
          </div>
        )}

        {/* QR Code Container */}
        <div className="relative group">
          <div className="w-52 h-52 sm:w-56 sm:h-56 bg-white p-2 rounded-2xl border-2 border-slate-200 shadow-inner flex items-center justify-center relative">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">กำลังสร้าง QR Code...</span>
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="PromptPay QR Code"
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <div className="text-xs text-rose-500">ไม่สามารถสร้าง QR ได้</div>
            )}
          </div>
        </div>

        {/* Account Details Box */}
        <div className="w-full bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[11px]">
              {type === 'phone' ? 'เบอร์พร้อมเพย์:' : type === 'citizenId' ? 'เลขบัตร/ประจำตัวผู้เสียภาษี:' : 'e-Wallet ID:'}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-slate-900 text-sm tracking-wide">{display}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                title="คัดลอกเลขพร้อมเพย์"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[11px]">ชื่อบัญชี:</span>
            <span className="font-semibold text-slate-900 truncate max-w-[180px]">{accountName}</span>
          </div>

          {bankAccountNumber && (
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
              <span className="text-slate-500">{bankName}:</span>
              <span className="font-mono text-slate-700">{bankAccountNumber}</span>
            </div>
          )}
        </div>

        {/* Scan instruction pill */}
        <div className="text-[11px] text-slate-600 flex flex-col items-center justify-center gap-1 bg-slate-50 py-2 px-3 rounded-lg border border-slate-200 w-full">
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
            <span>สแกนจ่ายได้จริงด้วยแอปธนาคารทุกแห่ง</span>
          </div>
          <span className="text-[10px] text-slate-500">
            (K PLUS • SCB EASY • Krungthai NEXT • Bualuang • ttb • ออมสิน)
          </span>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="grid grid-cols-2 gap-2 w-full pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all border border-slate-300"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกเบอร์'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-2 bg-[#0D3880] hover:bg-blue-800 active:scale-95 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลด QR</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

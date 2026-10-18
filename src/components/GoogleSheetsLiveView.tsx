import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  ArrowDownCircle,
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Download,
  Copy,
  Layers,
  Sparkles,
  Database,
  Eye,
  Filter,
  Check
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import {
  TARGET_SPREADSHEET_ID,
  DEFAULT_SPREADSHEET_URL,
  fetchSheetDataFromGoogle,
  FetchedSheetData,
  parseSparePartsFromRows,
  parseCustomersFromRows,
  parseJobOrdersFromRows,
  downloadCsvFile,
  copyTableToClipboard
} from '../services/googleSheetsService';

export const GoogleSheetsLiveView: React.FC = () => {
  const {
    spareParts,
    customers,
    jobOrders,
    importSpareParts,
    importCustomers,
    importJobOrders,
    pullDataFromGoogleSheets,
    isPullingSheets,
    lastSheetPullAt,
    sheetPullNotification,
    dismissSheetPullNotification,
    googleSheetsSyncStatus,
    setGoogleSheetId,
  } = useGarage();

  const currentSheetId = googleSheetsSyncStatus.spreadsheetId || TARGET_SPREADSHEET_ID;
  const currentSheetUrl = `https://docs.google.com/spreadsheets/d/${currentSheetId}/edit`;

  const tabs = [
    { id: 'คลังสต็อกอะไหล่', label: '📦 คลังสต็อกอะไหล่', hint: '71 รายการ' },
    { id: 'ประวัติลูกค้าและรถยนต์', label: '👥 ประวัติลูกค้าและรถยนต์', hint: '20 รายการ' },
    { id: 'ใบสั่งซ่อมและสถานะ', label: '📋 ใบสั่งซ่อมและสถานะ', hint: '8 ใบงาน' },
    { id: 'Sheet1', label: '📄 แผ่นงาน Sheet1', hint: '31 รายการ' },
  ];

  const [activeTab, setActiveTab] = useState<string>('คลังสต็อกอะไหล่');
  const [sheetData, setSheetData] = useState<FetchedSheetData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Fetch sheet tab data
  const loadTab = async (tabName: string) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const data = await fetchSheetDataFromGoogle(currentSheetId, tabName);
      setSheetData(data);
    } catch (err: any) {
      console.warn('Load sheet tab error:', err);
      setFeedback({
        type: 'error',
        message: err?.message || 'ไม่สามารถดึงข้อมูลจากชีตได้ กรุณาตรวจสอบสิทธิ์การแชร์หรือลองใหม่อีกครั้ง',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab, currentSheetId]);

  // Pull all sheets into app
  const handlePullAll = async () => {
    const res = await pullDataFromGoogleSheets(true);
    if (res) {
      setFeedback({
        type: 'success',
        message: `นำเข้าและอัปเดตข้อมูลทั้งหมดสำเร็จ! (อะไหล่ ${res.parts.length} รายการ • ลูกค้า ${res.customers.length} ราย • ใบสั่งซ่อม ${res.jobOrders.length} ใบ)`,
      });
      // reload current tab
      loadTab(activeTab);
    } else {
      setFeedback({
        type: 'error',
        message: 'ไม่สามารถดึงข้อมูลจาก Google Sheets ได้ กรุณาลองใหม่อีกครั้ง',
      });
    }
  };

  // Import current tab data into app
  const handleImportCurrentTab = () => {
    if (!sheetData || sheetData.rows.length === 0) return;

    try {
      if (activeTab === 'คลังสต็อกอะไหล่' || activeTab === 'Sheet1') {
        const parts = parseSparePartsFromRows(sheetData.headers, sheetData.rows);
        importSpareParts(parts, 'merge');
        setFeedback({
          type: 'success',
          message: `✅ นำเข้าสต็อกอะไหล่ ${parts.length} รายการจาก Google Sheets เข้าสู่ระบบเรียบร้อยแล้ว!`,
        });
      } else if (activeTab === 'ประวัติลูกค้าและรถยนต์') {
        const custs = parseCustomersFromRows(sheetData.headers, sheetData.rows);
        importCustomers(custs, 'merge');
        setFeedback({
          type: 'success',
          message: `✅ นำเข้าข้อมูลลูกค้า ${custs.length} รายจาก Google Sheets เข้าสู่ระบบเรียบร้อยแล้ว!`,
        });
      } else if (activeTab === 'ใบสั่งซ่อมและสถานะ') {
        const jobs = parseJobOrdersFromRows(sheetData.headers, sheetData.rows);
        importJobOrders(jobs, 'merge');
        setFeedback({
          type: 'success',
          message: `✅ นำเข้าใบสั่งซ่อม ${jobs.length} ใบจาก Google Sheets เข้าสู่ระบบเรียบร้อยแล้ว!`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `เกิดข้อผิดพลาดในการแปลงข้อมูล: ${err?.message || err}`,
      });
    }
  };

  const handleCopy = () => {
    if (!sheetData) return;
    const ok = copyTableToClipboard(sheetData.headers, sheetData.rows);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadCsv = () => {
    if (!sheetData) return;
    downloadCsvFile(`GoogleSheet_${sheetData.sheetTitle}_${new Date().toISOString().slice(0, 10)}.csv`, [
      sheetData.headers,
      ...sheetData.rows,
    ]);
  };

  const filteredRows = sheetData
    ? sheetData.rows.filter((row) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return row.some((cell) => String(cell || '').toLowerCase().includes(q));
      })
    : [];

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-[#16191D] border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                  <span>ข้อมูลสดจาก Google Sheets (Live Sheets Viewer)</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/40 font-mono">
                    LIVE
                  </span>
                </h1>
                <p className="text-sm font-medium text-gray-200 mt-0.5">
                  เชื่อมต่อและอ่านข้อมูลสดจาก Google Sheets อู่ซ่อมรถยนต์ ID:{' '}
                  <span className="font-mono text-orange-400 font-bold bg-[#0F1113] px-2 py-0.5 rounded border border-[#2D3135]">
                    {currentSheetId}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick stats pills */}
            <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap pt-1 text-xs">
              <span className="px-3 py-1 rounded-lg bg-[#0F1113] border border-[#2D3135] text-gray-200 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>สถานะ: <strong className="text-emerald-400 font-bold">เชื่อมต่อสด 2-Way</strong></span>
              </span>

              <span className="px-3 py-1 rounded-lg bg-[#0F1113] border border-[#2D3135] text-gray-200 font-medium">
                อะไหล่ในชีต: <strong className="text-orange-400 font-mono font-bold">71 รายการ</strong>
              </span>

              <span className="px-3 py-1 rounded-lg bg-[#0F1113] border border-[#2D3135] text-gray-200 font-medium">
                ลูกค้าในชีต: <strong className="text-sky-400 font-mono font-bold">20 ราย</strong>
              </span>

              {lastSheetPullAt && (
                <span className="px-3 py-1 rounded-lg bg-[#0F1113] border border-[#2D3135] text-gray-300 font-medium font-mono text-xs">
                  ดึงข้อมูลล่าสุด: <strong className="text-gray-100">{lastSheetPullAt}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <a
              href={currentSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-[#0F1113] hover:bg-[#1E2329] border border-[#2D3135] text-gray-200 hover:text-white font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
            >
              <ExternalLink className="w-4 h-4 text-emerald-400" />
              <span>เปิด Google Sheets จริง</span>
            </a>

            <button
              type="button"
              disabled={isPullingSheets || isLoading}
              onClick={handlePullAll}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all disabled:opacity-50"
            >
              <ArrowDownCircle className={`w-4 h-4 ${isPullingSheets ? 'animate-spin' : ''}`} />
              <span>{isPullingSheets ? 'กำลังดึงข้อมูลทั้งหมด...' : '📥 ดึงข้อมูลทั้งหมดเข้าสู่ระบบ'}</span>
            </button>
          </div>
        </div>

        {/* Global Pull Notification Banner */}
        {sheetPullNotification && (
          <div className="mt-4 p-3.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-200 text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{sheetPullNotification}</span>
            </div>
            <button
              onClick={dismissSheetPullNotification}
              className="text-gray-300 hover:text-white text-xs underline font-bold px-2 py-1"
            >
              รับทราบ
            </button>
          </div>
        )}

        {/* Local Feedback */}
        {feedback && (
          <div
            className={`mt-4 p-3.5 rounded-xl text-sm font-semibold flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-200'
                : 'bg-red-500/15 border border-red-500/40 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-gray-300 hover:text-white text-xs underline font-bold px-2 py-1">
              ปิด
            </button>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#2D3135]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 border border-emerald-400/40 scale-100'
                : 'bg-[#16191D] text-gray-300 hover:text-white hover:bg-[#1E2329] border border-[#2D3135]'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-[#0F1113] text-gray-300 border border-[#2D3135]'
              }`}
            >
              {tab.hint}
            </span>
          </button>
        ))}
      </div>

      {/* Table Toolbar */}
      <div className="bg-[#16191D] border border-[#2D3135] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`ค้นหาในแผ่นงาน "${activeTab}" (ชื่อ, รหัส, ทะเบียน, ยี่ห้อ, ราคา)...`}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0F1113] border border-[#2D3135] text-white text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleImportCurrentTab}
            disabled={!sheetData || sheetData.rows.length === 0}
            className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50"
            title="นำเข้าตารางนี้เข้าสู่ระบบอู่"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>นำเข้าแผ่นงานนี้เข้าสู่ระบบ</span>
          </button>

          <button
            type="button"
            onClick={() => loadTab(activeTab)}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-[#0F1113] hover:bg-[#1E2329] border border-[#2D3135] text-gray-200 hover:text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all"
            title="รีเฟรชข้อมูลสดจากชีต"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'กำลังโหลด...' : 'รีเฟรชชีต'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl bg-[#0F1113] hover:bg-[#1E2329] border border-[#2D3135] text-gray-200 hover:text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all"
            title="คัดลอกตารางข้อมูลลงคลิปบอร์ด"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-gray-300" />}
            <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกตาราง'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="px-3.5 py-2 rounded-xl bg-[#0F1113] hover:bg-[#1E2329] border border-[#2D3135] text-gray-200 hover:text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all"
            title="ดาวน์โหลดไฟล์ CSV"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>ดาวน์โหลด CSV</span>
          </button>
        </div>
      </div>

      {/* Table Results Count & Status */}
      <div className="flex items-center justify-between text-sm text-gray-200 px-1 font-medium">
        <span>
          แสดงผล: <strong className="text-white font-bold">{filteredRows.length}</strong> จากทั้งหมด{' '}
          <strong className="text-emerald-400 font-bold">{sheetData?.totalRows || 0}</strong> แถว
        </span>
        <span className="text-xs text-gray-300 font-mono">
          แหล่งที่มา: {sheetData?.source === 'google_api' ? '⚡ Google Sheets API v4' : '🌐 Google Visualization Live Stream'}
        </span>
      </div>

      {/* Main Table Viewer */}
      <div className="bg-[#121518] border border-[#2D3135] rounded-2xl overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="py-24 text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
            <div className="space-y-1">
              <p className="text-white font-bold text-base">กำลังดึงข้อมูลสดจาก Google Sheets...</p>
              <p className="text-gray-300 text-sm">กำลังติดต่อแผ่นงาน &ldquo;{activeTab}&rdquo; กรุณารอสักครู่</p>
            </div>
          </div>
        ) : !sheetData || sheetData.rows.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <FileSpreadsheet className="w-12 h-12 text-gray-500 mx-auto" />
            <p className="text-white font-bold text-base">ไม่พบข้อมูลในแผ่นงานนี้</p>
            <p className="text-gray-300 text-sm">อาจยังไม่มีข้อมูลในแผ่นงาน &ldquo;{activeTab}&rdquo; หรืออยู่ระหว่างการอัปเดต</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[640px] custom-scrollbar">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 z-20 bg-[#1A1F26] border-b-2 border-emerald-500/40 shadow-md">
                <tr>
                  <th className="p-3.5 text-center text-gray-200 font-black font-mono text-xs w-12 bg-[#1A1F26]">
                    #
                  </th>
                  {sheetData.headers.map((h, i) => (
                    <th
                      key={i}
                      className="p-3.5 text-gray-100 font-bold text-xs uppercase tracking-wider whitespace-nowrap bg-[#1A1F26] border-r border-[#2D3135]/60"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#22272E]">
                {filteredRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="even:bg-[#121518] odd:bg-[#161A1F] hover:bg-[#1F252E] transition-colors group"
                  >
                    <td className="p-3.5 text-center text-gray-300 font-mono text-xs font-bold bg-[#0F1113]/40 border-r border-[#2D3135]/40">
                      {rIdx + 1}
                    </td>
                    {row.map((cell, cIdx) => {
                      const val = String(cell || '');
                      const isNumber = !isNaN(Number(val)) && val.trim() !== '';
                      const isPrice =
                        (sheetData.headers[cIdx]?.includes('ราคา') || sheetData.headers[cIdx]?.includes('บาท') || sheetData.headers[cIdx]?.includes('ยอด')) &&
                        isNumber;
                      const isQty =
                        (sheetData.headers[cIdx]?.includes('คงเหลือ') || sheetData.headers[cIdx]?.includes('จำนวน')) &&
                        isNumber;
                      const isCode = sheetData.headers[cIdx]?.includes('รหัส') || sheetData.headers[cIdx]?.includes('Job No');

                      return (
                        <td
                          key={cIdx}
                          className="p-3.5 text-gray-100 whitespace-nowrap border-r border-[#2D3135]/30 font-medium"
                        >
                          {isCode ? (
                            <span className="font-mono font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/25">
                              {val}
                            </span>
                          ) : isPrice ? (
                            <span className="font-mono font-bold text-emerald-400">
                              ฿{Number(val).toLocaleString()}
                            </span>
                          ) : isQty ? (
                            <span
                              className={`font-mono font-bold px-2 py-0.5 rounded ${
                                Number(val) <= 2
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {val}
                            </span>
                          ) : (
                            <span className="text-gray-100">{val || '-'}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

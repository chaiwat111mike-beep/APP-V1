import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  ShieldCheck,
  Server,
  Activity,
  ArrowRight,
  HardDrive,
  Users,
  Wrench,
  Car,
  Clock,
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import {
  defaultFirebaseConfig,
  getStoredFirebaseConfig,
  testFirebaseConnection,
} from '../firebase/config';

interface FirebaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseSyncModal: React.FC<FirebaseSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    jobOrders,
    spareParts,
    customers,
    mechanics,
    serviceBays,
    syncStatus,
    syncWithFirebase,
  } = useGarage();

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    connected: boolean;
    latencyMs: number;
    mode: string;
    message: string;
  } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [syncErrMsg, setSyncErrMsg] = useState<string | null>(null);

  const config = getStoredFirebaseConfig();

  // Reset tests when modal opens
  useEffect(() => {
    if (isOpen) {
      setSyncSuccessMsg(null);
      setSyncErrMsg(null);
      // Auto test connection on open
      handleTestPing();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestPing = async () => {
    setIsTesting(true);
    try {
      const res = await testFirebaseConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        connected: false,
        latencyMs: 0,
        mode: 'offline_fallback',
        message: err?.message || 'เกิดข้อผิดพลาดในการทดสอบ',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncSuccessMsg(null);
    setSyncErrMsg(null);
    try {
      const ok = await syncWithFirebase();
      if (ok) {
        setSyncSuccessMsg('ซิงค์และบันทึกข้อมูลทุกหมวดขึ้นระบบ Firebase สำเร็จเรียบร้อยแล้ว!');
        // Refresh ping test
        handleTestPing();
      } else {
        setSyncErrMsg('การซิงค์พบข้อขัดข้อง กำลังใช้งานระบบสำรอง Local-First Storage');
      }
    } catch (err: any) {
      setSyncErrMsg(`เกิดข้อผิดพลาด: ${err?.message || 'ไม่สามารถซิงค์ได้'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-[#16191D] border border-[#2D3135] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-[#1E232A] to-[#16191D] border-b border-[#2D3135]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center shadow-lg shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  ตรวจสอบระบบเชื่อมต่อ Firebase & Firestore
                </h2>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {syncStatus.mode === 'firestore' ? 'CLOUD FIRESTORE' : 'LOCAL-FIRST'}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                ระบบฐานข้อมูลคลาวด์แบบเรียลไทม์ โครงการ: <span className="font-mono text-gray-300">{config.projectId}</span>
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

        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Real-time Connection Status Card */}
          <div className="p-4 rounded-xl bg-[#0F1113] border border-[#2D3135] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-gray-200">ผลการตรวจสอบการเชื่อมต่อ (Live Ping)</span>
              </div>
              <button
                onClick={handleTestPing}
                disabled={isTesting}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[#16191D] border border-[#2D3135] hover:border-orange-500 text-gray-300 hover:text-white flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-orange-400' : ''}`} />
                <span>{isTesting ? 'กำลังทดสอบ...' : 'ทดสอบใหม่'}</span>
              </button>
            </div>

            {testResult ? (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                  testResult.connected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                {testResult.connected ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                )}
                <div>
                  <p className="font-bold">{testResult.message}</p>
                  {testResult.latencyMs > 0 && (
                    <p className="text-[11px] opacity-80 mt-0.5">
                      ความเร็ว Latency: {testResult.latencyMs} ms | โปรเจกต์ ID: {config.projectId}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-[#16191D] border border-[#2D3135] text-xs text-gray-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400" />
                <span>กำลังส่งสัญญาณ Ping ไปยัง Firebase Firestore...</span>
              </div>
            )}

            {/* Notification Messages */}
            {syncSuccessMsg && (
              <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{syncSuccessMsg}</span>
              </div>
            )}
            {syncErrMsg && (
              <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{syncErrMsg}</span>
              </div>
            )}
          </div>

          {/* Database Summary & Collections */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-orange-400" />
                <span>ข้อมูลที่ซิงค์ในฐานข้อมูล (Firestore Collections)</span>
              </span>
              <span className="text-[11px] text-gray-400">
                อัปเดตล่าสุด: {syncStatus.lastSyncedAt || 'พร้อมใช้งาน'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-[#0F1113] border border-[#2D3135]">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-[11px]">ใบสั่งซ่อม</span>
                  <Wrench className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <div className="text-lg font-bold text-white font-mono">{jobOrders.length}</div>
                <div className="text-[10px] text-gray-400 font-mono">job_orders</div>
              </div>

              <div className="p-3 rounded-xl bg-[#0F1113] border border-[#2D3135]">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-[11px]">สต็อกอะไหล่</span>
                  <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="text-lg font-bold text-white font-mono">{spareParts.length}</div>
                <div className="text-[10px] text-gray-400 font-mono">spare_parts</div>
              </div>

              <div className="p-3 rounded-xl bg-[#0F1113] border border-[#2D3135]">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-[11px]">ลูกค้าและรถยนต์</span>
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-lg font-bold text-white font-mono">{customers.length}</div>
                <div className="text-[10px] text-gray-400 font-mono">customers</div>
              </div>

              <div className="p-3 rounded-xl bg-[#0F1113] border border-[#2D3135]">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-[11px]">ทีมช่าง</span>
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-lg font-bold text-white font-mono">{mechanics.length}</div>
                <div className="text-[10px] text-gray-400 font-mono">mechanics</div>
              </div>

              <div className="p-3 rounded-xl bg-[#0F1113] border border-[#2D3135]">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-[11px]">ช่องซ่อม (Bays)</span>
                  <Car className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-lg font-bold text-white font-mono">{serviceBays.length}</div>
                <div className="text-[10px] text-gray-400 font-mono">service_bays</div>
              </div>

              <div className="p-3 rounded-xl bg-[#0F1113] border border-[#2D3135]">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-[11px]">ข้อมูลอู่</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-xs font-bold text-white truncate">อู่สงกรานต์</div>
                <div className="text-[10px] text-gray-400 font-mono">garage_profile</div>
              </div>
            </div>
          </div>

          {/* Technical Specs & Security Rules */}
          <div className="p-4 rounded-xl bg-[#0F1113] border border-[#2D3135] space-y-2 text-xs">
            <div className="flex items-center gap-2 text-gray-300 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ความปลอดภัยและการตั้งค่า (Firestore Security Rules)</span>
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              ระบบใช้งาน Firestore Security Rules ที่ได้รับการ Deploy เรียบร้อยแล้ว อนุญาตการอ่านและเขียนข้อมูลใบสั่งซ่อม สต็อกอะไหล่ และลูกค้า พร้อมกลไก Local-First สำรองข้อมูลในเบราว์เซอร์อัตโนมัติหากเครือข่ายขัดข้อง
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2 rounded bg-[#16191D] border border-[#2D3135] text-gray-300">
                <span className="text-gray-400 block text-[10px]">Project ID</span>
                {config.projectId}
              </div>
              <div className="p-2 rounded bg-[#16191D] border border-[#2D3135] text-gray-300">
                <span className="text-gray-400 block text-[10px]">Auth Domain</span>
                {config.authDomain}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'กำลังซิงค์ขึ้น Firestore...' : 'ซิงค์ข้อมูลทั้งหมดขึ้น Firebase ทันที'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-full sm:w-auto py-3 px-5 rounded-xl bg-[#0F1113] hover:bg-[#1C2025] text-gray-300 hover:text-white border border-[#2D3135] text-xs sm:text-sm font-bold transition-all"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

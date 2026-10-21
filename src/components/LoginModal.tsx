import React, { useState } from 'react';
import { Shield, Check, Lock, Sparkles, UserCheck, Wrench, Crown, User, KeyRound, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, loginWithGoogle, quickLoginAsRole, logout } = useAuth();
  const [authTab, setAuthTab] = useState<'pin' | 'role' | 'google'>('pin');
  const [pinCode, setPinCode] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<boolean>(false);

  const user = currentUser
    ? {
        name: currentUser.displayName,
        email: currentUser.email,
        avatar: currentUser.photoURL,
        role: currentUser.role,
      }
    : null;
  const switchRole = quickLoginAsRole;

  if (!isOpen) return null;

  const handleKeypadPress = (digit: string) => {
    if (pinCode.length < 4) {
      const nextPin = pinCode + digit;
      setPinCode(nextPin);
      setPinError(null);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPinCode(pinCode.slice(0, -1));
    setPinError(null);
  };

  const verifyPin = (enteredPin: string) => {
    // Valid owner PINs: 9999, 1234, 1111, or 0000
    if (enteredPin === '9999' || enteredPin === '1234' || enteredPin === '1111' || enteredPin === '0000') {
      setPinSuccess(true);
      setTimeout(() => {
        quickLoginAsRole('owner');
        setPinSuccess(false);
        setPinCode('');
        onClose();
      }, 500);
    } else {
      setPinError('รหัส PIN ไม่ถูกต้อง (ลองใช้ 9999 หรือ 1234)');
      setTimeout(() => {
        setPinCode('');
      }, 1000);
    }
  };

  const roles: { role: UserRole; title: string; desc: string; icon: React.ReactNode; color: string }[] = [
    {
      role: 'owner',
      title: 'เจ้าของอู่ (Owner)',
      desc: 'เข้าถึงทุกระบบ: จัดการเงิน สต็อก ช่าง เปิดปิดช่องซ่อม และตั้งค่า',
      icon: <Crown className="w-5 h-5 text-amber-400" />,
      color: 'border-amber-500/40 hover:border-amber-400 bg-amber-500/5',
    },
    {
      role: 'lead_mechanic',
      title: 'หัวหน้าช่าง (Lead Mechanic)',
      desc: 'ตรวจเช็คสภาพรถ มอบหมายช่าง เบิกอะไหล่ และทดสอบ QC',
      icon: <Wrench className="w-5 h-5 text-sky-400" />,
      color: 'border-sky-500/40 hover:border-sky-400 bg-sky-500/5',
    },
    {
      role: 'mechanic',
      title: 'ช่างเทคนิค (Mechanic)',
      desc: 'ดูรายการงานซ่อมที่ได้รับมอบหมาย อัปเดตสถานะงาน และบันทึกโน้ต',
      icon: <UserCheck className="w-5 h-5 text-emerald-400" />,
      color: 'border-emerald-500/40 hover:border-emerald-400 bg-emerald-500/5',
    },
    {
      role: 'receptionist',
      title: 'เจ้าหน้าที่ต้อนรับ (Receptionist)',
      desc: 'เปิดใบสั่งซ่อม ค้นหาประวัติลูกค้า และออกใบเสร็จรับเงิน',
      icon: <User className="w-5 h-5 text-purple-400" />,
      color: 'border-purple-500/40 hover:border-purple-400 bg-purple-500/5',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#16191D] border border-[#2D3135] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2D3135]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                เข้าสู่ระบบ / สลับสิทธิ์ผู้ใช้งาน (Auth & Quick PIN)
              </h2>
              <p className="text-xs text-gray-400">
                เข้าใช้งานด่วนด้วยรหัส PIN, บัญชี Google หรือสลับสิทธิ์เจ้าหน้าที่
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-base">✕</button>
        </div>

        {/* Current User Card */}
        {user && (
          <div className="p-3 bg-[#0F1113] rounded-lg border border-[#2D3135] flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full border border-orange-500/40" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm">
                  {user.name.slice(0, 1)}
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{user.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-normal">
                    {user.role === 'owner' ? 'เจ้าของอู่' : user.role === 'lead_mechanic' ? 'หัวหน้าช่าง' : user.role === 'mechanic' ? 'ช่างเทคนิค' : 'ต้อนรับ'}
                  </span>
                </p>
                <p className="text-[11px] text-gray-400">{user.email}</p>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="px-2.5 py-1 bg-[#16191D] hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-bold rounded-lg border border-[#2D3135] transition-colors"
            >
              ออกจากระบบ
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[#0F1113] rounded-xl border border-[#2D3135] text-xs">
          <button
            type="button"
            onClick={() => setAuthTab('pin')}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              authTab === 'pin' ? 'bg-orange-500 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>รหัส PIN ด่วนเจ้าของ</span>
          </button>
          <button
            type="button"
            onClick={() => setAuthTab('role')}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              authTab === 'role' ? 'bg-orange-500 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>เลือกตำแหน่ง (Role)</span>
          </button>
          <button
            type="button"
            onClick={() => setAuthTab('google')}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              authTab === 'google' ? 'bg-orange-500 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>Google Account</span>
          </button>
        </div>

        {/* TAB 1: QUICK PIN AUTH */}
        {authTab === 'pin' && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-white">กดรหัส PIN 4 หลัก เพื่อปลดล็อกสิทธิ์เจ้าของอู่ทันที</p>
              <p className="text-[11px] text-gray-400">รหัส PIN ด่วนเริ่มต้น: <strong className="text-orange-400 font-mono">9999</strong> หรือ <strong className="text-orange-400 font-mono">1234</strong></p>
            </div>

            {/* PIN Dots Indicator */}
            <div className="flex justify-center items-center gap-3 py-2">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pinCode.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      filled
                        ? pinSuccess
                          ? 'bg-emerald-400 border-emerald-400 scale-110'
                          : pinError
                          ? 'bg-red-400 border-red-400 animate-shake'
                          : 'bg-orange-500 border-orange-500 scale-105'
                        : 'border-[#3D4248] bg-[#0F1113]'
                    }`}
                  />
                );
              })}
            </div>

            {pinError && (
              <p className="text-center text-xs text-red-400 flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{pinError}</span>
              </p>
            )}

            {pinSuccess && (
              <p className="text-center text-xs text-emerald-400 font-bold flex items-center justify-center gap-1">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>เข้าสู่ระบบในฐานะเจ้าของอู่สำเร็จ!</span>
              </p>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  className="h-11 rounded-xl bg-[#0F1113] hover:bg-[#20252A] text-white font-mono text-base font-bold border border-[#2D3135] active:scale-95 transition-all cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  quickLoginAsRole('owner');
                  onClose();
                }}
                className="h-11 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-bold text-[11px] border border-orange-500/30 active:scale-95 transition-all"
                title="เข้าสู่ระบบทันทีโดยไม่ต้องกด"
              >
                เข้าด่วน
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-11 rounded-xl bg-[#0F1113] hover:bg-[#20252A] text-white font-mono text-base font-bold border border-[#2D3135] active:scale-95 transition-all cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-11 rounded-xl bg-[#0F1113] hover:bg-[#20252A] text-gray-400 hover:text-white text-xs font-bold border border-[#2D3135] active:scale-95 transition-all cursor-pointer"
              >
                ⌫
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: ROLE SELECTOR */}
        {authTab === 'role' && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-300">เลือกตำแหน่งงานเพื่อเข้าถึงฟังก์ชันที่เกี่ยวข้อง:</p>
            <div className="space-y-2">
              {roles.map((r) => {
                const isCurrent = user?.role === r.role;
                return (
                  <div
                    key={r.role}
                    onClick={() => {
                      switchRole(r.role);
                      onClose();
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      isCurrent
                        ? 'border-orange-500 bg-orange-500/10 shadow-sm'
                        : 'border-[#2D3135] bg-[#0F1113] hover:bg-[#1C2025]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#16191D] border border-[#2D3135]">{r.icon}</div>
                      <div>
                        <span className="font-bold text-xs text-white block">{r.title}</span>
                        <span className="text-[11px] text-gray-400 line-clamp-1">{r.desc}</span>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded bg-orange-500 text-white font-bold text-[10px]">
                        ใช้งานอยู่
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: GOOGLE ACCOUNT */}
        {authTab === 'google' && (
          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                loginWithGoogle();
                onClose();
              }}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-gray-100 text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-lg active:scale-98 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>เข้าสู่ระบบด้วย Gmail (chaiwat111mike@gmail.com)</span>
            </button>
            <p className="text-[11px] text-gray-400 text-center">
              ข้อมูลใบงานซ่อมและสต็อกจะเชื่อมโยงกับบัญชี Google ของท่านอัตโนมัติ
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

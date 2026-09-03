import React from 'react';
import { Shield, Check, Lock, Sparkles, UserCheck, Wrench, Crown, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, loginWithGoogle, quickLoginAsRole, logout } = useAuth();

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
                เข้าสู่ระบบ / สลับสิทธิ์ผู้ใช้งาน (Auth)
              </h2>
              <p className="text-xs text-gray-400">
                รองรับเข้าสู่ระบบด้วย Gmail (Google Account) และสลับ Role
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-base">✕</button>
        </div>

        {/* Current User Card */}
        {user ? (
          <div className="p-3.5 bg-[#0F1113] rounded-lg border border-[#2D3135] flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border border-orange-500/40" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                  {user.name.slice(0, 1)}
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-white">{user.name}</p>
                <p className="text-[11px] text-gray-400">{user.email}</p>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="px-3 py-1 bg-[#16191D] hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-bold rounded-lg border border-[#2D3135] transition-colors"
            >
              ออกจากระบบ
            </button>
          </div>
        ) : (
          /* Google Sign In Button */
          <button
            onClick={() => {
              loginWithGoogle();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-gray-100 text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-lg active:scale-98 transition-all"
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
            <span>เข้าสู่ระบบด้วย Gmail (Google Account)</span>
          </button>
        )}

        {/* Role Selector Grid */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-300">หรือเลือกบทบาทสิทธิ์การใช้งาน (Role Switcher):</p>
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

      </div>
    </div>
  );
};

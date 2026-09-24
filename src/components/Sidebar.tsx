import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Boxes,
  Users,
  Wrench,
  Receipt,
  Settings,
  AlertTriangle,
  Car,
  CheckCircle2,
  Calendar,
  Sparkles,
  Flame,
  X,
  History
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { GarageLogo } from './GarageLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewJobModal?: () => void;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (open: boolean) => void;
  activeJobCount?: number;
  lowStockCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewJobModal,
  isSidebarOpen,
  setIsSidebarOpen,
}) => {
  const { jobOrders, spareParts, serviceBays } = useGarage();

  const isBayOccupied = (b: (typeof serviceBays)[0]) =>
    (b.status === 'occupied' ||
      jobOrders.some(
        (j) => j.bayNumber === b.bayNumber && j.status !== 'delivered' && j.status !== 'completed'
      )) &&
    b.status !== 'maintenance';

  const activeJobs = jobOrders.filter((j) => j.status !== 'delivered' && j.status !== 'completed').length;
  const readyPickupJobs = jobOrders.filter((j) => j.status === 'completed').length;
  const lowStockCount = spareParts.filter((p) => p.stockQty <= p.minStockQty).length;
  const occupiedBays = serviceBays.filter(isBayOccupied).length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'ภาพรวมอู่ (Dashboard)',
      icon: LayoutDashboard,
      badge: occupiedBays > 0 ? `${occupiedBays} ช่องซ่อม` : undefined,
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    },
    {
      id: 'jobs',
      label: 'ใบสั่งซ่อม (Job Orders)',
      icon: ClipboardList,
      badge: activeJobs > 0 ? `${activeJobs}` : undefined,
      badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    },
    {
      id: 'history',
      label: 'ประวัติใบซ่อมย้อนหลัง',
      icon: History,
      badge: jobOrders.length > 0 ? `${jobOrders.length}` : undefined,
      badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    },
    {
      id: 'inventory',
      label: 'สต็อกอะไหล่ (Inventory)',
      icon: Boxes,
      badge: lowStockCount > 0 ? `${lowStockCount} เตือน` : undefined,
      badgeColor: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    },
    {
      id: 'customers',
      label: 'ประวัติลูกค้า & รถยนต์',
      icon: Users,
    },
    {
      id: 'bays',
      label: 'ช่องซ่อม & ทีมช่าง',
      icon: Wrench,
    },
    {
      id: 'billing',
      label: 'บิล & การเงิน & รายงาน',
      icon: Receipt,
    },
    {
      id: 'settings',
      label: 'ตั้งค่า & Firebase DB',
      icon: Settings,
    },
  ];

  const renderNavContent = () => (
    <>
      <div className="space-y-5">
        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen?.(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm transition-all text-left ${
                  isActive
                    ? 'bg-orange-500/10 border-l-4 border-orange-500 text-orange-400 font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-[#1C2025] font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400 stroke-[2.5]' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && !isActive && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Hoist / Bay Snapshot */}
        <div className="bg-[#0F1113] border border-[#2D3135] rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
            <span className="flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-orange-400" />
              <span>สถานะช่องซ่อมปัจจุบัน</span>
            </span>
            <span className="text-orange-400 font-bold font-mono">{occupiedBays}/{serviceBays.length}</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {serviceBays.map((bay) => {
              const occupied = isBayOccupied(bay);
              return (
                <div
                  key={bay.id}
                  title={`ช่องซ่อมที่ ${bay.bayNumber}: ${bay.name} (${occupied ? 'กำลังซ่อม' : bay.status === 'maintenance' ? 'ปิดปรับปรุง' : 'ว่าง'})`}
                  className={`h-7 rounded-md flex items-center justify-center font-bold text-xs transition-all font-mono ${
                    occupied
                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                      : bay.status === 'maintenance'
                      ? 'bg-[#1C2025] text-gray-500 border border-[#2D3135]'
                      : 'bg-[#16191D] border border-green-500/30 text-green-400'
                  }`}
                >
                  {bay.bayNumber}
                </div>
              );
            })}
          </div>

          {readyPickupJobs > 0 && (
            <div className="pt-2 border-t border-[#2D3135] flex items-center justify-between text-xs">
              <span className="text-green-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>รอส่งมอบรถ:</span>
              </span>
              <span className="font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full text-[11px] border border-green-500/20 font-mono">
                {readyPickupJobs} คัน
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Banner */}
      <div className="pt-3 border-t border-[#2D3135] space-y-2">
        <GarageLogo variant="sidebar" />

        <a
          href="https://line.me/ti/p/~chaiwatmike"
          target="_blank"
          rel="noreferrer"
          className="p-2.5 bg-[#06C755]/10 hover:bg-[#06C755]/20 border border-[#06C755]/30 rounded-xl flex items-center justify-between text-xs transition-all text-[#06C755]"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#06C755] animate-ping"></span>
            <span className="font-bold">LINE: chaiwatmike</span>
          </div>
          <span className="text-[10px] bg-[#06C755] text-white px-1.5 py-0.5 rounded font-medium">แชท</span>
        </a>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="w-64 bg-[#16191D] border-r border-[#2D3135] flex flex-col justify-between p-4 shrink-0 hidden md:flex min-h-[calc(100vh-4rem)]">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer (Slide-over) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen?.(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] bg-[#16191D] border-r border-[#2D3135] h-full flex flex-col justify-between p-4 shadow-2xl z-10 overflow-y-auto animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#2D3135]">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">เมนูหลัก</span>
              <button
                type="button"
                onClick={() => setIsSidebarOpen?.(false)}
                className="p-1.5 rounded-lg bg-[#0F1113] border border-[#2D3135] text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderNavContent()}
          </div>
        </div>
      )}
    </>
  );
};

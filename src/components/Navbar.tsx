import React, { useState } from 'react';
import {
  Search,
  PlusCircle,
  Database,
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Car,
  Phone,
  FileSpreadsheet,
  Send,
  MessageSquare,
  ExternalLink,
  Menu,
  QrCode
} from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { GarageLogo } from './GarageLogo';
import { GoogleSheetsSyncModal } from './GoogleSheetsSyncModal';
import { FirebaseSyncModal } from './FirebaseSyncModal';
import { PromptPayQRModal } from './PromptPayQRModal';
import { DEFAULT_LINE_ID, DEFAULT_LINE_URL, DEFAULT_MECHANIC_PHONE } from '../services/lineService';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenNewJobModal: () => void;
  onOpenFirebaseModal?: () => void;
  onOpenAuthModal?: () => void;
  onOpenPromptPayModal?: () => void;
  onSelectJob: (jobId: string) => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenNewJobModal,
  onOpenFirebaseModal,
  onOpenAuthModal,
  onOpenPromptPayModal,
  onSelectJob,
  activeTab,
  setActiveTab,
}) => {
  const { garageProfile, syncStatus, syncWithFirebase, jobOrders, spareParts } = useGarage();
  const { currentUser, isAuthenticated, logout, quickLoginAsRole } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isPromptPayModalOpen, setIsPromptPayModalOpen] = useState(false);

  const phone = garageProfile.mechanicPhone || garageProfile.phone || DEFAULT_MECHANIC_PHONE;
  const lineId = garageProfile.lineId || DEFAULT_LINE_ID;
  const lineUrl = garageProfile.lineDirectUrl || DEFAULT_LINE_URL;

  const handleSyncClick = async () => {
    setIsSyncing(true);
    await syncWithFirebase();
    setTimeout(() => setIsSyncing(false), 600);
  };

  const filteredJobs = searchQuery.trim()
    ? jobOrders.filter(
        (j) =>
          j.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
          j.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          j.customerPhone.includes(searchQuery) ||
          j.jobNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          j.carBrand.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case 'owner':
        return 'เจ้าของอู่ (Owner)';
      case 'lead_mechanic':
        return 'หัวหน้าช่าง (Lead)';
      case 'mechanic':
        return 'ช่างซ่อม (Mechanic)';
      case 'receptionist':
        return 'แอดมิน/แคชเชียร์';
      default:
        return 'ผู้ใช้งาน';
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#16191D] border-b border-[#2D3135] text-gray-100 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
            
            {/* Mobile menu toggle & Logo Branding */}
            <div className="flex items-center gap-2 sm:gap-3">
              {onToggleSidebar && (
                <button
                  type="button"
                  onClick={onToggleSidebar}
                  className="p-2 rounded-lg bg-[#0F1113] border border-[#2D3135] text-gray-300 md:hidden hover:text-white"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}

              <div
                className="cursor-pointer transition-transform active:scale-98"
                onClick={() => setActiveTab && setActiveTab('dashboard')}
              >
                <GarageLogo variant="header" />
              </div>
            </div>

            {/* Quick Universal Search */}
            <div className="relative flex-1 max-w-md hidden md:block">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="search-input-header"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  placeholder="ค้นหาทะเบียนรถ, ชื่อลูกค้า, เบอร์โทร, เลขที่ใบสั่งซ่อม..."
                  className="w-full pl-10 pr-4 py-2 bg-[#0F1113] border border-[#2D3135] rounded-xl text-xs sm:text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-200"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Live Search Results Dropdown */}
              {showSearchResults && searchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-[#16191D] border border-[#2D3135] rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                  <div className="p-2 text-xs font-semibold text-gray-400 bg-[#1C2025] border-b border-[#2D3135] flex justify-between">
                    <span>ผลการค้นหา ({filteredJobs.length} รายการ)</span>
                    <button onClick={() => setShowSearchResults(false)} className="text-orange-400 hover:underline">
                      ปิด
                    </button>
                  </div>
                  {filteredJobs.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400">
                      ไม่พบข้อมูลที่ตรงกับ "{searchQuery}"
                    </div>
                  ) : (
                    filteredJobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => {
                          onSelectJob(job.id);
                          setShowSearchResults(false);
                          setSearchQuery('');
                        }}
                        className="p-3 hover:bg-[#1C2025] border-b border-[#2D3135]/50 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-xs">
                            <Car className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-orange-400 font-mono text-sm">{job.licensePlate}</span>
                              <span className="text-xs text-gray-300 font-medium">{job.carBrand} {job.carModel}</span>
                            </div>
                            <p className="text-xs text-gray-400 flex items-center gap-2">
                              <span>{job.customerName}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {job.customerPhone}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#0F1113] text-gray-300 border border-[#2D3135] font-mono">
                            {job.jobNo}
                          </span>
                          <p className="text-[11px] text-orange-400 mt-1 font-medium">฿{job.totalAmount.toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Right Action Items */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* LINE ID Direct Link */}
              <a
                href={lineUrl}
                target="_blank"
                rel="noreferrer"
                title={`คลิกเปิด LINE แชทกับช่างไมค์ (ID: ${lineId})`}
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#06C755]/10 border border-[#06C755]/30 hover:bg-[#06C755]/20 text-[#06C755] transition-all text-xs font-bold"
              >
                <span className="w-2 h-2 rounded-full bg-[#06C755] animate-pulse"></span>
                <span>LINE: {lineId}</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              {/* PromptPay Quick QR Payment Button */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenPromptPayModal) {
                    onOpenPromptPayModal();
                  } else {
                    setIsPromptPayModalOpen(true);
                  }
                }}
                title="สร้าง QR Code รับชำระเงิน พร้อมเพย์ (PromptPay)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/15 border border-blue-500/30 hover:bg-blue-600/25 text-blue-400 hover:text-blue-300 transition-all text-xs font-bold active:scale-95 shadow-sm"
              >
                <QrCode className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden md:inline">QR พร้อมเพย์</span>
              </button>

              {/* Google Sheets Sync Action Button */}
              <button
                type="button"
                onClick={() => setIsSheetsModalOpen(true)}
                title="จัดการเชื่อมต่อและซิงค์ข้อมูล Google Sheets เรียลไทม์"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0F9D58]/10 border border-[#0F9D58]/30 hover:bg-[#0F9D58]/20 text-[#0F9D58] transition-all text-xs font-bold active:scale-95"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Google Sheets</span>
              </button>

              {/* Real-time Firebase Sync Status Badge */}
              <div
                onClick={() => {
                  if (onOpenFirebaseModal) {
                    onOpenFirebaseModal();
                  } else {
                    setIsFirebaseModalOpen(true);
                  }
                }}
                title="คลิกเพื่อดูการตั้งค่าและการเชื่อมต่อ Firebase & Firestore"
                className="cursor-pointer hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 hover:border-green-500/40 transition-all text-xs"
              >
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </div>
                <div className="font-mono text-green-400 text-xs">
                  <span>DB: Songkarn-v1</span>
                </div>
              </div>

              {/* Quick Sync Button */}
              <button
                id="sync-btn-header"
                onClick={handleSyncClick}
                disabled={isSyncing}
                title="ซิงค์ข้อมูลล่าสุดกับ Firebase"
                className="p-2 rounded-xl bg-[#0F1113] border border-[#2D3135] hover:bg-[#1C2025] text-gray-300 hover:text-white transition-all active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-orange-500' : ''}`} />
              </button>

              {/* Primary Action: + เปิดใบสั่งซ่อม */}
              <button
                id="btn-new-job-header"
                onClick={onOpenNewJobModal}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 active:scale-95 transition-all shrink-0"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">เปิดใบสั่งซ่อม</span>
                <span className="sm:hidden">สั่งซ่อม</span>
              </button>

              {/* User Account / Gmail Profile */}
              <div className="relative">
                <button
                  id="user-profile-menu-btn"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl bg-[#0F1113] border border-[#2D3135] hover:border-orange-500/50 transition-all text-xs text-left"
                >
                  {currentUser?.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName}
                      className="w-7 h-7 rounded-full object-cover border border-orange-500/50"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center font-bold text-xs">
                      {currentUser?.displayName ? currentUser.displayName.slice(0, 1) : 'G'}
                    </div>
                  )}
                  <div className="hidden lg:block">
                    <div className="font-semibold text-gray-200 truncate max-w-[120px]">
                      {currentUser?.displayName || 'ผู้ใช้งาน'}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {getRoleLabel(currentUser?.role)}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {/* Profile dropdown menu */}
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#16191D] border border-[#2D3135] rounded-xl shadow-2xl overflow-hidden z-50 p-2 text-xs">
                    <div className="p-3 bg-[#0F1113] rounded-lg border border-[#2D3135] mb-2">
                      <p className="font-bold text-gray-200">{currentUser?.displayName || 'นายชัยวัฒน์ มงคลสุข'}</p>
                      <p className="text-gray-400 text-[11px] truncate">{currentUser?.email || 'chaiwat111mike@gmail.com'}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-mono text-[10px] border border-orange-500/30">
                        {getRoleLabel(currentUser?.role)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          quickLoginAsRole('owner');
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1C2025] text-gray-300 flex items-center justify-between"
                      >
                        <span>สลับเป็น: เจ้าของอู่ (ช่างไมค์)</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                      </button>

                      <button
                        onClick={() => {
                          setIsSheetsModalOpen(true);
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1C2025] text-green-400 flex items-center justify-between"
                      >
                        <span>จัดการ Google Sheets</span>
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (onOpenAuthModal) onOpenAuthModal();
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1C2025] text-gray-300 flex items-center justify-between"
                      >
                        <span>เข้าสู่ระบบด้วย Gmail บัญชีอื่น</span>
                        <User className="w-3.5 h-3.5 text-gray-400" />
                      </button>

                      <button
                        onClick={() => {
                          logout();
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 flex items-center justify-between mt-1 pt-1 border-t border-[#2D3135]"
                      >
                        <span>ออกจากระบบ (Logout)</span>
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      </header>

      {/* Google Sheets Sync Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
      />

      {/* Firebase Diagnostics & Sync Modal */}
      <FirebaseSyncModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
      />

      {/* PromptPay QR Code Modal */}
      <PromptPayQRModal
        isOpen={isPromptPayModalOpen}
        onClose={() => setIsPromptPayModalOpen(false)}
      />
    </>
  );
};

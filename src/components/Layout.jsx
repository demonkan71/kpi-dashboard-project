import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, TableProperties, Edit3, LogOut, LogIn, Users, FolderPlus, KeyRound, Settings, History, AlertCircle, Bell } from 'lucide-react';
import { supabase } from '../supabaseClient';
import OnboardingModal from './OnboardingModal';
import { getFiscalYearMonthDetails } from '../utils/dateUtils';

export default function Layout({ profile, session }) {
  const location = useLocation();
  const [missingDataCount, setMissingDataCount] = useState(0);

  useEffect(() => {
    const fetchMissingData = async () => {
      if (!session || !profile || profile.status !== 'approved') return;

      const currentYear = localStorage.getItem('selectedFiscalYear') || '2569';
      
      const { data: kpiData } = await supabase.from('kpis').select('id, kpi_name').eq('fiscal_year', currentYear);
      const { data: mData } = await supabase.from('kpi_monthly_data').select('kpi_id, month_year, value');
      
      if (kpiData && mData) {
        let missing = 0;
        const currentRealDate = new Date();
        const allMonthsDetails = getFiscalYearMonthDetails(currentYear);
        const availableMonths = allMonthsDetails.filter(m => m.date <= currentRealDate || (m.date.getFullYear() === currentRealDate.getFullYear() && m.date.getMonth() === currentRealDate.getMonth()));
        
        const allowedKpis = profile.role === 'admin' 
          ? kpiData 
          : kpiData.filter(k => profile.responsible_kpis?.includes(k.id));
          
        allowedKpis.forEach(kpi => {
          let hasMissing = false;
          const kpiMonths = mData.filter(d => d.kpi_id === kpi.id);
          availableMonths.forEach(m => {
            const record = kpiMonths.find(d => d.month_year === m.value);
            if (!record || record.value === null || record.value === undefined || record.value === '') {
              hasMissing = true;
            }
          });
          if (hasMissing) missing++;
        });
        setMissingDataCount(missing);
      }
    };

    fetchMissingData();
  }, [location.pathname, profile, session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `flex items-center p-2 text-base font-normal rounded-lg transition-colors duration-200 ${
      isActive 
        ? 'bg-blue-800 text-white' 
        : 'text-blue-100 hover:bg-blue-800 hover:text-white'
    }`;
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="w-64 flex-shrink-0 bg-blue-900 flex flex-col transition-transform shadow-xl z-20">
        <div className="p-5 border-b border-blue-800">
          <div className="flex items-center space-x-3 mb-2">
            <img src="/logoMOPH.png" alt="MOPH" className="h-10" />
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">KPI Dashboard</h2>
              <span className="text-blue-300 text-xs font-semibold">สสจ.กาญจนบุรี</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 pb-10">
          <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2 px-2 mt-2">เมนูหลัก</div>
          
          <Link to="/" className={navLinkClass('/')}>
            <LayoutDashboard className="w-5 h-5 mr-3" />
            <span>ภาพรวม (Dashboard)</span>
          </Link>
          
          <Link to="/table" className={navLinkClass('/table')}>
            <TableProperties className="w-5 h-5 mr-3" />
            <span>ข้อมูลตัวชี้วัด</span>
          </Link>
          
          {profile?.role !== 'viewer' && profile?.status === 'approved' && (
              <>
                <Link to="/entry" className={navLinkClass('/entry')}>
                  <Edit3 className="w-5 h-5 mr-3" />
                  <span>บันทึกข้อมูลผลงาน</span>
                </Link>
                <Link to="/missing-data" className={navLinkClass('/missing-data')}>
                  <AlertCircle className="w-5 h-5 mr-3" />
                  <span>ข้อมูลที่ต้องติดตาม</span>
                </Link>
              </>
            )}

          {session && (
            <Link to="/reset-password" className={navLinkClass('/reset-password')}>
              <KeyRound className="w-5 h-5 mr-3" />
              <span>เปลี่ยนรหัสผ่าน</span>
            </Link>
          )}

          {profile?.role === 'admin' && (
            <>
              <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2 px-2 mt-6 pt-4 border-t border-blue-800">สำหรับผู้ดูแลระบบ</div>
              <Link to="/manage-kpi" className={navLinkClass('/manage-kpi')}>
                <FolderPlus className="w-5 h-5 mr-3" />
                <span>จัดการตัวชี้วัด</span>
              </Link>
              <Link to="/manage-users" className={navLinkClass('/manage-users')}>
                <Users className="w-5 h-5 mr-3" />
                <span>จัดการผู้ใช้งาน</span>
              </Link>
              <Link to="/system-settings" className={navLinkClass('/system-settings')}>
                <Settings className="w-5 h-5 mr-3" />
                <span>ตั้งค่าระบบ</span>
              </Link>
              <Link to="/audit-logs" className={navLinkClass('/audit-logs')}>
                <History className="w-5 h-5 mr-3" />
                <span>ประวัติการแก้ไข</span>
              </Link>
            </>
          )}
        </div>
        
        {/* Version Info */}
        <div className="absolute bottom-0 w-64 p-4 text-center border-t border-blue-800">
          <p className="text-xs text-blue-300/60 font-medium">Version 1.0.0-beta</p>
        </div>
      </aside>
      
      <main className="flex-1 overflow-x-hidden flex flex-col bg-gray-50">
        {/* Top Navbar */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 shadow-md flex items-center justify-end px-6 flex-shrink-0 z-10">
          {session ? (
            <div className="flex items-center space-x-6">
              {/* Bell Icon Notification */}
              {profile?.status === 'approved' && profile?.role !== 'viewer' && (
                <Link to="/missing-data" className="relative text-slate-300 hover:text-white transition-colors" title="ข้อมูลที่ต้องติดตาม">
                  <Bell className="w-6 h-6" />
                  {missingDataCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-slate-900">
                      {missingDataCount}
                    </span>
                  )}
                </Link>
              )}
              
              {/* Divider */}
              <div className="h-8 w-px bg-slate-700"></div>
              
              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden md:block">
                  <div className="text-sm font-bold text-white truncate max-w-[150px]">{profile?.full_name || 'ผู้ใช้งาน'}</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">{profile?.role}</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold border-2 border-slate-800 shadow-sm">
                  {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <button onClick={handleLogout} className="ml-2 text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors" title="ออกจากระบบ">
                  <LogOut className="w-5 h-5"/> 
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-white">ผู้เยี่ยมชม</div>
                <div className="text-xs text-slate-400 uppercase">Public View</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold border-2 border-slate-800">
                G
              </div>
              <Link to="/login" className="ml-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors flex items-center">
                <LogIn className="w-4 h-4 mr-2"/> 
                เข้าสู่ระบบ
              </Link>
            </div>
          )}
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 relative">
          {session && profile?.status === 'pending' && (
            <div className="mb-6 p-4 bg-amber-100 border-l-4 border-amber-500 text-amber-800 rounded shadow-sm">
              <strong>แจ้งเตือน:</strong> บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ คุณสามารถดูข้อมูลภาพรวมได้ แต่ยังไม่สามารถบันทึกข้อมูลได้จนกว่าจะได้รับการอนุมัติ
            </div>
          )}
          <Outlet />
        </div>
      </main>

      {/* Onboarding Modal - only for 'user' role who hasn't picked KPIs yet */}
      {session && profile?.role === 'user' && profile?.status === 'approved' && profile?.responsible_kpis === null && (
        <OnboardingModal 
          profile={profile} 
          onComplete={() => window.location.reload()} 
        />
      )}
    </div>
  );
}

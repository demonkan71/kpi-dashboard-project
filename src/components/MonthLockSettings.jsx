import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';
import { Lock, Unlock, ShieldAlert } from 'lucide-react';
import { getFiscalYearMonthDetails, getAvailableFiscalYears } from '../utils/dateUtils';

export default function MonthLockSettings() {
  const [fiscalYear, setFiscalYear] = useState(localStorage.getItem('fiscalYear') ? parseInt(localStorage.getItem('fiscalYear')) : 2569);
  const [lockedMonthsMap, setLockedMonthsMap] = useState({});
  const [loading, setLoading] = useState(true);

  const months = getFiscalYearMonthDetails(fiscalYear);

  useEffect(() => {
    fetchLockedMonths();
  }, [fiscalYear]);

  const fetchLockedMonths = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('locked_months').select('*');
    if (data) {
      const map = {};
      data.forEach(d => {
        map[d.month_year] = d.is_locked;
      });
      setLockedMonthsMap(map);
    }
    setLoading(false);
  };

  const handleYearChange = (e) => {
    const y = parseInt(e.target.value);
    setFiscalYear(y);
    localStorage.setItem('fiscalYear', y);
  };

  const toggleLock = async (monthValue, currentStatus) => {
    const newStatus = !currentStatus;
    
    // Optimistic UI update
    setLockedMonthsMap(prev => ({ ...prev, [monthValue]: newStatus }));

    try {
      const { error } = await supabase.from('locked_months').upsert({
        month_year: monthValue,
        is_locked: newStatus
      }, { onConflict: 'month_year' });

      if (error) {
        throw error;
      }
    } catch (err) {
      // Revert if error
      setLockedMonthsMap(prev => ({ ...prev, [monthValue]: currentStatus }));
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกการตั้งค่าได้: ' + err.message, 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 flex items-center">
            <ShieldAlert className="mr-3 text-blue-600" size={28} />
            ตั้งค่าการล็อกรอบเดือน
          </h1>
          <p className="text-gray-500 mt-1 text-sm">เปิด-ปิดสิทธิ์การแก้ไขข้อมูลผลงานตามรายเดือน เพื่อป้องกันการแก้ไขข้อมูลย้อนหลัง</p>
        </div>
        <select 
          value={fiscalYear} 
          onChange={handleYearChange}
          className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 shadow-sm font-medium"
        >
          {getAvailableFiscalYears().map(y => (
            <option key={y} value={y}>ปีงบประมาณ {y}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {months.map(m => {
            const isLocked = lockedMonthsMap[m.value] || false;
            return (
              <div 
                key={m.value} 
                className={`p-4 rounded-xl border-2 transition-all duration-300 flex items-center justify-between ${
                  isLocked 
                    ? 'border-red-200 bg-red-50/50' 
                    : 'border-emerald-200 bg-emerald-50/50'
                }`}
              >
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{m.label}</h3>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    isLocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {isLocked ? 'ล็อกการแก้ไข' : 'เปิดรับข้อมูล'}
                  </span>
                </div>
                
                <button
                  onClick={() => toggleLock(m.value, isLocked)}
                  className={`relative inline-flex items-center justify-center w-12 h-12 rounded-full shadow-sm transition-all duration-300 focus:outline-none ${
                    isLocked 
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-200' 
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200'
                  } hover:scale-110 active:scale-95`}
                  title={isLocked ? "ปลดล็อก" : "ล็อกข้อมูล"}
                >
                  {isLocked ? <Lock size={20} strokeWidth={2.5} /> : <Unlock size={20} strokeWidth={2.5} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

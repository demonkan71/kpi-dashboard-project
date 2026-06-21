import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';
import { Lock } from 'lucide-react';
import { getFiscalYearMonthDetails, getAvailableFiscalYears } from '../utils/dateUtils';

export default function DataEntry({ profile }) {
  const [kpis, setKpis] = useState([]);
  const [selectedKpi, setSelectedKpi] = useState('');
  const [monthlyData, setMonthlyData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [saving, setSaving] = useState(false);
  const [lockedMonths, setLockedMonths] = useState({});
  const [fiscalYear, setFiscalYear] = useState(localStorage.getItem('fiscalYear') ? parseInt(localStorage.getItem('fiscalYear')) : 2569);

  const allMonths = getFiscalYearMonthDetails(fiscalYear);

  const currentRealDate = new Date();
  const availableMonths = allMonths.filter(m => m.date <= currentRealDate || (m.date.getFullYear() === currentRealDate.getFullYear() && m.date.getMonth() === currentRealDate.getMonth()));

  useEffect(() => {
    fetchKpis();
    fetchLockedMonths();
    // Reset selected KPI when year changes
    setSelectedKpi('');
    setMonthlyData({});
  }, [fiscalYear]);

  const fetchLockedMonths = async () => {
    const { data } = await supabase.from('locked_months').select('month_year, is_locked');
    if (data) {
      const map = {};
      data.forEach(d => {
        map[d.month_year] = d.is_locked;
      });
      setLockedMonths(map);
    }
  };

  const fetchKpis = async () => {
    const { data } = await supabase.from('kpis').select('id, kpi_number, kpi_name').eq('fiscal_year', fiscalYear).order('id');
    if (data) {
      const allowedKpis = profile?.role === 'admin' 
        ? data 
        : data.filter(k => profile?.responsible_kpis?.includes(k.id));
      setKpis(allowedKpis);
    }
  };

  const handleKpiSelect = async (e) => {
    const kpiId = e.target.value;
    setSelectedKpi(kpiId);
    
    if(!kpiId) {
      setMonthlyData({});
      return;
    }

    const { data } = await supabase.from('kpi_monthly_data').select('*').eq('kpi_id', kpiId);
    const mData = {};
    if (data) {
      data.forEach(d => {
        mData[d.month_year] = d.value;
      });
    }
    setMonthlyData(mData);
    // Deep clone for original state comparison
    setOriginalData(JSON.parse(JSON.stringify(mData)));
  };

  const handleChange = (monthVal, val) => {
    setMonthlyData(prev => ({...prev, [monthVal]: val}));
  };

  const handleSave = async () => {
    if(!selectedKpi) return;
    setSaving(true);
    
    const upserts = [];
    const auditEntries = [];

    availableMonths.forEach(m => {
      if (lockedMonths[m.value]) return; // Skip locked months

      const val = monthlyData[m.value];
      const origVal = originalData[m.value];
      
      const parsedVal = (val !== undefined && val !== null && val !== '') ? parseFloat(val) : null;
      const parsedOrigVal = (origVal !== undefined && origVal !== null && origVal !== '') ? parseFloat(origVal) : null;

      // Only process if value changed or is explicitly populated for the first time
      if (parsedVal !== parsedOrigVal) {
        if (parsedVal !== null) {
          upserts.push({
            kpi_id: parseInt(selectedKpi),
            month_year: m.value,
            value: parsedVal
          });
        }
        
        // Log changes
        auditEntries.push({
          kpi_id: parseInt(selectedKpi),
          month_year: m.value,
          old_value: parsedOrigVal,
          new_value: parsedVal,
          updated_by: profile.id
        });
      }
    });

    if(upserts.length > 0 || auditEntries.length > 0) {
      let hasError = false;
      let errorMsg = '';

      if (upserts.length > 0) {
        const { error } = await supabase.from('kpi_monthly_data').upsert(upserts, { onConflict: 'kpi_id, month_year' });
        if(error) {
          hasError = true;
          errorMsg = error.message;
        }
      }

      // If data save was successful, save audit logs
      if (!hasError && auditEntries.length > 0) {
        await supabase.from('audit_logs').insert(auditEntries);
        // Update originalData to reflect new saved state
        setOriginalData(JSON.parse(JSON.stringify(monthlyData)));
      }

      if(hasError) {
        Swal.fire('Error', errorMsg, 'error');
      } else {
        Swal.fire('สำเร็จ', 'บันทึกข้อมูลและประวัติเรียบร้อยแล้ว', 'success');
      }
    } else {
      Swal.fire('Info', 'ไม่มีข้อมูลให้บันทึก', 'info');
    }
    
    setSaving(false);
  };

  const handleYearChange = (e) => {
    const y = parseInt(e.target.value);
    setFiscalYear(y);
    localStorage.setItem('fiscalYear', y);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-900">บันทึกข้อมูลผลการดำเนินงาน</h1>
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

      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-blue-100">
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">เลือกตัวชี้วัด (KPI)</label>
          <select
            className="block w-full max-w-full text-xs bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 truncate overflow-hidden"
            value={selectedKpi}
            onChange={handleKpiSelect}
          >
            <option value="">-- กรุณาเลือก --</option>
            {kpis.map(k => (
              <option key={k.id} value={k.id} className="text-xs truncate">
                {k.kpi_number} {k.kpi_name}
              </option>
            ))}
          </select>
        </div>

        {selectedKpi && (
          <div>
            <h5 className="mb-4 text-base font-bold text-blue-900 border-b-2 border-gray-200 pb-3">
              กรอกผลงานรายเดือน
            </h5>
            <div className="grid grid-cols-3 gap-3">
              {availableMonths.map(m => {
                const isLocked = lockedMonths[m.value];
                return (
                  <div
                    key={m.value}
                    className={`p-3 rounded-lg border transition-colors ${
                      isLocked ? 'bg-gray-100 border-gray-300' : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex justify-center items-center space-x-1 text-xs font-bold text-gray-700 mb-2">
                      <span>{m.label}</span>
                      {isLocked && <Lock size={12} className="text-red-500" />}
                    </div>
                    <input
                      type="number"
                      disabled={isLocked}
                      className={`w-full text-center text-sm font-bold rounded-md p-2 outline-none ${
                        isLocked 
                          ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed' 
                          : 'text-blue-900 bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                      value={monthlyData[m.value] || ''}
                      onChange={(e) => handleChange(m.value, e.target.value)}
                      placeholder="-"
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

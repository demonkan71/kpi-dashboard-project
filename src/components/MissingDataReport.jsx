import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { AlertCircle, Search, Filter } from 'lucide-react';
import { getFiscalYearMonthDetails, getAvailableFiscalYears } from '../utils/dateUtils';
import { Link } from 'react-router-dom';

export default function MissingDataReport({ profile }) {
  const [kpis, setKpis] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fiscalYear, setFiscalYear] = useState(localStorage.getItem('fiscalYear') ? parseInt(localStorage.getItem('fiscalYear')) : 2569);

  // Get months up to current real date
  const allMonths = getFiscalYearMonthDetails(fiscalYear);
  const currentRealDate = new Date();
  const availableMonths = allMonths.filter(m => m.date <= currentRealDate || (m.date.getFullYear() === currentRealDate.getFullYear() && m.date.getMonth() === currentRealDate.getMonth()));

  useEffect(() => {
    fetchData();
  }, [fiscalYear, profile]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch KPIs
    const { data: kpiData } = await supabase.from('kpis').select('*').eq('fiscal_year', fiscalYear).order('id');
    
    let allowedKpis = [];
    if (kpiData) {
      allowedKpis = profile?.role === 'admin' 
        ? kpiData 
        : kpiData.filter(k => profile?.responsible_kpis?.includes(k.id));
      setKpis(allowedKpis);
    }

    if (allowedKpis.length > 0) {
      const kpiIds = allowedKpis.map(k => k.id);
      const { data: mData } = await supabase.from('kpi_monthly_data').select('*').in('kpi_id', kpiIds);
      if (mData) setMonthlyData(mData);
    } else {
      setMonthlyData([]);
    }
    
    setLoading(false);
  };

  const handleYearChange = (e) => {
    const y = parseInt(e.target.value);
    setFiscalYear(y);
    localStorage.setItem('fiscalYear', y);
  };

  // Calculate missing data
  const reportData = kpis.map(kpi => {
    const missingMonths = [];
    availableMonths.forEach(m => {
      const record = monthlyData.find(d => d.kpi_id === kpi.id && d.month_year === m.value);
      if (!record || record.value === null || record.value === undefined || record.value === '') {
        missingMonths.push(m.label);
      }
    });
    return { ...kpi, missingMonths };
  });

  const filteredReport = reportData.filter(item => {
    if (item.missingMonths.length === 0) return false; // Only show KPIs with missing data
    if (!searchTerm) return true;
    return item.kpi_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           item.kpi_number.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalMissingItems = filteredReport.length; // Count the number of KPIs, not months

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-600 flex items-center">
            <AlertCircle className="mr-3 text-orange-500" size={28} />
            ข้อมูลที่ต้องติดตาม (Missing Data)
          </h1>
          <p className="text-gray-500 mt-1 text-sm">รายการตัวชี้วัดที่ยังไม่ได้บันทึกผลงาน</p>
        </div>
        <div className="flex space-x-3">
          <select 
            value={fiscalYear} 
            onChange={handleYearChange}
            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 shadow-sm font-medium"
          >
            {getAvailableFiscalYears().map(y => (
              <option key={y} value={y}>ปีงบประมาณ {y}</option>
            ))}
          </select>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="ค้นหาตัวชี้วัด..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredReport.length === 0 ? (
          <div className="p-16 text-center text-gray-500">
            <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={40} className="text-green-500" />
            </div>
            <p className="text-xl font-bold text-gray-800">ยอดเยี่ยมมาก!</p>
            <p className="text-md mt-2">ผลงานตัวชี้วัดครบถ้วน สำหรับปีงบประมาณ {fiscalYear}</p>
          </div>
        ) : (
          <div>
            <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex justify-between items-center">
              <span className="font-semibold text-orange-800">
                พบตัวชี้วัดที่ยังไม่ได้บันทึกผลงานทั้งหมด <span className="text-xl font-bold text-orange-600 mx-1">{totalMissingItems}</span> รายการ
              </span>
              <Link to="/entry" className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors shadow">
                ไปหน้าบันทึกข้อมูล
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-gray-700">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-bold w-16 text-center">รหัส</th>
                    <th className="px-6 py-4 font-bold w-1/2">ชื่อตัวชี้วัด (KPI)</th>
                    <th className="px-6 py-4 font-bold">เดือนที่ต้องติดตาม <span className="text-gray-400 font-normal">(ยังไม่กรอกผลงาน)</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredReport.map(item => (
                    <tr key={item.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-gray-500 text-center">{item.kpi_number}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{item.kpi_name}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {item.missingMonths.map((m, idx) => (
                            <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

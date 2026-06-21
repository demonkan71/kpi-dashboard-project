import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Minus } from 'lucide-react';
import { getFiscalYearMonths, getAvailableFiscalYears } from '../utils/dateUtils';

export default function KpiTable() {
  const [kpis, setKpis] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedQuarter, setSelectedQuarter] = useState('all');
  const [fiscalYear, setFiscalYear] = useState(localStorage.getItem('fiscalYear') ? parseInt(localStorage.getItem('fiscalYear')) : 2569);

  const months = getFiscalYearMonths(fiscalYear);

  useEffect(() => {
    fetchData();
  }, [fiscalYear]);

  const fetchData = async () => {
    setLoading(true);
    const { data: kpiData } = await supabase.from('kpis').select('*').eq('fiscal_year', fiscalYear).order('id');
    const { data: mData } = await supabase.from('kpi_monthly_data').select('*');
    
    if (kpiData) setKpis(kpiData);
    if (mData) setMonthlyData(mData);
    
    // Default collapsed = do not auto-expand
    setExpandedCategories({});
    
    setLoading(false);
  };

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const getMonthlyValue = (kpiId, monthYear) => {
    const record = monthlyData.find(d => d.kpi_id === kpiId && d.month_year === monthYear);
    return record ? record.value : '-';
  };

  const getVisibleMonths = () => {
    switch(selectedQuarter) {
      case 'Q1': return months.slice(0, 3);
      case 'Q2': return months.slice(3, 6);
      case 'Q3': return months.slice(6, 9);
      case 'Q4': return months.slice(9, 12);
      default: return months;
    }
  };

  const visibleMonths = getVisibleMonths();

  const evaluatePassFail = (kpi) => {
    // Find latest data within selected scope
    let latestValue = null;
    for (let i = visibleMonths.length - 1; i >= 0; i--) {
      const v = getMonthlyValue(kpi.id, visibleMonths[i]);
      if (v !== '-' && v !== null && v !== '') {
        latestValue = parseFloat(v);
        break;
      }
    }

    if (latestValue === null || isNaN(latestValue)) return 'none';

    const targetStr = String(kpi.target);
    const match = targetStr.match(/-?\d+(\.\d+)?/);
    if (!match) return 'none';
    const targetNum = parseFloat(match[0]);

    const isDecrease = kpi.kpi_name.includes('ลดลง') || kpi.kpi_name.includes('อัตราตาย') || kpi.kpi_name.includes('เสียชีวิต');

    if (isDecrease) {
      return latestValue <= targetNum ? 'pass' : 'fail';
    } else {
      return latestValue >= targetNum ? 'pass' : 'fail';
    }
  };

  const renderStatus = (status) => {
    if (status === 'pass') return <span className="inline-flex items-center text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"><CheckCircle size={11} className="mr-0.5"/> ผ่าน</span>;
    if (status === 'fail') return <span className="inline-flex items-center text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"><XCircle size={11} className="mr-0.5"/> ไม่ผ่าน</span>;
    return <span className="inline-flex items-center text-gray-400"><Minus size={11} /></span>;
  };

  const categories = [...new Set(kpis.map(k => k.category))];

  const monthNames = {
    '10': 'ต.ค.', '11': 'พ.ย.', '12': 'ธ.ค.',
    '01': 'ม.ค.', '02': 'ก.พ.', '03': 'มี.ค.',
    '04': 'เม.ย.', '05': 'พ.ค.', '06': 'มิ.ย.',
    '07': 'ก.ค.', '08': 'ส.ค.', '09': 'ก.ย.'
  };

  const handleYearChange = (e) => {
    const y = parseInt(e.target.value);
    setFiscalYear(y);
    localStorage.setItem('fiscalYear', y);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-900">ข้อมูลตัวชี้วัด (KPIs)</h1>
        <div className="flex space-x-3 items-center">
          <select 
            value={fiscalYear} 
            onChange={handleYearChange}
            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 shadow-sm font-medium"
          >
            {getAvailableFiscalYears().map(y => (
              <option key={y} value={y}>ปีงบประมาณ {y}</option>
            ))}
          </select>
          <select 
            value={selectedQuarter} 
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 shadow-sm font-medium"
          >
            <option value="all">แสดงทั้งปี</option>
            <option value="Q1">ไตรมาส 1 (ต.ค.-ธ.ค.)</option>
            <option value="Q2">ไตรมาส 2 (ม.ค.-มี.ค.)</option>
            <option value="Q3">ไตรมาส 3 (เม.ย.-มิ.ย.)</option>
            <option value="Q4">ไตรมาส 4 (ก.ค.-ก.ย.)</option>
          </select>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64"><div className="spinner"></div></div>
      ) : (
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
          <table className="w-full text-xs text-left text-gray-500">
            <thead className="text-xs text-white uppercase bg-blue-900">
              <tr>
                <th scope="col" className="px-3 py-2 min-w-[50px]">รหัส</th>
                <th scope="col" className="px-3 py-2 min-w-[220px]">ตัวชี้วัด</th>
                <th scope="col" className="px-3 py-2 min-w-[60px]">เป้าหมาย</th>
                <th scope="col" className="px-3 py-2 min-w-[60px]">หน่วย</th>
                <th scope="col" className="px-3 py-2 min-w-[75px] text-center">สถานะล่าสุด</th>
                {visibleMonths.map(m => <th key={m} scope="col" className="px-2 py-2 text-center">{monthNames[m.split('-')[0]]}</th>)}
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <React.Fragment key={cat}>
                  <tr className="bg-blue-50 border-b hover:bg-blue-100 cursor-pointer" onClick={() => toggleCategory(cat)}>
                    <td colSpan={17} className="px-3 py-2 font-bold text-xs text-blue-900 border-l-4 border-blue-600">
                      <div className="flex items-center gap-2">
                        {expandedCategories[cat] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        {cat}
                      </div>
                    </td>
                  </tr>
                  {expandedCategories[cat] && kpis.filter(k => k.category === cat).map((kpi, idx) => {
                    const status = evaluatePassFail(kpi);
                    return (
                      <tr key={kpi.id} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-3 py-2 font-semibold text-gray-700">{kpi.kpi_number}</td>
                        <td className="px-3 py-2 text-gray-900 font-medium text-[11px] leading-tight">{kpi.kpi_name}</td>
                        <td className="px-3 py-2 font-bold text-blue-800">{kpi.target}</td>
                        <td className="px-3 py-2 text-gray-500 text-[10px]">{kpi.unit}</td>
                        <td className="px-3 py-2 text-center">{renderStatus(status)}</td>
                        {visibleMonths.map(m => (
                          <td key={m} className="px-2 py-2 text-center font-medium text-gray-700">{getMonthlyValue(kpi.id, m)}</td>
                        ))}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

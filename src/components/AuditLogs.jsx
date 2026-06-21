import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { History, Search, Filter } from 'lucide-react';
import { getFiscalYearMonthDetails, getAvailableFiscalYears } from '../utils/dateUtils';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fiscalYear, setFiscalYear] = useState(localStorage.getItem('fiscalYear') ? parseInt(localStorage.getItem('fiscalYear')) : 2569);

  // We fetch kpis and profiles to map IDs to names locally, avoiding foreign key setup issues
  const [kpisMap, setKpisMap] = useState({});
  const [kpisYearMap, setKpisYearMap] = useState({});
  const [usersMap, setUsersMap] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch reference data
    const [ { data: kpiData }, { data: profileData }, { data: auditData } ] = await Promise.all([
      supabase.from('kpis').select('id, kpi_name, fiscal_year'),
      supabase.from('profiles').select('id, full_name'),
      supabase.from('audit_logs').select('*').order('updated_at', { ascending: false })
    ]);

    const kMap = {};
    const kyMap = {};
    if (kpiData) {
      kpiData.forEach(k => {
        kMap[k.id] = k.kpi_name;
        kyMap[k.id] = k.fiscal_year;
      });
    }
    setKpisMap(kMap);
    setKpisYearMap(kyMap);

    const uMap = {};
    if (profileData) profileData.forEach(u => uMap[u.id] = u.full_name || 'ผู้ใช้ (ไม่มีชื่อ)');
    setUsersMap(uMap);

    if (auditData) setLogs(auditData);
    setLoading(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    // Thai format: DD/MM/YYYY HH:mm
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear() + 543;
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} เวลา ${hours}:${minutes} น.`;
  };

  const getMonthLabel = (monthYearStr) => {
    // e.g. "10-2568"
    if (!monthYearStr) return '-';
    const parts = monthYearStr.split('-');
    if (parts.length !== 2) return monthYearStr;
    const m = parts[0];
    const y = parts[1];
    
    const monthNames = {
      '10': 'ต.ค.', '11': 'พ.ย.', '12': 'ธ.ค.',
      '01': 'ม.ค.', '02': 'ก.พ.', '03': 'มี.ค.',
      '04': 'เม.ย.', '05': 'พ.ค.', '06': 'มิ.ย.',
      '07': 'ก.ค.', '08': 'ส.ค.', '09': 'ก.ย.'
    };
    return `${monthNames[m] || m} ${y}`;
  };

  const filteredLogs = logs.filter(log => {
    // Filter by fiscal year first
    const logYear = kpisYearMap[log.kpi_id];
    if (logYear && logYear !== fiscalYear) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const kpiName = (kpisMap[log.kpi_id] || '').toLowerCase();
    const userName = (usersMap[log.updated_by] || '').toLowerCase();
    return kpiName.includes(term) || userName.includes(term);
  });

  const handleYearChange = (e) => {
    const y = parseInt(e.target.value);
    setFiscalYear(y);
    localStorage.setItem('fiscalYear', y);
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 flex items-center">
            <History className="mr-3 text-blue-600" size={28} />
            ประวัติการแก้ไขข้อมูล (Audit Logs)
          </h1>
          <p className="text-gray-500 mt-1 text-sm">ตรวจสอบประวัติการบันทึกหรือเปลี่ยนแปลงข้อมูลตัวเลข</p>
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
              placeholder="ค้นหา KPI หรือ ชื่อผู้ใช้..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <History size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">ไม่พบประวัติการอัปเดตข้อมูล</p>
            {searchTerm && <p className="text-sm mt-1">ลองเปลี่ยนคำค้นหาใหม่</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-bold">วัน/เวลาที่บันทึก</th>
                  <th className="px-6 py-4 font-bold">ผู้แก้ไข</th>
                  <th className="px-6 py-4 font-bold w-1/3">ตัวชี้วัด (KPI)</th>
                  <th className="px-6 py-4 font-bold">รอบเดือน</th>
                  <th className="px-6 py-4 font-bold text-center">ค่าเดิม</th>
                  <th className="px-6 py-4 font-bold text-center">ค่าใหม่</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {formatDate(log.updated_at)}
                    </td>
                    <td className="px-6 py-4">
                      {usersMap[log.updated_by] || <span className="text-gray-400 italic">ไม่ทราบชื่อ</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="line-clamp-2" title={kpisMap[log.kpi_id]}>
                        {kpisMap[log.kpi_id] || `KPI ID: ${log.kpi_id}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {getMonthLabel(log.month_year)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono text-xs">
                        {log.old_value !== null ? log.old_value : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono text-xs font-bold">
                        {log.new_value !== null ? log.new_value : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

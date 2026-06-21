import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';
import { PlusCircle, Edit, Trash2, CheckCircle, XCircle, Minus, Search } from 'lucide-react';
import { getFiscalYearMonths, getAvailableFiscalYears } from '../utils/dateUtils';

export default function KpiManagement() {
  const [kpis, setKpis] = useState([]);
  const [monthlyDataMap, setMonthlyDataMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fiscalYear, setFiscalYear] = useState(localStorage.getItem('fiscalYear') ? parseInt(localStorage.getItem('fiscalYear')) : 2569);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ id: null, kpi_number: '', kpi_name: '', target: '', unit: '', category: '' });

  const months = getFiscalYearMonths(fiscalYear);

  useEffect(() => {
    fetchKpis();
  }, [fiscalYear]);

  const fetchKpis = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('kpis').select('*').eq('fiscal_year', fiscalYear).order('id');
    if (data) setKpis(data);

    // Fetch all monthly data for status badges
    const { data: mData } = await supabase.from('kpi_monthly_data').select('*');
    if (mData) {
      const map = {};
      mData.forEach(d => {
        if (!map[d.kpi_id]) map[d.kpi_id] = {};
        map[d.kpi_id][d.month_year] = d.value;
      });
      setMonthlyDataMap(map);
    }

    setLoading(false);
  };

  const getLatestStatus = (kpi) => {
    const kpiData = monthlyDataMap[kpi.id];
    if (!kpiData) return null;

    // Find the latest month with data (iterate backwards)
    let latestValue = null;
    for (let i = months.length - 1; i >= 0; i--) {
      if (kpiData[months[i]] !== undefined && kpiData[months[i]] !== null) {
        latestValue = kpiData[months[i]];
        break;
      }
    }

    if (latestValue === null) return null;

    // Parse target number
    const targetStr = String(kpi.target || '');
    const targetMatch = targetStr.match(/[\d.]+/);
    if (!targetMatch) return null;
    const targetNum = parseFloat(targetMatch[0]);

    // Determine if lower is better
    const name = kpi.kpi_name || '';
    const isLowerBetter = name.includes('ลดลง') || name.includes('อัตราตาย') || name.includes('เสียชีวิต');

    const val = parseFloat(latestValue);
    if (isNaN(val) || isNaN(targetNum)) return null;

    if (isLowerBetter) {
      return val <= targetNum ? 'pass' : 'fail';
    } else {
      return val >= targetNum ? 'pass' : 'fail';
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        // Update
        const { error } = await supabase.from('kpis').update({
          kpi_number: formData.kpi_number,
          kpi_name: formData.kpi_name,
          target: formData.target,
          unit: formData.unit,
          category: formData.category
        }).eq('id', formData.id);
        if (error) throw error;
        Swal.fire('สำเร็จ', 'แก้ไขข้อมูลตัวชี้วัดเรียบร้อย', 'success');
      } else {
        // Insert
        const { error } = await supabase.from('kpis').insert([{
          kpi_number: formData.kpi_number,
          kpi_name: formData.kpi_name,
          target: formData.target,
          unit: formData.unit,
          category: formData.category,
          fiscal_year: fiscalYear
        }]);
        if (error) throw error;
        Swal.fire('สำเร็จ', 'เพิ่มตัวชี้วัดใหม่เรียบร้อย', 'success');
      }
      setShowForm(false);
      setFormData({ id: null, kpi_number: '', kpi_name: '', target: '', unit: '', category: '' });
      fetchKpis();
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    }
  };

  const handleEdit = (kpi) => {
    setFormData(kpi);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: "คุณต้องการลบตัวชี้วัดนี้ใช่หรือไม่? ข้อมูลผลงานรายเดือนที่ผูกกับตัวชี้วัดนี้จะถูกลบไปด้วย",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('kpis').delete().eq('id', id);
        if (error) throw error;
        Swal.fire('ลบสำเร็จ', '', 'success');
        fetchKpis();
      } catch (err) {
        Swal.fire('ข้อผิดพลาด', err.message, 'error');
      }
    }
  };

  // Filter KPIs by search term
  const filteredKpis = kpis.filter(kpi =>
    kpi.kpi_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleYearChange = (e) => {
    const y = parseInt(e.target.value);
    setFiscalYear(y);
    localStorage.setItem('fiscalYear', y);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-900">จัดการตัวชี้วัด</h1>
        <div className="flex items-center space-x-3">
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
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาตัวชี้วัด..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white w-64"
            />
          </div>
          <button
            onClick={() => {
              setFormData({ id: null, kpi_number: '', kpi_name: '', target: '', unit: '', category: '' });
              setShowForm(!showForm);
            }}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            <PlusCircle size={18} /> <span>{showForm ? 'ยกเลิก' : 'เพิ่มตัวชี้วัดใหม่'}</span>
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-blue-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">{formData.id ? 'แก้ไขตัวชี้วัด' : 'เพิ่มตัวชี้วัดใหม่'}</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">รหัสตัวชี้วัด</label>
                <input type="text" name="kpi_number" value={formData.kpi_number} onChange={handleInputChange} required className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="เช่น 1. หรือ 1.1" />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">หมวดหมู่ / ประเด็น</label>
                <input type="text" name="category" value={formData.category} onChange={handleInputChange} required className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="เช่น ประเด็นที่ 1 : ..." />
              </div>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900">ชื่อตัวชี้วัด</label>
              <input type="text" name="kpi_name" value={formData.kpi_name} onChange={handleInputChange} required className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">เป้าหมาย</label>
                <input type="text" name="target" value={formData.target} onChange={handleInputChange} required className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="เช่น 80 หรือ ลดลงร้อยละ 5" />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">หน่วย</label>
                <input type="text" name="unit" value={formData.unit} onChange={handleInputChange} required className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="เช่น ร้อยละ, อัตรา" />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">ยกเลิก</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">บันทึกข้อมูล</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64"><div className="spinner"></div></div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-white uppercase bg-blue-900">
              <tr>
                <th className="px-4 py-3">รหัส</th>
                <th className="px-4 py-3">ตัวชี้วัด</th>
                <th className="px-4 py-3">เป้าหมาย</th>
                <th className="px-4 py-3 text-center">สถานะล่าสุด</th>
                <th className="px-4 py-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredKpis.map((kpi, idx) => {
                const status = getLatestStatus(kpi);
                return (
                  <tr key={kpi.id} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{kpi.kpi_number}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-md truncate" title={kpi.kpi_name}>{kpi.kpi_name}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      <span className="font-semibold">{kpi.target}</span>
                      {kpi.unit && <span className="text-xs text-gray-400 ml-1">({kpi.unit})</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {status === 'pass' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                          <CheckCircle size={14} />
                          <span>ผ่าน</span>
                        </span>
                      ) : status === 'fail' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                          <XCircle size={14} />
                          <span>ไม่ผ่าน</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                          <Minus size={14} />
                          <span>ไม่มีข้อมูล</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center space-x-2">
                      <button onClick={() => handleEdit(kpi)} className="inline-flex items-center text-blue-600 hover:text-blue-900" title="แก้ไข">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDelete(kpi.id)} className="inline-flex items-center text-red-600 hover:text-red-900" title="ลบ">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredKpis.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">ไม่พบข้อมูลตัวชี้วัด</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

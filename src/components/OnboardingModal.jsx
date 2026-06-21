import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';
import { Target, Info } from 'lucide-react';

export default function OnboardingModal({ profile, onComplete }) {
  const [categories, setCategories] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [takenKpis, setTakenKpis] = useState([]);
  
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedKpis, setSelectedKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: kpiData, error: kpiError } = await supabase.from('kpis').select('*').order('kpi_number', { ascending: true });
      if (kpiError) throw kpiError;
      
      setKpis(kpiData || []);
      const uniqueCategories = [...new Set((kpiData || []).map(k => k.category))].filter(Boolean);
      setCategories(uniqueCategories);

      const { data: profileData, error: profileError } = await supabase.from('profiles').select('id, responsible_kpis');
      if (profileError) throw profileError;

      const taken = [];
      if (profileData) {
        profileData.forEach(p => {
          // don't count their own existing KPIs just in case
          if (p.id !== profile.id && p.responsible_kpis && Array.isArray(p.responsible_kpis)) {
            taken.push(...p.responsible_kpis);
          }
        });
      }
      setTakenKpis(taken);

    } catch (err) {
      console.error('Error fetching onboarding data:', err);
      Swal.fire('Error', 'ไม่สามารถดึงข้อมูลได้: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (cat) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleKpiChange = (kpiId) => {
    if (selectedKpis.includes(kpiId)) {
      setSelectedKpis(prev => prev.filter(id => id !== kpiId));
    } else {
      if (selectedKpis.length >= 10) {
        Swal.fire({ icon: 'warning', title: 'เลือกได้สูงสุด 10 ตัวชี้วัด', text: 'คุณได้เลือกครบจำนวนที่กำหนดแล้ว' });
        return;
      }
      setSelectedKpis(prev => [...prev, kpiId]);
    }
  };

  const handleSave = async (kpisToSave, categoriesToSave, newRole) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        responsible_category: categoriesToSave,
        responsible_kpis: kpisToSave,
        role: newRole
      }).eq('id', profile.id);

      if (error) throw error;
      
      Swal.fire({
        icon: 'success',
        title: 'ตั้งค่าสำเร็จ',
        text: 'ระบบได้บันทึกตัวชี้วัดที่คุณรับผิดชอบเรียบร้อยแล้ว',
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        onComplete();
      });

    } catch (err) {
      Swal.fire('Error', err.message, 'error');
      setSaving(false);
    }
  };

  const submitSelection = () => {
    if (selectedKpis.length === 0) {
      Swal.fire({
        title: 'ยืนยันการตั้งค่า?',
        text: "คุณยังไม่ได้เลือกตัวชี้วัดใดๆ ระบบจะกำหนดสิทธิ์ให้คุณเป็น 'ผู้เยี่ยมชม' (Viewer) ต้องการดำเนินการต่อหรือไม่?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก'
      }).then((result) => {
        if (result.isConfirmed) {
          handleSave([], [], 'viewer');
        }
      });
    } else {
      handleSave(selectedKpis, selectedCategories, profile.role || 'user');
    }
  };

  const filteredKpis = kpis.filter(kpi => selectedCategories.length === 0 || selectedCategories.includes(kpi.category));

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
        <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">กำลังเตรียมข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-fade-in-up">
        
        {/* Header */}
        <div className="bg-blue-900 text-white p-6">
          <div className="flex items-center mb-2">
            <Target className="w-6 h-6 mr-3 text-cyan-400" />
            <h2 className="text-xl font-bold">เลือกตัวชี้วัดที่รับผิดชอบ</h2>
          </div>
          <p className="text-blue-200 text-sm">เนื่องจากคุณระบุว่าเป็นผู้รับผิดชอบตัวชี้วัด กรุณาเลือกประเด็นและรายการตัวชี้วัดของคุณ</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-gray-50">
          
          {/* Categories */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-800 mb-2 flex items-center">
              1. เลือกประเด็นที่เกี่ยวข้อง 
              <span className="ml-2 text-xs font-normal text-gray-500">(เลือกได้มากกว่า 1 ประเด็น)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.map((cat, idx) => (
                <label key={idx} className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${selectedCategories.includes(cat) ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <input type="checkbox" className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => handleCategoryChange(cat)} />
                  <span className="ml-2 text-sm text-gray-700 leading-tight">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <h3 className="text-base font-bold text-gray-800">
                2. เลือกตัวชี้วัด <span className="text-xs font-normal text-gray-500">(สูงสุด 10 ตัว)</span>
              </h3>
              <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-800 rounded-md border border-blue-200">
                เลือกแล้ว: {selectedKpis.length}/10
              </span>
            </div>

            <div className="space-y-2 border border-gray-200 rounded-xl p-3 bg-white shadow-inner max-h-80 overflow-y-auto custom-scrollbar">
              {filteredKpis.length > 0 ? filteredKpis.map(kpi => {
                const isTaken = takenKpis.includes(kpi.id);
                const isSelected = selectedKpis.includes(kpi.id);
                return (
                  <label key={kpi.id} className={`flex items-start p-3 rounded-lg border transition-colors ${
                    isTaken ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed' : 
                    isSelected ? 'bg-blue-50 border-blue-300 shadow-sm cursor-pointer' : 'bg-white border-gray-100 hover:border-blue-200 hover:bg-gray-50 cursor-pointer'
                  }`}>
                    <input 
                      type="checkbox" 
                      className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                      checked={isSelected}
                      disabled={isTaken && !isSelected}
                      onChange={() => handleKpiChange(kpi.id)} 
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-800">
                        <span className="font-bold text-blue-700 mr-1">{kpi.kpi_number}</span> 
                        {kpi.kpi_name}
                      </div>
                      {isTaken && !isSelected && (
                        <span className="inline-block mt-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200">
                          มีผู้รับผิดชอบแล้ว
                        </span>
                      )}
                    </div>
                  </label>
                );
              }) : (
                <div className="p-8 text-center text-sm text-gray-500 flex flex-col items-center">
                  <Info className="w-8 h-8 text-gray-300 mb-2" />
                  ไม่มีตัวชี้วัดในประเด็นที่เลือก หรือยังไม่มีข้อมูลในระบบ
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-white p-4 border-t border-gray-200 flex justify-between items-center">
          <button 
            onClick={() => {
              handleSave([], [], 'viewer');
            }}
            disabled={saving}
            className="text-sm text-gray-500 hover:text-gray-800 font-medium px-4 py-2"
          >
            ฉันไม่มีตัวชี้วัดรับผิดชอบ (ขอเป็นผู้เข้าชม)
          </button>

          <button
            onClick={submitSelection}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-colors disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลและเข้าสู่ระบบ'}
          </button>
        </div>

      </div>
    </div>
  );
}

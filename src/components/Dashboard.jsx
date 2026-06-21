import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FileDown, FileText, CheckCircle, XCircle, BarChart3, TrendingUp, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
  RadarController,
  RadialLinearScale,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Radar } from 'react-chartjs-2';
import { getFiscalYearMonths, getAvailableFiscalYears, getFiscalYearMonthDetails } from '../utils/dateUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
  RadarController,
  RadialLinearScale,
  Filler
);

export default function Dashboard({ profile }) {
  const [stats, setStats] = useState({ total: 0, passed: 0, failed: 0, score: 0 });
  const [passedKpis, setPassedKpis] = useState([]);
  const [failedKpis, setFailedKpis] = useState([]);
  const [categoryStats, setCategoryStats] = useState({});
  const [missingDataCount, setMissingDataCount] = useState(0);
  const [fiscalYear, setFiscalYear] = useState(localStorage.getItem('fiscalYear') ? parseInt(localStorage.getItem('fiscalYear')) : 2569);
  const [quarterlyStats, setQuarterlyStats] = useState({ 
    Q1: { passed: 0, total: 0 }, 
    Q2: { passed: 0, total: 0 }, 
    Q3: { passed: 0, total: 0 }, 
    Q4: { passed: 0, total: 0 } 
  });
  const [loading, setLoading] = useState(true);

  const months = getFiscalYearMonths(fiscalYear);

  useEffect(() => {
    fetchData();
  }, [fiscalYear]);

  const fetchData = async () => {
    setLoading(true);
    const { data: kpiData } = await supabase.from('kpis').select('*').eq('fiscal_year', fiscalYear);
    const { data: mData } = await supabase.from('kpi_monthly_data').select('*');

    if (kpiData && mData) {
      const pList = [];
      const fList = [];
      const catMap = {};
      const qStats = { 
        Q1: { passed: 0, total: 0 }, 
        Q2: { passed: 0, total: 0 }, 
        Q3: { passed: 0, total: 0 }, 
        Q4: { passed: 0, total: 0 } 
      };

      const evaluateQuarter = (kpi, qMonths) => {
        let latestValue = null;
        for (let i = qMonths.length - 1; i >= 0; i--) {
          const record = mData.find(d => d.kpi_id === kpi.id && d.month_year === qMonths[i]);
          const v = record ? record.value : '-';
          if (v !== '-' && v !== null && v !== '') {
            latestValue = parseFloat(v);
            break;
          }
        }
        if (latestValue !== null && !isNaN(latestValue)) {
          const targetStr = String(kpi.target);
          const match = targetStr.match(/-?\d+(\.\d+)?/);
          if (match) {
            const targetNum = parseFloat(match[0]);
            const isDecrease = kpi.kpi_name.includes('ลดลง') || kpi.kpi_name.includes('อัตราตาย') || kpi.kpi_name.includes('เสียชีวิต');
            return isDecrease ? latestValue <= targetNum : latestValue >= targetNum;
          }
        }
        return null; // not evaluated
      };

      kpiData.forEach(kpi => {
        // Find latest data
        let latestValue = null;
        for (let i = months.length - 1; i >= 0; i--) {
          const record = mData.find(d => d.kpi_id === kpi.id && d.month_year === months[i]);
          const v = record ? record.value : '-';
          if (v !== '-' && v !== null && v !== '') {
            latestValue = parseFloat(v);
            break;
          }
        }

        if (latestValue !== null && !isNaN(latestValue)) {
          const targetStr = String(kpi.target);
          const match = targetStr.match(/-?\d+(\.\d+)?/);
          if (match) {
            const targetNum = parseFloat(match[0]);
            const isDecrease = kpi.kpi_name.includes('ลดลง') || kpi.kpi_name.includes('อัตราตาย') || kpi.kpi_name.includes('เสียชีวิต');

            let passed = false;
            if (isDecrease) {
              passed = latestValue <= targetNum;
            } else {
              passed = latestValue >= targetNum;
            }

            if (passed) pList.push(kpi);
            else fList.push(kpi);

            // Track per-category stats
            const cat = kpi.category || 'ไม่ระบุ';
            if (!catMap[cat]) catMap[cat] = { passed: 0, failed: 0 };
            if (passed) catMap[cat].passed++;
            else catMap[cat].failed++;
          }
        }

        // Track per-quarter stats
        const q1Result = evaluateQuarter(kpi, [months[0], months[1], months[2]]);
        if (q1Result !== null) { qStats.Q1.total++; if (q1Result) qStats.Q1.passed++; }
        const q2Result = evaluateQuarter(kpi, [months[3], months[4], months[5]]);
        if (q2Result !== null) { qStats.Q2.total++; if (q2Result) qStats.Q2.passed++; }
        const q3Result = evaluateQuarter(kpi, [months[6], months[7], months[8]]);
        if (q3Result !== null) { qStats.Q3.total++; if (q3Result) qStats.Q3.passed++; }
        const q4Result = evaluateQuarter(kpi, [months[9], months[10], months[11]]);
        if (q4Result !== null) { qStats.Q4.total++; if (q4Result) qStats.Q4.passed++; }
      });

      setPassedKpis(pList);
      setFailedKpis(fList);
      setCategoryStats(catMap);
      setQuarterlyStats(qStats);

      const totalEvaluated = pList.length + fList.length;
      const score = totalEvaluated > 0 ? Math.round((pList.length / totalEvaluated) * 100) : 0;

      setStats({
        total: kpiData.length,
        passed: pList.length,
        failed: fList.length,
        score: score
      });

      // Calculate missing data
      if (profile && profile.status === 'approved') {
        let missing = 0;
        const currentRealDate = new Date();
        const allMonthsDetails = getFiscalYearMonthDetails(fiscalYear);
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
      } else {
        setMissingDataCount(0);
      }
    }
    setLoading(false);
  };

  const handleYearChange = (e) => {
    const y = parseInt(e.target.value);
    setFiscalYear(y);
    localStorage.setItem('fiscalYear', y);
  };

  const exportExcel = async () => {
    const { data: kpiData } = await supabase.from('kpis').select('*').eq('fiscal_year', fiscalYear).order('id');
    const { data: mData } = await supabase.from('kpi_monthly_data').select('*');

    if (!kpiData) return;

    const monthNames = {
      '10': 'ต.ค.', '11': 'พ.ย.', '12': 'ธ.ค.',
      '01': 'ม.ค.', '02': 'ก.พ.', '03': 'มี.ค.',
      '04': 'เม.ย.', '05': 'พ.ค.', '06': 'มิ.ย.',
      '07': 'ก.ค.', '08': 'ส.ค.', '09': 'ก.ย.'
    };

    const formatted = kpiData.map(k => {
      const row = {
        'รหัส': k.kpi_number,
        'ตัวชี้วัด': k.kpi_name,
        'เป้าหมาย': k.target,
        'หน่วย': k.unit,
        'หมวดหมู่': k.category
      };
      months.forEach(m => {
        const record = (mData || []).find(d => d.kpi_id === k.id && d.month_year === m);
        const shortMonth = monthNames[m.split('-')[0]];
        row[shortMonth] = record ? record.value : '-';
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(formatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KPIs");
    XLSX.writeFile(wb, `KPI_Report_${fiscalYear}.xlsx`);
  };

  const exportPDF = async () => {
    const element = document.getElementById('dashboard-content');
    if (!element) return;

    try {
      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#f9fafb',
      });

      const pdf = new jsPDF('l', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const img = new Image();
      img.src = dataUrl;
      await new Promise(resolve => img.onload = resolve);
      
      const imgWidth = img.width;
      const imgHeight = img.height;
      
      const ratio = pdfWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;
      
      if (scaledHeight <= pdfHeight) {
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, scaledHeight);
      } else {
        let position = 0;
        let remainingHeight = scaledHeight;
        while (remainingHeight > 0) {
          pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, scaledHeight);
          remainingHeight -= pdfHeight;
          position -= pdfHeight;
          if (remainingHeight > 0) pdf.addPage();
        }
      }
      
      pdf.save(`KPI_Dashboard_${fiscalYear}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('เกิดข้อผิดพลาดในการส่งออก PDF: ' + err.message);
    }
  };

  const getCategoryLabel = (cat, i) => {
    if (cat.includes('1')) return 'PP&P Excellence';
    if (cat.includes('2')) return 'Service Excellence';
    if (cat.includes('3')) return 'People Excellence';
    if (cat.includes('4')) return 'Governance Excellence';
    const m = cat.match(/ประเด็น\s*\d+/);
    return m ? m[0] : `ประเด็น ${i + 1}`;
  };

  const categoryLabels = Object.keys(categoryStats);
  const categoryBarData = {
    labels: categoryLabels.map((cat, i) => getCategoryLabel(cat, i)),
    datasets: [
      {
        label: 'ผ่านเกณฑ์',
        data: categoryLabels.map(c => categoryStats[c].passed),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderRadius: 4,
        barThickness: 18
      },
      {
        label: 'ไม่ผ่านเกณฑ์',
        data: categoryLabels.map(c => categoryStats[c].failed),
        backgroundColor: 'rgba(239, 68, 68, 0.85)',
        borderRadius: 4,
        barThickness: 18
      }
    ]
  };

  const categoryBarOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { font: { size: 12, weight: 'bold' }, padding: 16, usePointStyle: true, pointStyleWidth: 14 }
      },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.raw || 0;
            const dataIndex = context.dataIndex;
            const cat = categoryLabels[dataIndex];
            const total = categoryStats[cat].passed + categoryStats[cat].failed;
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} (${pct}%)`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        beginAtZero: true,
        ticks: { stepSize: 1, font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.04)' }
      },
      y: {
        stacked: true,
        ticks: { font: { size: 11, weight: '600' } },
        grid: { display: false }
      }
    }
  };

  const radarLabels = categoryLabels.map((cat, i) => getCategoryLabel(cat, i));
  const radarValues = categoryLabels.map(c => {
    const total = categoryStats[c].passed + categoryStats[c].failed;
    return total > 0 ? Math.round((categoryStats[c].passed / total) * 100) : 0;
  });

  const radarData = {
    labels: radarLabels,
    datasets: [
      {
        label: 'อัตราผ่านเกณฑ์ (%)',
        data: radarValues,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderColor: 'rgba(59, 130, 246, 0.8)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true
      }
    ]
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { font: { size: 12, weight: 'bold' }, padding: 12, usePointStyle: true }
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 20, backdropColor: 'transparent', font: { size: 10 } },
        pointLabels: { font: { size: 12, weight: '600' }, color: '#374151' },
        grid: { color: 'rgba(0,0,0,0.06)' },
        angleLines: { color: 'rgba(0,0,0,0.06)' }
      }
    }
  };

  const doughnutData = {
    labels: ['ผ่านเกณฑ์', 'ไม่ผ่านเกณฑ์'],
    datasets: [{
      data: [stats.passed, stats.failed],
      backgroundColor: ['#10b981', '#ef4444'],
      hoverBackgroundColor: ['#059669', '#dc2626'],
      borderWidth: 0
    }]
  };

  const doughnutOptions = {
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false }
    }
  };

  const quarterBarData = {
    labels: ['ไตรมาส 1 (ต.ค.-ธ.ค.)', 'ไตรมาส 2 (ม.ค.-มี.ค.)', 'ไตรมาส 3 (เม.ย.-มิ.ย.)', 'ไตรมาส 4 (ก.ค.-ก.ย.)'],
    datasets: [
      {
        label: 'อัตราผ่านเกณฑ์ (%)',
        data: [
          quarterlyStats.Q1.total > 0 ? Math.round((quarterlyStats.Q1.passed / quarterlyStats.Q1.total) * 100) : 0,
          quarterlyStats.Q2.total > 0 ? Math.round((quarterlyStats.Q2.passed / quarterlyStats.Q2.total) * 100) : 0,
          quarterlyStats.Q3.total > 0 ? Math.round((quarterlyStats.Q3.passed / quarterlyStats.Q3.total) * 100) : 0,
          quarterlyStats.Q4.total > 0 ? Math.round((quarterlyStats.Q4.passed / quarterlyStats.Q4.total) * 100) : 0,
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.85)',
        borderRadius: 4,
        barThickness: 32
      }
    ]
  };

  const quarterBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `ผ่านเกณฑ์: ${context.raw}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 20 }
      }
    }
  };

  const statCards = [
    {
      label: 'ตัวชี้วัดทั้งหมด',
      value: stats.total,
      sub: 'รายการ',
      gradient: 'bg-gradient-to-br from-blue-600 to-blue-800',
      icon: <BarChart3 size={28} className="opacity-80" />
    },
    {
      label: 'ผ่านเกณฑ์',
      value: stats.passed,
      sub: `รายการ (${stats.total > 0 ? Math.round(stats.passed / stats.total * 100) : 0}%)`,
      gradient: 'bg-gradient-to-br from-green-500 to-emerald-700',
      icon: <CheckCircle size={28} className="opacity-80" />
    },
    {
      label: 'ไม่ผ่านเกณฑ์',
      value: stats.failed,
      sub: `รายการ (${stats.total > 0 ? Math.round(stats.failed / stats.total * 100) : 0}%)`,
      gradient: 'bg-gradient-to-br from-red-500 to-rose-700',
      icon: <XCircle size={28} className="opacity-80" />
    },
    {
      label: 'คะแนนเฉลี่ย',
      value: `${stats.score}%`,
      sub: 'ประสิทธิภาพรวม',
      gradient: 'bg-gradient-to-br from-cyan-500 to-blue-600',
      icon: <TrendingUp size={28} className="opacity-80" />
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-500 font-medium">กำลังโหลดข้อมูล...</span>
        </div>
      </div>
    );
  }

  return (
    <div id="dashboard-content" className="p-2">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-900">ภาพรวม (Dashboard)</h1>
        <div className="flex space-x-2 items-center">
          <select 
            value={fiscalYear} 
            onChange={handleYearChange}
            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 shadow-sm font-medium"
          >
            {getAvailableFiscalYears().map(y => (
              <option key={y} value={y}>ปีงบประมาณ {y}</option>
            ))}
          </select>
          <button
            onClick={exportExcel}
            className="flex items-center space-x-2 bg-green-700 hover:bg-green-800 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors shadow cursor-pointer"
          >
            <FileDown size={16} /> <span>Excel</span>
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors shadow cursor-pointer"
          >
            <FileText size={16} /> <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Premium Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card, idx) => (
          <div
            key={idx}
            className={`${card.gradient} rounded-2xl shadow-lg p-5 text-white relative overflow-hidden transition-transform hover:scale-[1.02]`}
          >
            {/* Decorative circle */}
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10"></div>
            <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-white/5"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider opacity-90">{card.label}</span>
              {card.icon}
            </div>
            <div className="text-3xl font-extrabold mb-1">{card.value}</div>
            <div className="text-xs opacity-80">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1: Category Bar + Doughnut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h5 className="text-base font-bold text-gray-800 mb-4">สรุปผลตามประเด็น (Category Summary)</h5>
          <div style={{ height: Math.max(categoryLabels.length * 48, 200) }} className="flex items-center justify-center">
            {categoryLabels.length > 0 ? (
              <Bar data={categoryBarData} options={categoryBarOptions} />
            ) : (
              <p className="text-gray-400 text-sm">ยังไม่มีข้อมูลประเด็น</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h5 className="text-base font-bold text-gray-800 mb-4">สัดส่วนการผ่านเกณฑ์</h5>
          <div className="h-56 flex items-center justify-center mb-4">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
          <div className="flex justify-center items-center space-x-6 mt-2">
            <div className="flex items-center text-sm font-bold text-gray-700">
              <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span> ผ่าน {stats.passed}
            </div>
            <div className="flex items-center text-sm font-bold text-gray-700">
              <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span> ไม่ผ่าน {stats.failed}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Radar Chart & Quarterly Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h5 className="text-base font-bold text-gray-800 mb-4">อัตราผ่านเกณฑ์ตามประเด็น (Radar)</h5>
          <div className="h-80 max-w-xl mx-auto flex items-center justify-center">
            {radarLabels.length > 0 ? (
              <Radar data={radarData} options={radarOptions} />
            ) : (
              <p className="text-gray-400 text-sm">ยังไม่มีข้อมูลประเด็น</p>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h5 className="text-base font-bold text-gray-800 mb-4">อัตราผ่านเกณฑ์รายไตรมาส (%)</h5>
          <div className="h-80 flex items-center justify-center">
            <Bar data={quarterBarData} options={quarterBarOptions} />
          </div>
        </div>
      </div>


      {/* Pass / Fail KPI Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h5 className="text-base font-bold text-green-600 mb-4 flex items-center">
            <CheckCircle size={20} className="mr-2" /> รายชื่อตัวชี้วัดที่ &quot;ผ่านเกณฑ์&quot;
          </h5>
          <div className="overflow-y-auto max-h-80 pr-2">
            {passedKpis.length > 0 ? (
              <ul className="space-y-2">
                {passedKpis.map(k => (
                  <li key={k.id} className="px-3 py-2 bg-green-50 rounded-lg text-xs border border-green-100 hover:bg-green-100 transition-colors">
                    <span className="font-bold text-green-800 mr-1">{k.kpi_number}</span>
                    <span className="text-gray-700">{k.kpi_name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">ยังไม่มีข้อมูล</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h5 className="text-base font-bold text-red-600 mb-4 flex items-center">
            <XCircle size={20} className="mr-2" /> รายชื่อตัวชี้วัดที่ &quot;ไม่ผ่านเกณฑ์&quot;
          </h5>
          <div className="overflow-y-auto max-h-80 pr-2">
            {failedKpis.length > 0 ? (
              <ul className="space-y-2">
                {failedKpis.map(k => (
                  <li key={k.id} className="px-3 py-2 bg-red-50 rounded-lg text-xs border border-red-100 hover:bg-red-100 transition-colors">
                    <span className="font-bold text-red-800 mr-1">{k.kpi_number}</span>
                    <span className="text-gray-700">{k.kpi_name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">ยังไม่มีข้อมูล</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

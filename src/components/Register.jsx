import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';
import { LogIn, UserPlus, Info } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  
  // Responsibility
  const [isResponsible, setIsResponsible] = useState('yes'); // 'yes' or 'no'

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Set flag BEFORE signUp so App.jsx knows to block this session
      localStorage.setItem('pendingRegistration', 'true');

      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const role = isResponsible === 'yes' ? 'user' : 'viewer';
        const responsible_kpis = isResponsible === 'yes' ? null : [];
        const responsible_category = isResponsible === 'yes' ? null : [];

        // 2. Update profile BEFORE signOut (still have session here)
        const { error: profileError } = await supabase.from('profiles').update({
          full_name: fullName,
          position: position,
          department: department,
          responsible_category: responsible_category,
          responsible_kpis: responsible_kpis,
          role: role,
          status: 'pending'
        }).eq('id', authData.user.id);

        if (profileError) {
          console.warn("Profile update error:", profileError);
        }

        // 3. Sign out
        await supabase.auth.signOut();
        localStorage.removeItem('pendingRegistration');

        Swal.fire({ 
          icon: 'success', 
          title: 'สมัครสมาชิกสำเร็จ', 
          text: 'บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ',
          confirmButtonText: 'ตกลง'
        }).then(() => {
          navigate('/login');
        });
      }
    } catch (err) {
      setErrorMsg(err.message);
      Swal.fire({ icon: 'error', title: 'ลงทะเบียนล้มเหลว', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeUpCard {
          0% { opacity: 0; transform: translateY(40px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      
      <div className="relative flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2847 50%, #132e5b 100%)' }}
      >
        <div
          className="relative z-10 w-full max-w-4xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden"
          style={{ animation: 'fadeUpCard 0.7s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          <div className="flex flex-col md:flex-row h-full">
            
            {/* Sidebar / Info Panel */}
            <div className="md:w-1/3 bg-blue-900/50 p-8 flex flex-col justify-center items-center text-center border-r border-white/10">
              <img src="/logoMOPH.png" alt="MOPH Logo" className="h-24 mb-6 drop-shadow-lg" />
              <h2 className="text-2xl font-extrabold text-white mb-2">สมัครสมาชิก</h2>
              <p className="text-blue-200 text-sm mb-6 leading-relaxed">
                ระบบรายงานผลการดำเนินงานตัวชี้วัด<br/>สำนักงานสาธารณสุขจังหวัดกาญจนบุรี
              </p>
              <div className="mt-8 pt-8 border-t border-blue-400/30 w-full">
                <p className="text-white/70 text-sm mb-4">มีบัญชีผู้ใช้งานอยู่แล้ว?</p>
                <Link to="/login" className="inline-flex items-center justify-center w-full px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-colors">
                  <LogIn className="w-4 h-4 mr-2" /> เข้าสู่ระบบ
                </Link>
              </div>
            </div>

            {/* Registration Form Panel */}
            <div className="md:w-2/3 p-8 md:p-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <form onSubmit={handleRegister} className="space-y-6">
                
                {/* Account Details */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center"><UserPlus className="w-5 h-5 mr-2 text-cyan-400"/> ข้อมูลบัญชีผู้ใช้</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5 text-xs font-semibold text-white/80">อีเมล</label>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors"
                        placeholder="example@moph.go.th" />
                    </div>
                    <div>
                      <label className="block mb-1.5 text-xs font-semibold text-white/80">รหัสผ่าน</label>
                      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} minLength={6}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors"
                        placeholder="อย่างน้อย 6 ตัวอักษร" />
                    </div>
                  </div>
                </div>

                {/* Personal Details */}
                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-lg font-bold text-white mb-4 text-cyan-400">ข้อมูลส่วนตัว</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-1.5 text-xs font-semibold text-white/80">ชื่อ-นามสกุล</label>
                      <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-cyan-400 outline-none" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-1.5 text-xs font-semibold text-white/80">ตำแหน่ง</label>
                        <input type="text" required value={position} onChange={(e) => setPosition(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-cyan-400 outline-none" />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-semibold text-white/80">กลุ่มงาน</label>
                        <input type="text" required value={department} onChange={(e) => setDepartment(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-cyan-400 outline-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Responsibility Request */}
                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-lg font-bold text-white mb-3 text-cyan-400">การรับผิดชอบตัวชี้วัด</h3>
                  <p className="text-xs text-white/60 mb-3 flex items-start">
                    <Info className="w-4 h-4 mr-1 shrink-0" />
                    กรณีเป็นผู้รับผิดชอบ ระบบจะให้คุณเลือกรายการตัวชี้วัดในภายหลังเมื่อได้รับการอนุมัติบัญชีแล้ว
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${isResponsible === 'yes' ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                      <input 
                        type="radio" 
                        name="responsibility" 
                        value="yes"
                        checked={isResponsible === 'yes'}
                        onChange={(e) => setIsResponsible(e.target.value)}
                        className="w-4 h-4 text-cyan-500 bg-gray-800 border-gray-600 focus:ring-cyan-500"
                      />
                      <span className="ml-3 text-sm font-semibold text-white">เป็นผู้รับผิดชอบตัวชี้วัด</span>
                    </label>
                    
                    <label className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${isResponsible === 'no' ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                      <input 
                        type="radio" 
                        name="responsibility" 
                        value="no"
                        checked={isResponsible === 'no'}
                        onChange={(e) => setIsResponsible(e.target.value)}
                        className="w-4 h-4 text-cyan-500 bg-gray-800 border-gray-600 focus:ring-cyan-500"
                      />
                      <span className="ml-3 text-sm font-semibold text-white">ผู้เยี่ยมชม (ไม่มีตัวชี้วัด)</span>
                    </label>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 text-sm text-center rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 mt-4 rounded-xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/25 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #22d3ee 100%)' }}
                >
                  {loading ? 'กำลังดำเนินการ...' : 'ยืนยันการสมัครสมาชิก'}
                </button>

              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

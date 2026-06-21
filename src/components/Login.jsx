import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check profile status
        const { data: profileData } = await supabase.from('profiles').select('status').eq('id', data.user.id).single();
        
        if (profileData && profileData.status === 'pending') {
          await supabase.auth.signOut();
          Swal.fire({
            icon: 'warning',
            title: 'รอการอนุมัติ',
            text: 'บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ กรุณาลองใหม่อีกครั้งในภายหลัง'
          });
          setLoading(false);
          return;
        }

        // If approved or admin, proceed
        Swal.fire({ icon: 'success', title: 'ยินดีต้อนรับ', timer: 1500, showConfirmButton: false });
        window.location.href = '/';
      }
    } catch (error) {
      setErrorMsg(error.message);
      Swal.fire({ icon: 'error', title: 'เข้าสู่ระบบล้มเหลว', text: error.message });
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    const { value: emailInput } = await Swal.fire({
      title: 'รีเซ็ตรหัสผ่าน',
      input: 'email',
      inputLabel: 'กรุณากรอกอีเมลที่ใช้สมัครสมาชิก',
      inputPlaceholder: 'อีเมลของคุณ',
      showCancelButton: true,
      confirmButtonText: 'ส่งลิงก์',
      cancelButtonText: 'ยกเลิก'
    });

    if (emailInput) {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(emailInput, {
        redirectTo: 'http://localhost:5173/reset-password',
      });
      setLoading(false);

      if (error) {
        Swal.fire('เกิดข้อผิดพลาด', error.message, 'error');
      } else {
        Swal.fire('ส่งอีเมลสำเร็จ', 'กรุณาตรวจสอบอีเมลของคุณเพื่อรีเซ็ตรหัสผ่าน', 'success');
      }
    }
  };

  return (
    <>
      {/* Inline keyframes for card entrance & blob pulse */}
      <style>{`
        @keyframes fadeUpCard {
          0% { opacity: 0; transform: translateY(40px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes blobPulse {
          0%, 100% { transform: scale(1); opacity: 0.12; }
          50% { transform: scale(1.15); opacity: 0.22; }
        }
        @keyframes blobDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -20px) scale(1.08); }
          50% { transform: translate(-20px, 15px) scale(0.95); }
          75% { transform: translate(15px, 25px) scale(1.05); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      <div className="relative flex items-center justify-center min-h-screen overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2847 50%, #132e5b 100%)' }}
      >
        {/* ── Decorative floating blobs ── */}
        <div
          className="absolute rounded-full"
          style={{
            width: 420, height: 420,
            top: '-8%', left: '-10%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 70%)',
            animation: 'blobPulse 6s ease-in-out infinite, blobDrift 18s ease-in-out infinite',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 350, height: 350,
            bottom: '-6%', right: '-8%',
            background: 'radial-gradient(circle, rgba(34,211,238,0.30) 0%, transparent 70%)',
            animation: 'blobPulse 8s ease-in-out infinite 2s, blobDrift 22s ease-in-out infinite reverse',
            filter: 'blur(50px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 260, height: 260,
            top: '55%', left: '60%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
            animation: 'blobPulse 7s ease-in-out infinite 1s, blobDrift 20s ease-in-out infinite 3s',
            filter: 'blur(45px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 180, height: 180,
            top: '10%', right: '20%',
            background: 'radial-gradient(circle, rgba(56,189,248,0.20) 0%, transparent 70%)',
            animation: 'blobPulse 5s ease-in-out infinite 3s, blobDrift 16s ease-in-out infinite 1s',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 140, height: 140,
            bottom: '20%', left: '15%',
            background: 'radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 70%)',
            animation: 'blobPulse 9s ease-in-out infinite 4s, blobDrift 24s ease-in-out infinite 2s',
            filter: 'blur(35px)',
          }}
        />

        {/* ── Glassmorphism Login Card ── */}
        <div
          className="relative z-10 w-full max-w-md mx-4"
          style={{ animation: 'fadeUpCard 0.7s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          <div
            className="rounded-3xl p-8 md:p-10 shadow-2xl"
            style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.37), inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <img
                src="/logoMOPH.png"
                alt="MOPH Logo"
                className="h-20 mx-auto mb-4 drop-shadow-lg"
              />
              <div
                className="inline-block px-5 py-1.5 rounded-full text-xs font-bold tracking-wide mb-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.35), rgba(34,211,238,0.25))',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                สำนักงานสาธารณสุขจังหวัดกาญจนบุรี
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                KPI Dashboard
              </h2>
              <p className="text-sm mt-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                ระบบรายงานผลการดำเนินงานตัวชี้วัด
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-white/80">
                  อีเมล
                </label>
                <input
                  type="email"
                  className="block w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all duration-200
                    focus:ring-2 focus:ring-cyan-400/50"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.18)',
                  }}
                  placeholder="admin@moph.go.th"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-white/80">
                  รหัสผ่าน
                </label>
                <input
                  type="password"
                  className="block w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all duration-200
                    focus:ring-2 focus:ring-cyan-400/50"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.18)',
                  }}
                  placeholder="กรุณากรอกรหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    ลืมรหัสผ่านใช่หรือไม่?
                  </button>
                </div>
              </div>

              {/* Error message */}
              {errorMsg && (
                <div
                  className="p-3 text-sm text-center rounded-xl"
                  style={{
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#fca5a5',
                  }}
                >
                  เกิดข้อผิดพลาด: {errorMsg}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="relative w-full py-3.5 rounded-xl text-sm font-bold text-white overflow-hidden transition-all duration-300
                  disabled:opacity-60 disabled:cursor-not-allowed
                  hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #22d3ee 100%)',
                }}
              >
                {/* Shimmer overlay */}
                <span
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 3s ease-in-out infinite',
                  }}
                />
                <span className="relative z-10">
                  {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </span>
              </button>

              <div className="mt-4 text-center">
                <span className="text-sm text-white/60">ยังไม่มีบัญชีผู้ใช้งาน? </span>
                <Link to="/register" className="text-sm font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
                  สมัครสมาชิก
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

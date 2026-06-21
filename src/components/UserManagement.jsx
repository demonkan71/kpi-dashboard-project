import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';

export default function UserManagement({ profile }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      
      Swal.fire({
        icon: 'success',
        title: 'อัปเดตสิทธิ์สำเร็จ',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      fetchUsers();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message
      });
    }
  };

  const handleApprove = async (userId) => {
    try {
      const { error } = await supabase.from('profiles').update({ status: 'approved' }).eq('id', userId);
      if (error) throw error;

      Swal.fire({
        icon: 'success',
        title: 'อนุมัติผู้ใช้งานสำเร็จ',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      fetchUsers();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดในการอนุมัติ',
        text: err.message
      });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-900">จัดการผู้ใช้งาน</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64"><div className="spinner"></div></div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-white uppercase bg-blue-900">
              <tr>
                <th className="px-4 py-4 min-w-[200px]">ผู้ใช้ / อีเมล</th>
                <th className="px-4 py-4">ตำแหน่ง / กลุ่มงาน</th>
                <th className="px-4 py-4">ตัวชี้วัดที่รับผิดชอบ</th>
                <th className="px-4 py-4 text-center">สถานะ</th>
                <th className="px-4 py-4">สิทธิ์การใช้งาน (Role)</th>
                <th className="px-4 py-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="font-bold text-gray-900">{user.full_name || 'ไม่ได้ระบุชื่อ'}</div>
                    <div className="text-xs text-gray-500">{user.id}</div> {/* In a real app, you might join with auth.users to show email, but user.id is what we have in profiles unless email is stored */}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-gray-800">{user.position || '-'}</div>
                    <div className="text-xs text-gray-500">{user.department || '-'}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-xs text-blue-600 font-semibold mb-1">
                      ประเด็น: {user.responsible_category && user.responsible_category.length > 0 ? user.responsible_category.join(', ') : '-'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {user.responsible_kpis === null ? (
                        <span className="text-amber-600">เป็นผู้รับผิดชอบ (รอเลือกข้อมูล)</span>
                      ) : user.responsible_kpis.length === 0 ? (
                        <span className="text-gray-500">ไม่ได้เป็นผู้รับผิดชอบ</span>
                      ) : (
                        <span>จำนวนตัวชี้วัด: {user.responsible_kpis.length} ตัว</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {user.status === 'pending' ? (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-full border border-amber-200">รออนุมัติ</span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-200">อนุมัติแล้ว</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <select 
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={user.id === profile.id}
                    >
                      <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                      <option value="user">User (ผู้บันทึกข้อมูล)</option>
                      <option value="viewer">Viewer (ผู้เข้าชม)</option>
                    </select>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {user.status === 'pending' && user.id !== profile.id && (
                      <button 
                        onClick={() => handleApprove(user.id)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-1.5 px-3 rounded shadow-sm transition-colors"
                      >
                        อนุมัติ
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">ไม่พบข้อมูลผู้ใช้งาน</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

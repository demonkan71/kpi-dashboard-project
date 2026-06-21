import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import KpiTable from './components/KpiTable';
import DataEntry from './components/DataEntry';
import Layout from './components/Layout';
import UserManagement from './components/UserManagement';
import KpiManagement from './components/KpiManagement';
import ResetPassword from './components/ResetPassword';
import MonthLockSettings from './components/MonthLockSettings';
import AuditLogs from './components/AuditLogs';
import MissingDataReport from './components/MissingDataReport';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if(session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      // If we're in a registration flow, don't process the new session
      if (session && localStorage.getItem('pendingRegistration') === 'true') {
        // fetchProfile will handle signOut, just don't set session here
        fetchProfile(session.user.id);
        return;
      }
      setSession(session);
      if(session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });
  }, []);

  const fetchProfile = async (userId) => {
    // If we're in the middle of a registration flow, block this session immediately
    if (localStorage.getItem('pendingRegistration') === 'true') {
      await supabase.auth.signOut();
      localStorage.removeItem('pendingRegistration');
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) {
      // If still pending, force sign out - they must wait for admin approval
      if (data.status === 'pending') {
        await supabase.auth.signOut();
        setProfile(null);
        setLoading(false);
        return;
      }
      setProfile(data);
    }
    setLoading(false);
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!session ? <Register /> : <Navigate to="/" />} />
        <Route path="/reset-password" element={<ResetPassword session={session} />} />
        
        <Route element={<Layout profile={profile} session={session} />}>
          {/* Public routes */}
          <Route path="/" element={<Dashboard profile={profile} />} />
          <Route path="/table" element={<KpiTable />} />
          
          {/* Protected routes */}
          <Route path="/entry" element={session && profile?.role !== 'viewer' && profile?.status === 'approved' ? <DataEntry profile={profile} /> : <Navigate to={session ? "/" : "/login"} />} />
          <Route path="/missing-data" element={session && profile?.status === 'approved' ? <MissingDataReport profile={profile} /> : <Navigate to={session ? "/" : "/login"} />} />
          <Route path="/manage-users" element={session && profile?.role === 'admin' ? <UserManagement profile={profile} /> : <Navigate to={session ? "/" : "/login"} />} />
          <Route path="/manage-kpi" element={session && profile?.role === 'admin' ? <KpiManagement profile={profile} /> : <Navigate to={session ? "/" : "/login"} />} />
          <Route path="/system-settings" element={session && profile?.role === 'admin' ? <MonthLockSettings profile={profile} /> : <Navigate to={session ? "/" : "/login"} />} />
          <Route path="/audit-logs" element={session && profile?.role === 'admin' ? <AuditLogs profile={profile} /> : <Navigate to={session ? "/" : "/login"} />} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import api from './services/api';
import './AdminApp.css';

ChartJS.register(ArcElement, Tooltip, Legend);

// Polished Modal Component
const Modal = ({ isOpen, onClose, title, children, actions }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '600px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeIn 0.3s ease-out' }}>
        <h2 style={{ marginTop: 0, marginBottom: '24px', color: '#0f172a', fontSize: '1.5rem' }}>{title}</h2>
        <div style={{ marginBottom: '32px', color: '#334155', lineHeight: '1.6' }}>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>{actions}</div>
      </div>
    </div>
  );
};

// Admin Login Component
function AdminLogin({ setToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/login', { email, password });
      localStorage.setItem('admin_token', res.data.token);
      setToken(res.data.token);
    } catch (err) {
      setError('Invalid admin credentials');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <form onSubmit={handleLogin} style={{ background: 'white', padding: '48px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: '0 0 32px', color: '#0f172a', fontSize: '1.75rem', textAlign: 'center', fontWeight: 800 }}>Admin Portal</h2>
        {error && <div style={{ color: '#ef4444', background: '#fee2e2', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem', textAlign: 'center', fontWeight: 500 }}>{error}</div>}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }} onFocus={e=>e.target.style.borderColor='#38bdf8'} onBlur={e=>e.target.style.borderColor='#cbd5e1'} required />
        </div>
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }} onFocus={e=>e.target.style.borderColor='#38bdf8'} onBlur={e=>e.target.style.borderColor='#cbd5e1'} required />
        </div>
        <button type="submit" style={{ width: '100%', padding: '14px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e=>e.target.style.background='#1e293b'} onMouseOut={e=>e.target.style.background='#0f172a'}>Secure Login</button>
      </form>
    </div>
  );
}

function AdminDashboard({ token, setToken }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'provisioning' | 'analytics'
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [doctorToDelete, setDoctorToDelete] = useState(null);
  const [isDeletingDoctor, setIsDeletingDoctor] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, appsRes, doctorsRes] = await Promise.all([
        api.get('/admin/dashboard', { headers }),
        api.get('/admin/doctor-applications', { headers }),
        api.get('/admin/doctors', { headers }),
      ]);
      setStats(statsRes.data);
      const rawApps = Array.isArray(appsRes.data) ? appsRes.data : (appsRes.data.applications || []);
      setApplications(rawApps);
      const rawDoctors = Array.isArray(doctorsRes.data?.doctors) ? doctorsRes.data.doctors : [];
      setDoctors(rawDoctors);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('admin_token');
        setToken(null);
      }
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id) => {
    if (!window.confirm("Approve this doctor application and send credential email?")) return;
    setIsProcessing(true);
    try {
      const res = await api.post(`/admin/doctor-applications/${id}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedApp(null);
      setActionFeedback({
        type: 'success',
        message: `Doctor successfully approved! Verification notification dispatched to applicant.`
      });
      setTimeout(() => setActionFeedback(null), 5000);
      fetchData();
    } catch (err) {
      alert("Error approving doctor: " + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectModal = (app) => {
    setRejectReason(app?.rejectionReason || '');
    setIsProcessing(false);
    setIsRejectModalOpen(true);
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }
    setIsProcessing(true);
    try {
      await api.post(`/admin/doctor-applications/${selectedApp._id}/reject`, { reason: rejectReason }, { headers: { Authorization: `Bearer ${token}` } });
      setIsRejectModalOpen(false);
      setSelectedApp(null);
      setActionFeedback({
        type: 'info',
        message: `Application marked as rejected. Explanation email dispatched to applicant.`
      });
      setTimeout(() => setActionFeedback(null), 5000);
      fetchData();
    } catch (err) {
      alert("Error rejecting doctor: " + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResendEmail = async (id) => {
    setIsProcessing(true);
    try {
      const res = await api.post(`/admin/doctor-applications/${id}/resend-email`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setActionFeedback({
        type: 'success',
        message: res.data.message || 'Notification email dispatched to doctor successfully.'
      });
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err) {
      alert("Error resending email: " + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDeleteDoctor = async () => {
    if (!doctorToDelete) return;
    const id = doctorToDelete.doctorId || doctorToDelete._id;
    if (!id) return;
    setIsDeletingDoctor(true);
    try {
      await api.delete(`/admin/doctors/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setDoctors((prev) => prev.filter((d) => String(d.doctorId || d._id) !== String(id)));
      setDoctorToDelete(null);
      setActionFeedback({ type: 'success', message: 'Doctor deleted successfully.' });
      setTimeout(() => setActionFeedback(null), 5000);
      try {
        const statsRes = await api.get('/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } });
        setStats(statsRes.data);
      } catch { /* ignore */ }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete doctor.',
      });
      setTimeout(() => setActionFeedback(null), 6000);
      setDoctorToDelete(null);
    } finally {
      setIsDeletingDoctor(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  const filterCounts = useMemo(() => {
    const apps = Array.isArray(applications) ? applications : [];
    return {
      all: apps.length,
      pending: apps.filter(a => a.status === 'pending').length,
      approved: apps.filter(a => a.status === 'approved').length,
      rejected: apps.filter(a => a.status === 'rejected').length,
    };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    let list = Array.isArray(applications) ? applications : [];
    if (filter !== 'All') {
      list = list.filter(app => app.status === filter.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(app =>
        (app.fullName && app.fullName.toLowerCase().includes(q)) ||
        (app.email && app.email.toLowerCase().includes(q)) ||
        (app.specialty && app.specialty.toLowerCase().includes(q)) ||
        (app.registrationNumber && app.registrationNumber.toLowerCase().includes(q))
      );
    }
    return list;
  }, [applications, filter, search]);

  const analyticsData = useMemo(() => {
    const apps = Array.isArray(applications) ? applications : [];
    const total = apps.length;
    const approved = apps.filter(a => a.status === 'approved').length;
    const pending = apps.filter(a => a.status === 'pending').length;
    const rejected = apps.filter(a => a.status === 'rejected').length;

    // Specialty counts
    const specialtyMap = {};
    apps.forEach(a => {
      const spec = (a.specialty || 'General').trim();
      specialtyMap[spec] = (specialtyMap[spec] || 0) + 1;
    });

    const specialties = Object.entries(specialtyMap)
      .map(([name, count]) => ({
        name,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    // Avg experience
    const totalExp = apps.reduce((sum, a) => sum + (Number(a.experienceYears) || 0), 0);
    const avgExp = total > 0 ? (totalExp / total).toFixed(1) : '0.0';

    const processed = approved + rejected;
    const approvalRate = processed > 0 ? Math.round((approved / processed) * 100) : 100;

    return { total, approved, pending, rejected, specialties, avgExp, approvalRate };
  }, [applications]);

  if (!stats) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>
        Loading Command Center...
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            Arogyabodhini
          </div>
          <button className="admin-sidebar-close" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <nav className="admin-nav">
          <button
            className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
            Dashboard Overview
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'provisioning' ? 'active' : ''}`}
            onClick={() => { setActiveTab('provisioning'); setSidebarOpen(false); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" />
            </svg>
            Doctor Provisioning
            {filterCounts.pending > 0 && (
              <span style={{ marginLeft: 'auto', background: '#f59e0b', color: '#0f172a', padding: '2px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700 }}>
                {filterCounts.pending}
              </span>
            )}
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => { setActiveTab('analytics'); setSidebarOpen(false); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            System Analytics
          </button>
        </nav>

        <button className="admin-logout-btn" onClick={handleLogout}>Secure Logout</button>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main">
        <header className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              className="admin-mobile-menu-btn"
              onClick={() => setSidebarOpen(prev => !prev)}
              aria-label="Toggle navigation menu"
            >
              ☰
            </button>
            <h2>
              {activeTab === 'overview' && 'Command Center'}
              {activeTab === 'provisioning' && 'Doctor Provisioning Queue'}
              {activeTab === 'analytics' && 'System Analytics & Intelligence'}
            </h2>
          </div>
          <div className="admin-header-status">
            <span style={{ height: '8px', width: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
            <span>System Operational</span>
          </div>
        </header>

        <main className="admin-content">
          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div style={{
              background: actionFeedback.type === 'success' ? '#dcfce7' : actionFeedback.type === 'error' ? '#fee2e2' : '#e0f2fe',
              color: actionFeedback.type === 'success' ? '#166534' : actionFeedback.type === 'error' ? '#b91c1c' : '#0369a1',
              padding: '14px 20px',
              borderRadius: '8px',
              marginBottom: '24px',
              fontWeight: 600,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <span>{actionFeedback.message}</span>
              <button onClick={() => setActionFeedback(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800 }}>✕</button>
            </div>
          )}

          {/* ══════════════ TAB 1: OVERVIEW ══════════════ */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Row */}
              <div className="admin-stats-grid">
                <div className="admin-stat-card" style={{ borderTopColor: '#38bdf8' }}>
                  <h3>Verified Doctors</h3>
                  <p>{stats.totalDoctors}</p>
                </div>
                <div className="admin-stat-card" style={{ borderTopColor: '#f59e0b' }}>
                  <h3>Pending Reviews</h3>
                  <p>{stats.pendingApplications}</p>
                </div>
                <div className="admin-stat-card" style={{ borderTopColor: '#22c55e' }}>
                  <h3>Approved Applications</h3>
                  <p>{stats.approvedApplications}</p>
                </div>
                <div className="admin-stat-card" style={{ borderTopColor: '#ef4444' }}>
                  <h3>Rejected Applications</h3>
                  <p>{stats.rejectedApplications}</p>
                </div>
              </div>

              {/* Chart & Quick Action Row */}
              <div className="admin-overview-grid">
                <div className="admin-chart-card">
                  <h3 style={{ marginBottom: '20px', color: '#0f172a', fontSize: '1.05rem', fontWeight: 700 }}>
                    Application Distribution
                  </h3>
                  <Pie
                    data={{
                      labels: ['Approved', 'Pending', 'Rejected'],
                      datasets: [{
                        data: [stats.approvedApplications, stats.pendingApplications, stats.rejectedApplications],
                        backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                        borderWidth: 0,
                        hoverOffset: 4
                      }]
                    }}
                    options={{
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { padding: 16, font: { family: 'Inter', size: 12, weight: '500' } }
                        }
                      }
                    }}
                  />
                </div>

                <div className="admin-chart-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 12px 0' }}>
                      Operational Readiness
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.6' }}>
                      The Arogyabodhini clinical infrastructure is operational. Doctors can accept video consultations, issue electronic prescriptions, and handle multilingual patient triage.
                    </p>

                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Pending Credential Reviews</span>
                        <span style={{ fontWeight: 700, color: stats.pendingApplications > 0 ? '#d97706' : '#22c55e' }}>
                          {stats.pendingApplications} waiting
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Teleconsultation Relay</span>
                        <span style={{ fontWeight: 700, color: '#16a34a' }}>Active (WebRTC HD)</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Prescription Email Dispatcher</span>
                        <span style={{ fontWeight: 700, color: '#16a34a' }}>Online & Verified</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('provisioning')}
                    style={{
                      marginTop: '24px',
                      padding: '14px',
                      background: '#0f172a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#1e293b'}
                    onMouseOut={e => e.currentTarget.style.background = '#0f172a'}
                  >
                    Open Provisioning Queue →
                  </button>
                </div>
              </div>

              {/* Recent Pending Table Highlight */}
              <div className="admin-queue-header">
                <h3 style={{ color: '#0f172a', fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>
                  Recent Applications
                </h3>
                <button
                  onClick={() => setActiveTab('provisioning')}
                  style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  View All ({applications.length}) →
                </button>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Applicant Name</th>
                      <th>Specialty</th>
                      <th>Experience</th>
                      <th>License No.</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.slice(0, 5).map(app => (
                      <tr key={app._id}>
                        <td>
                          <strong style={{ color: '#0f172a' }}>{app.fullName}</strong><br />
                          <small style={{ color: '#64748b', fontSize: '0.8rem' }}>{app.email}</small>
                        </td>
                        <td>{app.specialty}</td>
                        <td>{app.experienceYears} yrs</td>
                        <td style={{ fontFamily: 'monospace', color: '#475569' }}>{app.registrationNumber}</td>
                        <td><span className={`admin-badge ${app.status}`}>{app.status}</span></td>
                        <td>
                          {app.status === 'pending' ? (
                            <button
                              onClick={() => { setSelectedApp(app); setActiveTab('provisioning'); }}
                              style={{ padding: '8px 16px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                            >
                              Review Application
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 }}>Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {applications.length === 0 && (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No doctor applications submitted yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Registered Doctors — Delete Doctor */}
              <div className="admin-queue-header" style={{ marginTop: 36 }}>
                <h3 style={{ color: '#0f172a', fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>
                  Registered Doctors
                </h3>
                <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
                  {doctors.length} active
                </span>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Doctor Name</th>
                      <th>Specialty</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((doc) => (
                      <tr key={doc.doctorId || doc._id}>
                        <td>
                          <strong style={{ color: '#0f172a' }}>{doc.name || '—'}</strong>
                        </td>
                        <td>{doc.specialty || '—'}</td>
                        <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{doc.email || '—'}</td>
                        <td>
                          <span className={`admin-badge ${doc.isActive ? 'approved' : 'pending'}`}>
                            {doc.isActive ? 'Active' : (doc.availabilityStatus || 'Registered')}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setDoctorToDelete(doc)}
                            style={{
                              padding: '8px 14px',
                              background: '#fef2f2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                            }}
                          >
                            Delete Doctor
                          </button>
                        </td>
                      </tr>
                    ))}
                    {doctors.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                          No registered doctors yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ══════════════ TAB 2: DOCTOR PROVISIONING ══════════════ */}
          {activeTab === 'provisioning' && (
            <>
              <div className="admin-queue-header">
                <div>
                  <h3 style={{ color: '#0f172a', fontSize: '1.3rem', margin: 0, fontWeight: 800 }}>
                    Doctor Provisioning Workspace
                  </h3>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                    Verify licenses, review qualifications, and provision certified doctors for telemedicine.
                  </p>
                </div>

                <div className="admin-queue-controls">
                  <input
                    type="text"
                    placeholder="Search name, email, specialty, license..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="admin-search-input"
                  />
                  <div className="admin-filter-group">
                    {[
                      { key: 'All', label: `All (${filterCounts.all})` },
                      { key: 'Pending', label: `Pending (${filterCounts.pending})` },
                      { key: 'Approved', label: `Approved (${filterCounts.approved})` },
                      { key: 'Rejected', label: `Rejected (${filterCounts.rejected})` },
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`admin-filter-pill ${filter === f.key ? 'active' : ''}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Applicant Name</th>
                      <th>Specialty</th>
                      <th>Experience</th>
                      <th>License No.</th>
                      <th>Clinic Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map(app => (
                      <tr key={app._id}>
                        <td>
                          <strong style={{ color: '#0f172a' }}>{app.fullName}</strong><br />
                          <small style={{ color: '#64748b', fontSize: '0.8rem' }}>{app.email}</small>
                        </td>
                        <td>{app.specialty}</td>
                        <td>{app.experienceYears} yrs</td>
                        <td style={{ fontFamily: 'monospace', color: '#475569' }}>{app.registrationNumber}</td>
                        <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{app.clinicName || app.address || '—'}</td>
                        <td><span className={`admin-badge ${app.status}`}>{app.status}</span></td>
                        <td>
                          {app.status === 'pending' ? (
                            <button
                              onClick={() => setSelectedApp(app)}
                              style={{ padding: '8px 16px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.2s' }}
                              onMouseOver={e => e.currentTarget.style.background = '#334155'}
                              onMouseOut={e => e.currentTarget.style.background = '#0f172a'}
                            >
                              Review & Verify
                            </button>
                          ) : (
                            <button
                              onClick={() => setSelectedApp(app)}
                              style={{ padding: '6px 12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                            >
                              View Details
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredApplications.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontSize: '1.1rem' }}>
                          No {filter === 'All' ? '' : filter.toLowerCase()} applications found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ══════════════ TAB 3: SYSTEM ANALYTICS ══════════════ */}
          {activeTab === 'analytics' && (
            <>
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ color: '#0f172a', fontSize: '1.3rem', margin: 0, fontWeight: 800 }}>
                  Telemedicine Intelligence & Analytics
                </h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                  Platform demographics, doctor specialty breakdown, and credential verification velocity.
                </p>
              </div>

              {/* KPI Summary Row */}
              <div className="admin-analytics-grid">
                <div className="admin-analytics-card">
                  <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                    Credentialing Performance
                  </h3>
                  <div className="admin-kpi-row">
                    <div className="admin-kpi-box">
                      <p className="admin-kpi-value" style={{ color: '#16a34a' }}>{analyticsData.approvalRate}%</p>
                      <p className="admin-kpi-label">Approval Rate</p>
                    </div>
                    <div className="admin-kpi-box">
                      <p className="admin-kpi-value" style={{ color: '#0284c7' }}>{analyticsData.avgExp}</p>
                      <p className="admin-kpi-label">Avg Experience (Yrs)</p>
                    </div>
                    <div className="admin-kpi-box">
                      <p className="admin-kpi-value" style={{ color: '#f59e0b' }}>{analyticsData.pending}</p>
                      <p className="admin-kpi-label">Pending Review</p>
                    </div>
                  </div>
                </div>

                <div className="admin-analytics-card">
                  <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                    Network Compliance & Triage
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Indian Language Speech-to-Text</span>
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>15+ Languages</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Digital Telemedicine Guidelines</span>
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>Compliant (2020)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Instant Email Notification Engine</span>
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>Active</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Specialty Breakdown and Application Distribution */}
              <div className="admin-overview-grid">
                <div className="admin-chart-card">
                  <h3 style={{ marginBottom: '20px', color: '#0f172a', fontSize: '1.05rem', fontWeight: 700 }}>
                    Applications by Review Status
                  </h3>
                  <Pie
                    data={{
                      labels: ['Approved', 'Pending', 'Rejected'],
                      datasets: [{
                        data: [stats.approvedApplications, stats.pendingApplications, stats.rejectedApplications],
                        backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                        borderWidth: 0,
                        hoverOffset: 4
                      }]
                    }}
                    options={{
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { padding: 16, font: { family: 'Inter', size: 12, weight: '500' } }
                        }
                      }
                    }}
                  />
                </div>

                <div className="admin-analytics-card">
                  <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    Doctor Specialties Breakdown
                  </h3>
                  <div className="admin-specialty-list">
                    {analyticsData.specialties.map(spec => (
                      <div key={spec.name} className="admin-specialty-item">
                        <div className="admin-specialty-meta">
                          <span>{spec.name}</span>
                          <span>{spec.count} doctor{spec.count !== 1 ? 's' : ''} ({spec.percent}%)</span>
                        </div>
                        <div className="admin-specialty-bar-bg">
                          <div
                            className="admin-specialty-bar-fill"
                            style={{ width: `${Math.max(8, spec.percent)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {analyticsData.specialties.length === 0 && (
                      <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No specialties recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Full Review Modal */}
      <Modal
        isOpen={!!selectedApp && !isRejectModalOpen}
        onClose={() => setSelectedApp(null)}
        title="Application Review & Verification"
        actions={
          <>
            <button
              onClick={() => setSelectedApp(null)}
              style={{ padding: '12px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              Close
            </button>
            {selectedApp?.status !== 'pending' && (
              <button
                disabled={isProcessing}
                onClick={() => handleResendEmail(selectedApp._id)}
                style={{ padding: '12px 20px', background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = '#e0f2fe'}
                onMouseOut={e => e.currentTarget.style.background = '#f0f9ff'}
              >
                {isProcessing ? 'Sending...' : '📧 Resend Email'}
              </button>
            )}
            <button
              onClick={() => openRejectModal(selectedApp)}
              style={{ padding: '12px 24px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = '#fecaca'}
              onMouseOut={e => e.currentTarget.style.background = '#fee2e2'}
            >
              {selectedApp?.status === 'rejected' ? 'Update Rejection Reason & Notify' : 'Reject Application'}
            </button>
            <button
              disabled={isProcessing}
              onClick={() => handleApprove(selectedApp._id)}
              style={{ padding: '12px 24px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.3)' }}
              onMouseOver={e => e.currentTarget.style.background = '#16a34a'}
              onMouseOut={e => e.currentTarget.style.background = '#22c55e'}
            >
              {isProcessing ? 'Provisioning...' : (selectedApp?.status === 'approved' ? 'Re-approve & Resend Credentials' : 'Approve & Dispatch Credentials')}
            </button>
          </>
        }
      >
        {selectedApp && (
          <div className="admin-modal-grid">
            <div>
              <strong style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</strong><br />
              <span style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 600 }}>{selectedApp.fullName}</span>
            </div>
            <div>
              <strong style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</strong><br />
              <span style={{ color: '#334155', fontWeight: 500 }}>{selectedApp.email}</span>
            </div>
            <div>
              <strong style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number</strong><br />
              <span style={{ color: '#334155', fontWeight: 500 }}>{selectedApp.phone || '—'}</span>
            </div>
            <div>
              <strong style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Specialty</strong><br />
              <span style={{ color: '#334155', fontWeight: 500 }}>{selectedApp.specialty}</span>
            </div>
            <div>
              <strong style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clinical Experience</strong><br />
              <span style={{ color: '#334155', fontWeight: 500 }}>{selectedApp.experienceYears} Years</span>
            </div>
            <div>
              <strong style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>License Number</strong><br />
              <span style={{ fontFamily: 'monospace', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#0f172a', fontWeight: 600 }}>
                {selectedApp.registrationNumber}
              </span>
            </div>
            <div className="admin-modal-fullwidth">
              <strong style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clinic / Hospital Details</strong><br />
              <span style={{ color: '#334155', fontWeight: 500 }}>
                {selectedApp.clinicName ? `${selectedApp.clinicName} — ` : ''}{selectedApp.address || 'Karnataka, India'}
              </span>
            </div>
            {selectedApp.status === 'rejected' && selectedApp.rejectionReason && (
              <div className="admin-modal-fullwidth" style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px' }}>
                <strong style={{ color: '#b91c1c', fontSize: '0.8rem', textTransform: 'uppercase' }}>Rejection Reason</strong><br />
                <span style={{ color: '#991b1b', fontSize: '0.9rem' }}>{selectedApp.rejectionReason}</span>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Rejection Reason Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setIsProcessing(false);
        }}
        title="Reject Application & Notify Doctor"
        actions={
          <>
            <button
              onClick={() => {
                setIsRejectModalOpen(false);
                setIsProcessing(false);
              }}
              style={{ padding: '12px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              disabled={isProcessing}
              onClick={submitReject}
              style={{ padding: '12px 24px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              {isProcessing ? 'Sending Notification...' : 'Confirm Rejection & Dispatch Email'}
            </button>
          </>
        }
      >
        <p style={{ marginBottom: '16px', color: '#334155', fontWeight: 500 }}>
          Please specify the reason for rejecting Dr. {selectedApp?.fullName}'s application. This will be automatically emailed to the doctor:
        </p>
        <textarea
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            boxSizing: 'border-box',
            minHeight: '120px',
            fontSize: '1rem',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s',
            resize: 'vertical'
          }}
          onFocus={e => e.currentTarget.style.borderColor = '#ef4444'}
          onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
          placeholder="e.g. Medical registration number could not be verified in the national council registry..."
        />
      </Modal>

      {/* Delete Doctor Confirmation */}
      <Modal
        isOpen={!!doctorToDelete}
        onClose={() => !isDeletingDoctor && setDoctorToDelete(null)}
        title="Delete Doctor?"
        actions={
          <>
            <button
              type="button"
              disabled={isDeletingDoctor}
              onClick={() => setDoctorToDelete(null)}
              style={{ padding: '12px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeletingDoctor}
              onClick={confirmDeleteDoctor}
              style={{ padding: '12px 24px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              {isDeletingDoctor ? 'Deleting…' : 'Delete Doctor'}
            </button>
          </>
        }
      >
        <p style={{ margin: 0, color: '#334155', fontWeight: 500, fontSize: '1.05rem' }}>
          Are you sure you want to permanently remove Dr. {doctorToDelete?.name || 'this doctor'}?
        </p>
        <p style={{ margin: '12px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
          Consultation history, prescriptions, and patient records will not be deleted.
        </p>
      </Modal>
    </div>
  );
}

export default function AdminApp() {
  const [token, setToken] = useState(localStorage.getItem('admin_token'));

  return (
    <Routes>
      <Route path="login" element={!token ? <AdminLogin setToken={setToken} /> : <Navigate to="/admin/dashboard" />} />
      <Route path="dashboard" element={token ? <AdminDashboard token={token} setToken={setToken} /> : <Navigate to="/admin/login" />} />
      <Route path="*" element={<Navigate to={token ? "/admin/dashboard" : "/admin/login"} />} />
    </Routes>
  );
}

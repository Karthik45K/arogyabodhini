import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
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

// ... AdminLogin Component ...
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
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, appsRes] = await Promise.all([
        api.get('/admin/dashboard', { headers }),
        api.get('/admin/doctor-applications', { headers })
      ]);
      setStats(statsRes.data);
      const rawApps = Array.isArray(appsRes.data) ? appsRes.data : (appsRes.data.applications || []);
      setApplications(rawApps);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('admin_token');
        setToken(null);
      }
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id) => {
    if(!window.confirm("Approve this doctor application and send credential email?")) return;
    try {
      await api.post(`/admin/doctor-applications/${id}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedApp(null);
      fetchData();
    } catch (err) {
      alert("Error approving doctor: " + (err.response?.data?.message || err.message));
    }
  };

  const openRejectModal = (app) => {
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const submitReject = async () => {
    if(!rejectReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }
    try {
      await api.post(`/admin/doctor-applications/${selectedApp._id}/reject`, { reason: rejectReason }, { headers: { Authorization: `Bearer ${token}` } });
      setIsRejectModalOpen(false);
      setSelectedApp(null);
      fetchData();
    } catch (err) {
      alert("Error rejecting doctor: " + (err.response?.data?.message || err.message));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

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

  if (!stats) return <div style={{display:'flex',height:'100vh',alignItems:'center',justifyContent:'center',background:'#f1f5f9',color:'#64748b',fontWeight:600}}>Loading Command Center...</div>;

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Arogyabodhini
        </div>
        <nav className="admin-nav">
          <button className="admin-nav-item active">Dashboard Overview</button>
          <button className="admin-nav-item">Doctor Provisioning</button>
          <button className="admin-nav-item">System Analytics</button>
        </nav>
        <button className="admin-logout-btn" onClick={handleLogout}>Secure Logout</button>
      </aside>

      {/* Main Content */}
      <div className="admin-main">
        <header className="admin-header">
          <h2>Command Center</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ height: '8px', width: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
            <span style={{ color: '#475569', fontSize: '0.9rem', fontWeight: 600 }}>System Operational</span>
          </div>
        </header>

        <main className="admin-content">
          {/* Stats Row */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card" style={{borderTopColor: '#38bdf8'}}>
              <h3>Verified Doctors</h3>
              <p>{stats.totalDoctors}</p>
            </div>
            <div className="admin-stat-card" style={{borderTopColor: '#f59e0b'}}>
              <h3>Pending Reviews</h3>
              <p>{stats.pendingApplications}</p>
            </div>
            <div className="admin-stat-card" style={{borderTopColor: '#22c55e'}}>
              <h3>Approved Today</h3>
              <p>{stats.approvedApplications}</p>
            </div>
            <div className="admin-stat-card" style={{borderTopColor: '#ef4444'}}>
              <h3>Rejected Apps</h3>
              <p>{stats.rejectedApplications}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '40px', marginBottom: '40px' }}>
            <div style={{ width: '100%', maxWidth: '350px', background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
              <h3 style={{marginBottom: '24px', color: '#0f172a', fontSize: '1.1rem', fontWeight: 700}}>Application Distribution</h3>
              <Pie data={{
                labels: ['Approved', 'Pending', 'Rejected'],
                datasets: [{
                  data: [stats.approvedApplications, stats.pendingApplications, stats.rejectedApplications],
                  backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                  borderWidth: 0,
                  hoverOffset: 4
                }]
              }} options={{ plugins: { legend: { position: 'bottom', labels: { padding: 20, font: { family: 'Inter', size: 13, weight: '500' } } } } }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 style={{ color: '#0f172a', fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>Provisioning Queue</h3>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search name, email, specialty..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '99px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: '0.85rem',
                  minWidth: '240px'
                }}
              />
              <div className="admin-filter-group">
                {['All', 'Pending', 'Approved', 'Rejected'].map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`admin-filter-pill ${filter === f ? 'active' : ''}`}
                  >
                    {f}
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
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map(app => (
                  <tr key={app._id}>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{app.fullName}</strong><br/>
                      <small style={{color: '#64748b', fontSize: '0.8rem'}}>{app.email}</small>
                    </td>
                    <td>{app.specialty}</td>
                    <td>{app.experienceYears} yrs</td>
                    <td style={{ fontFamily: 'monospace', color: '#475569' }}>{app.registrationNumber}</td>
                    <td><span className={`admin-badge ${app.status}`}>{app.status}</span></td>
                    <td>
                      {app.status === 'pending' ? (
                        <button onClick={() => setSelectedApp(app)} style={{ padding: '8px 16px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e=>e.target.style.background='#334155'} onMouseOut={e=>e.target.style.background='#0f172a'}>
                          Review Application
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 }}>Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredApplications.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontSize: '1.1rem' }}>No {filter === 'All' ? '' : filter.toLowerCase()} applications found in queue.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* Review Modal */}
      <Modal 
        isOpen={!!selectedApp && !isRejectModalOpen} 
        onClose={() => setSelectedApp(null)}
        title="Application Review"
        actions={
          <>
            <button onClick={() => openRejectModal(selectedApp)} style={{ padding: '12px 24px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e=>e.target.style.background='#fecaca'} onMouseOut={e=>e.target.style.background='#fee2e2'}>Reject</button>
            <button onClick={() => handleApprove(selectedApp._id)} style={{ padding: '12px 24px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.3)' }} onMouseOver={e=>e.target.style.background='#16a34a'} onMouseOut={e=>e.target.style.background='#22c55e'}>Approve & Provision</button>
          </>
        }
      >
        {selectedApp && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div><strong style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</strong><br/> <span style={{fontSize:'1.1rem', color:'#0f172a', fontWeight:600}}>{selectedApp.fullName}</span></div>
            <div><strong style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</strong><br/> <span style={{color:'#334155', fontWeight:500}}>{selectedApp.email}</span></div>
            <div><strong style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number</strong><br/> <span style={{color:'#334155', fontWeight:500}}>{selectedApp.phone}</span></div>
            <div><strong style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Specialty</strong><br/> <span style={{color:'#334155', fontWeight:500}}>{selectedApp.specialty}</span></div>
            <div><strong style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clinical Experience</strong><br/> <span style={{color:'#334155', fontWeight:500}}>{selectedApp.experienceYears} Years</span></div>
            <div><strong style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>License Number</strong><br/> <span style={{fontFamily:'monospace', background:'#e2e8f0', padding:'2px 6px', borderRadius:'4px', color:'#0f172a', fontWeight:600}}>{selectedApp.registrationNumber}</span></div>
            <div style={{ gridColumn: 'span 2' }}><strong style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clinic / Hospital Details</strong><br/> <span style={{color:'#334155', fontWeight:500}}>{selectedApp.clinicName} — {selectedApp.address}</span></div>
          </div>
        )}
      </Modal>

      {/* Rejection Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Application"
        actions={
          <>
            <button onClick={() => setIsRejectModalOpen(false)} style={{ padding: '12px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={submitReject} style={{ padding: '12px 24px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Confirm Rejection & Notify</button>
          </>
        }
      >
        <p style={{ marginBottom: '16px', color: '#334155', fontWeight: 500 }}>Please provide a clear reason for rejecting Dr. {selectedApp?.fullName}'s application (this will be sent via email):</p>
        <textarea 
          value={rejectReason} 
          onChange={e => setRejectReason(e.target.value)}
          style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', minHeight: '120px', fontSize: '1rem', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s', resize: 'vertical' }}
          onFocus={e=>e.target.style.borderColor='#ef4444'}
          onBlur={e=>e.target.style.borderColor='#cbd5e1'}
          placeholder="e.g. License number could not be verified in the national registry..."
        />
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

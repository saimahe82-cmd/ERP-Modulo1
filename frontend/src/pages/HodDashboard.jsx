import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import leaveService from '../services/leaveService';
import db from '../services/api';
import logo from '../assets/nec-logo.jpeg';
import './HodDashboard.css';

const getStudentSection = async (studentEmail) => {
    if (!studentEmail) return 'A';
    try {
        const stored = await db.getStudentExtra(studentEmail.toLowerCase());
        return stored?.section || 'A';
    } catch (e) {
        return 'A';
    }
};

const HodDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activePage, setActivePage] = useState('dashboard');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [modalRemarks, setModalRemarks] = useState('');

    // Separate tabs for student and faculty
    const [activeTab, setActiveTab] = useState('student'); // 'student' or 'faculty'

    // Filter states
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sectionFilter, setSectionFilter] = useState('all');

    const [studentRequests, setStudentRequests] = useState([]);
    const [facultyRequests, setFacultyRequests] = useState([]);
    const [facultyList, setFacultyList] = useState([]);
    const [overdueProofs, setOverdueProofs] = useState([]);
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const loadRequests = useCallback(async () => {
        try {
            const [studentRes, facultyRes, overdue, faculty] = await Promise.all([
                leaveService.getRequestsByRole('student'),
                leaveService.getRequestsByRole('faculty'),
                leaveService.getOverdueOdProofs(),
                leaveService.getFacultyList()
            ]);
            // Handle requests without requesterRole (backward compatibility)
            const normalizedStudentRes = studentRes.map(r => ({ ...r, requesterRole: r.requesterRole || 'student' }));
            const normalizedFacultyRes = facultyRes.map(r => ({ ...r, requesterRole: r.requesterRole || 'faculty' }));
            setStudentRequests(normalizedStudentRes);
            setFacultyRequests(normalizedFacultyRes);
            setOverdueProofs(overdue);
            setFacultyList(faculty);
        } catch (err) {
            console.error('Failed to load requests:', err);
        }
    }, []);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const openModal = (id) => {
        setSelectedRequestId(id);
        setModalRemarks('');
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedRequestId(null);
    };

    const handleAction = async (status) => {
        if (!selectedRequestId) return;
        await leaveService.hodAction(selectedRequestId, status);
        await loadRequests();
        closeModal();
    };

    const currentRequests = activeTab === 'student' ? studentRequests : facultyRequests;

    const filteredRequests = currentRequests.filter(r => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (typeFilter !== 'all') {
            if (typeFilter === 'od' && !(r.type?.toLowerCase().includes('od') || r.type?.toLowerCase().includes('on-duty'))) return false;
            if (typeFilter === 'leave' && (r.type?.toLowerCase().includes('od') || r.type?.toLowerCase().includes('on-duty'))) return false;
        }
        return true;
    });

    const paginate = (list) => {
        const start = (page - 1) * pageSize;
        return list.slice(start, start + pageSize);
    };

    const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
    const paginatedRequests = paginate(filteredRequests);

    const pendingCount = currentRequests.filter(r => r.status === 'pending').length;
    const approvedCount = currentRequests.filter(r => r.status === 'approved').length;
    const rejectedCount = currentRequests.filter(r => r.status === 'rejected').length;

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getDuration = (from, to) => {
        if (!from || !to) return '-';
        const diff = Math.ceil((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)) + 1;
        return diff <= 0 ? '-' : diff === 1 ? '1 Day' : `${diff} Days`;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return '#10b981';
            case 'rejected': return '#ef4444';
            case 'pending': return '#f59e0b';
            default: return '#64748b';
        }
    };

    const selectedRequest = currentRequests.find(r => r.id === selectedRequestId);

    return (
        <div className="hod-dashboard-wrapper">
            {/* SIDEBAR */}
            <nav className="sidebar">
                <div className="sidebar-header">HOD Panel</div>
                <div className="sidebar-nav">
                    <button className={activePage === 'dashboard' ? 'active' : ''} onClick={() => setActivePage('dashboard')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                        Dashboard
                    </button>
                    <button className={activePage === 'requests' ? 'active' : ''} onClick={() => setActivePage('requests')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                        Leave Requests
                    </button>
                </div>
                <div style={{ marginTop: 'auto', padding: '16px 8px' }}>
                    <div className="sidebar-nav">
                        <button onClick={handleLogout} style={{ color: '#ef4444' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            {/* MAIN */}
            <div className="main">
                <div className="topbar" style={{ height: '70px', padding: '0 2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <img src={logo} alt="NEC Logo" style={{ height: '45px' }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)', lineHeight: 1.1 }}>Nandha Engineering College</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-fg)', letterSpacing: '0.05em' }}>HOD DASHBOARD</span>
                        </div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{
                            padding: '0.25rem 0.75rem', borderRadius: '0.5rem',
                            background: '#f0fdf4', color: '#15803d', fontSize: '0.75rem',
                            fontWeight: 600, border: '1px solid #bbf7d0',
                        }}>
                            <i className="fas fa-building" style={{ marginRight: '0.3rem' }}></i>
                            {user?.department || 'No Department'}
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--muted-fg)' }}>{user?.name || 'HOD'}</span>
                    </div>
                </div>
                <div className="content">

                    {/* ── DASHBOARD PAGE ── */}
                    {activePage === 'dashboard' && (
                        <div className="page active">
                            <h1>Dashboard Overview</h1>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-card-header">
                                        <span className="stat-card-title">Student Requests</span>
                                        <span className="stat-card-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                            </svg>
                                        </span>
                                    </div>
                                    <div className="stat-card-value">{studentRequests.length}</div>
                                    <div className="stat-card-desc">Total student requests</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-card-header">
                                        <span className="stat-card-title">Faculty Requests</span>
                                        <span className="stat-card-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="2" y="7" width="20" height="14" rx="2" />
                                                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                                            </svg>
                                        </span>
                                    </div>
                                    <div className="stat-card-value">{facultyRequests.length}</div>
                                    <div className="stat-card-desc">Total faculty requests</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-card-header">
                                        <span className="stat-card-title">Pending (Students)</span>
                                        <span className="stat-card-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                            </svg>
                                        </span>
                                    </div>
                                    <div className="stat-card-value">{studentRequests.filter(r => r.status === 'pending').length}</div>
                                    <div className="stat-card-desc">Awaiting approval</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-card-header">
                                        <span className="stat-card-title">Pending (Faculty)</span>
                                        <span className="stat-card-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                            </svg>
                                        </span>
                                    </div>
                                    <div className="stat-card-value">{facultyRequests.filter(r => r.status === 'pending').length}</div>
                                    <div className="stat-card-desc">Awaiting approval</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── REQUESTS PAGE ── */}
                    {activePage === 'requests' && (
                        <div className="page active">
                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0' }}>
                                <button
                                    onClick={() => { setActiveTab('student'); setPage(1); }}
                                    style={{
                                        padding: '0.75rem 1.5rem', border: 'none', background: 'none',
                                        fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                                        color: activeTab === 'student' ? '#4f46e5' : '#64748b',
                                        borderBottom: activeTab === 'student' ? '3px solid #4f46e5' : '3px solid transparent',
                                        marginBottom: '-2px', transition: 'all 0.2s',
                                    }}
                                >
                                    <i className="fas fa-user-graduate" style={{ marginRight: '0.5rem' }}></i>
                                    Student Requests ({studentRequests.length})
                                </button>
                                <button
                                    onClick={() => { setActiveTab('faculty'); setPage(1); }}
                                    style={{
                                        padding: '0.75rem 1.5rem', border: 'none', background: 'none',
                                        fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                                        color: activeTab === 'faculty' ? '#4f46e5' : '#64748b',
                                        borderBottom: activeTab === 'faculty' ? '3px solid #4f46e5' : '3px solid transparent',
                                        marginBottom: '-2px', transition: 'all 0.2s',
                                    }}
                                >
                                    <i className="fas fa-chalkboard-teacher" style={{ marginRight: '0.5rem' }}></i>
                                    Faculty Requests ({facultyRequests.length})
                                </button>
                            </div>

                            {/* Faculty List - Only shown in faculty tab */}
                            {activeTab === 'faculty' && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                            <i className="fas fa-users" style={{ marginRight: '0.5rem', color: '#4f46e5' }}></i>
                                            Faculty Members
                                        </h3>
                                        <span style={{
                                            fontSize: '0.75rem', color: '#64748b', background: '#f8fafc',
                                            padding: '0.25rem 0.75rem', borderRadius: '0.5rem',
                                            border: '1px solid #e2e8f0',
                                        }}>
                                            <i className="fas fa-info-circle" style={{ marginRight: '0.25rem', color: '#4f46e5' }}></i>
                                            Auto-shows {user?.department} faculty
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                                        {facultyList.map(faculty => {
                                            const facultyReqs = facultyRequests.filter(r => r.studentEmail === faculty.email);
                                            const pendingCount = facultyReqs.filter(r => r.status === 'pending').length;
                                            const approvedCount = facultyReqs.filter(r => r.status === 'approved').length;
                                            const rejectedCount = facultyReqs.filter(r => r.status === 'rejected').length;
                                            return (
                                                <div key={faculty.email} style={{
                                                    background: '#fff', borderRadius: '0.75rem', padding: '1rem',
                                                    border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                        <div style={{
                                                            width: '40px', height: '40px', borderRadius: '10px',
                                                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            color: '#fff', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0,
                                                        }}>
                                                            {faculty.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div style={{ minWidth: 0 }}>
                                                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {faculty.name}
                                                            </div>
                                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {faculty.subject || faculty.department || faculty.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem' }}>
                                                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                                                            Pending: {pendingCount}
                                                        </span>
                                                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#d1fae5', color: '#065f46', fontWeight: 600 }}>
                                                            Approved: {approvedCount}
                                                        </span>
                                                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>
                                                            Rejected: {rejectedCount}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Filters */}
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>Status:</span>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                                        style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.875rem', cursor: 'pointer' }}
                                    >
                                        <option value="all">All Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>Type:</span>
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                                        style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.875rem', cursor: 'pointer' }}
                                    >
                                        <option value="all">All Types</option>
                                        <option value="leave">Leave</option>
                                        <option value="od">On-Duty</option>
                                    </select>
                                </div>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
                                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>Pending: {pendingCount}</span>
                                    <span style={{ color: '#10b981', fontWeight: 600 }}>Approved: {approvedCount}</span>
                                    <span style={{ color: '#ef4444', fontWeight: 600 }}>Rejected: {rejectedCount}</span>
                                </div>
                            </div>

                            {/* Requests Table */}
                            <div className="card">
                                <div className="card-content" style={{ paddingTop: '20px' }}>
                                    {paginatedRequests.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                            <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                                            No {activeTab} requests found.
                                        </div>
                                    ) : (
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc' }}>
                                                    {['ID', 'Name', 'Type', 'Duration', 'Reason', 'From', 'To', 'Status', 'Action'].map(h => (
                                                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedRequests.map(req => (
                                                    <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td className="mono" style={{ padding: '1rem', fontSize: '0.75rem', color: '#64748b' }}>{req.id?.substring(0, 8)}...</td>
                                                        <td style={{ padding: '1rem' }}>
                                                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{req.studentName}</div>
                                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{req.registerNo}</div>
                                                        </td>
                                                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#475569' }}>{req.type}</td>
                                                        <td style={{ padding: '1rem' }}>
                                                            <span style={{ fontWeight: 700, color: '#6366f1', background: '#f5f3ff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                                {getDuration(req.fromDate, req.toDate)}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '1rem', maxWidth: '150px' }}>
                                                            <div style={{ fontSize: '0.8rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.reason}>
                                                                {req.reason || '-'}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap' }}>{formatDate(req.fromDate)}</td>
                                                        <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap' }}>{formatDate(req.toDate)}</td>
                                                        <td style={{ padding: '1rem' }}>
                                                            <span style={{
                                                                padding: '0.25rem 0.75rem', borderRadius: '9999px',
                                                                background: `${getStatusColor(req.status)}15`,
                                                                color: getStatusColor(req.status),
                                                                fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                                                            }}>
                                                                {req.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '1rem' }}>
                                                            <button className="btn btn-ghost" onClick={() => openModal(req.id)}>
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                                    <circle cx="12" cy="12" r="3" />
                                                                </svg>
                                                                View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                    {totalPages > 1 && (
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}>
                                            <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                                            <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.875rem', color: '#64748b' }}>Page {page} of {totalPages}</span>
                                            <button className="btn btn-ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* ── MODAL ── */}
            {modalOpen && selectedRequest && (
                <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') closeModal(); }}>
                    <div className="modal">
                        <h2>{selectedRequest.type} — {selectedRequest.studentName}</h2>
                        <div className="modal-grid">
                            <div><span className="label">Register No:</span> <strong>{selectedRequest.registerNo || '-'}</strong></div>
                            <div><span className="label">Type:</span> <strong>{selectedRequest.type}</strong></div>
                            <div><span className="label">From:</span> <strong>{formatDate(selectedRequest.fromDate)}</strong></div>
                            <div><span className="label">To:</span> <strong>{formatDate(selectedRequest.toDate)}</strong></div>
                            <div><span className="label">Duration:</span> <strong>{getDuration(selectedRequest.fromDate, selectedRequest.toDate)}</strong></div>
                            <div><span className="label">Status:</span> <span className={`badge badge-${selectedRequest.status}`}>{selectedRequest.status}</span></div>
                            <div style={{ gridColumn: '1 / -1' }}><span className="label">Reason:</span> <strong>{selectedRequest.reason || '-'}</strong></div>
                            {selectedRequest.rejectionReason && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <span className="label">Rejection Reason:</span>
                                    <strong style={{ color: '#ef4444' }}>{selectedRequest.rejectionReason}</strong>
                                </div>
                            )}
                            {selectedRequest.proctorEmail && (
                                <div><span className="label">Proctor:</span> <strong>{selectedRequest.proctorEmail}</strong></div>
                            )}
                            {selectedRequest.classFacultyEmail && (
                                <div><span className="label">Class Faculty:</span> <strong>{selectedRequest.classFacultyEmail}</strong></div>
                            )}
                        </div>

                        {/* Approve / Reject actions - only for pending */}
                        {selectedRequest.status === 'pending' && (
                            <div className="modal-actions-area">
                                <textarea
                                    placeholder="Add remarks..."
                                    value={modalRemarks}
                                    onChange={(e) => setModalRemarks(e.target.value)}
                                />
                                <div className="modal-actions">
                                    <button className="btn btn-reject" onClick={() => handleAction('rejected')}>✕ Reject</button>
                                    <button className="btn btn-approve" onClick={() => handleAction('approved')}>✓ Approve</button>
                                </div>
                            </div>
                        )}

                        <div className="modal-actions" style={{ marginTop: '16px' }}>
                            <button className="btn btn-ghost" onClick={closeModal} style={{ marginLeft: 'auto' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HodDashboard;

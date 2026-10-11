import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/nec-logo.jpeg';
import { useAuth } from '../context/AuthContext';
import leaveService from '../services/leaveService';

const StaffDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [allRequests, setAllRequests] = useState([]);
    const [filter, setFilter] = useState('all');
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [viewingReq, setViewingReq] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const pending = await leaveService.getPendingForFaculty();
            setRequests(pending);
            const all = await leaveService.getAllRequests();
            setAllRequests(all);
        } catch (err) {
            setErrorMsg('Failed to load requests. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const handleApprove = async (reqId, studentName) => {
        setProcessingId(reqId);
        try {
            const result = await leaveService.facultyForwardToHod(reqId);
            if (result.success) {
                setSuccessMsg(`Forwarded ${studentName}'s request to HOD`);
            } else {
                setErrorMsg(result.message || 'Failed to forward request');
            }
        } catch (err) {
            setErrorMsg('Failed to forward request. Please try again.');
        } finally {
            setProcessingId(null);
            await loadData();
            setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 3000);
        }
    };

    const handleApproveAll = async () => {
        if (requests.length === 0) return;
        if (!window.confirm(`Forward all ${requests.length} pending requests to HOD?`)) return;
        try {
            for (const req of requests) {
                await leaveService.facultyForwardToHod(req.id);
            }
            setSuccessMsg(`Forwarded all ${requests.length} requests to HOD`);
            await loadData();
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setErrorMsg('Failed to forward requests');
            setProcessingId(null);
        }
    };

    const handleRejectClick = (req) => {
        setViewingReq(req);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const handleRejectConfirm = async () => {
        if (!viewingReq) return;
        setProcessingId(viewingReq.id);
        setShowRejectModal(false);
        try {
            const result = await leaveService.facultyReject(viewingReq.id, rejectReason);
            if (result.success) {
                setSuccessMsg(`Rejected ${viewingReq.studentName}'s request`);
            } else {
                setErrorMsg(result.message || 'Failed to reject request');
            }
        } catch (err) {
            setErrorMsg('Failed to reject request');
        } finally {
            setProcessingId(null);
            setViewingReq(null);
            setRejectReason('');
            await loadData();
            setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 3000);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getDuration = (from, to) => {
        if (!from || !to) return '-';
        const d1 = new Date(from);
        const d2 = new Date(to);
        const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
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

    const getTypeIcon = (type) => {
        const t = (type || '').toLowerCase();
        if (t.includes('od') || t.includes('on-duty')) return { icon: 'fa-briefcase', color: '#8b5cf6' };
        if (t.includes('sick')) return { icon: 'fa-briefcase-medical', color: '#ef4444' };
        if (t.includes('personal')) return { icon: 'fa-user', color: '#f59e0b' };
        if (t.includes('emergency')) return { icon: 'fa-exclamation-triangle', color: '#dc2626' };
        if (t.includes('medical')) return { icon: 'fa-hospital', color: '#0ea5e9' };
        return { icon: 'fa-calendar', color: '#6366f1' };
    };

    const filteredRequests = filter === 'all' ? requests
        : requests.filter(r => r.leaveType === filter);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayLeaves = allRequests.filter(r =>
        r.status === 'approved' && r.fromDate <= todayStr && r.toDate >= todayStr
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
            {/* Sidebar */}
            <aside style={{
                width: '272px', background: 'linear-gradient(195deg, #1e293b 0%, #0f172a 100%)',
                color: '#fff', display: 'flex', flexDirection: 'column', position: 'fixed',
                top: 0, left: 0, bottom: 0, zIndex: 50, boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
            }}>
                <div style={{ padding: '1.75rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img src={logo} alt="NEC Logo" style={{ width: '40px' }} />
                        <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Nandha Engineering College</div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Staff Portal</div>
                        </div>
                    </div>
                </div>
                <nav style={{ padding: '1.5rem 1rem', flex: 1 }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', padding: '0 0.75rem', marginBottom: '0.75rem' }}>Menu</div>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.875rem',
                        padding: '0.75rem 1rem', borderRadius: '0.625rem',
                        color: '#fff', background: 'rgba(99,102,241,0.2)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem',
                    }}>
                        <i className="fas fa-home"></i>
                        <span>Overview</span>
                    </div>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.875rem',
                        padding: '0.75rem 1rem', borderRadius: '0.625rem',
                        color: 'rgba(255,255,255,0.55)', background: 'transparent',
                        border: '1px solid transparent', fontSize: '0.875rem',
                        cursor: 'pointer', marginBottom: '0.25rem',
                    }}>
                        <i className="fas fa-clipboard-check"></i>
                        <span>Full Dashboard</span>
                    </div>
                </nav>
                <div style={{ padding: '0 1rem 1.5rem' }}>
                    <button onClick={handleLogout} style={{
                        display: 'flex', alignItems: 'center', gap: '0.875rem',
                        padding: '0.75rem 1rem', borderRadius: '0.625rem',
                        color: '#f87171', background: 'transparent',
                        border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                        fontSize: '0.875rem',
                    }}>
                        <i className="fas fa-sign-out-alt"></i>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ marginLeft: '272px', flex: 1, padding: '2rem 2.5rem' }}>
                <header style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: '2rem',
                }}>
                    <div>
                        <h2 style={{ color: '#4f46e5', fontWeight: 800, margin: 0, fontSize: '1.5rem' }}>Staff Dashboard</h2>
                        <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontWeight: 500 }}>
                            {user?.name || 'Faculty'} · {user?.department || 'Computer Science'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            padding: '0.5rem 1rem', borderRadius: '0.5rem',
                            background: '#fff', border: '1px solid #e2e8f0',
                            fontSize: '0.875rem', color: '#64748b',
                        }}>
                            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>
                </header>

                {/* Success/Error Messages */}
                {successMsg && (
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#10b981', padding: '0.75rem 1rem', borderRadius: '0.5rem',
                        marginBottom: '1.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}>
                        <i className="fas fa-check-circle"></i> {successMsg}
                    </div>
                )}
                {errorMsg && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '0.5rem',
                        marginBottom: '1.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}>
                        <i className="fas fa-exclamation-circle"></i> {errorMsg}
                    </div>
                )}

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
                    <div style={{
                        background: '#fff', borderRadius: '1rem', padding: '1.5rem',
                        border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem',
                    }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '14px',
                            background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.06))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(245,158,11,0.15)',
                        }}>
                            <i className="fas fa-hourglass-half" style={{ color: '#f59e0b', fontSize: '1.125rem' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Approvals</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', marginTop: '0.25rem' }}>{requests.length}</div>
                        </div>
                    </div>
                    <div style={{
                        background: '#fff', borderRadius: '1rem', padding: '1.5rem',
                        border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem',
                    }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '14px',
                            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.06))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(16,185,129,0.15)',
                        }}>
                            <i className="fas fa-calendar-check" style={{ color: '#10b981', fontSize: '1.125rem' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Today's Leaves</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', marginTop: '0.25rem' }}>{todayLeaves.length}</div>
                        </div>
                    </div>
                    <div style={{
                        background: '#fff', borderRadius: '1rem', padding: '1.5rem',
                        border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem',
                    }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '14px',
                            background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.06))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(99,102,241,0.15)',
                        }}>
                            <i className="fas fa-file-invoice" style={{ color: '#6366f1', fontSize: '1.125rem' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Processed</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', marginTop: '0.25rem' }}>
                                {allRequests.filter(r => r.facultyStatus && r.facultyStatus !== 'pending').length}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pending Requests Table */}
                <div style={{
                    background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <div>
                            <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', margin: 0 }}>Pending Leave Requests</h3>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.125rem 0 0' }}>Review and forward student requests to HOD</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <select
                                style={{
                                    padding: '0.5rem 1rem', background: '#fff', color: '#1e293b',
                                    border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.8rem',
                                    cursor: 'pointer', outline: 'none',
                                }}
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            >
                                <option value="all">All Types</option>
                                <option value="sick">Sick Leave</option>
                                <option value="personal">Personal</option>
                                <option value="od">On-Duty</option>
                                <option value="medical">Medical</option>
                                <option value="emergency">Emergency</option>
                            </select>
                            <button
                                onClick={handleApproveAll}
                                disabled={filteredRequests.length === 0 || processingId !== null}
                                style={{
                                    padding: '0.5rem 1rem', background: filteredRequests.length === 0 ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: filteredRequests.length === 0 ? '#94a3b8' : '#fff',
                                    border: 'none', borderRadius: '0.5rem', fontSize: '0.8rem',
                                    fontWeight: 600, cursor: filteredRequests.length === 0 ? 'not-allowed' : 'pointer',
                                    boxShadow: filteredRequests.length === 0 ? 'none' : '0 2px 8px rgba(99,102,241,0.3)',
                                }}
                            >
                                Forward All to HOD
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem' }}></i>
                            <p style={{ marginTop: '0.5rem' }}>Loading requests...</p>
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center' }}>
                            <i className="fas fa-check-circle" style={{ fontSize: '2rem', color: '#d1d5db', marginBottom: '0.5rem', display: 'block' }}></i>
                            <p style={{ fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>No pending requests!</p>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>All caught up. New student requests will appear here.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        {['Student', 'Type', 'Duration', 'Reason', 'Status', 'Action'].map(h => (
                                            <th key={h} style={{
                                                padding: '0.75rem 1rem', textAlign: 'left',
                                                fontSize: '0.7rem', fontWeight: 700, color: '#64748b',
                                                textTransform: 'uppercase', letterSpacing: '0.05em',
                                                borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap',
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRequests.map((req) => {
                                        const typeCfg = getTypeIcon(req.type);
                                        const isProcessing = processingId === req.id;
                                        return (
                                            <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#fafbfd'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <div style={{
                                                            width: '36px', height: '36px', borderRadius: '10px',
                                                            background: `${typeCfg.color}15`, display: 'flex', alignItems: 'center',
                                                            justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700,
                                                            color: typeCfg.color, flexShrink: 0, border: `1px solid ${typeCfg.color}25`,
                                                        }}>
                                                            {req.studentName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{req.studentName}</div>
                                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{req.registerNo}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <i className={`fas ${typeCfg.icon}`} style={{ color: typeCfg.color, fontSize: '0.875rem' }}></i>
                                                        <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>{req.type}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap' }}>
                                                        {formatDate(req.fromDate)} — {formatDate(req.toDate)}
                                                    </div>
                                                    <div style={{
                                                        display: 'inline-block', marginTop: '0.25rem',
                                                        fontSize: '0.7rem', fontWeight: 700, color: '#6366f1',
                                                        background: '#f5f3ff', padding: '2px 8px', borderRadius: '4px',
                                                    }}>
                                                        {getDuration(req.fromDate, req.toDate)}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem', maxWidth: '200px' }}>
                                                    <div style={{
                                                        fontSize: '0.8rem', color: '#64748b',
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                        title: req.reason,
                                                    }}>
                                                        {req.reason || '-'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{
                                                        padding: '0.25rem 0.75rem', borderRadius: '9999px',
                                                        background: `${getStatusColor(req.facultyStatus)}15`,
                                                        color: getStatusColor(req.facultyStatus),
                                                        fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                                                        letterSpacing: '0.03em',
                                                    }}>
                                                        {req.facultyStatus}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => handleApprove(req.id, req.studentName)}
                                                            disabled={isProcessing}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '0.375rem',
                                                                padding: '0.4rem 0.875rem', borderRadius: '0.5rem',
                                                                background: isProcessing ? '#e2e8f0' : 'linear-gradient(135deg, #10b981, #059669)',
                                                                color: '#fff', border: 'none', fontSize: '0.75rem',
                                                                fontWeight: 600, cursor: isProcessing ? 'not-allowed' : 'pointer',
                                                                boxShadow: isProcessing ? 'none' : '0 2px 8px rgba(16,185,129,0.3)',
                                                                transition: 'all 0.2s',
                                                            }}
                                                        >
                                                            {isProcessing ? (
                                                                <><i className="fas fa-spinner fa-spin"></i> Processing...</>
                                                            ) : (
                                                                <><i className="fas fa-check"></i> Forward</>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectClick(req)}
                                                            disabled={isProcessing}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '0.375rem',
                                                                padding: '0.4rem 0.875rem', borderRadius: '0.5rem',
                                                                background: '#fef2f2', color: '#ef4444',
                                                                border: '1px solid rgba(239,68,68,0.2)',
                                                                fontSize: '0.75rem', fontWeight: 600,
                                                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                                                                opacity: isProcessing ? 0.5 : 1,
                                                                transition: 'all 0.2s',
                                                            }}
                                                        >
                                                            <i className="fas fa-times"></i> Reject
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Reject Modal */}
            {showRejectModal && viewingReq && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }} onClick={() => setShowRejectModal(false)}>
                    <div style={{
                        background: '#fff', borderRadius: '1rem', padding: '2rem',
                        width: '90%', maxWidth: '450px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                            Reject Request
                        </h3>
                        <p style={{ margin: '0 0 1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                            Are you sure you want to reject <strong>{viewingReq.studentName}</strong>'s {viewingReq.type} request?
                        </p>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                                Reason for rejection (optional)
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Enter reason for rejection..."
                                rows={3}
                                style={{
                                    width: '100%', padding: '0.75rem', border: '1.5px solid #e2e8f0',
                                    borderRadius: '0.5rem', fontSize: '0.9rem', resize: 'vertical',
                                    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowRejectModal(false)}
                                style={{
                                    padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
                                    background: '#f8fafc', color: '#64748b', border: '1.5px solid #e2e8f0',
                                    fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRejectConfirm}
                                disabled={processingId !== null}
                                style={{
                                    padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
                                    background: processingId !== null ? '#e2e8f0' : '#ef4444',
                                    color: '#fff', border: 'none',
                                    fontWeight: 600, fontSize: '0.875rem',
                                    cursor: processingId !== null ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {processingId !== null ? 'Rejecting...' : 'Reject Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffDashboard;

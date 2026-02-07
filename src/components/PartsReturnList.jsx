import { useState, useEffect, useCallback } from 'react';
import {
    Undo2, Check, X, Clock, Loader2,
    Search, ChevronDown, Package, AlertTriangle,
    User, Calendar, ArrowLeft, CheckCircle2, XCircle
} from 'lucide-react';
import { partsReturnsAPI } from '../services/api';

const STATUS_CONFIG = {
    pending: { bg: 'bg-amber-600', text: 'text-amber-400', label: 'รออนุมัติ', icon: Clock },
    approved: { bg: 'bg-emerald-600', text: 'text-emerald-400', label: 'อนุมัติแล้ว', icon: Check },
    restocked: { bg: 'bg-sky-600', text: 'text-sky-400', label: 'คืนสต๊อกแล้ว', icon: Package },
    rejected: { bg: 'bg-red-600', text: 'text-red-400', label: 'ปฏิเสธ', icon: X },
};

const REASON_LABELS = {
    'wrong_part': 'ไม่ตรงรุ่น',
    'defective': 'ชำรุด/เสียหาย',
    'not_needed': 'ไม่ต้องใช้',
    'excess': 'เกินจำนวน'
};

const PartsReturnList = ({ userId, userRole, onBack }) => {
    const [returns, setReturns] = useState([]);
    const [stats, setStats] = useState({ pending_count: 0, approved_count: 0, restocked_count: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState({ status: '' });
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(null);

    const fetchReturns = useCallback(async () => {
        try {
            setLoading(true);
            const result = await partsReturnsAPI.getAll({
                status: filter.status || undefined,
            });
            setReturns(result.returns || []);
            setStats(result.stats || { pending_count: 0, approved_count: 0, restocked_count: 0 });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    const handleApprove = async (id) => {
        if (actionLoading) return; // Prevent double submit
        if (!confirm('ต้องการอนุมัติคืนอะไหล่และเพิ่มเข้าสต๊อก?')) return;
        
        try {
            setActionLoading(id);
            await partsReturnsAPI.approve(id, userId);
            fetchReturns();
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async () => {
        if (actionLoading) return; // Prevent double submit
        if (!rejectReason.trim()) {
            alert('กรุณาระบุเหตุผล');
            return;
        }
        try {
            setActionLoading(showRejectModal);
            await partsReturnsAPI.reject(showRejectModal, userId, rejectReason);
            setShowRejectModal(null);
            setRejectReason('');
            fetchReturns();
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const filteredReturns = returns.filter(r => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            r.return_number?.toLowerCase().includes(searchLower) ||
            r.part_name?.toLowerCase().includes(searchLower) ||
            r.part_code?.toLowerCase().includes(searchLower) ||
            r.returned_by_name?.toLowerCase().includes(searchLower) ||
            r.work_order?.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-lg border-b border-zinc-800/50">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        {onBack && (
                            <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white">
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h1 className="text-lg font-bold flex items-center gap-2">
                                <Undo2 className="w-5 h-5 text-orange-500" />
                                ใบขอคืนอะไหล่
                            </h1>
                            <p className="text-xs text-zinc-500">จัดการรายการคืนอะไหล่</p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
                    <button
                        onClick={() => setFilter({ status: '' })}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                            filter.status === '' ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-400'
                        }`}
                    >
                        ทั้งหมด ({returns.length})
                    </button>
                    <button
                        onClick={() => setFilter({ status: 'pending' })}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                            filter.status === 'pending' ? 'bg-amber-600 text-white' : 'bg-zinc-900 text-amber-400'
                        }`}
                    >
                        รออนุมัติ ({stats.pending_count || 0})
                    </button>
                    <button
                        onClick={() => setFilter({ status: 'restocked' })}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                            filter.status === 'restocked' ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-emerald-400'
                        }`}
                    >
                        คืนแล้ว ({stats.restocked_count || 0})
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="ค้นหาเลขใบคืน, อะไหล่, ผู้ขอ..."
                            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        />
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="p-4 space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                ) : error ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <p className="text-red-400">{error}</p>
                    </div>
                ) : filteredReturns.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>ไม่พบรายการคืนอะไหล่</p>
                    </div>
                ) : (
                    filteredReturns.map((item) => {
                        const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                        const isExpanded = expandedId === item.id;

                        return (
                            <div
                                key={item.id}
                                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
                            >
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                    className="w-full p-4 text-left"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bg}`}>
                                                    {statusConfig.label}
                                                </span>
                                                <span className="text-xs text-zinc-500">{item.return_number}</span>
                                            </div>
                                            <p className="font-medium text-white truncate">{item.part_name}</p>
                                            <p className="text-xs text-zinc-500">{item.part_code}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-orange-400">{item.quantity}</p>
                                            <p className="text-xs text-zinc-500">{item.unit || 'ชิ้น'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <User size={12} />
                                            {item.returned_by_name}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            {formatDate(item.created_at)}
                                        </span>
                                    </div>

                                    <ChevronDown
                                        size={16}
                                        className={`absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-zinc-800 p-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-zinc-500 text-xs mb-1">เหตุผล</p>
                                                <p className="text-white">{REASON_LABELS[item.reason] || item.reason}</p>
                                            </div>
                                            {item.work_order && (
                                                <div>
                                                    <p className="text-zinc-500 text-xs mb-1">Work Order</p>
                                                    <p className="text-white">{item.work_order}</p>
                                                </div>
                                            )}
                                        </div>

                                        {item.notes && (
                                            <div>
                                                <p className="text-zinc-500 text-xs mb-1">หมายเหตุ</p>
                                                <p className="text-zinc-300 text-sm">{item.notes}</p>
                                            </div>
                                        )}

                                        {item.approved_by_name && (
                                            <div>
                                                <p className="text-zinc-500 text-xs mb-1">อนุมัติโดย</p>
                                                <p className="text-white">{item.approved_by_name}</p>
                                                <p className="text-xs text-zinc-500">{formatDate(item.approved_at)}</p>
                                            </div>
                                        )}

                                        {/* Action Buttons for Pending */}
                                        {item.status === 'pending' && ['admin', 'moderator'].includes(userRole) && (
                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    onClick={() => handleApprove(item.id)}
                                                    disabled={actionLoading === item.id}
                                                    className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {actionLoading === item.id ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 size={16} />
                                                    )}
                                                    อนุมัติคืน
                                                </button>
                                                <button
                                                    onClick={() => setShowRejectModal(item.id)}
                                                    disabled={actionLoading === item.id}
                                                    className="flex-1 py-2.5 rounded-lg bg-red-600/20 border border-red-600/50 text-red-400 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    <XCircle size={16} />
                                                    ปฏิเสธ
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </main>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-sm">
                        <div className="p-4 border-b border-zinc-800">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <XCircle className="w-5 h-5 text-red-500" />
                                ปฏิเสธใบขอคืน
                            </h3>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">เหตุผลที่ปฏิเสธ *</label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="ระบุเหตุผล..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                                    className="flex-1 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 font-medium"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={actionLoading === showRejectModal}
                                    className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {actionLoading === showRejectModal ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        'ยืนยันปฏิเสธ'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PartsReturnList;

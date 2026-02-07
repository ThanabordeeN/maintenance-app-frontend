import { useState, useEffect, useCallback } from 'react';
import {
    FileText, Check, X, AlertTriangle, Clock, Loader2,
    ShoppingCart, Search, ChevronDown, Package,
    User, Calendar
} from 'lucide-react';
import { requisitionsAPI, purchaseOrdersAPI, vendorsAPI } from '../services/api';

const STATUS_CONFIG = {
    pending: { bg: 'bg-amber-600', text: 'text-amber-400', label: 'รออนุมัติ', icon: Clock },
    approved: { bg: 'bg-emerald-600', text: 'text-emerald-400', label: 'อนุมัติแล้ว', icon: Check },
    ordered: { bg: 'bg-sky-600', text: 'text-sky-400', label: 'สั่งซื้อแล้ว', icon: ShoppingCart },
    received: { bg: 'bg-green-600', text: 'text-green-400', label: 'รับแล้ว', icon: Check },
    rejected: { bg: 'bg-red-600', text: 'text-red-400', label: 'ปฏิเสธ', icon: X },
    cancelled: { bg: 'bg-gray-600', text: 'text-gray-400', label: 'ยกเลิก', icon: X },
    partially_fulfilled: { bg: 'bg-sky-600', text: 'text-sky-400', label: 'เบิกบางส่วน', icon: Package },
};

const PRIORITY_CONFIG = {
    normal: { color: 'bg-gray-600', label: 'ปกติ' },
    high: { color: 'bg-orange-600', label: 'สูง' },
    urgent: { color: 'bg-red-600', label: 'เร่งด่วน' },
};

const PurchaseRequisitionList = ({ userId, userRole }) => {
    const [requisitions, setRequisitions] = useState([]);
    const [stats, setStats] = useState({ pending: 0, approved: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState({ status: '', priority: '' });
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [showCreatePO, setShowCreatePO] = useState(null);
    const [vendors, setVendors] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [vendorSearch, setVendorSearch] = useState('');
    const [showVendorDropdown, setShowVendorDropdown] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(null);

    const fetchRequisitions = useCallback(async () => {
        try {
            setLoading(true);
            const result = await requisitionsAPI.getAll({
                status: filter.status || undefined,
                priority: filter.priority || undefined,
            });
            setRequisitions(result.requisitions || []);
            // Map stats from API (pending_count, approved_count, etc) to frontend format
            const apiStats = result.stats || {};
            setStats({
                pending: parseInt(apiStats.pending_count) || 0,
                approved: parseInt(apiStats.approved_count) || 0,
                ordered: parseInt(apiStats.ordered_count) || 0,
                received: parseInt(apiStats.received_count) || 0,
                total: (result.requisitions || []).length
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchRequisitions();
    }, [fetchRequisitions]);

    useEffect(() => {
        const loadVendors = async () => {
            try {
                const { vendors: v } = await vendorsAPI.getAll();
                setVendors(v || []);
            } catch (err) {
                console.error('Error loading vendors:', err);
            }
        };
        loadVendors();
    }, []);

    const handleApprove = async (prId) => {
        if (actionLoading) return; // Prevent double submit
        try {
            setActionLoading(prId);
            const result = await requisitionsAPI.approve(prId, userId);

            if (!result.all_stock_available && result.stock_issues?.length > 0) {
                setShowCreatePO({ prId, stockIssues: result.stock_issues });
            }

            fetchRequisitions();
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            alert('กรุณาระบุเหตุผล');
            return;
        }
        try {
            setActionLoading(showRejectModal);
            await requisitionsAPI.reject(showRejectModal, userId, rejectReason);
            setShowRejectModal(null);
            setRejectReason('');
            fetchRequisitions();
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleCreatePO = async () => {
        if (!selectedVendor) {
            alert('กรุณาเลือก Vendor');
            return;
        }
        try {
            setActionLoading('create_po');
            await purchaseOrdersAPI.create({
                pr_id: showCreatePO.prId,
                vendor_id: selectedVendor,
                created_by: userId,
            });
            setShowCreatePO(null);
            setSelectedVendor(null);
            fetchRequisitions();
            alert('สร้างใบสั่งซื้อสำเร็จ');
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredRequisitions = requisitions.filter(pr => {
        if (search) {
            const s = search.toLowerCase();
            return pr.pr_number?.toLowerCase().includes(s) ||
                pr.requester_name?.toLowerCase().includes(s);
        }
        return true;
    });

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                        <ShoppingCart className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500" />
                        ใบขอเบิก (PR)
                    </h1>
                    <p className="text-gray-400 mt-1">จัดการและอนุมัติใบขอเบิกอะไหล่</p>
                </div>
                {stats.pending > 0 && (
                    <div className="px-4 py-2 bg-amber-600/20 border border-amber-500/30 rounded-lg">
                        <span className="text-amber-400 font-medium">รออนุมัติ {stats.pending} รายการ</span>
                    </div>
                )}
            </div>

            {/* Filter Section */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-3 space-y-3">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="ค้นหา PR, ผู้ขอ..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                    />
                </div>
                
                {/* Status Tab Filter */}
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                    {[
                        { value: '', label: 'ทั้งหมด', icon: FileText, count: requisitions.length },
                        { value: 'pending', label: 'รออนุมัติ', icon: Clock, count: stats.pending || 0 },
                        { value: 'approved', label: 'อนุมัติแล้ว', icon: Check, count: stats.approved || 0 },
                        { value: 'received', label: 'รับแล้ว', icon: Check, count: stats.received || 0 },
                        { value: 'rejected', label: 'ปฏิเสธ', icon: X, count: null },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = filter.status === tab.value;
                        return (
                            <button
                                key={tab.value}
                                onClick={() => setFilter(prev => ({ ...prev, status: tab.value }))}
                                className={`flex-none px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
                                    isActive
                                        ? 'bg-gray-800 text-amber-400 ring-1 ring-amber-500/30'
                                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                                }`}
                            >
                                <Icon size={16} className={isActive ? 'text-amber-400' : ''} />
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                                        isActive ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-800 text-gray-500'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
                
                {/* Priority Filter */}
                <div className="flex gap-2">
                    {[
                        { value: '', label: 'ทุกความเร่งด่วน' },
                        { value: 'urgent', label: '🔴 เร่งด่วน' },
                        { value: 'high', label: '🟠 สูง' },
                        { value: 'normal', label: '⚪ ปกติ' },
                    ].map((p) => (
                        <button
                            key={p.value}
                            onClick={() => setFilter(prev => ({ ...prev, priority: p.value }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                filter.priority === p.value
                                    ? 'bg-gray-700 text-white'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="animate-spin mx-auto mb-2 text-gray-500" size={32} />
                        <p className="text-gray-500">กำลังโหลด...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <AlertTriangle className="mx-auto mb-2 text-red-400" size={32} />
                        <p className="text-red-400">{error}</p>
                    </div>
                ) : filteredRequisitions.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="mx-auto mb-2 text-gray-700" size={48} />
                        <p className="text-gray-500">ไม่พบใบขอเบิก</p>
                    </div>
                ) : (
                    filteredRequisitions.map((pr) => {
                        const statusConfig = STATUS_CONFIG[pr.status] || STATUS_CONFIG.pending;
                        const priorityConfig = PRIORITY_CONFIG[pr.priority] || PRIORITY_CONFIG.normal;
                        const isExpanded = expandedId === pr.id;
                        const daysSinceCreated = Math.floor((Date.now() - new Date(pr.created_at).getTime()) / (1000 * 60 * 60 * 24));

                        return (
                            <div
                                key={pr.id}
                                className={`bg-gray-900 rounded-xl border overflow-hidden hover:border-gray-700 transition-colors group ${
                                    pr.status === 'pending' && pr.priority === 'urgent' 
                                        ? 'border-red-500/50' 
                                        : pr.status === 'pending' && pr.priority === 'high'
                                        ? 'border-orange-500/50'
                                        : 'border-gray-800'
                                }`}
                            >
                                {/* PR Header */}
                                <div
                                    className="p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : pr.id)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-white group-hover:text-amber-400 transition-colors">{pr.pr_number}</span>
                                                <span className={`px-2 py-0.5 text-xs text-white rounded-full ${statusConfig.bg}`}>
                                                    {statusConfig.label}
                                                </span>
                                                <span className={`px-2 py-0.5 text-xs text-white rounded-full ${priorityConfig.color}`}>
                                                    {priorityConfig.label}
                                                </span>
                                                {daysSinceCreated > 0 && pr.status === 'pending' && (
                                                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                                                        daysSinceCreated > 3 ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400'
                                                    }`}>
                                                        รอ {daysSinceCreated} วัน
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <User size={14} />
                                                    {pr.requester_name || 'ไม่ระบุ'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    {formatDate(pr.created_at)}
                                                </span>
                                            </div>
                                            {pr.work_order && (
                                                <div className="text-xs text-sky-400 mt-1 flex items-center gap-1">
                                                    <Package size={12} />
                                                    งาน: {pr.work_order} {pr.equipment_name && `(${pr.equipment_name})`}
                                                </div>
                                            )}
                                            {/* Quick Item Summary */}
                                            {pr.items && pr.items.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {pr.items.slice(0, 3).map((item, idx) => (
                                                        <span key={idx} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                                                            {item.part_name || item.custom_item_name}: {item.quantity} {item.unit || 'ชิ้น'}
                                                        </span>
                                                    ))}
                                                    {pr.items.length > 3 && (
                                                        <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-500">
                                                            +{pr.items.length - 3} รายการ
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-white">
                                                ฿{(pr.total_amount || 0).toLocaleString()}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {pr.item_count || 0} รายการ
                                            </div>
                                        </div>
                                        <ChevronDown
                                            className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                            size={20}
                                        />
                                    </div>
                                    
                                    {/* Quick Action Buttons - Always visible for pending items */}
                                    {pr.status === 'pending' && (userRole === 'admin' || userRole === 'moderator') && (
                                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleApprove(pr.id); }}
                                                disabled={actionLoading === pr.id}
                                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:bg-gray-700"
                                            >
                                                {actionLoading === pr.id ? (
                                                    <Loader2 className="animate-spin" size={18} />
                                                ) : (
                                                    <Check size={18} />
                                                )}
                                                อนุมัติ
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowRejectModal(pr.id); }}
                                                disabled={actionLoading === pr.id}
                                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:bg-gray-700"
                                            >
                                                <X size={18} />
                                                ไม่อนุมัติ
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-gray-800 bg-gray-950 p-4 space-y-4">
                                        {/* Items */}
                                        <div>
                                            <h4 className="font-medium text-gray-400 mb-2 text-sm">รายการอะไหล่</h4>
                                            <div className="space-y-2">
                                                {(pr.items || []).map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-800"
                                                    >
                                                        <div>
                                                            <div className="font-medium text-white">
                                                                {item.part_name || item.custom_item_name || 'ไม่ระบุ'}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {item.part_code && `รหัส: ${item.part_code} • `}
                                                                {item.quantity} {item.unit || item.custom_item_unit || 'ชิ้น'}
                                                            </div>
                                                            {item.current_stock !== undefined && item.quantity > item.current_stock && (
                                                                <div className="text-xs text-orange-400 flex items-center gap-1 mt-1">
                                                                    <AlertTriangle size={12} />
                                                                    สต๊อกไม่พอ (มี {item.current_stock})
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-white">฿{(item.quantity * item.unit_price).toLocaleString()}</div>
                                                            <div className="text-xs text-gray-500">@ ฿{item.unit_price?.toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        {pr.notes && (
                                            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                                <p className="text-sm text-amber-300">
                                                    <strong>หมายเหตุ:</strong> {pr.notes}
                                                </p>
                                            </div>
                                        )}

                                        {/* Approval Info */}
                                        {pr.status === 'approved' && pr.approved_by_name && (
                                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                                                <p className="text-sm text-emerald-300">
                                                    <strong>อนุมัติโดย:</strong> {pr.approved_by_name}
                                                    {pr.approved_at && ` เมื่อ ${formatDate(pr.approved_at)}`}
                                                </p>
                                            </div>
                                        )}

                                        {/* Rejection Reason */}
                                        {pr.rejection_reason && (
                                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                                <p className="text-sm text-red-300">
                                                    <strong>เหตุผลปฏิเสธ:</strong> {pr.rejection_reason}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
                    <div className="bg-zinc-900 rounded-2xl w-full max-w-md p-6 border border-zinc-800">
                        <h3 className="text-lg font-bold text-white mb-4">ปฏิเสธใบขอเบิก</h3>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="ระบุเหตุผลในการปฏิเสธ..."
                            className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl resize-none h-32 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                            autoFocus
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                                className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium active:scale-[0.98]"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={actionLoading === showRejectModal}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium active:scale-[0.98] disabled:bg-zinc-700"
                            >
                                {actionLoading === showRejectModal ? 'กำลังบันทึก...' : 'ยืนยันปฏิเสธ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create PO Modal */}
            {showCreatePO && (
                <div 
                    className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
                    onClick={() => { setShowCreatePO(null); setSelectedVendor(null); setVendorSearch(''); setShowVendorDropdown(false); }}
                >
                    <div 
                        className="bg-zinc-900 rounded-2xl w-full max-w-lg p-6 border border-zinc-800 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => { setShowCreatePO(null); setSelectedVendor(null); setVendorSearch(''); setShowVendorDropdown(false); }}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                        
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-orange-600/20 rounded-xl flex items-center justify-center">
                                <AlertTriangle className="text-orange-400" size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">สต๊อกไม่เพียงพอ</h3>
                                <p className="text-sm text-zinc-500">ต้องการสร้างใบสั่งซื้อหรือไม่?</p>
                            </div>
                        </div>

                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 mb-4">
                            <p className="text-sm text-orange-300 font-medium mb-2">รายการที่ต้องสั่งซื้อ:</p>
                            <ul className="text-sm text-orange-400/80 space-y-1">
                                {showCreatePO.stockIssues?.map((issue, idx) => (
                                    <li key={idx}>
                                        • {issue.part_name}: ขอ {issue.requested} / มี {issue.available}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-zinc-400 mb-2">เลือก Vendor</label>
                            <div className="relative">
                                {/* Search Input */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                    <input
                                        type="text"
                                        value={vendorSearch}
                                        onChange={(e) => {
                                            setVendorSearch(e.target.value);
                                            setShowVendorDropdown(true);
                                            if (!e.target.value) setSelectedVendor(null);
                                        }}
                                        onFocus={() => setShowVendorDropdown(true)}
                                        placeholder="พิมพ์ค้นหา Vendor..."
                                        className="w-full pl-10 pr-10 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
                                    />
                                    {selectedVendor && (
                                        <button
                                            onClick={() => {
                                                setSelectedVendor(null);
                                                setVendorSearch('');
                                            }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                                
                                {/* Dropdown List */}
                                {showVendorDropdown && (
                                    <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                        {vendors
                                            .filter(v => 
                                                (v.name || '').toLowerCase().includes(vendorSearch.toLowerCase()) ||
                                                (v.contact_person || '').toLowerCase().includes(vendorSearch.toLowerCase())
                                            )
                                            .map(v => (
                                                <button
                                                    key={v.id}
                                                    onClick={() => {
                                                        setSelectedVendor(v.id);
                                                        setVendorSearch(v.name || '');
                                                        setShowVendorDropdown(false);
                                                    }}
                                                    className={`w-full px-4 py-3 text-left hover:bg-zinc-700 transition-colors flex items-center justify-between ${
                                                        selectedVendor === v.id ? 'bg-sky-600/20 text-sky-400' : 'text-white'
                                                    }`}
                                                >
                                                    <div>
                                                        <div className="font-medium">{v.name || 'ไม่ระบุชื่อ'}</div>
                                                        {v.contact_person && (
                                                            <div className="text-xs text-zinc-500">{v.contact_person}</div>
                                                        )}
                                                    </div>
                                                    {selectedVendor === v.id && (
                                                        <Check size={18} className="text-sky-400" />
                                                    )}
                                                </button>
                                            ))
                                        }
                                        {vendors.filter(v => 
                                            (v.name || '').toLowerCase().includes(vendorSearch.toLowerCase())
                                        ).length === 0 && (
                                            <div className="px-4 py-3 text-zinc-500 text-center">
                                                ไม่พบ Vendor ที่ตรงกับ "{vendorSearch}"
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* Selected Vendor Display */}
                            {selectedVendor && (
                                <div className="mt-2 px-3 py-2 bg-sky-600/10 border border-sky-500/30 rounded-lg flex items-center gap-2">
                                    <Check size={16} className="text-sky-400" />
                                    <span className="text-sky-300 text-sm">
                                        เลือก: {vendors.find(v => v.id === selectedVendor)?.name}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowCreatePO(null); setSelectedVendor(null); setVendorSearch(''); setShowVendorDropdown(false); }}
                                className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium active:scale-[0.98]"
                            >
                                ข้าม
                            </button>
                            <button
                                onClick={handleCreatePO}
                                disabled={!selectedVendor || actionLoading === 'create_po'}
                                className="flex-1 py-3 bg-sky-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:bg-zinc-700 active:scale-[0.98]"
                            >
                                {actionLoading === 'create_po' ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <ShoppingCart size={20} />
                                )}
                                สร้างใบสั่งซื้อ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseRequisitionList;

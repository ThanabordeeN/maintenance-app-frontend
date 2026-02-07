import { useState, useEffect, useCallback, useRef } from 'react';
import {
    FileText, Check, X, Loader2, Search,
    ChevronDown, Printer, Package, Calendar,
    Truck, AlertTriangle
} from 'lucide-react';
import { purchaseOrdersAPI } from '../services/api';

const STATUS_CONFIG = {
    draft: { bg: 'bg-gray-600', label: 'ฉบับร่าง', icon: FileText },
    sent: { bg: 'bg-sky-600', label: 'รออนุมัติสั่งซื้อ', icon: Check },
    ordered: { bg: 'bg-violet-600', label: 'สั่งซื้อแล้ว', icon: Truck },
    partial: { bg: 'bg-orange-600', label: 'รับบางส่วน', icon: Package },
    received: { bg: 'bg-emerald-600', label: 'รับครบแล้ว', icon: Package },
    cancelled: { bg: 'bg-red-600', label: 'ยกเลิก', icon: X },
};

const PurchaseOrderList = ({ userId, userRole }) => {
    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState({ pending: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState({ status: '' });
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [showReceive, setShowReceive] = useState(null);
    const [receiveItems, setReceiveItems] = useState([]);
    const [printPO, setPrintPO] = useState(null);
    const printRef = useRef();

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const result = await purchaseOrdersAPI.getAll({
                status: filter.status || undefined,
            });
            setOrders(result.orders || []);
            setStats(result.stats || { pending: 0, total: 0 });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleApprove = async (poId) => {
        try {
            setActionLoading(poId);
            await purchaseOrdersAPI.approve(poId, userId);
            fetchOrders();
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleMarkOrdered = async (poId) => {
        try {
            setActionLoading('order-' + poId);
            await purchaseOrdersAPI.markOrdered(poId, userId);
            fetchOrders();
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReceive = async () => {
        if (!showReceive) return;
        try {
            setActionLoading('receive');
            const items = receiveItems.map(item => ({
                po_item_id: item.id,
                received_quantity: item.receive_qty,
                actual_unit_price: item.actual_price || item.unit_price
            })).filter(item => item.received_quantity > 0);

            await purchaseOrdersAPI.receive(showReceive.id, userId, items);
            setShowReceive(null);
            setReceiveItems([]);
            fetchOrders();
            alert('รับสินค้าสำเร็จ! สต๊อกได้รับการอัปเดตแล้ว');
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handlePrint = async (poId) => {
        try {
            setActionLoading('print-' + poId);
            const data = await purchaseOrdersAPI.getPrintData(poId);
            setPrintPO(data);
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const openReceiveModal = (po) => {
        setShowReceive(po);
        setReceiveItems((po.items || []).map(item => ({
            ...item,
            receive_qty: Math.max(0, (item.quantity || 0) - (item.received_quantity || 0))
        })));
    };

    const filteredOrders = orders.filter(po => {
        if (search) {
            const s = search.toLowerCase();
            return po.po_number?.toLowerCase().includes(s) ||
                po.vendor_name?.toLowerCase().includes(s);
        }
        return true;
    });

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Print View - White Background for Printing (Formal A4 Layout)
    if (printPO) {
        return (
            <div className="fixed inset-0 z-50 bg-gray-100 overflow-auto print:bg-white">
                <div className="max-w-[210mm] mx-auto my-8 bg-white shadow-xl print:shadow-none print:my-0" ref={printRef}>
                    {/* Document Header with Border */}
                    <div className="border-b-4 border-gray-900 p-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                                    {printPO.company?.name || 'บริษัท สมาร์ทควอรี่ จำกัด'}
                                </h1>
                                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                                    {printPO.company?.address || '123 ถนนพหลโยธิน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900'}<br />
                                    โทร: {printPO.company?.phone || '02-XXX-XXXX'} | แฟกซ์: {printPO.company?.fax || '02-XXX-XXXX'}<br />
                                    อีเมล: {printPO.company?.email || 'info@smartquary.com'}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="bg-gray-900 text-white px-6 py-3 rounded-lg inline-block mb-3">
                                    <h2 className="text-xl font-bold">ใบสั่งซื้อ</h2>
                                    <p className="text-sm opacity-80">PURCHASE ORDER</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-mono font-bold text-gray-900">{printPO.order?.po_number}</p>
                                    <p className="text-sm text-gray-600">วันที่: {formatDate(printPO.order?.created_at)}</p>
                                    <p className="text-sm text-gray-600">หน้า: 1/1</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Vendor Info Box */}
                    <div className="p-8 pb-4">
                        <div className="border-2 border-gray-300 rounded-lg p-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">ผู้ขาย / Vendor</h3>
                                    <p className="text-lg font-bold text-gray-900">{printPO.order?.vendor_name || '-'}</p>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {printPO.order?.vendor_address || 'ที่อยู่ไม่ระบุ'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        โทร: {printPO.order?.vendor_phone || '-'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="inline-block text-left">
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                            <span className="text-gray-500">เลขที่อ้างอิง PR:</span>
                                            <span className="font-medium">{printPO.order?.pr_number || '-'}</span>
                                            <span className="text-gray-500">กำหนดส่ง:</span>
                                            <span className="font-medium">{formatDate(printPO.order?.expected_delivery) || 'ไม่ระบุ'}</span>
                                            <span className="text-gray-500">เงื่อนไขชำระ:</span>
                                            <span className="font-medium">{printPO.order?.payment_terms || 'เงินสด'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="px-8">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-900 text-white">
                                    <th className="py-3 px-4 text-center text-sm font-semibold w-12">ลำดับ</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold">รายการสินค้า</th>
                                    <th className="py-3 px-4 text-center text-sm font-semibold w-24">จำนวน</th>
                                    <th className="py-3 px-4 text-center text-sm font-semibold w-20">หน่วย</th>
                                    <th className="py-3 px-4 text-right text-sm font-semibold w-28">ราคา/หน่วย</th>
                                    <th className="py-3 px-4 text-right text-sm font-semibold w-32">จำนวนเงิน</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(printPO.items || []).map((item, idx) => (
                                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="py-3 px-4 text-center text-gray-600 border-b">{idx + 1}</td>
                                        <td className="py-3 px-4 border-b">
                                            <div className="font-medium text-gray-900">
                                                {item.part_name || item.custom_item_name}
                                            </div>
                                            {item.part_code && (
                                                <div className="text-xs text-gray-500">รหัส: {item.part_code}</div>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center border-b font-medium">
                                            {item.quantity}
                                        </td>
                                        <td className="py-3 px-4 text-center border-b text-gray-600">
                                            {item.unit || 'ชิ้น'}
                                        </td>
                                        <td className="py-3 px-4 text-right border-b">
                                            ฿{(item.unit_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-4 text-right border-b font-medium">
                                            ฿{((item.quantity || 0) * (item.unit_price || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                                {/* Empty rows for spacing if less than 5 items */}
                                {Array.from({ length: Math.max(0, 5 - (printPO.items?.length || 0)) }).map((_, idx) => (
                                    <tr key={`empty-${idx}`} className="h-10">
                                        <td className="border-b" colSpan="6"></td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="4" rowSpan="3" className="py-3 px-4 align-top">
                                        {printPO.order?.notes && (
                                            <div className="text-sm">
                                                <strong className="text-gray-700">หมายเหตุ:</strong>
                                                <p className="text-gray-600 mt-1">{printPO.order.notes}</p>
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-2 px-4 text-right text-sm text-gray-600 border-b">รวมเป็นเงิน</td>
                                    <td className="py-2 px-4 text-right border-b">
                                        ฿{(printPO.order?.subtotal || printPO.order?.total_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-4 text-right text-sm text-gray-600 border-b">ภาษีมูลค่าเพิ่ม 7%</td>
                                    <td className="py-2 px-4 text-right border-b">
                                        ฿{((printPO.order?.subtotal || printPO.order?.total_amount || 0) * 0.07).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                                <tr className="bg-gray-900 text-white">
                                    <td className="py-3 px-4 text-right font-bold">รวมทั้งสิ้น</td>
                                    <td className="py-3 px-4 text-right font-bold text-lg">
                                        ฿{((printPO.order?.subtotal || printPO.order?.total_amount || 0) * 1.07).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Terms and Conditions */}
                    <div className="px-8 py-4">
                        <div className="text-xs text-gray-500 border-t pt-4">
                            <strong>เงื่อนไขการสั่งซื้อ:</strong>
                            <ul className="list-disc list-inside mt-1 space-y-0.5">
                                <li>กรุณาส่งสินค้าตามรายการที่ระบุภายในวันที่กำหนด</li>
                                <li>สินค้าต้องตรงตามสเปคและคุณภาพที่ตกลง</li>
                                <li>ใบส่งสินค้าต้องแนบใบสั่งซื้อฉบับนี้</li>
                            </ul>
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="px-8 pb-8 pt-4">
                        <div className="grid grid-cols-3 gap-8">
                            <div className="text-center">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg h-20 mb-2 flex items-end justify-center pb-2">
                                    <div className="w-32 border-b-2 border-gray-400"></div>
                                </div>
                                <p className="font-semibold text-gray-700">ผู้สั่งซื้อ</p>
                                <p className="text-xs text-gray-500">วันที่: ___/___/______</p>
                            </div>
                            <div className="text-center">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg h-20 mb-2 flex items-end justify-center pb-2">
                                    <div className="w-32 border-b-2 border-gray-400"></div>
                                </div>
                                <p className="font-semibold text-gray-700">ผู้อนุมัติ</p>
                                <p className="text-xs text-gray-500">วันที่: ___/___/______</p>
                            </div>
                            <div className="text-center">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg h-20 mb-2 flex items-end justify-center pb-2">
                                    <div className="w-32 border-b-2 border-gray-400"></div>
                                </div>
                                <p className="font-semibold text-gray-700">ผู้รับสินค้า</p>
                                <p className="text-xs text-gray-500">วันที่: ___/___/______</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-100 px-8 py-3 text-center text-xs text-gray-500 border-t">
                        เอกสารฉบับนี้ออกโดยระบบ SmartQuary CMMS | พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}
                    </div>
                </div>

                {/* Print Buttons - Hidden on print */}
                <div className="fixed bottom-6 right-6 flex gap-3 print:hidden">
                    <button
                        onClick={() => window.print()}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium flex items-center gap-2 shadow-lg active:scale-95 hover:bg-emerald-500"
                    >
                        <Printer size={20} />
                        พิมพ์
                    </button>
                    <button
                        onClick={() => setPrintPO(null)}
                        className="px-6 py-3 bg-zinc-700 text-white rounded-xl font-medium flex items-center gap-2 shadow-lg active:scale-95 hover:bg-zinc-600"
                    >
                        <X size={20} />
                        ปิด
                    </button>
                </div>

                {/* Print Styles */}
                <style>{`
                    @media print {
                        @page {
                            size: A4;
                            margin: 10mm;
                        }
                        body {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        .print\\:hidden {
                            display: none !important;
                        }
                        .print\\:bg-white {
                            background: white !important;
                        }
                        .print\\:shadow-none {
                            box-shadow: none !important;
                        }
                        .print\\:my-0 {
                            margin-top: 0 !important;
                            margin-bottom: 0 !important;
                        }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                        <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-violet-500" />
                        ใบสั่งซื้อ (PO)
                    </h1>
                    <p className="text-gray-400 mt-1">จัดการใบสั่งซื้อและรับสินค้า</p>
                </div>
                {(stats.draft_count > 0 || stats.sent_count > 0) && (
                    <div className="flex gap-2">
                        {stats.draft_count > 0 && (
                            <div className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg">
                                <span className="text-zinc-300 text-sm font-medium">ฉบับร่าง {stats.draft_count}</span>
                            </div>
                        )}
                        {stats.sent_count > 0 && (
                            <div className="px-3 py-1.5 bg-sky-600/20 border border-sky-500/30 rounded-lg">
                                <span className="text-sky-400 text-sm font-medium">รอสั่งซื้อ {stats.sent_count}</span>
                            </div>
                        )}
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
                        placeholder="ค้นหา PO, vendor..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                    />
                </div>
                
                {/* Status Tab Filter */}
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                    {[
                        { value: '', label: 'ทั้งหมด', icon: FileText, count: orders.length },
                        { value: 'draft', label: 'ฉบับร่าง', icon: FileText, count: stats.draft_count || 0 },
                        { value: 'sent', label: 'รออนุมัติ', icon: Check, count: stats.sent_count || 0 },
                        { value: 'ordered', label: 'สั่งซื้อแล้ว', icon: Truck, count: null },
                        { value: 'partial', label: 'รับบางส่วน', icon: Package, count: stats.partial_count || 0 },
                        { value: 'received', label: 'รับครบแล้ว', icon: Package, count: null },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = filter.status === tab.value;
                        return (
                            <button
                                key={tab.value}
                                onClick={() => setFilter(prev => ({ ...prev, status: tab.value }))}
                                className={`flex-none px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
                                    isActive
                                        ? 'bg-gray-800 text-violet-400 ring-1 ring-violet-500/30'
                                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                                }`}
                            >
                                <Icon size={16} className={isActive ? 'text-violet-400' : ''} />
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                                        isActive ? 'bg-violet-500/20 text-violet-400' : 'bg-gray-800 text-gray-500'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="animate-spin mx-auto mb-2 text-zinc-500" size={32} />
                        <p className="text-zinc-500">กำลังโหลด...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <AlertTriangle className="mx-auto mb-2 text-red-400" size={32} />
                        <p className="text-red-400">{error}</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="mx-auto mb-2 text-zinc-700" size={48} />
                        <p className="text-zinc-500">ไม่พบใบสั่งซื้อ</p>
                    </div>
                ) : (
                    filteredOrders.map((po) => {
                        const statusConfig = STATUS_CONFIG[po.status] || STATUS_CONFIG.draft;
                        const isExpanded = expandedId === po.id;

                        return (
                            <div
                                key={po.id}
                                className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-colors group"
                            >
                                {/* PO Header */}
                                <div
                                    className="p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : po.id)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-white group-hover:text-violet-400 transition-colors">{po.po_number}</span>
                                                <span className={`px-2 py-0.5 text-xs text-white rounded-full ${statusConfig.bg}`}>
                                                    {statusConfig.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <Truck size={14} />
                                                    {po.vendor_name || 'ไม่ระบุ'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    {formatDate(po.created_at)}
                                                </span>
                                            </div>
                                            {po.pr_number && (
                                                <div className="text-xs text-sky-400 mt-1">
                                                    อ้างอิง: {po.pr_number}
                                                </div>
                                            )}
                                            {/* Quick Item Summary */}
                                            {po.items && po.items.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {po.items.slice(0, 3).map((item, idx) => (
                                                        <span key={idx} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                                                            {item.part_name || item.custom_item_name}: {item.quantity} {item.unit || 'ชิ้น'}
                                                        </span>
                                                    ))}
                                                    {po.items.length > 3 && (
                                                        <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-500">
                                                            +{po.items.length - 3} รายการ
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-white">
                                                ฿{(po.total_amount || 0).toLocaleString()}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {po.item_count || 0} รายการ
                                            </div>
                                        </div>
                                        <ChevronDown
                                            className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                            size={20}
                                        />
                                    </div>
                                    
                                    {/* Quick Action Buttons - Always visible for actionable POs */}
                                    {(po.status === 'draft' || po.status === 'sent' || po.status === 'ordered' || po.status === 'partial') && (userRole === 'admin' || userRole === 'moderator') && (
                                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800">
                                            {/* Print Button */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handlePrint(po.id); }}
                                                disabled={actionLoading === 'print-' + po.id}
                                                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-colors"
                                            >
                                                {actionLoading === 'print-' + po.id ? (
                                                    <Loader2 className="animate-spin" size={18} />
                                                ) : (
                                                    <Printer size={18} />
                                                )}
                                                พิมพ์
                                            </button>

                                            {/* Approve Button */}
                                            {po.status === 'draft' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleApprove(po.id); }}
                                                    disabled={actionLoading === po.id}
                                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-colors"
                                                >
                                                    {actionLoading === po.id ? (
                                                        <Loader2 className="animate-spin" size={18} />
                                                    ) : (
                                                        <Check size={18} />
                                                    )}
                                                    อนุมัติ
                                                </button>
                                            )}

                                            {/* Mark as Ordered Button */}
                                            {po.status === 'sent' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleMarkOrdered(po.id); }}
                                                    disabled={actionLoading === 'order-' + po.id}
                                                    className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-colors"
                                                >
                                                    {actionLoading === 'order-' + po.id ? (
                                                        <Loader2 className="animate-spin" size={18} />
                                                    ) : (
                                                        <Truck size={18} />
                                                    )}
                                                    สั่งซื้อแล้ว
                                                </button>
                                            )}

                                            {/* Receive Button */}
                                            {(po.status === 'ordered' || po.status === 'partial') && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openReceiveModal(po); }}
                                                    className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-colors"
                                                >
                                                    <Package size={18} />
                                                    รับสินค้า
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-gray-800 bg-gray-950 p-4 space-y-4">
                                        {/* Items */}
                                        <div>
                                            <h4 className="font-medium text-gray-400 mb-2 text-sm">รายการสินค้า</h4>
                                            <div className="space-y-2">
                                                {(po.items || []).map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-800"
                                                    >
                                                        <div className="flex-1">
                                                            <div className="font-medium text-white">
                                                                {item.part_name || item.custom_item_name || 'ไม่ระบุ'}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {item.quantity} {item.unit || 'ชิ้น'}
                                                                {item.received_quantity > 0 && (
                                                                    <span className="ml-2 text-emerald-400">
                                                                        (รับแล้ว {item.received_quantity})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-white">฿{(item.quantity * item.unit_price).toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Action Buttons - Additional info only */}
                                        {po.created_by_name && (
                                            <div className="text-sm text-gray-500 pt-2">
                                                สร้างโดย: {po.created_by_name} | 
                                                {po.approved_by_name && ` อนุมัติโดย: ${po.approved_by_name}`}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Receive Modal */}
            {showReceive && (
                <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-gray-800">
                        <div className="p-4 border-b border-gray-800">
                            <h3 className="text-lg font-bold text-white">รับสินค้า - {showReceive.po_number}</h3>
                            <p className="text-sm text-gray-500">ระบุจำนวนและราคาจริงที่ได้รับ</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {receiveItems.map((item, idx) => {
                                const pending = (item.quantity || 0) - (item.received_quantity || 0);
                                return (
                                    <div key={idx} className="p-4 bg-gray-800 rounded-lg space-y-3">
                                        <div className="font-medium text-white">
                                            {item.part_name || item.custom_item_name}
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            สั่ง: {item.quantity} | รับแล้ว: {item.received_quantity || 0} | คงเหลือ: {pending}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Quantity Input */}
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">จำนวนที่รับ</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={pending}
                                                    value={item.receive_qty}
                                                    onChange={(e) => {
                                                        const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), pending);
                                                        setReceiveItems(prev => prev.map((p, i) =>
                                                            i === idx ? { ...p, receive_qty: val } : p
                                                        ));
                                                    }}
                                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-center text-white focus:outline-none focus:border-violet-500"
                                                />
                                            </div>
                                            
                                            {/* Actual Price Input */}
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">ราคาจริง/หน่วย</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.actual_price ?? item.unit_price ?? 0}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        setReceiveItems(prev => prev.map((p, i) =>
                                                            i === idx ? { ...p, actual_price: val } : p
                                                        ));
                                                    }}
                                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-right text-white focus:outline-none focus:border-violet-500"
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* Price comparison */}
                                        {item.actual_price && item.actual_price !== item.unit_price && (
                                            <div className={`text-xs ${item.actual_price > item.unit_price ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {item.actual_price > item.unit_price ? '⚠️' : '✓'} ราคาเดิม: ฿{item.unit_price?.toLocaleString()} → ราคาจริง: ฿{item.actual_price?.toLocaleString()}
                                                {item.actual_price > item.unit_price 
                                                    ? ` (+฿${(item.actual_price - item.unit_price).toLocaleString()})` 
                                                    : ` (-฿${(item.unit_price - item.actual_price).toLocaleString()})`
                                                }
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Summary */}
                        <div className="px-4 py-3 bg-gray-800/50 border-t border-gray-700">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">รวมที่จะรับ:</span>
                                <span className="text-white font-medium">
                                    {receiveItems.reduce((sum, item) => sum + (item.receive_qty || 0), 0)} ชิ้น
                                </span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                                <span className="text-gray-400">มูลค่ารวม:</span>
                                <span className="text-emerald-400 font-bold">
                                    ฿{receiveItems.reduce((sum, item) => 
                                        sum + ((item.receive_qty || 0) * (item.actual_price ?? item.unit_price ?? 0)), 0
                                    ).toLocaleString()}
                                </span>
                            </div>
                        </div>
                        
                        <div className="p-4 border-t border-gray-800 flex gap-3">
                            <button
                                onClick={() => { setShowReceive(null); setReceiveItems([]); }}
                                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-medium transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleReceive}
                                disabled={actionLoading === 'receive' || receiveItems.every(i => !i.receive_qty)}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
                            >
                                {actionLoading === 'receive' ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <Package size={20} />
                                )}
                                รับสินค้า + เข้าสต๊อก
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print styles */}
            <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:relative, .print\\:relative * { visibility: visible; }
          .print\\:relative { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
        </div>
    );
};

export default PurchaseOrderList;

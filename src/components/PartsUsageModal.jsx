import { useState, useEffect, useCallback } from 'react';
import { X, Search, Package, Plus, Minus, AlertTriangle, Check, Loader2, AlertCircle, Trash2, ArrowLeft } from 'lucide-react';
import { sparePartsAPI, requisitionsAPI } from '../services/api';

const PRIORITY_OPTIONS = [
    { value: 'normal', label: 'ปกติ', bg: 'bg-zinc-700', activeBg: 'bg-zinc-600' },
    { value: 'high', label: 'สูง', bg: 'bg-orange-600/20', activeBg: 'bg-orange-600' },
    { value: 'urgent', label: 'เร่งด่วน', bg: 'bg-red-600/20', activeBg: 'bg-red-600' },
];

const PartsUsageModal = ({ maintenanceId, userId, onClose, onSuccess }) => {
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedParts, setSelectedParts] = useState([]);
    const [customItems, setCustomItems] = useState([]);
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [customItem, setCustomItem] = useState({ name: '', quantity: 1, unit_price: 0, unit: 'ชิ้น' });
    const [priority, setPriority] = useState('normal');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const fetchParts = useCallback(async (searchQuery = '') => {
        try {
            setLoading(true);
            const { parts: partsData } = await sparePartsAPI.getAll({ search: searchQuery || undefined });
            setParts(partsData || []);
        } catch (err) {
            console.error('Error fetching parts:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load - fetch all parts immediately
    useEffect(() => {
        fetchParts();
    }, []);

    // Debounced search - also handles when search is cleared
    useEffect(() => {
        const debounce = setTimeout(() => fetchParts(search), 300);
        return () => clearTimeout(debounce);
    }, [search, fetchParts]);

    const handleAddPart = (part) => {
        const existing = selectedParts.find(p => p.spare_part_id === part.id);
        if (existing) {
            setSelectedParts(prev => prev.map(p =>
                p.spare_part_id === part.id
                    ? { ...p, quantity: p.quantity + 1 }
                    : p
            ));
        } else {
            setSelectedParts(prev => [...prev, {
                spare_part_id: part.id,
                part_name: part.part_name,
                part_code: part.part_code,
                current_stock: part.current_stock,
                unit: part.unit || 'ชิ้น',
                unit_price: part.unit_price || 0,
                quantity: 1
            }]);
        }
    };

    const handleUpdateQuantity = (sparePartId, delta) => {
        setSelectedParts(prev => prev.map(p => {
            if (p.spare_part_id === sparePartId) {
                const newQty = Math.max(1, p.quantity + delta);
                return { ...p, quantity: newQty };
            }
            return p;
        }));
    };

    const handleRemovePart = (sparePartId) => {
        setSelectedParts(prev => prev.filter(p => p.spare_part_id !== sparePartId));
    };

    const handleAddCustomItem = () => {
        if (!customItem.name.trim() || customItem.quantity < 1) return;
        setCustomItems(prev => [...prev, {
            id: `custom-${Date.now()}`,
            custom_item_name: customItem.name,
            custom_item_unit: customItem.unit,
            quantity: customItem.quantity,
            unit_price: customItem.unit_price
        }]);
        setCustomItem({ name: '', quantity: 1, unit_price: 0, unit: 'ชิ้น' });
        setShowCustomForm(false);
    };

    const handleRemoveCustomItem = (id) => {
        setCustomItems(prev => prev.filter(item => item.id !== id));
    };

    const calculateTotal = () => {
        const partsTotal = selectedParts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);
        const customTotal = customItems.reduce((sum, c) => sum + (c.quantity * c.unit_price), 0);
        return partsTotal + customTotal;
    };

    const hasStockIssues = () => selectedParts.some(p => p.quantity > p.current_stock);

    const handleSubmit = async () => {
        if (selectedParts.length === 0 && customItems.length === 0) {
            setError('กรุณาเลือกอะไหล่อย่างน้อย 1 รายการ');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const items = [
                ...selectedParts.map(p => ({
                    spare_part_id: p.spare_part_id,
                    quantity: p.quantity,
                    unit_price: p.unit_price
                })),
                ...customItems.map(c => ({
                    custom_item_name: c.custom_item_name,
                    custom_item_unit: c.custom_item_unit,
                    quantity: c.quantity,
                    unit_price: c.unit_price
                }))
            ];

            const result = await requisitionsAPI.create({
                maintenance_record_id: maintenanceId,
                requested_by: userId,
                priority,
                notes,
                items
            });

            setSuccessMessage(`สร้างใบขอเบิก ${result.pr_number} สำเร็จ`);
            setTimeout(() => {
                onSuccess && onSuccess(result);
                onClose();
            }, 1500);
        } catch (err) {
            setError(err.message || 'เกิดข้อผิดพลาด');
        } finally {
            setSubmitting(false);
        }
    };

    const allItems = [...selectedParts, ...customItems];

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
            {/* Header */}
            <header className="flex-none bg-zinc-950 border-b border-zinc-800/50 px-4 py-3">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900 active:scale-95">
                        <ArrowLeft size={20} className="text-zinc-400" />
                    </button>
                    <div className="flex-1">
                        <p className="text-white font-bold">ขอเบิกอะไหล่</p>
                        <p className="text-sm text-zinc-500">เลือกอะไหล่ที่ต้องการใช้</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center">
                        <Package size={20} className="text-white" />
                    </div>
                </div>
            </header>

            {/* Success Message */}
            {successMessage && (
                <div className="bg-emerald-600/20 border-b border-emerald-500/30 p-4 flex items-center gap-3">
                    <Check className="text-emerald-400" size={24} />
                    <span className="text-emerald-300 font-medium">{successMessage}</span>
                </div>
            )}

            {/* Body */}
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                    <input
                        type="text"
                        placeholder="ค้นหาอะไหล่..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                    />
                </div>

                {/* Parts List */}
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center">
                            <Loader2 className="animate-spin mx-auto mb-2 text-zinc-500" size={24} />
                            <span className="text-zinc-500">กำลังโหลด...</span>
                        </div>
                    ) : parts.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">
                            ไม่พบอะไหล่{search && ` "${search}"`}
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800 max-h-48 overflow-y-auto">
                            {parts.slice(0, 10).map((part) => {
                                const isSelected = selectedParts.some(p => p.spare_part_id === part.id);
                                const isLowStock = part.current_stock <= part.min_stock_level;
                                const isOutOfStock = part.current_stock === 0;

                                return (
                                    <div
                                        key={part.id}
                                        className={`p-3 flex items-center justify-between active:bg-zinc-800 ${isSelected ? 'bg-sky-600/10' : ''}`}
                                        onClick={() => handleAddPart(part)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-white truncate">{part.part_name}</span>
                                                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded shrink-0">{part.part_code}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm mt-1">
                                                <span className={`flex items-center gap-1 ${isOutOfStock ? 'text-red-400' : isLowStock ? 'text-orange-400' : 'text-emerald-400'}`}>
                                                    {isOutOfStock && <AlertTriangle size={12} />}
                                                    สต๊อก: {part.current_stock}
                                                </span>
                                                <span className="text-zinc-500">฿{part.unit_price?.toLocaleString() || 0}</span>
                                            </div>
                                        </div>
                                        <button className="p-2 bg-sky-600 text-white rounded-lg active:scale-95">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Add Custom Item */}
                <button
                    onClick={() => setShowCustomForm(!showCustomForm)}
                    className="w-full py-3 border-2 border-dashed border-zinc-700 rounded-xl text-zinc-400 active:border-zinc-600 flex items-center justify-center gap-2"
                >
                    <Plus size={20} />
                    เพิ่มสินค้านอกระบบ
                </button>

                {/* Custom Item Form */}
                {showCustomForm && (
                    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 space-y-3">
                        <input
                            type="text"
                            placeholder="ชื่อสินค้า"
                            value={customItem.name}
                            onChange={(e) => setCustomItem(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-3 bg-zinc-800 border-2 border-zinc-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
                        />
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs text-zinc-500 mb-1 block">จำนวน</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={customItem.quantity}
                                    onChange={(e) => setCustomItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-center"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 mb-1 block">ราคา/หน่วย</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={customItem.unit_price}
                                    onChange={(e) => setCustomItem(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-center"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 mb-1 block">หน่วย</label>
                                <input
                                    type="text"
                                    value={customItem.unit}
                                    onChange={(e) => setCustomItem(prev => ({ ...prev, unit: e.target.value }))}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-center"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddCustomItem}
                                className="flex-1 py-3 bg-sky-600 text-white rounded-xl font-semibold active:scale-[0.98]"
                            >
                                เพิ่มรายการ
                            </button>
                            <button
                                onClick={() => setShowCustomForm(false)}
                                className="px-6 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-semibold active:scale-[0.98]"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                )}

                {/* Selected Items */}
                {allItems.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-zinc-400">รายการที่เลือก ({allItems.length})</p>
                        <div className="rounded-xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800">
                            {selectedParts.map((item) => {
                                const exceedsStock = item.quantity > item.current_stock;
                                return (
                                    <div key={item.spare_part_id} className={`p-3 flex items-center gap-3 ${exceedsStock ? 'bg-orange-500/10' : ''}`}>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-white truncate">{item.part_name}</p>
                                            <p className="text-sm text-zinc-500">
                                                ฿{item.unit_price?.toLocaleString()} × {item.quantity} =
                                                <span className="text-sky-400 ml-1">฿{(item.quantity * item.unit_price).toLocaleString()}</span>
                                            </p>
                                            {exceedsStock && (
                                                <p className="text-xs text-orange-400 flex items-center gap-1 mt-1">
                                                    <AlertTriangle size={12} />
                                                    สต๊อกไม่พอ (มี {item.current_stock})
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleUpdateQuantity(item.spare_part_id, -1)} className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center active:scale-95">
                                                <Minus size={16} className="text-zinc-400" />
                                            </button>
                                            <span className="w-8 text-center font-bold text-white">{item.quantity}</span>
                                            <button onClick={() => handleUpdateQuantity(item.spare_part_id, 1)} className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center active:scale-95">
                                                <Plus size={16} className="text-zinc-400" />
                                            </button>
                                            <button onClick={() => handleRemovePart(item.spare_part_id)} className="w-8 h-8 text-red-400 rounded-lg flex items-center justify-center active:bg-red-500/20">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {customItems.map((item) => (
                                <div key={item.id} className="p-3 flex items-center gap-3 bg-violet-500/10">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-white truncate">{item.custom_item_name}</p>
                                            <span className="text-xs bg-violet-600/30 text-violet-300 px-2 py-0.5 rounded shrink-0">นอกระบบ</span>
                                        </div>
                                        <p className="text-sm text-zinc-500">
                                            ฿{item.unit_price?.toLocaleString()} × {item.quantity} =
                                            <span className="text-violet-400 ml-1">฿{(item.quantity * item.unit_price).toLocaleString()}</span>
                                        </p>
                                    </div>
                                    <button onClick={() => handleRemoveCustomItem(item.id)} className="w-8 h-8 text-red-400 rounded-lg flex items-center justify-center active:bg-red-500/20">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stock Warning */}
                {hasStockIssues() && (
                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="text-orange-400 shrink-0 mt-0.5" size={20} />
                            <div>
                                <p className="font-semibold text-orange-300">สต๊อกไม่เพียงพอ</p>
                                <p className="text-sm text-orange-400/80">บางรายการจะต้องสร้างใบสั่งซื้อเพิ่ม</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Priority */}
                <div>
                    <p className="text-sm font-medium text-zinc-400 mb-2">ความเร่งด่วน</p>
                    <div className="flex gap-2">
                        {PRIORITY_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setPriority(opt.value)}
                                className={`flex-1 py-3 rounded-xl font-medium transition ${priority === opt.value
                                        ? `${opt.activeBg} text-white`
                                        : 'bg-zinc-800 text-zinc-400'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <p className="text-sm font-medium text-zinc-400 mb-2">หมายเหตุ (ถ้ามี)</p>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="รายละเอียดเพิ่มเติม..."
                        className="w-full px-4 py-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500 resize-none"
                        rows={2}
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                        <AlertCircle className="text-red-400" size={20} />
                        <span className="text-red-300">{error}</span>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="flex-none bg-zinc-950 border-t border-zinc-800/50 p-4 pb-8">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-zinc-500">{allItems.length} รายการ</span>
                    <span className="text-xl font-bold text-white">รวม ฿{calculateTotal().toLocaleString()}</span>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 h-14 rounded-xl bg-zinc-800 text-zinc-300 font-semibold active:scale-[0.98]"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || allItems.length === 0}
                        className="flex-[2] h-14 rounded-xl bg-sky-600 text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] disabled:bg-zinc-700"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                กำลังส่ง...
                            </>
                        ) : (
                            <>
                                <Package size={20} />
                                ขอเบิกอะไหล่
                            </>
                        )}
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default PartsUsageModal;

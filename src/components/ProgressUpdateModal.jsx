import { useState, useEffect, useCallback } from 'react';
import {
    X, ArrowLeft, TrendingUp, Package, Undo2, Camera, Check,
    Loader2, Search, Plus, Minus, Trash2, AlertTriangle, AlertCircle
} from 'lucide-react';
import { maintenanceAPI, sparePartsAPI, requisitionsAPI, partsReturnsAPI } from '../services/api';

const TABS = [
    { id: 'update', label: 'อัปเดต', icon: TrendingUp, color: 'sky' },
    { id: 'parts', label: 'เบิกอะไหล่', icon: Package, color: 'blue' },
    { id: 'return', label: 'คืนอะไหล่', icon: Undo2, color: 'orange' },
];

const PRIORITY_OPTIONS = [
    { value: 'normal', label: 'ปกติ' },
    { value: 'high', label: 'สูง' },
    { value: 'urgent', label: 'เร่งด่วน' },
];

const RETURN_REASONS = [
    { value: 'wrong_part', label: 'ไม่ตรงรุ่น' },
    { value: 'defective', label: 'ชำรุด' },
    { value: 'not_needed', label: 'ไม่ต้องใช้' },
    { value: 'excess', label: 'เกินจำนวน' },
];

const ProgressUpdateModal = ({
    recordId,
    record,
    userId,
    partsUsed = [],
    onClose,
    onSuccess
}) => {
    const [activeTab, setActiveTab] = useState('update');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Update Tab State
    const [updateNotes, setUpdateNotes] = useState('');
    const [updateImages, setUpdateImages] = useState([]);
    const [updateImagePreviews, setUpdateImagePreviews] = useState([]);

    // Parts Tab State
    const [parts, setParts] = useState([]);
    const [partsLoading, setPartsLoading] = useState(false);
    const [partsSearch, setPartsSearch] = useState('');
    const [selectedParts, setSelectedParts] = useState([]);
    const [partsPriority, setPartsPriority] = useState('normal');
    const [partsNotes, setPartsNotes] = useState('');
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [customItems, setCustomItems] = useState([]);
    const [customItem, setCustomItem] = useState({ name: '', quantity: 1, unit_price: 0, unit: 'ชิ้น' });

    // Return Tab State
    const [selectedReturnPart, setSelectedReturnPart] = useState(null);
    const [returnQuantity, setReturnQuantity] = useState(1);
    const [returnReason, setReturnReason] = useState('');
    const [returnNotes, setReturnNotes] = useState('');

    // Search parts
    const fetchParts = useCallback(async (searchQuery = '') => {
        try {
            setPartsLoading(true);
            const { parts: partsData } = await sparePartsAPI.getAll({ search: searchQuery || undefined });
            setParts(partsData || []);
        } catch (err) {
            console.error('Error fetching parts:', err);
        } finally {
            setPartsLoading(false);
        }
    }, []);

    // Initial load - fetch all parts when switching to parts tab
    useEffect(() => {
        if (activeTab === 'parts') {
            fetchParts();
        }
    }, [activeTab]);

    // Debounced search
    useEffect(() => {
        if (activeTab !== 'parts') return;
        const debounce = setTimeout(() => fetchParts(partsSearch), 300);
        return () => clearTimeout(debounce);
    }, [partsSearch, fetchParts, activeTab]);

    // Part selection handlers
    const handleAddPart = (part) => {
        const existing = selectedParts.find(p => p.spare_part_id === part.id);
        if (existing) {
            setSelectedParts(prev => prev.map(p =>
                p.spare_part_id === part.id ? { ...p, quantity: p.quantity + 1 } : p
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
        setSelectedParts(prev => prev.map(p =>
            p.spare_part_id === sparePartId
                ? { ...p, quantity: Math.max(1, p.quantity + delta) }
                : p
        ));
    };

    const handleRemovePart = (sparePartId) => {
        setSelectedParts(prev => prev.filter(p => p.spare_part_id !== sparePartId));
    };

    // Custom item handlers
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

    // Submit handlers
    const handleSubmitUpdate = async () => {
        if (submitting) return; // Prevent double submit
        if (!updateNotes.trim()) {
            setError('กรุณากรอกรายละเอียดความคืบหน้า');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('notes', updateNotes);
            formData.append('userId', userId);
            updateImages.forEach(img => formData.append('images', img));

            await maintenanceAPI.addProgressUpdate(recordId, formData);
            setSuccessMessage('บันทึกความคืบหน้าสำเร็จ');
            setTimeout(() => {
                onSuccess && onSuccess();
                onClose();
            }, 1000);
        } catch (err) {
            setError(err.message || 'เกิดข้อผิดพลาด');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitParts = async () => {
        if (submitting) return; // Prevent double submit
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
                maintenance_record_id: parseInt(recordId),
                requested_by: userId,
                priority: partsPriority,
                notes: partsNotes || `เบิกอะไหล่สำหรับงาน ${record?.work_order}`,
                items
            });

            setSuccessMessage(`สร้างใบขอเบิก ${result.pr_number} สำเร็จ`);
            setTimeout(() => {
                onSuccess && onSuccess();
                onClose();
            }, 1500);
        } catch (err) {
            setError(err.message || 'เกิดข้อผิดพลาด');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitReturn = async () => {
        if (submitting) return; // Prevent double submit
        if (!selectedReturnPart) {
            setError('กรุณาเลือกอะไหล่ที่ต้องการคืน');
            return;
        }
        if (!returnReason) {
            setError('กรุณาเลือกเหตุผลในการคืน');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const result = await partsReturnsAPI.create({
                maintenance_record_id: parseInt(recordId),
                maintenance_part_used_id: selectedReturnPart.id,
                spare_part_id: selectedReturnPart.spare_part_id,
                quantity: returnQuantity,
                reason: returnReason,
                notes: returnNotes || `คืนอะไหล่จากงาน ${record?.work_order}`,
                returned_by: userId
            });

            setSuccessMessage(`สร้างใบขอคืน ${result.return_number} สำเร็จ`);
            setTimeout(() => {
                onSuccess && onSuccess();
                onClose();
            }, 1500);
        } catch (err) {
            setError(err.message || 'เกิดข้อผิดพลาด');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = () => {
        if (activeTab === 'update') handleSubmitUpdate();
        else if (activeTab === 'parts') handleSubmitParts();
        else if (activeTab === 'return') handleSubmitReturn();
    };

    const getSubmitButtonText = () => {
        if (submitting) return 'กำลังบันทึก...';
        if (activeTab === 'update') return 'บันทึกอัปเดต';
        if (activeTab === 'parts') return `เบิกอะไหล่ (${selectedParts.length + customItems.length})`;
        if (activeTab === 'return') return 'ยืนยันการคืน';
        return 'บันทึก';
    };

    const isSubmitDisabled = () => {
        if (submitting) return true;
        if (activeTab === 'update') return !updateNotes.trim();
        if (activeTab === 'parts') return selectedParts.length === 0 && customItems.length === 0;
        if (activeTab === 'return') return !selectedReturnPart || !returnReason;
        return true;
    };

    // Filter parts that still have quantity available to return
    const filteredPartsUsed = partsUsed
        .filter(p => p.spare_part_id)
        .map(p => ({
            ...p,
            returned_quantity: parseInt(p.returned_quantity) || 0,
            returnable_quantity: parseInt(p.quantity) - (parseInt(p.returned_quantity) || 0)
        }))
        .filter(p => p.returnable_quantity > 0);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
            {/* Header */}
            <header className="flex-none bg-zinc-950 border-b border-zinc-800/50">
                <div className="px-4 py-3 flex items-center gap-3">
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900 active:scale-95">
                        <ArrowLeft size={20} className="text-zinc-400" />
                    </button>
                    <div className="flex-1">
                        <p className="text-white font-bold">อัปเดตความคืบหน้า</p>
                        <p className="text-sm text-zinc-500">{record?.work_order}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-4 pb-3 flex gap-2">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setError(''); }}
                                className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition ${isActive
                                        ? `bg-${tab.color}-600 text-white`
                                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                                    }`}
                                style={isActive ? { backgroundColor: tab.color === 'sky' ? '#0284c7' : tab.color === 'blue' ? '#2563eb' : '#ea580c' } : {}}
                            >
                                <Icon size={16} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
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
                {/* ===== UPDATE TAB ===== */}
                {activeTab === 'update' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">ความคืบหน้า</label>
                            <textarea
                                value={updateNotes}
                                onChange={(e) => setUpdateNotes(e.target.value)}
                                placeholder="เช่น กำลังรื้อสายพาน, พบลูกปืนแตก..."
                                className="w-full h-32 px-4 py-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl text-white focus:outline-none focus:border-sky-500 resize-none"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">แนบรูปภาพ (ไม่บังคับ)</label>
                            <div className="grid grid-cols-4 gap-2">
                                {updateImagePreviews.map((preview, index) => (
                                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-800">
                                        <img src={preview} className="w-full h-full object-cover" alt="" />
                                        <button
                                            onClick={() => {
                                                setUpdateImages(prev => prev.filter((_, i) => i !== index));
                                                setUpdateImagePreviews(prev => prev.filter((_, i) => i !== index));
                                            }}
                                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center"
                                        >
                                            <X size={14} className="text-white" />
                                        </button>
                                    </div>
                                ))}
                                {updateImages.length < 5 && (
                                    <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer active:bg-zinc-800">
                                        <Camera size={24} className="text-zinc-500" />
                                        <span className="text-xs text-zinc-500 mt-1">เพิ่มรูป</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="hidden"
                                            onChange={(e) => {
                                                const files = Array.from(e.target.files);
                                                const remaining = 5 - updateImages.length;
                                                files.slice(0, remaining).forEach(file => {
                                                    setUpdateImages(prev => [...prev, file]);
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setUpdateImagePreviews(prev => [...prev, reader.result]);
                                                    reader.readAsDataURL(file);
                                                });
                                            }}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* ===== PARTS TAB ===== */}
                {activeTab === 'parts' && (
                    <>
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                            <input
                                type="text"
                                placeholder="ค้นหาอะไหล่..."
                                value={partsSearch}
                                onChange={(e) => setPartsSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Parts List */}
                        <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden max-h-48 overflow-y-auto">
                            {partsLoading ? (
                                <div className="p-4 text-center text-zinc-500">
                                    <Loader2 className="animate-spin mx-auto" size={20} />
                                </div>
                            ) : parts.length === 0 ? (
                                <div className="p-4 text-center text-zinc-500">
                                    {partsSearch ? 'ไม่พบอะไหล่' : 'ไม่มีอะไหล่ในระบบ'}
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-800">
                                    {parts.slice(0, 10).map((part) => (
                                        <div
                                            key={part.id}
                                            onClick={() => handleAddPart(part)}
                                            className="p-3 flex items-center justify-between active:bg-zinc-800"
                                        >
                                            <div>
                                                <span className="font-medium text-white">{part.part_name}</span>
                                                <div className="text-xs text-zinc-500">
                                                    {part.part_code} • สต๊อก: {part.current_stock}
                                                </div>
                                            </div>
                                            <button className="p-1.5 bg-blue-600 rounded-lg">
                                                <Plus size={14} className="text-white" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add Custom Item Button */}
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
                                    className="w-full px-4 py-3 bg-zinc-800 border-2 border-zinc-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
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
                                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold active:scale-[0.98]"
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

                        {/* Selected Parts */}
                        {selectedParts.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-zinc-400">รายการที่เลือก ({selectedParts.length})</p>
                                <div className="rounded-xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800">
                                    {selectedParts.map((item) => {
                                        const exceedsStock = item.quantity > item.current_stock;
                                        return (
                                            <div key={item.spare_part_id} className={`p-3 flex items-center gap-3 ${exceedsStock ? 'bg-orange-500/10' : ''}`}>
                                                <div className="flex-1">
                                                    <p className="font-medium text-white truncate">{item.part_name}</p>
                                                    <p className="text-xs text-zinc-500">{item.part_code}</p>
                                                    {exceedsStock && (
                                                        <p className="text-xs text-orange-400 flex items-center gap-1 mt-1">
                                                            <AlertTriangle size={10} />
                                                            สต๊อกไม่พอ (มี {item.current_stock})
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => handleUpdateQuantity(item.spare_part_id, -1)} className="w-7 h-7 bg-zinc-800 rounded flex items-center justify-center">
                                                        <Minus size={14} className="text-zinc-400" />
                                                    </button>
                                                    <span className="w-6 text-center font-bold text-white text-sm">{item.quantity}</span>
                                                    <button onClick={() => handleUpdateQuantity(item.spare_part_id, 1)} className="w-7 h-7 bg-zinc-800 rounded flex items-center justify-center">
                                                        <Plus size={14} className="text-zinc-400" />
                                                    </button>
                                                    <button onClick={() => handleRemovePart(item.spare_part_id)} className="w-7 h-7 text-red-400 rounded flex items-center justify-center ml-1">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Custom Items */}
                        {customItems.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-zinc-400">สินค้านอกระบบ ({customItems.length})</p>
                                <div className="rounded-xl bg-zinc-900 border border-amber-800/50 divide-y divide-zinc-800">
                                    {customItems.map((item) => (
                                        <div key={item.id} className="p-3 flex items-center gap-3 bg-amber-500/5">
                                            <div className="flex-1">
                                                <p className="font-medium text-amber-400 truncate">{item.custom_item_name}</p>
                                                <p className="text-xs text-zinc-500">
                                                    {item.quantity} {item.custom_item_unit} • ฿{(item.unit_price * item.quantity).toLocaleString()}
                                                </p>
                                            </div>
                                            <button onClick={() => handleRemoveCustomItem(item.id)} className="w-7 h-7 text-red-400 rounded flex items-center justify-center">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
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
                                        onClick={() => setPartsPriority(opt.value)}
                                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${partsPriority === opt.value
                                                ? opt.value === 'urgent' ? 'bg-red-600 text-white'
                                                    : opt.value === 'high' ? 'bg-orange-600 text-white'
                                                        : 'bg-zinc-600 text-white'
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
                            <p className="text-sm font-medium text-zinc-400 mb-2">หมายเหตุ</p>
                            <input
                                type="text"
                                value={partsNotes}
                                onChange={(e) => setPartsNotes(e.target.value)}
                                placeholder="หมายเหตุเพิ่มเติม..."
                                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </>
                )}

                {/* ===== RETURN TAB ===== */}
                {activeTab === 'return' && (
                    <>
                        {filteredPartsUsed.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="mx-auto mb-4 text-zinc-700" size={48} />
                                <p className="text-zinc-400">ไม่มีอะไหล่ที่สามารถคืนได้</p>
                            </div>
                        ) : (
                            <>
                                {/* Select Part */}
                                <div>
                                    <p className="text-sm font-medium text-zinc-400 mb-2">เลือกอะไหล่ที่ต้องการคืน</p>
                                    <div className="space-y-2">
                                        {filteredPartsUsed.map((part) => (
                                            <div
                                                key={part.id}
                                                onClick={() => {
                                                    setSelectedReturnPart(part);
                                                    setReturnQuantity(1);
                                                }}
                                                className={`p-3 rounded-xl border-2 transition ${selectedReturnPart?.id === part.id
                                                        ? 'border-orange-500 bg-orange-500/10'
                                                        : 'border-zinc-800 bg-zinc-900'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium text-white">{part.part_name}</p>
                                                        <p className="text-xs text-zinc-500">
                                                            ใช้ไป: {part.quantity} {part.unit || 'ชิ้น'}
                                                            {part.returned_quantity > 0 && (
                                                                <span className="text-orange-400 ml-2">
                                                                    (คืนแล้ว {part.returned_quantity})
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-emerald-400">คืนได้อีก: {part.returnable_quantity} {part.unit || 'ชิ้น'}</p>
                                                    </div>
                                                    {selectedReturnPart?.id === part.id && (
                                                        <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center">
                                                            <Check className="text-white" size={14} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Quantity & Reason */}
                                {selectedReturnPart && (
                                    <>
                                        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                                            <p className="text-sm font-medium text-zinc-400 mb-2">จำนวนที่คืน (สูงสุด {selectedReturnPart.returnable_quantity})</p>
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max={selectedReturnPart.returnable_quantity}
                                                    value={returnQuantity}
                                                    onChange={(e) => setReturnQuantity(parseInt(e.target.value))}
                                                    className="flex-1 accent-orange-500"
                                                />
                                                <span className="w-10 text-center font-bold text-white">{returnQuantity}</span>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-sm font-medium text-zinc-400 mb-2">เหตุผลในการคืน</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {RETURN_REASONS.map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => setReturnReason(opt.value)}
                                                        className={`p-3 rounded-xl text-sm font-medium text-left transition ${returnReason === opt.value
                                                                ? 'bg-orange-600 text-white'
                                                                : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-sm font-medium text-zinc-400 mb-2">หมายเหตุ</p>
                                            <input
                                                type="text"
                                                value={returnNotes}
                                                onChange={(e) => setReturnNotes(e.target.value)}
                                                placeholder="หมายเหตุเพิ่มเติม..."
                                                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                                            />
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* Error */}
                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                        <AlertCircle className="text-red-400 shrink-0" size={20} />
                        <span className="text-red-300">{error}</span>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="flex-none bg-zinc-950 border-t border-zinc-800/50 p-4 pb-8">
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 h-14 rounded-xl bg-zinc-800 text-zinc-300 font-semibold active:scale-[0.98]"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitDisabled()}
                        className={`flex-[2] h-14 rounded-xl text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] disabled:bg-zinc-700 ${activeTab === 'update' ? 'bg-sky-600' :
                                activeTab === 'parts' ? 'bg-blue-600' : 'bg-orange-600'
                            }`}
                    >
                        {submitting ? <Loader2 className="animate-spin" size={20} /> : null}
                        {getSubmitButtonText()}
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default ProgressUpdateModal;

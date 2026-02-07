import { useState } from 'react';
import { X, RotateCcw, AlertTriangle, Check, Loader2, AlertCircle, Package, ArrowLeft } from 'lucide-react';
import { partsReturnsAPI } from '../services/api';

const RETURN_REASONS = [
    { value: 'wrong_part', label: 'ไม่ตรงรุ่น / ผิดชนิด', icon: '❌' },
    { value: 'defective', label: 'ชำรุด / เสียหาย', icon: '⚠️' },
    { value: 'not_needed', label: 'ไม่ต้องใช้แล้ว', icon: '🚫' },
    { value: 'excess', label: 'เกินจำนวนที่ใช้', icon: '📦' },
];

const PartsReturnModal = ({
    maintenanceId,
    userId,
    partsUsed = [],
    onClose,
    onSuccess
}) => {
    const [selectedPart, setSelectedPart] = useState(null);
    const [returnQuantity, setReturnQuantity] = useState(1);
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleSelectPart = (part) => {
        setSelectedPart(part);
        setReturnQuantity(1);
        setReason('');
        setNotes('');
        setError('');
    };

    const handleSubmit = async () => {
        if (!selectedPart) {
            setError('กรุณาเลือกอะไหล่ที่ต้องการคืน');
            return;
        }
        if (!reason) {
            setError('กรุณาเลือกเหตุผลในการคืน');
            return;
        }
        if (returnQuantity < 1 || returnQuantity > selectedPart.quantity) {
            setError(`จำนวนต้องอยู่ระหว่าง 1 - ${selectedPart.quantity}`);
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const result = await partsReturnsAPI.create({
                maintenance_record_id: maintenanceId,
                maintenance_part_used_id: selectedPart.id,
                spare_part_id: selectedPart.spare_part_id,
                quantity: returnQuantity,
                reason,
                notes,
                returned_by: userId
            });

            setSuccessMessage(`สร้างใบขอคืน ${result.return_number} สำเร็จ`);
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

    const filteredPartsUsed = partsUsed.filter(p => p.quantity > 0 && p.spare_part_id);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
            {/* Header */}
            <header className="flex-none bg-zinc-950 border-b border-zinc-800/50 px-4 py-3">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900 active:scale-95">
                        <ArrowLeft size={20} className="text-zinc-400" />
                    </button>
                    <div className="flex-1">
                        <p className="text-white font-bold">คืนอะไหล่</p>
                        <p className="text-sm text-zinc-500">คืนอะไหล่ที่ไม่ได้ใช้เข้าสต๊อก</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center">
                        <RotateCcw size={20} className="text-white" />
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
                {filteredPartsUsed.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="mx-auto mb-4 text-zinc-700" size={48} />
                        <p className="text-zinc-400 font-medium">ไม่มีอะไหล่ที่สามารถคืนได้</p>
                        <p className="text-sm text-zinc-600 mt-1">อะไหล่ที่ใช้ไปแล้วจะแสดงที่นี่</p>
                    </div>
                ) : (
                    <>
                        {/* Select Part */}
                        <div>
                            <p className="text-sm font-medium text-zinc-400 mb-3">เลือกอะไหล่ที่ต้องการคืน</p>
                            <div className="space-y-2">
                                {filteredPartsUsed.map((part) => (
                                    <div
                                        key={part.id}
                                        onClick={() => handleSelectPart(part)}
                                        className={`p-4 rounded-xl border-2 active:scale-[0.99] transition ${selectedPart?.id === part.id
                                                ? 'border-orange-500 bg-orange-500/10'
                                                : 'border-zinc-800 bg-zinc-900'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-white">{part.part_name}</p>
                                                <p className="text-sm text-zinc-500">
                                                    รหัส: {part.part_code} • ใช้ไป: {part.quantity} {part.unit || 'ชิ้น'}
                                                </p>
                                            </div>
                                            {selectedPart?.id === part.id && (
                                                <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center">
                                                    <Check className="text-white" size={18} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Return Details */}
                        {selectedPart && (
                            <>
                                {/* Quantity */}
                                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                                    <p className="text-sm font-medium text-zinc-400 mb-3">
                                        จำนวนที่ต้องการคืน (สูงสุด {selectedPart.quantity})
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="1"
                                            max={selectedPart.quantity}
                                            value={returnQuantity}
                                            onChange={(e) => setReturnQuantity(parseInt(e.target.value))}
                                            className="flex-1 accent-orange-500"
                                        />
                                        <input
                                            type="number"
                                            min="1"
                                            max={selectedPart.quantity}
                                            value={returnQuantity}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 1;
                                                setReturnQuantity(Math.min(Math.max(1, val), selectedPart.quantity));
                                            }}
                                            className="w-20 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-center"
                                        />
                                    </div>
                                </div>

                                {/* Reason */}
                                <div>
                                    <p className="text-sm font-medium text-zinc-400 mb-3">เหตุผลในการคืน *</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {RETURN_REASONS.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setReason(opt.value)}
                                                className={`p-3 rounded-xl border-2 text-left transition ${reason === opt.value
                                                        ? 'border-orange-500 bg-orange-500/10'
                                                        : 'border-zinc-800 bg-zinc-900'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{opt.icon}</span>
                                                    <span className={`text-sm font-medium ${reason === opt.value ? 'text-orange-300' : 'text-zinc-300'}`}>
                                                        {opt.label}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <p className="text-sm font-medium text-zinc-400 mb-2">หมายเหตุเพิ่มเติม</p>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="รายละเอียดเพิ่มเติม..."
                                        className="w-full px-4 py-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
                                        rows={2}
                                    />
                                </div>
                            </>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                                <AlertCircle className="text-red-400 shrink-0" size={20} />
                                <span className="text-red-300">{error}</span>
                            </div>
                        )}

                        {/* Info */}
                        <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-sky-400 shrink-0 mt-0.5" size={20} />
                                <div className="text-sm text-sky-300/80">
                                    <p className="font-semibold text-sky-300 mb-1">หมายเหตุ</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>การคืนต้องได้รับอนุมัติจาก Admin</li>
                                        <li>เมื่ออนุมัติแล้ว สต๊อกจะถูกเพิ่มอัตโนมัติ</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </>
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
                    {filteredPartsUsed.length > 0 && (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !selectedPart || !reason}
                            className="flex-[2] h-14 rounded-xl bg-orange-600 text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] disabled:bg-zinc-700"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    กำลังส่ง...
                                </>
                            ) : (
                                <>
                                    <RotateCcw size={20} />
                                    ยืนยันการคืน
                                </>
                            )}
                        </button>
                    )}
                </div>
            </footer>
        </div>
    );
};

export default PartsReturnModal;

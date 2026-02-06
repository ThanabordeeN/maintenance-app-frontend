import { useState } from 'react';
import { Play, CheckCircle, Pause, XCircle, RotateCcw, Camera, X, Plus, ArrowLeft, Loader2 } from 'lucide-react';

const StatusUpdateModal = ({ record, onClose, onUpdate, userId }) => {
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [formData, setFormData] = useState({
    notes: '',
    rootCause: '',
    actionTaken: '',
    cancelledReason: '',
    onHoldReason: ''
  });
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const currentStatusConfig = {
    pending: { label: 'รอดำเนินการ', bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-500' },
    in_progress: { label: 'กำลังซ่อม', bg: 'bg-sky-500/20', text: 'text-sky-400', dot: 'bg-sky-500' },
    completed: { label: 'เสร็จสิ้น', bg: 'bg-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-500' },
    cancelled: { label: 'ยกเลิก', bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-500' },
    on_hold: { label: 'พักงาน', bg: 'bg-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-500' },
    reopened: { label: 'เปิดใหม่', bg: 'bg-violet-500/20', text: 'text-violet-400', dot: 'bg-violet-500' }
  };

  const getAvailableActions = () => {
    switch (record.status) {
      case 'pending':
        return [
          { value: 'in_progress', label: 'เริ่มงานซ่อม', sublabel: 'Start Work', icon: Play, color: 'emerald' },
          { value: 'cancelled', label: 'ยกเลิกงาน', sublabel: 'Cancel', icon: XCircle, color: 'red' }
        ];
      case 'in_progress':
        return [
          { value: 'completed', label: 'ปิดงาน', sublabel: 'Complete', icon: CheckCircle, color: 'emerald' },
          { value: 'on_hold', label: 'พักงาน', sublabel: 'On Hold', icon: Pause, color: 'orange' },
          { value: 'cancelled', label: 'ยกเลิก', sublabel: 'Cancel', icon: XCircle, color: 'red' }
        ];
      case 'on_hold':
        return [
          { value: 'in_progress', label: 'ทำงานต่อ', sublabel: 'Resume', icon: Play, color: 'sky' },
          { value: 'cancelled', label: 'ยกเลิก', sublabel: 'Cancel', icon: XCircle, color: 'red' }
        ];
      case 'completed':
        return [
          { value: 'reopened', label: 'เปิดใหม่', sublabel: 'Reopen', icon: RotateCcw, color: 'violet' }
        ];
      default:
        return [];
    }
  };

  const colorMap = {
    emerald: {
      btn: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700',
      icon: 'bg-emerald-600',
      text: 'text-emerald-400',
      border: 'border-emerald-600',
      ring: 'focus:ring-emerald-500/30'
    },
    sky: {
      btn: 'bg-sky-600 hover:bg-sky-500 active:bg-sky-700',
      icon: 'bg-sky-600',
      text: 'text-sky-400',
      border: 'border-sky-600',
      ring: 'focus:ring-sky-500/30'
    },
    orange: {
      btn: 'bg-orange-600 hover:bg-orange-500 active:bg-orange-700',
      icon: 'bg-orange-600',
      text: 'text-orange-400',
      border: 'border-orange-600',
      ring: 'focus:ring-orange-500/30'
    },
    red: {
      btn: 'bg-red-600 hover:bg-red-500 active:bg-red-700',
      icon: 'bg-red-600',
      text: 'text-red-400',
      border: 'border-red-600',
      ring: 'focus:ring-red-500/30'
    },
    violet: {
      btn: 'bg-violet-600 hover:bg-violet-500 active:bg-violet-700',
      icon: 'bg-violet-600',
      text: 'text-violet-400',
      border: 'border-violet-600',
      ring: 'focus:ring-violet-500/30'
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (selectedStatus === 'completed') {
      if (!formData.rootCause.trim()) newErrors.rootCause = true;
      if (!formData.actionTaken.trim()) newErrors.actionTaken = true;
    }
    if (selectedStatus === 'cancelled' && !formData.cancelledReason.trim()) {
      newErrors.cancelledReason = true;
    }
    if (selectedStatus === 'on_hold' && !formData.onHoldReason.trim()) {
      newErrors.onHoldReason = true;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('status', selectedStatus);
      formDataToSend.append('userId', String(userId));
      formDataToSend.append('notes', formData.notes || '');
      if (selectedStatus === 'completed') {
        formDataToSend.append('rootCause', formData.rootCause);
        formDataToSend.append('actionTaken', formData.actionTaken);
      } else if (selectedStatus === 'cancelled') {
        formDataToSend.append('cancelledReason', formData.cancelledReason);
      } else if (selectedStatus === 'on_hold') {
        formDataToSend.append('onHoldReason', formData.onHoldReason);
      }
      selectedImages.forEach(img => formDataToSend.append('images', img));
      await onUpdate(selectedStatus, formDataToSend);
      onClose();
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageAdd = (e) => {
    const files = Array.from(e.target.files);
    const remaining = 5 - selectedImages.length;
    files.slice(0, remaining).forEach(file => {
      if (file.size > 10 * 1024 * 1024) return;
      setSelectedImages(prev => [...prev, file]);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreviews(prev => [...prev, reader.result]);
      reader.readAsDataURL(file);
    });
  };

  const handleImageRemove = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const actions = getAvailableActions();
  const selectedAction = actions.find(a => a.value === selectedStatus);
  const currentConfig = currentStatusConfig[record.status] || currentStatusConfig.pending;

  return (
    <div className="fixed inset-0 z-[60] bg-black animate-in fade-in duration-200">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800/50">
        <div className="flex items-center h-16 px-4">
          <button
            onClick={selectedStatus ? () => setSelectedStatus(null) : onClose}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 transition-all"
          >
            {selectedStatus ? <ArrowLeft size={24} className="text-zinc-400" /> : <X size={24} className="text-zinc-400" />}
          </button>
          <div className="flex-1 ml-4">
            <h1 className="text-lg font-semibold text-white">
              {selectedStatus ? 'ยืนยันการเปลี่ยนสถานะ' : 'อัปเดตสถานะ'}
            </h1>
            <p className="text-sm text-zinc-500">{record.work_order}</p>
          </div>
        </div>
        
        {/* Current Status */}
        <div className="px-4 pb-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${currentConfig.bg}`}>
            <span className={`w-2 h-2 rounded-full ${currentConfig.dot}`}></span>
            <span className={`text-sm font-medium ${currentConfig.text}`}>{currentConfig.label}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="h-[calc(100vh-180px)] overflow-y-auto pb-32">
        {!selectedStatus ? (
          // Step 1: เลือก Action
          <div className="p-4 space-y-3">
            {actions.map((action) => {
              const Icon = action.icon;
              const colors = colorMap[action.color];
              return (
                <button
                  key={action.value}
                  onClick={() => setSelectedStatus(action.value)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 active:scale-[0.98] transition-all"
                >
                  <div className={`w-14 h-14 rounded-xl ${colors.icon} flex items-center justify-center shadow-lg`}>
                    <Icon size={28} className="text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-lg font-semibold text-white">{action.label}</p>
                    <p className="text-sm text-zinc-500">{action.sublabel}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          // Step 2: Form
          <div className="p-4 space-y-5">
            {/* Selected Action Display */}
            {selectedAction && (
              <div className={`flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border ${colorMap[selectedAction.color].border}`}>
                <div className={`w-12 h-12 rounded-xl ${colorMap[selectedAction.color].icon} flex items-center justify-center`}>
                  <selectedAction.icon size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">เปลี่ยนเป็น</p>
                  <p className={`text-xl font-bold ${colorMap[selectedAction.color].text}`}>{selectedAction.label}</p>
                </div>
              </div>
            )}

            {/* Completed Fields */}
            {selectedStatus === 'completed' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    สาเหตุของปัญหา <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.rootCause}
                    onChange={(e) => {
                      setFormData({ ...formData, rootCause: e.target.value });
                      if (errors.rootCause) setErrors(prev => ({ ...prev, rootCause: false }));
                    }}
                    placeholder="อธิบายสาเหตุของปัญหา..."
                    className={`w-full h-32 px-4 py-3 rounded-xl bg-zinc-900 text-white text-base resize-none border-2 transition-colors focus:outline-none ${
                      errors.rootCause ? 'border-red-500' : 'border-zinc-800 focus:border-emerald-500'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    วิธีการแก้ไข <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.actionTaken}
                    onChange={(e) => {
                      setFormData({ ...formData, actionTaken: e.target.value });
                      if (errors.actionTaken) setErrors(prev => ({ ...prev, actionTaken: false }));
                    }}
                    placeholder="อธิบายขั้นตอนการแก้ไข..."
                    className={`w-full h-32 px-4 py-3 rounded-xl bg-zinc-900 text-white text-base resize-none border-2 transition-colors focus:outline-none ${
                      errors.actionTaken ? 'border-red-500' : 'border-zinc-800 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </>
            )}

            {/* Cancelled Field */}
            {selectedStatus === 'cancelled' && (
              <div>
                <label className="block text-sm font-medium text-red-400 mb-2">
                  เหตุผลในการยกเลิก <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.cancelledReason}
                  onChange={(e) => {
                    setFormData({ ...formData, cancelledReason: e.target.value });
                    if (errors.cancelledReason) setErrors(prev => ({ ...prev, cancelledReason: false }));
                  }}
                  placeholder="ระบุเหตุผล..."
                  className={`w-full h-32 px-4 py-3 rounded-xl bg-zinc-900 text-white text-base resize-none border-2 transition-colors focus:outline-none ${
                    errors.cancelledReason ? 'border-red-500' : 'border-red-900/50 focus:border-red-500'
                  }`}
                />
              </div>
            )}

            {/* On Hold Field */}
            {selectedStatus === 'on_hold' && (
              <div>
                <label className="block text-sm font-medium text-orange-400 mb-2">
                  เหตุผลในการพักงาน <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.onHoldReason}
                  onChange={(e) => {
                    setFormData({ ...formData, onHoldReason: e.target.value });
                    if (errors.onHoldReason) setErrors(prev => ({ ...prev, onHoldReason: false }));
                  }}
                  placeholder="เช่น รออะไหล่..."
                  className={`w-full h-32 px-4 py-3 rounded-xl bg-zinc-900 text-white text-base resize-none border-2 transition-colors focus:outline-none ${
                    errors.onHoldReason ? 'border-red-500' : 'border-orange-900/50 focus:border-orange-500'
                  }`}
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">หมายเหตุเพิ่มเติม</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="รายละเอียดอื่นๆ..."
                className="w-full h-24 px-4 py-3 rounded-xl bg-zinc-900 border-2 border-zinc-800 text-white text-base resize-none focus:outline-none focus:border-zinc-600"
              />
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">แนบรูปภาพ</label>
              <div className="grid grid-cols-4 gap-2">
                {imagePreviews.map((preview, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleImageRemove(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center"
                    >
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                ))}
                {selectedImages.length < 5 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-600 active:scale-95 transition-all">
                    <Plus size={24} className="text-zinc-500" />
                    <span className="text-xs text-zinc-500 mt-1">เพิ่ม</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800/50 p-4 pb-8">
        {selectedStatus ? (
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedStatus(null)}
              disabled={isSubmitting}
              className="flex-1 h-14 rounded-xl bg-zinc-800 text-zinc-300 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <ArrowLeft size={20} />
              ย้อนกลับ
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex-[2] h-14 rounded-xl text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg ${
                selectedAction ? colorMap[selectedAction.color].btn : 'bg-emerald-600'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  ยืนยัน
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className="w-full h-14 rounded-xl bg-zinc-800 text-zinc-300 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <X size={20} />
            ปิด
          </button>
        )}
      </footer>
    </div>
  );
};

export default StatusUpdateModal;

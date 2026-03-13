import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import Badge from './ui/Badge';
import {
  Gauge,
  Plus,
  Save,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Pencil,
  X,
  Settings,
  TrendingUp,
  Zap,
  Calendar,
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  User,
  ZoomIn
} from 'lucide-react';
import { usageAPI, equipmentAPI, getImageUrl } from '../services/api';
import MaintenanceForm from './MaintenanceForm';

export default function UsageLog({ onClose, userId }) {
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [usageLogs, setUsageLogs] = useState([]);
  const [maintenanceSchedules, setMaintenanceSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputMode, setInputMode] = useState('used');
  const [showMaintenanceProgress, setShowMaintenanceProgress] = useState(true);
  const [showEquipmentInfo, setShowEquipmentInfo] = useState(true);
  const [showListProgress, setShowListProgress] = useState({});
  const [editingLog, setEditingLog] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  // Maintenance Request State
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [maintenanceInitialData, setMaintenanceInitialData] = useState(null);

  const [logNotes, setLogNotes] = useState('');
  const [logCondition, setLogCondition] = useState('normal');
  const [logImage, setLogImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [_previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const res = await equipmentAPI.getAll();
      setEquipment(res.equipment || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipmentDetails = async (eq) => {
    try {
      // Get fresh equipment data with schedules
      const [equipmentRes, logsRes] = await Promise.all([
        equipmentAPI.getById(eq.equipment_id || eq.id),
        usageAPI.getByEquipment(eq.equipment_id || eq.id)
      ]);

      const freshEquipment = equipmentRes.equipment || eq;

      // Maintenance schedules come with equipment from backend
      setMaintenanceSchedules(freshEquipment.maintenance_schedules || eq.maintenance_schedules || []);

      // Usage logs from API
      setUsageLogs(logsRes.logs || []);
      setCurrentPage(logsRes.page || 1);
      setTotalPages(logsRes.totalPages || 1);

      setSelectedEquipment(freshEquipment);
      setInputValue('');
      setLogNotes('');
      setInputMode('used');
      setIsLogging(false);
      setEditingLog(null);
    } catch (error) {
      console.error('Error fetching details:', error);
      // Fallback to using existing data
      setMaintenanceSchedules(eq.maintenance_schedules || []);
      setUsageLogs([]);
      setSelectedEquipment(eq);
    }
  };

  const handlePageChange = async (newPage) => {
    if (newPage < 1 || newPage > totalPages || !selectedEquipment) return;

    try {
      setLoading(true);
      const res = await usageAPI.getByEquipment(selectedEquipment.equipment_id || selectedEquipment.id, newPage);
      setUsageLogs(res.logs || []);
      setCurrentPage(res.page);
      setTotalPages(res.totalPages);
    } catch (error) {
      console.error('Error changing page:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentUsage = parseFloat(selectedEquipment?.current_usage || selectedEquipment?.current_hours || 0);

  const calculateNextMaintenance = (schedule) => {
    const interval = parseFloat(schedule.interval_value) || 0;
    const lastCompletedAt = parseFloat(schedule.last_completed_at_usage) || 0;
    const currentTicketId = schedule.current_ticket_id;

    if (interval <= 0) return null;

    const nextDue = lastCompletedAt + interval;
    const remaining = nextDue - currentUsage;
    const progress = ((currentUsage - lastCompletedAt) / interval) * 100;

    return {
      nextDue,
      remaining,
      progress: Math.min(Math.max(progress, 0), 100),
      isOverdue: remaining < 0,
      isDue: remaining <= (interval * 0.1),
      hasOpenTicket: !!currentTicketId,
      currentTicketId,
      schedule
    };
  };

  const getEquipmentMaintenanceStatus = (eq) => {
    const schedules = eq.maintenance_schedules || [];
    const equipCurrentUsage = parseFloat(eq.current_usage || eq.current_hours || 0);

    let mostUrgent = null;
    let hasOpenTicket = false;

    schedules.forEach(schedule => {
      const interval = parseFloat(schedule.interval_value) || 0;
      const lastCompletedAt = parseFloat(schedule.last_completed_at_usage) || 0;

      if (interval <= 0) return;

      const nextDue = lastCompletedAt + interval;
      const remaining = nextDue - equipCurrentUsage;
      const progress = ((equipCurrentUsage - lastCompletedAt) / interval) * 100;

      if (schedule.current_ticket_id) hasOpenTicket = true;

      const calc = {
        nextDue,
        remaining,
        progress: Math.min(Math.max(progress, 0), 100),
        isOverdue: remaining < 0,
        isDue: remaining <= (interval * 0.1),
        hasOpenTicket: !!schedule.current_ticket_id,
        currentTicketId: schedule.current_ticket_id,
        schedule
      };

      if (!mostUrgent || calc.remaining < mostUrgent.remaining) {
        mostUrgent = calc;
      }
    });

    return { mostUrgent, hasOpenTicket };
  };

  const sortedEquipment = useMemo(() => {
    return [...equipment].sort((a, b) => {
      const statusA = getEquipmentMaintenanceStatus(a);
      const statusB = getEquipmentMaintenanceStatus(b);

      if (statusA.mostUrgent?.isOverdue && !statusB.mostUrgent?.isOverdue) return -1;
      if (!statusA.mostUrgent?.isOverdue && statusB.mostUrgent?.isOverdue) return 1;

      if (statusA.mostUrgent && statusB.mostUrgent) {
        return statusA.mostUrgent.remaining - statusB.mostUrgent.remaining;
      }

      return 0;
    });
  }, [equipment]);

  const startLogging = () => {
    setIsLogging(true);
    setInputValue('');
    setLogNotes('');

    setLogCondition('normal');
    setLogImage(null);
    setPreviewUrl(null);
    setInputMode('used');
  };

  const cancelLogging = () => {
    setIsLogging(false);
    setInputValue('');
    setLogNotes('');
    setLogCondition('normal');
    setLogImage(null);
    setPreviewUrl(null);
  };

  const handleSaveUsage = async (value) => {
    // Determine the value to save
    const valObj = typeof value === 'object' ? parseFloat(inputValue) : parseFloat(value);
    const finalValue = !isNaN(valObj) ? valObj : parseFloat(inputValue);

    if (!finalValue || finalValue <= 0 || !selectedEquipment) return;

    setSaving(true);
    try {
      // Calculate new total usage
      const newTotalUsage = inputMode === 'current' ? finalValue : currentUsage + finalValue;

      const formData = new FormData();
      formData.append('equipment_id', selectedEquipment.equipment_id || selectedEquipment.id);
      formData.append('usage_value', newTotalUsage);
      if (logNotes) formData.append('notes', logNotes);
      formData.append('recorded_by', userId);
      formData.append('condition', logCondition);
      if (logImage) formData.append('image', logImage);

      await usageAPI.create(formData);

      // PM check is now handled by backend automatically

      await fetchEquipmentDetails(selectedEquipment);
      await fetchEquipment();

      // Check for due maintenance
      try {
        const freshEq = await equipmentAPI.getById(selectedEquipment.equipment_id || selectedEquipment.id);
        const freshStatus = getEquipmentMaintenanceStatus(freshEq.equipment);

        if (freshStatus.mostUrgent && (freshStatus.mostUrgent.isOverdue || freshStatus.mostUrgent.isDue)) {
          if (confirm(`⚠️ มีรอบบำรุงรักษาครบกำหนด (${freshStatus.mostUrgent.schedule.description})\nต้องการแจ้งซ่อม/บันทึกการซ่อมเลยหรือไม่?`)) {
            handleRequestMaintenance(freshStatus.mostUrgent.schedule);
          }
        }
      } catch (err) {
        console.error("Error checking PM status:", err);
      }

      // Reset logging state
      setIsLogging(false);
      setInputValue('');
      setLogNotes('');
      setLogCondition('normal');
      setLogImage(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error saving usage:', error);
      alert(error.message || 'บันทึกไม่สำเร็จ');
      setSaving(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestMaintenance = (schedule, eq = selectedEquipment) => {
    if (!eq) return;
    setMaintenanceInitialData({
      equipmentId: eq.equipment_id || eq.id,
      maintenanceType: 'routine',
      title: 'PM: ' + (schedule.description || 'Maintenance Schedule'),
      description: `Preventive Maintenance for schedule: ${schedule.description || 'Regular check'}`,
      scheduleId: schedule.id
    });
    setShowMaintenanceForm(true);
  };

  const handleStartEdit = (log) => {
    setEditingLog(log);
    setEditValue(log.usage_value.toString());
  };

  const handleCancelEdit = () => {
    setEditingLog(null);
    setEditValue('');
  };

  const handleSaveEdit = async () => {
    if (!editingLog || !editValue) return;

    setSaving(true);
    try {
      await usageAPI.update(editingLog.id, {
        equipment_id: selectedEquipment.equipment_id || selectedEquipment.id,
        usage_value: parseFloat(editValue),
        notes: null
      });

      // PM check is now handled by backend automatically

      await fetchEquipmentDetails(selectedEquipment);
      await fetchEquipment();
      setEditingLog(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating usage log:', error);
      alert(error.message || 'แก้ไขไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const toggleListProgress = (equipmentId) => {
    setShowListProgress(prev => ({
      ...prev,
      [equipmentId]: !prev[equipmentId]
    }));
  };

  const getStatusBadge = (remaining, interval) => {
    const ratio = remaining / interval;
    if (remaining < 0) return { className: 'bg-red-500/10 text-red-400 border-red-500/30', label: 'เกินกำหนด' };
    if (ratio <= 0.1) return { className: 'bg-amber-500/10 text-amber-400 border-amber-500/30', label: 'ใกล้ครบ' };
    if (ratio <= 0.3) return { className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', label: 'เตรียมตัว' };
    return { className: 'bg-green-500/10 text-green-400 border-green-500/30', label: 'ปกติ' };
  };

  const getProgressColor = (remaining, interval) => {
    const ratio = remaining / interval;
    if (remaining < 0) return 'bg-red-500';
    if (ratio <= 0.1) return 'bg-amber-500';
    if (ratio <= 0.3) return 'bg-yellow-500';
    return 'bg-green-500';
  };



  // Header Logic
  const isDetailView = !!selectedEquipment;

  let headerTitle = 'บันทึกการใช้งาน';
  let headerSubtitle = 'Usage Log';

  if (isLogging) {
    headerTitle = 'บันทึกข้อมูล';
    headerSubtitle = selectedEquipment?.equipment_name;
  } else if (isDetailView) {
    headerTitle = selectedEquipment?.equipment_name || selectedEquipment?.name;
    headerSubtitle = selectedEquipment?.equipment_code;
  }

  const handleBack = () => {
    if (isLogging) {
      cancelLogging();
    } else if (isDetailView) {
      setSelectedEquipment(null);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black animate-in fade-in duration-200 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800/50">
        <div className="flex items-center h-16 px-4 gap-4">
          <button
            onClick={handleBack}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 transition-all"
          >
            {isDetailView ? <ArrowLeft size={24} className="text-zinc-400" /> : <X size={24} className="text-zinc-400" />}
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-white truncate">{headerTitle}</h1>
            <p className="text-sm text-zinc-500 truncate">{headerSubtitle}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4">
        {isLogging ? (
          // Log Usage Form
          <div className="space-y-6 max-w-lg mx-auto">
            <Card className="border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-green-500" />
                  เพิ่มชั่วโมงการใช้งาน
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mode Toggle */}
                <div className="flex p-1 bg-gray-800 rounded-lg">
                  <button
                    onClick={() => setInputMode('used')}
                    className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${inputMode === 'used'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-400 hover:text-white'
                      }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Zap className="w-4 h-4" />
                      ใช้ไปวันนี้
                    </div>
                  </button>
                  <button
                    onClick={() => setInputMode('current')}
                    className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${inputMode === 'current'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-400 hover:text-white'
                      }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Gauge className="w-4 h-4" />
                      อ่านจากมิเตอร์
                    </div>
                  </button>
                </div>

                {/* Input Field */}
                <div>
                  <div className="relative">
                    <Input
                      type="number"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={inputMode === 'used' ? 'ใช้ไปกี่ชั่วโมง?' : 'อ่านมิเตอร์ได้เท่าไหร่?'}
                      className="text-center text-xl font-bold h-14 bg-gray-900 border-gray-700 pr-16"
                      autoFocus
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">ชม.</span>
                  </div>
                  {inputValue && parseFloat(inputValue) > 0 && (
                    <div className="mt-2 text-center">
                      {inputMode === 'current' ? (
                        <p className="text-sm text-gray-400">
                          เพิ่มมา: <span className="text-green-400">+{((parseFloat(inputValue) - currentUsage)).toLocaleString()}</span> ชม.
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400">
                          ค่าสุทธิ: <span className="text-green-400">{(currentUsage + parseFloat(inputValue)).toLocaleString()}</span> ชม.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Condition Selection */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">สภาพเครื่องจักร</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setLogCondition('normal')}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${logCondition === 'normal'
                        ? 'bg-green-600 text-white shadow-lg shadow-green-900/20'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                      ปกติ
                    </button>
                    <button
                      onClick={() => setLogCondition('abnormal')}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${logCondition === 'abnormal'
                        ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                      ไม่ปกติ
                    </button>
                    <button
                      onClick={() => setLogCondition('damaged')}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${logCondition === 'damaged'
                        ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                      เสียหาย
                    </button>
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">รูปภาพ (ถ้ามี)</label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-3 bg-gray-800 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        <span>ถ่ายรูป / อัพโหลด</span>
                      </button>
                      <input
                        type="file"
                        hidden
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            if (!file.type.startsWith('image/')) {
                              alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
                              e.target.value = '';
                              return;
                            }
                            setLogImage(file);
                            setPreviewUrl(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </div>

                    {previewUrl && (
                      <div className="relative rounded-lg overflow-hidden border border-gray-700">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="w-full h-48 object-cover"
                        />
                        <button
                          onClick={() => {
                            setLogImage(null);
                            setPreviewUrl(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 backdrop-blur-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>



                {/* Notes Field */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">หมายเหตุ / รายละเอียด (ไม่บังคับ)</label>
                  <textarea
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                    placeholder="เช่น วิ่งไปส่งของที่..."
                    className="w-full h-24 bg-gray-900 border-gray-700 rounded-lg p-3 text-white text-sm resize-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={cancelLogging}
                    className="w-full"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    disabled={!inputValue || parseFloat(inputValue) <= 0 || saving}
                    onClick={() => handleSaveUsage(parseFloat(inputValue))}
                    className="w-full bg-green-600 hover:bg-green-500 text-white"
                  >
                    {saving ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        บันทึก
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : selectedEquipment ? (
          /* Detail View Content (Header removed) */
          <div className="space-y-6">
            {/* Input Section - Replaced with Button */}
            <Card className="border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-green-950/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">ใช้งานปัจุบัน</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">{currentUsage.toLocaleString()}</span>
                      <span className="text-gray-500">ชั่วโมง</span>
                    </div>
                  </div>
                  <Button
                    onClick={startLogging}
                    className="bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 px-6 h-12 rounded-xl"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    บันทึกการใช้งาน
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Equipment Info Card */}
            <Card className="border-gray-800">
              <button
                onClick={() => setShowEquipmentInfo(!showEquipmentInfo)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-900/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-blue-400" />
                  </div>
                  <h2 className="font-medium text-white">ข้อมูลเครื่อง</h2>
                </div>
                {showEquipmentInfo ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {showEquipmentInfo && (
                <CardContent className="pt-0 pb-4 border-t border-gray-800">
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {[
                      { label: 'ประเภท', value: selectedEquipment.category, key: 'cat' },
                      { label: 'สถานที่', value: selectedEquipment.location, key: 'loc' },
                      { label: 'รุ่น', value: selectedEquipment.model, key: 'mod' },
                      { label: 'รหัสเครื่อง', value: selectedEquipment.serial_number, key: 'sn' },
                    ].map((item) => (
                      <div key={item.key} className="bg-gray-900/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                        <p className="font-medium text-white">{item.value || '-'}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Maintenance Progress Card */}
            <Card className="border-gray-800">
              <button
                onClick={() => setShowMaintenanceProgress(!showMaintenanceProgress)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-900/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-amber-400" />
                  </div>
                  <h2 className="font-medium text-white">รอบการซ่อมบำรุง</h2>
                  {maintenanceSchedules.length > 0 && (
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                      {maintenanceSchedules.length} รายการ
                    </Badge>
                  )}
                </div>
                {showMaintenanceProgress ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {showMaintenanceProgress && (
                <CardContent className="pt-0 pb-4 border-t border-gray-800 space-y-3 mt-4">
                  {maintenanceSchedules.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                      <p className="text-gray-500">ไม่มีรอบการซ่อมบำรุง</p>
                    </div>
                  ) : (
                    maintenanceSchedules.map((schedule) => {
                      const calc = calculateNextMaintenance(schedule);
                      if (!calc) return null;

                      const interval = parseFloat(schedule.interval_value);

                      return (
                        <div
                          key={schedule.id}
                          className="p-4 rounded-lg bg-gray-900/50"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-medium text-white mb-1">
                                {schedule.description || `บำรุงรักษาทุก ${interval.toLocaleString()} ชม.`}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>ทุก {interval.toLocaleString()} ชม.</span>
                              </div>
                            </div>
                            {calc.hasOpenTicket && (
                              <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/30">
                                ใบงาน #{calc.currentTicketId}
                              </Badge>
                            )}
                            {/* Manual Trigger Button */}
                            {!calc.hasOpenTicket && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="ml-auto bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20 h-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRequestMaintenance(schedule, selectedEquipment);
                                }}
                              >
                                <Wrench className="w-3 h-3 mr-1" />
                                แจ้งซ่อม
                              </Button>
                            )}
                          </div>

                          <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
                            <div
                              className={`h-full rounded-full transition-all ${getProgressColor(calc.remaining, interval)}`}
                              style={{ width: `${Math.min(calc.progress, 100)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">
                              ครบที่ {calc.nextDue.toLocaleString()} ชม.
                            </span>
                            <span className={`font-medium ${calc.isOverdue
                              ? 'text-red-400'
                              : calc.isDue
                                ? 'text-amber-400'
                                : 'text-green-400'
                              }`}>
                              {calc.isOverdue
                                ? `เกิน ${Math.abs(calc.remaining).toLocaleString()} ชม.`
                                : `เหลือ ${calc.remaining.toLocaleString()} ชม.`
                              }
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              )}
            </Card>

            {/* Usage History Card */}
            <Card className="border-gray-800">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-400" />
                </div>
                <CardTitle>ประวัติการใช้งาน</CardTitle>
              </CardHeader>

              <CardContent className="pt-0">
                {usageLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-500">ยังไม่มีประวัติการใช้งาน</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {usageLogs.slice(0, 10).map((log, index, arr) => {
                      const isLatest = index === 0;
                      const isEditing = editingLog?.id === log.id;

                      // Calculate difference
                      const currentValue = parseFloat(log.usage_value) || 0;
                      const previousLog = arr[index + 1];
                      const previousValue = previousLog ? parseFloat(previousLog.usage_value) || 0 : 0;
                      const difference = currentValue - previousValue;

                      const conditionStyle = (condition) => {
                        switch (condition) {
                          case 'damaged': return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'เสียหาย' };
                          case 'abnormal': return { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'ไม่ปกติ' };
                          default: return { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'ปกติ' };
                        }
                      };

                      const style = conditionStyle(log.condition || 'normal');
                      const imageUrl = getImageUrl(log.image_url);

                      return (
                        <div key={log.id} className="p-4 rounded-xl bg-gray-900/40 border border-gray-800 hover:border-gray-700 transition-all">
                          {isEditing ? (
                            <div className="flex items-center gap-3">
                              <Input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="flex-1 text-center font-bold bg-gray-800 border-gray-700"
                                autoFocus
                              />
                              <Button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                size="sm"
                                className="bg-green-600 hover:bg-green-500"
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={handleCancelEdit}
                                variant="outline"
                                size="sm"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {/* Header: Icon, Value, Actions */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                  {/* Condition Icon */}
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${style.bg}`}>
                                    {log.condition === 'damaged' || log.condition === 'abnormal' ? (
                                      <AlertTriangle className={`w-6 h-6 ${style.color}`} />
                                    ) : (
                                      <CheckCircle2 className={`w-6 h-6 ${style.color}`} />
                                    )}
                                  </div>

                                  {/* Usage Value */}
                                  <div>
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-xl font-bold text-white tracking-tight">
                                        {currentValue.toLocaleString()}
                                      </span>
                                      <span className="text-sm text-gray-500 font-medium">ชม.</span>
                                    </div>
                                    {previousLog && difference > 0 && (
                                      <div className="flex items-center gap-1 text-xs text-green-400 font-medium mt-1">
                                        <TrendingUp className="w-3 h-3" />
                                        <span>+{difference.toLocaleString()}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                  {isLatest && (
                                    <>
                                      <Badge className="bg-green-500/10 text-green-400 border-green-500/30">
                                        ล่าสุด
                                      </Badge>
                                      <button
                                        onClick={() => handleStartEdit(log)}
                                        className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
                                      >
                                        <Pencil className="w-3.5 h-3.5 text-gray-400" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Details Grid */}
                              <div className="grid grid-cols-2 gap-4 py-2 border-t border-b border-gray-800/50">
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                  <Calendar className="w-4 h-4 text-gray-500" />
                                  <span>
                                    {log.log_date ? new Date(log.log_date).toLocaleDateString('th-TH', {
                                      day: 'numeric', month: 'short', year: '2-digit'
                                    }) : '-'}
                                    <span className="mx-1 text-gray-600">•</span>
                                    {log.created_at && new Date(log.created_at).toLocaleTimeString('th-TH', {
                                      hour: '2-digit', minute: '2-digit'
                                    })}
                                    {' น.'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                  <User className="w-4 h-4 text-gray-500" />
                                  <span>{log.recorded_by_name || 'Admin'}</span>
                                </div>
                              </div>

                              {/* Footer: Notes, Image, Condition */}
                              <div className="flex items-end justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  {log.notes ? (
                                    <p className="text-sm text-gray-400 bg-gray-900/50 p-2 rounded-lg border border-gray-800/50">
                                      {log.notes}
                                    </p>
                                  ) : (
                                    <span className="text-xs text-gray-600 italic">ไม่มีบันทึกเพิ่มเติม</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  {imageUrl && (
                                    <button
                                      onClick={() => setPreviewImage(imageUrl)}
                                      className="group relative w-12 h-12 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-500 transition-all"
                                    >
                                      <img
                                        src={imageUrl}
                                        alt="Evidence"
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <ZoomIn className="w-4 h-4 text-white" />
                                      </div>
                                    </button>
                                  )}
                                  <div className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${style.bg} ${style.color} ${style.border}`}>
                                    {style.label}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination Controls */}
                {usageLogs.length > 0 && totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 border-t border-gray-800 pt-3">
                    <p className="text-sm text-gray-500">
                      หน้า {currentPage} จาก {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || loading}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* List View Content (Header removed) */
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-gray-800">
                <CardContent className="p-5 min-h-[100px] flex flex-col items-center justify-center">
                  <Settings className="w-8 h-8 text-blue-400 mb-2" />
                  <p className="text-2xl font-bold text-white">{equipment.length}</p>
                  <p className="text-sm text-gray-400 text-center">เครื่องจักรทั้งหมด</p>
                </CardContent>
              </Card>
              <Card className="border-gray-800">
                <CardContent className="p-5 min-h-[100px] flex flex-col items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {equipment.filter(eq => {
                      const status = getEquipmentMaintenanceStatus(eq);
                      return status.mostUrgent && status.mostUrgent.isDue && !status.mostUrgent.isOverdue;
                    }).length}
                  </p>
                  <p className="text-sm text-gray-400 text-center">ใกล้ครบกำหนด</p>
                </CardContent>
              </Card>
              <Card className="border-gray-800">
                <CardContent className="p-5 min-h-[100px] flex flex-col items-center justify-center">
                  <Wrench className="w-8 h-8 text-red-400 mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {equipment.filter(eq => {
                      const status = getEquipmentMaintenanceStatus(eq);
                      return status.mostUrgent && status.mostUrgent.isOverdue;
                    }).length}
                  </p>
                  <p className="text-sm text-gray-400 text-center">เกินกำหนด</p>
                </CardContent>
              </Card>
            </div>

            {/* Equipment List */}
            {loading ? (
              <Card className="p-12 text-center border-dashed">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mx-auto"></div>
                <p className="mt-4 text-gray-500 font-medium">กำลังโหลด...</p>
              </Card>
            ) : sortedEquipment.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <Settings className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-500 font-medium">ไม่พบเครื่องจักร</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {sortedEquipment.map((eq) => {
                  const { mostUrgent, hasOpenTicket } = getEquipmentMaintenanceStatus(eq);
                  const schedules = eq.maintenance_schedules || [];
                  const isExpanded = showListProgress[eq.id];

                  return (
                    <Card
                      key={eq.equipment_id || eq.id}
                      className="border-gray-800 hover:border-green-500/50 transition-all"
                    >
                      <CardContent className="p-0">
                        {/* Main Card Content */}
                        <div
                          onClick={() => fetchEquipmentDetails(eq)}
                          className="p-4 cursor-pointer hover:bg-gray-900/30 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            {/* Equipment Icon */}
                            <div className={`
                              w-12 h-12 rounded-lg flex items-center justify-center
                              ${mostUrgent?.isOverdue
                                ? 'bg-red-500/10'
                                : mostUrgent?.isDue
                                  ? 'bg-amber-500/10'
                                  : 'bg-green-500/10'
                              }
                            `}>
                              <Gauge className={`w-6 h-6 ${mostUrgent?.isOverdue
                                ? 'text-red-400'
                                : mostUrgent?.isDue
                                  ? 'text-amber-400'
                                  : 'text-green-400'
                                }`} />
                            </div>

                            {/* Equipment Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-white truncate">{eq.equipment_name || eq.name}</h3>
                                {eq.equipment_code && (
                                  <span className="text-xs text-gray-500 font-mono">({eq.equipment_code})</span>
                                )}
                                {hasOpenTicket && (
                                  <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/30">
                                    มีใบงาน
                                  </Badge>
                                )}
                              </div>

                              {/* Location & Type */}
                              {(eq.location || eq.equipment_type) && (
                                <p className="text-xs text-gray-500 mb-1 truncate">
                                  {eq.location && <span>📍 {eq.location}</span>}
                                  {eq.location && eq.equipment_type && <span className="mx-1">•</span>}
                                  {eq.equipment_type && <span>🏭 {eq.equipment_type}</span>}
                                </p>
                              )}

                              <div className="flex items-center gap-3 text-sm">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-800 rounded text-gray-300">
                                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                                  <span className="font-medium">
                                    {parseFloat(eq.current_usage || eq.current_hours || 0).toLocaleString()}
                                  </span>
                                  <span className="text-gray-500">ชม.</span>
                                </span>

                                {mostUrgent && (
                                  <Badge className={getStatusBadge(mostUrgent.remaining, parseFloat(mostUrgent.schedule.interval_value)).className}>
                                    {mostUrgent.isOverdue ? (
                                      <>เกิน {Math.abs(mostUrgent.remaining).toLocaleString()} ชม.</>
                                    ) : (
                                      <>เหลือ {mostUrgent.remaining.toLocaleString()} ชม.</>
                                    )}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Arrow */}
                            <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            </div>
                          </div>

                          {/* Quick Progress Preview */}
                          {mostUrgent && !isExpanded && (
                            <div className="mt-4 pt-4 border-t border-gray-800">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                <span>{mostUrgent.schedule.description || `ทุก ${mostUrgent.schedule.interval_value} ชม.`}</span>
                                <span>{Math.round(mostUrgent.progress)}%</span>
                              </div>
                              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${getProgressColor(mostUrgent.remaining, parseFloat(mostUrgent.schedule.interval_value))
                                    }`}
                                  style={{ width: `${Math.min(mostUrgent.progress, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Expandable Progress Section */}
                        {schedules.length > 0 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleListProgress(eq.equipment_id || eq.id);
                              }}
                              className="w-full py-2.5 px-4 flex items-center justify-center gap-2 text-sm text-gray-500 hover:bg-gray-900/30 transition-colors border-t border-gray-800"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-4 h-4" />
                                  ซ่อนรอบเช็ค
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4" />
                                  แสดงรอบเช็ค ({schedules.length})
                                </>
                              )}
                            </button>

                            {isExpanded && (
                              <div className="px-4 pb-4 space-y-2 bg-gray-900/30">
                                {schedules.map((schedule) => {
                                  const calc = calculateNextMaintenance({
                                    ...schedule,
                                    last_completed_at_usage: parseFloat(schedule.last_completed_at_usage) || 0
                                  });
                                  if (!calc) return null;
                                  const interval = parseFloat(schedule.interval_value);

                                  return (
                                    <div
                                      key={schedule.id}
                                      className="p-3 rounded-lg bg-gray-800/50"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <Wrench className="w-4 h-4 text-gray-500" />
                                          <span className="font-medium text-gray-300 text-sm">
                                            {schedule.description || `ทุก ${schedule.interval_value} ชม.`}
                                          </span>
                                        </div>
                                        {calc.hasOpenTicket && (
                                          <Badge className="bg-orange-500/10 text-orange-400 text-xs">
                                            #{calc.currentTicketId}
                                          </Badge>
                                        )}
                                        {/* Manual Trigger Button */}
                                        {!calc.hasOpenTicket && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20 h-6 text-[10px] px-2"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRequestMaintenance(schedule, eq);
                                            }}
                                          >
                                            แจ้งซ่อม
                                          </Button>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                        <span>ทุก {interval.toLocaleString()} ชม.</span>
                                        <span>•</span>
                                        <span>ครบที่ {calc.nextDue.toLocaleString()} ชม.</span>
                                      </div>

                                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${getProgressColor(calc.remaining, interval)}`}
                                          style={{ width: `${Math.min(calc.progress, 100)}%` }}
                                        />
                                      </div>

                                      <div className="flex justify-end mt-2">
                                        <span className={`text-xs font-medium ${calc.isOverdue ? 'text-red-400' : calc.isDue ? 'text-amber-400' : 'text-green-400'
                                          }`}>
                                          {calc.isOverdue
                                            ? `เกิน ${Math.abs(calc.remaining).toLocaleString()} ชม.`
                                            : `เหลือ ${calc.remaining.toLocaleString()} ชม.`
                                          }
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )
        }
      </main >

      {/* Maintenance Request Modal */}
      {showMaintenanceForm && (
        <MaintenanceForm
          userId={userId}
          initialData={maintenanceInitialData}
          onSuccess={() => {
            setShowMaintenanceForm(false);
            if (selectedEquipment) fetchEquipmentDetails(selectedEquipment);
            fetchEquipment();
          }}
          onCancel={() => setShowMaintenanceForm(false)}
        />
      )}

    </div >
  );
}

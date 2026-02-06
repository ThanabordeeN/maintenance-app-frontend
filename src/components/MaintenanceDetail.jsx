import { X, Clock, User, Wrench, CheckCircle, Calendar, DollarSign, AlertTriangle, Zap, Play, Pause, XCircle, RotateCcw, ArrowRight, Package, TrendingUp, History, MapPin, Tag, Briefcase, Camera, ClipboardCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { maintenanceAPI, getImageUrl } from '../services/api';
import StatusUpdateModal from './StatusUpdateModal';
import ChecklistModal from './ChecklistModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

const MaintenanceDetail = ({ recordId, onClose, userId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [updateNotes, setUpdateNotes] = useState('');
  const [updateImages, setUpdateImages] = useState([]);
  const [updateImagePreviews, setUpdateImagePreviews] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    fetchRecordDetail();
  }, [recordId]);

  const fetchRecordDetail = async () => {
    try {
      setLoading(true);
      const result = await maintenanceAPI.getById(recordId);
      setData(result);
    } catch (error) {
      console.error('Error fetching record detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus, updateData) => {
    try {
      // Map frontend data to backend expected format
      const payload = {
        status: newStatus,
        userId: updateData.userId,
        notes: updateData.notes || null,
        rootCause: updateData.rootCause || null,
        actionTaken: updateData.actionTaken || null,
        cancelledReason: updateData.cancelledReason || null,
        onHoldReason: updateData.onHoldReason || null,
      };
      
      await maintenanceAPI.update(recordId, payload);
      await fetchRecordDetail(); // Reload data
      setShowStatusModal(false);
    } catch (error) {
      throw new Error(error.message || 'Failed to update status');
    }
  };

  const handleProgressUpdate = async (e) => {
    e.preventDefault();
    if (!updateNotes && !updateImage) return;

    try {
      setIsUpdating(true);
      const formData = new FormData();
      formData.append('notes', updateNotes);
      formData.append('userId', userId);
      if (updateImages.length > 0) {
        updateImages.forEach(img => formData.append('images', img));
      }

      await maintenanceAPI.addProgressUpdate(recordId, formData);
      await fetchRecordDetail();
      setUpdateNotes('');
      setUpdateImages([]);
      setUpdateImagePreviews([]);
      setShowUpdateForm(false);
    } catch (error) {
      console.error('Error updating progress:', error);
      alert('Failed to update progress');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', badge: 'warning', label: 'รอดำเนินการ', icon: Clock, step: 0 },
      in_progress: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', badge: 'info', label: 'กำลังซ่อม', icon: Wrench, step: 1 },
      completed: { color: 'bg-green-500/20 text-green-400 border-green-500/30', badge: 'default', label: 'เสร็จสิ้น', icon: CheckCircle, step: 2 },
      cancelled: { color: 'bg-red-500/20 text-red-400 border-red-500/30', badge: 'destructive', label: 'ยกเลิก', icon: XCircle, step: -1 },
      on_hold: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', badge: 'warning', label: 'พักงาน', icon: Pause, step: 1.5 },
      reopened: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', badge: 'secondary', label: 'เปิดใหม่', icon: RotateCcw, step: 0 },
      progress_update: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', badge: 'info', label: 'อัปเดตงาน', icon: TrendingUp, step: 1 }
    };
    return configs[status] || configs.pending;
  };

  const getPriorityConfig = (priority) => {
    const configs = {
      critical: { color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20', label: 'วีกฤต (Critical)', icon: AlertTriangle, pulse: true },
      high: { color: 'text-red-400', bg: 'bg-red-500/5 border-red-500/10', label: 'ด่วนมาก (High)', icon: AlertTriangle },
      medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/5 border-yellow-500/10', label: 'ปกติ (Medium)', icon: Clock },
      low: { color: 'text-green-400', bg: 'bg-green-500/5 border-green-500/10', label: 'ต่ำ (Low)', icon: CheckCircle }
    };
    return configs[priority] || configs.medium;
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'เมื่อสักครู่';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`;
    
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
        <Card className="p-12 text-center bg-gray-900 border-gray-800 shadow-2xl animate-in zoom-in duration-300">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-300 font-bold uppercase tracking-widest text-sm">กำลังโหลดข้อมูลแผนงาน...</p>
        </Card>
      </div>
    );
  }

  if (!data || !data.record) return null;

  const record = data.record;
  const timeline = data.timeline || [];
  const images = data.images || [];
  const statusConfig = getStatusConfig(record.status);
  const priorityConfig = getPriorityConfig(record.priority);
  const StatusIcon = statusConfig.icon;
  
  const calculateDowntime = () => {
    // If we have total accumulated minutes, use them
    if (record.downtime_minutes !== null && record.downtime_minutes !== undefined) {
      const totalMinutes = record.downtime_minutes;
      
      // If currently in_progress, add current segment time
      let currentSegmentMins = 0;
      if (record.status === 'in_progress' && record.started_at) {
        const start = new Date(record.started_at);
        const now = new Date();
        currentSegmentMins = Math.floor((now - start) / 60000);
      }
      
      const total = totalMinutes + currentSegmentMins;
      const hours = Math.floor(total / 60);
      const mins = total % 60;
      
      if (total === 0 && record.status === 'in_progress') return 'กำลังคำนวณ...';
      return hours > 0 ? `${hours} ชม. ${mins} นาที` : `${mins} นาที`;
    }
    
    // Fallback for old records or while in progress
    if (record.started_at) {
      const start = new Date(record.started_at);
      const end = record.completed_at ? new Date(record.completed_at) : new Date();
      const minutes = Math.floor((end - start) / 60000);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return hours > 0 ? `${hours} ชม. ${mins} นาที` : `${mins} นาที`;
    }
    
    return '0 นาที';
  };
  
  const downtime = calculateDowntime();

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm overflow-hidden">
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-0 sm:px-4 py-0 sm:py-8 flex justify-center items-start">
          <Card className="max-w-4xl w-full bg-gray-900 border-gray-800 shadow-3xl animate-in fade-in slide-in-from-bottom-5 duration-500 overflow-hidden rounded-none sm:rounded-3xl min-h-screen sm:min-h-0 mb-28 sm:mb-0">
        
        {/* Superior Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-400 p-1 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          
          <div className="flex flex-row justify-between items-center sm:items-start gap-2 relative z-10">
            <div className="space-y-1 sm:space-y-3 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-3xl font-black text-white tracking-tight leading-none">{record.work_order}</h2>
                <div className={`px-2 py-1 rounded-full text-[8px] sm:text-xs font-black uppercase tracking-widest border border-white/20 flex items-center gap-1 ${priorityConfig.bg} ${priorityConfig.color} ${priorityConfig.pulse ? 'animate-pulse' : ''}`}>
                  <priorityConfig.icon size={10} />
                  {priorityConfig.label}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge className="bg-white text-green-700 hover:bg-white px-2 py-0.5 sm:px-4 sm:py-1.5 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-sm shadow-xl shadow-green-900/20 gap-1.5">
                  <StatusIcon size={12} />
                  {statusConfig.label}
                </Badge>
                <div className="text-white/70 text-[9px] font-bold bg-black/20 px-2 py-0.5 sm:py-1.5 rounded-lg border border-white/10">
                  {formatRelativeTime(record.created_at)}
                </div>
              </div>
            </div>
            
            <Button
              variant="icon"
              onClick={onClose}
              className="bg-black/20 hover:bg-black/30 text-white rounded-xl h-9 w-9 sm:h-14 sm:w-14 backdrop-blur-md transition-all active:scale-95 shrink-0"
            >
              <X size={20} />
            </Button>
          </div>
          
          {/* Progress Timeline Tracker */}
          {record.status !== 'cancelled' && (
            <div className="mt-3 sm:mt-8 pt-3 sm:pt-6 border-t border-white/10 pb-1.5 scrollbar-none">
              <div className="flex items-start justify-between">
                {[
                  { label: 'รอดำเนินการ', status: 'pending', icon: Clock },
                  { label: 'กำลังซ่อม', status: 'in_progress', icon: Wrench },
                  { label: 'เสร็จสิ้น', status: 'completed', icon: CheckCircle }
                ].map((step, index, arr) => {
                  const StepIcon = step.icon;
                  const isActive = statusConfig.step >= index;
                  const isCurrent = step.status === record.status;
                  
                  return (
                    <div key={step.status} className="flex flex-col items-center flex-1 relative group">
                      {/* Connecting Line */}
                      {index < arr.length - 1 && (
                        <div className={`absolute top-4 sm:top-6 left-[60%] w-[80%] h-[2px] z-0 transition-colors duration-1000 ${
                          statusConfig.step > index ? 'bg-white' : 'bg-white/20'
                        }`} />
                      )}
                      
                      <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg relative z-10 ${
                        isCurrent ? 'bg-white text-green-600 scale-110 rotate-3 ring-4 sm:ring-6 ring-white/20' :
                        isActive ? 'bg-white/90 text-green-600' : 'bg-gray-800/50 text-white/30 border border-white/5'
                      }`}>
                        <StepIcon size={statusConfig.step >= index ? 18 : 16} className={isCurrent ? 'animate-pulse' : ''} />
                      </div>
                      <p className={`text-[9px] sm:text-[10px] font-black uppercase mt-2 sm:mt-3 tracking-widest text-center px-1 leading-tight ${
                        isCurrent ? 'text-white' : isActive ? 'text-white/80' : 'text-white/20'
                      }`}>
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <CardContent className="p-0">
          {/* Desktop/Tablet Quick Action Dock - Hidden on Mobile */}
          {record.status !== 'completed' && record.status !== 'cancelled' && (
            <div className="hidden sm:flex bg-gray-800/30 p-4 border-b border-gray-800 flex-wrap gap-3">
              <Button
                onClick={() => setShowStatusModal(true)}
                className="flex-1 min-w-[140px] bg-blue-600 hover:bg-blue-500 text-white h-12 rounded-2xl font-bold gap-2 shadow-lg shadow-blue-900/20"
              >
                {record.status === 'pending' ? <Play size={18} /> : 
                 record.status === 'on_hold' ? <Play size={18} /> : 
                 <CheckCircle size={18} />}
                {record.status === 'pending' ? 'เริ่มงานทันที' : 
                 record.status === 'on_hold' ? 'ทำงานต่อ (Resume)' : 
                 'ปิดงาน (เสร็จสิ้น)'}
              </Button>
              {record.status === 'in_progress' && (
                <Button
                  onClick={() => setShowStatusModal(true)}
                  variant="secondary"
                  className="w-12 h-12 sm:w-auto sm:px-6 rounded-2xl font-bold gap-2"
                >
                  <Pause size={18} />
                  <span className="hidden sm:inline">พักงาน</span>
                </Button>
              )}
              <Button
                onClick={() => setShowStatusModal(true)}
                variant="outline"
                className="px-6 h-12 rounded-2xl border-gray-700 text-gray-400 font-bold hover:text-white"
              >
                <AlertTriangle size={18} />
                <span className="hidden sm:inline">จัดการสถานะอื่น</span>
              </Button>
              {record.status === 'in_progress' && (
                <Button
                  onClick={() => setShowUpdateForm(!showUpdateForm)}
                  variant="ghost"
                  className={`px-6 h-12 rounded-2xl border ${showUpdateForm ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-800 text-gray-500'} font-bold transition-all`}
                >
                  <TrendingUp size={18} className="mr-2" />
                  {showUpdateForm ? 'ยกเลิก' : 'อัปเดตงาน'}
                </Button>
              )}
              {/* Checklist Button */}
              <Button
                onClick={() => setShowChecklistModal(true)}
                variant="ghost"
                className="px-6 h-12 rounded-2xl border border-green-500/30 text-green-400 font-bold hover:bg-green-500/10 transition-all"
              >
                <ClipboardCheck size={18} className="mr-2" />
                Checklist
              </Button>
            </div>
          )}
 
          <div className="p-0.5 sm:p-6 md:p-8 space-y-2 sm:space-y-8">
            {/* Top Stat Row - Horizontally Scrollable on Mobile */}
            <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6 overflow-x-auto pb-1 sm:pb-0 -mx-1 sm:mx-0 px-1 sm:px-0 scrollbar-none">
              {/* Repair Timer */}
              {downtime && (
                <div className="bg-blue-600/10 min-w-[140px] sm:min-w-0 p-3 sm:p-6 rounded-xl sm:rounded-3xl border border-blue-500/20 flex-1">
                  <div className="flex items-center gap-2 text-blue-400 mb-1 sm:mb-4">
                    <Clock size={14} className="sm:size-5" />
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Repair Time</span>
                  </div>
                  <div className="text-xl sm:text-4xl font-black text-white">{downtime}</div>
                </div>
              )}

              {/* Type Card */}
              <div className="bg-purple-600/10 min-w-[140px] sm:min-w-0 p-3 sm:p-6 rounded-xl sm:rounded-3xl border border-purple-500/20 flex-1">
                <div className="flex items-center gap-2 text-purple-400 mb-1 sm:mb-4">
                  <Tag size={14} className="sm:size-5" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Type</span>
                </div>
                <div className="text-xl sm:text-3xl font-black text-white capitalize">{record.maintenance_type}</div>
              </div>

              {/* Cost Center */}
              {record.total_cost > 0 && (
                <div className="bg-green-600/10 min-w-[140px] sm:min-w-0 p-3 sm:p-6 rounded-xl sm:rounded-3xl border border-green-500/20 flex-1">
                  <div className="flex items-center gap-2 text-green-400 mb-1 sm:mb-4">
                    <DollarSign size={14} className="sm:size-5" />
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Total Cost</span>
                  </div>
                  <div className="text-xl sm:text-4xl font-black text-white">{record.total_cost.toLocaleString()} <span className="text-xs text-gray-500">฿</span></div>
                </div>
              )}
            </div>

            {/* Single Column Content Stack on Mobile / Grid on Desktop */}
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3 sm:gap-8">
              {/* Primary Info */}
              <div className="lg:col-span-8 flex flex-col gap-3 sm:gap-6">
                <section className="bg-gray-800/30 rounded-xl sm:rounded-3xl p-2 sm:p-8 border border-gray-800">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-green-500/10 text-green-400 rounded-2xl"><Package size={24} /></div>
                    <div>
                      <h3 className="text-xl font-black text-white">รายละเอียดเครื่องจักร</h3>
                      <p className="text-sm text-gray-500">ข้อมูลและสถานที่ตั้งอุปกรณ์</p>
                    </div>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4 sm:gap-8">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">เครื่องจักร</p>
                      <p className="text-lg font-bold text-white">{record.equipment_name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">รหัสอุปกรณ์</p>
                      <p className="text-lg font-mono font-bold text-green-400">{record.equipment_code}</p>
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-3 p-4 bg-gray-900/50 rounded-2xl border border-gray-800">
                      <MapPin size={20} className="text-blue-400" />
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">สถานที่ตั้ง</p>
                        <p className="text-white font-bold">{record.location}</p>
                      </div>
                    </div>
                  </div>
                </section>
 
                <section className="bg-gray-800/30 rounded-xl sm:rounded-3xl p-2 sm:p-8 border border-gray-800">
                  <div className="flex items-center gap-4 mb-2 sm:mb-6">
                    <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-2xl"><History size={24} /></div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white">รายละเอียดปัญหา</h3>
                      <p className="text-xs sm:text-sm text-gray-500">ปัญหาที่แจ้งและสาเหตุเบื้องต้น</p>
                    </div>
                  </div>
                  <div className="bg-gray-900/50 p-2 sm:p-6 rounded-xl border border-gray-800 text-gray-200 leading-relaxed font-medium text-sm sm:text-base">
                    {record.description}
                  </div>
                  {record.notes && (
                    <div className="mt-2 flex gap-2 p-2 sm:p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                      <AlertTriangle size={20} className="text-purple-400 shrink-0" />
                      <p className="text-[11px] sm:text-xs text-purple-300/80 leading-normal">{record.notes}</p>
                    </div>
                  )}
                </section>

                {/* Repair Report Layer */}
                {record.status === 'completed' && (record.root_cause || record.action_taken) && (
                  <section className="bg-gradient-to-br from-green-500/10 to-transparent rounded-2xl sm:rounded-3xl p-2.5 sm:p-8 border border-green-500/20">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-3 bg-green-500 text-white rounded-2xl shadow-lg shadow-green-900/40"><CheckCircle size={24} /></div>
                      <div>
                        <h3 className="text-2xl font-black text-white tracking-tight">Repair Report</h3>
                        <p className="text-sm text-green-400/70 font-bold uppercase tracking-widest">สรุปผลการซ่อมแซม</p>
                      </div>
                    </div>
                    
                    <div className="grid gap-6">
                      {record.root_cause && (
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-green-400 uppercase tracking-widest bg-green-500/10 px-3 py-1 rounded-full">สาเหตุรากเหง้า (Root Cause)</label>
                          <div className="bg-gray-950/80 p-5 rounded-3xl border border-green-500/10 text-white font-medium leading-relaxed">
                            {record.root_cause}
                          </div>
                        </div>
                      )}
                      {record.action_taken && (
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full">การดำเนินการ (Action Taken)</label>
                          <div className="bg-gray-950/80 p-5 rounded-3xl border border-blue-500/10 text-white font-medium leading-relaxed">
                            {record.action_taken}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Attached Images Gallery */}
                {images.length > 0 && (
                  <section className="bg-gray-800/30 rounded-xl sm:rounded-3xl p-2 sm:p-8 border border-gray-800">
                    <div className="flex items-center gap-4 mb-2 sm:mb-6">
                      <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl"><Camera size={24} /></div>
                      <div>
                        <h3 className="text-xl font-black text-white">รูปภาพประกอบ</h3>
                        <p className="text-sm text-gray-500">ภาพที่บันทึกระหว่างดำเนินการ</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {images.map((img, idx) => (
                        <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-950 border border-gray-800 hover:border-blue-500/50 transition-all cursor-pointer" onClick={() => setPreviewImage(getImageUrl(img.image_url))}>
                          <img 
                            src={getImageUrl(img.image_url)} 
                            alt={`Maintenance ${idx}`} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">{img.image_type || 'Image'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Sidebar Info - Stacked after Primary Info on Mobile */}
              <div className="lg:col-span-4 flex flex-col gap-3 sm:gap-6">
                {/* Team Card - Horizontal on Mobile */}
                <Card className="bg-gray-800/30 border-gray-800 rounded-xl sm:rounded-3xl overflow-hidden shadow-xl">
                  <div className="p-3 sm:p-6 flex sm:flex-col gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center border border-gray-800 shrink-0">
                          {record.created_by_picture ? (
                            <img src={getImageUrl(record.created_by_picture)} alt="" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <span className="text-sm sm:text-xl font-black text-white">{record.created_by_name?.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Reporter</p>
                          <p className="text-white text-xs sm:text-base font-bold leading-tight">{record.created_by_name || 'System'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border border-gray-800 shrink-0">
                          {record.assigned_to_picture ? (
                            <img src={getImageUrl(record.assigned_to_picture)} alt="" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <span className="text-sm sm:text-xl font-black text-white">{record.assigned_to_name?.charAt(0) || '?'}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Technician</p>
                          <p className="text-white text-xs sm:text-base font-bold leading-tight">{record.assigned_to_name || 'Unassigned'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="hidden sm:block border-t border-gray-800 pt-4">
                      <p className="text-gray-500 text-[10px] font-bold text-center">ID: {record.id}</p>
                    </div>
                  </div>
                </Card>

                {/* Mini Timeline Tracker */}
                <div className="bg-gray-800/20 rounded-xl sm:rounded-3xl p-2 sm:p-6 border border-gray-800">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                       <History size={16} /> History Log
                    </h3>
                  </div>
                  
                  <div className="space-y-6">
                    {timeline.length > 0 ? (
                      timeline.map((item, index) => {
                        const isLast = index === timeline.length - 1;
                        const statusInfo = getStatusConfig(item.status);
                        
                        // Find images related to this timeline event (within 5 seconds)
                        const eventImages = images.filter(img => {
                          const eventTime = new Date(item.created_at).getTime();
                          const imgTime = new Date(img.uploaded_at).getTime();
                          return Math.abs(eventTime - imgTime) < 5000;
                        });
                        
                        return (
                          <div key={index} className="flex gap-4 group">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-xl ${statusInfo.color} border flex items-center justify-center p-1 transition-transform group-hover:scale-110`}>
                                <statusInfo.icon size={14} />
                              </div>
                              {!isLast && <div className="w-0.5 flex-1 bg-gray-800 mt-2"></div>}
                            </div>
                            <div className="flex-1 pb-6">
                              <div className="flex justify-between items-start mb-0.5">
                                <p className={`text-xs font-black uppercase tracking-wider text-white`}>{statusInfo.label}</p>
                                <p className="text-[9px] font-bold text-gray-600">{formatRelativeTime(item.created_at)}</p>
                              </div>
                              <p className="text-[10px] text-gray-500 font-bold mb-1">By {item.changed_by_name || 'System'}</p>
                              {item.notes && <p className="text-[10px] text-gray-300 bg-gray-950 p-2 rounded-lg italic leading-relaxed">"{item.notes}"</p>}
                              
                              {/* Display event-specific images */}
                              {eventImages.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {eventImages.map((img, i) => (
                                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-800 cursor-pointer" onClick={() => setPreviewImage(getImageUrl(img.image_url))}>
                                      <img src={getImageUrl(img.image_url)} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <History size={32} className="text-gray-800 mx-auto mb-2" />
                        <p className="text-xs text-gray-600 font-bold">No history available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Cancel/Hold Alert Layer */}
            {(record.cancelled_reason || record.on_hold_reason) && (
              <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-8 border-2 shadow-2xl animate-pulse ${
                record.cancelled_reason 
                  ? 'bg-red-500/10 border-red-500/20' 
                  : 'bg-orange-500/10 border-orange-500/20'
              }`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-4 rounded-2xl ${record.cancelled_reason ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                    {record.cancelled_reason ? <XCircle size={32} /> : <Pause size={32} />}
                  </div>
                  <div>
                    <h3 className={`text-2xl font-black ${record.cancelled_reason ? 'text-red-400' : 'text-orange-400'}`}>
                      {record.cancelled_reason ? 'รายการถูกยกเลิก' : 'พักงานชั่วคราว'}
                    </h3>
                    <p className="text-sm font-bold opacity-60">ระบุโดย {timeline.slice().reverse().find(t => t.status === (record.cancelled_reason ? 'cancelled' : 'on_hold'))?.changed_by_name || 'Administrator'}</p>
                  </div>
                </div>
                <div className="bg-gray-950/50 p-6 rounded-2xl border border-gray-800 italic text-white font-medium">
                  "{record.cancelled_reason || record.on_hold_reason}"
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {/* Closing Panel */}
        <div className="p-2 sm:p-6 bg-gray-900 border-t border-gray-800">
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-all shadow-hover"
          >
            Close Detail
          </Button>
        </div>
      </Card>
      </div>

      {/* Mobile Sticky Bottom Action Bar - NOW outside the scrolling content */}
      {record.status !== 'completed' && record.status !== 'cancelled' && (
        <div className="fixed bottom-0 left-0 right-0 z-[70] bg-gray-900/90 backdrop-blur-3xl border-t border-gray-800 p-4 pb-8 flex gap-3 sm:hidden animate-in slide-in-from-bottom duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
          <Button
            onClick={() => setShowStatusModal(true)}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white h-14 rounded-2xl font-black gap-2 shadow-lg shadow-green-900/40 text-base"
          >
            {record.status === 'pending' ? <Play size={20} /> : 
             record.status === 'on_hold' ? <Play size={20} /> : 
             <CheckCircle size={20} />}
            {record.status === 'pending' ? 'เริ่มงาน' : 
             record.status === 'on_hold' ? 'ทำงานต่อ' : 
             'ปิดงาน'}
          </Button>
          {record.status === 'in_progress' && (
            <Button
              onClick={() => setShowStatusModal(true)}
              variant="secondary"
              className="bg-gray-800 text-white w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-gray-700 active:scale-90 transition-transform"
            >
              <Pause size={24} />
            </Button>
          )}
          <Button
            onClick={() => setShowUpdateForm(!showUpdateForm)}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all border active:scale-90 ${showUpdateForm ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-blue-400'}`}
          >
            <TrendingUp size={24} />
          </Button>
        </div>
      )}
    </div>

      {/* Progress Update Modal - Full Screen on Mobile */}
      {showUpdateForm && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black animate-in fade-in duration-200">
          {/* Header */}
          <header className="flex-none bg-zinc-950 border-b border-zinc-800/50">
            <div className="flex items-center h-16 px-4">
              <button 
                onClick={() => setShowUpdateForm(false)}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 transition-all"
              >
                <X size={24} className="text-zinc-400" />
              </button>
              <div className="flex-1 ml-4">
                <h1 className="text-lg font-semibold text-white">อัปเดตความคืบหน้า</h1>
                <p className="text-sm text-zinc-500">{record.work_order}</p>
              </div>
            </div>
          </header>

          {/* Form Content */}
          <form onSubmit={handleProgressUpdate} className="flex-1 overflow-y-auto p-4 pb-32 space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">
                ข้อความอัปเดต <span className="text-red-500">*</span>
              </label>
              <textarea
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                placeholder="พิมพ์ความคืบหน้าของงาน เช่น กำลังรื้อสายพาน, ตรวจพบลูกปืนแตกเพิ่มเติม..."
                className="w-full h-40 px-4 py-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl text-white text-base focus:outline-none focus:border-sky-500 resize-none"
                required
                autoFocus
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-zinc-400">แนบรูปภาพ</label>
              
              <div className="grid grid-cols-4 gap-2">
                {updateImagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
                    <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                    <button 
                      type="button"
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
                  <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-600 active:scale-95 transition-all">
                    <Camera size={24} className="text-zinc-500" />
                    <span className="text-xs text-zinc-500 mt-1">เพิ่ม</span>
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
              
              {updateImages.length > 0 && (
                <p className="text-xs text-zinc-500">{updateImages.length} / 5 รูป</p>
              )}
            </div>
          </form>

          {/* Footer Actions */}
          <footer className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800/50 p-4 pb-8">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowUpdateForm(false)}
                className="flex-1 h-14 rounded-xl bg-zinc-800 text-zinc-300 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <X size={20} />
                ยกเลิก
              </button>
              <button
                onClick={handleProgressUpdate}
                disabled={isUpdating || !updateNotes.trim()}
                className="flex-[2] h-14 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg disabled:bg-zinc-700 disabled:cursor-not-allowed"
              >
                {isUpdating ? (
                  <>
                    <Clock className="animate-spin" size={20} />
                    กำลังส่ง...
                  </>
                ) : (
                  <>
                    <TrendingUp size={20} />
                    บันทึกข้อมูล
                  </>
                )}
              </button>
            </div>
          </footer>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <StatusUpdateModal
          record={record}
          userId={userId}
          onClose={() => setShowStatusModal(false)}
          onUpdate={handleStatusUpdate}
        />
      )}

      {/* Checklist Modal */}
      {showChecklistModal && (
        <ChecklistModal
          maintenanceRecordId={recordId}
          equipmentId={record.equipment_id}
          userId={userId}
          onClose={() => setShowChecklistModal(false)}
          onSuccess={() => {
            setShowChecklistModal(false);
            fetchRecordDetail();
          }}
        />
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300"
          onClick={() => setPreviewImage(null)}
        >
          <div className="absolute top-6 right-6 flex gap-4">
            <button 
              onClick={() => window.open(previewImage, '_blank')}
              className="p-3 rounded-full bg-gray-800/80 text-white hover:bg-gray-700 transition-all border border-gray-700"
              title="Open in original size"
            >
              <ArrowRight className="w-6 h-6 -rotate-45" />
            </button>
            <button 
              onClick={() => setPreviewImage(null)}
              className="p-3 rounded-full bg-red-600/80 text-white hover:bg-red-700 transition-all border border-red-500/50 shadow-lg shadow-red-600/20"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden rounded-2xl shadow-2xl border border-gray-800 bg-gray-900/50">
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-[95vw] max-h-[85vh] object-contain animate-in zoom-in duration-300"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default MaintenanceDetail;

import { useState, useEffect, useMemo } from 'react';
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
  ArrowLeft
} from 'lucide-react';
import { usageAPI, equipmentAPI } from '../services/api';
import { formatThaiDateTime } from '../lib/utils';

export default function UsageLog() {
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
        equipmentAPI.getById(eq.id),
        usageAPI.getByEquipment(eq.id)
      ]);
      
      const freshEquipment = equipmentRes.equipment || eq;
      
      // Maintenance schedules come with equipment from backend
      setMaintenanceSchedules(freshEquipment.maintenance_schedules || eq.maintenance_schedules || []);
      
      // Usage logs from API
      setUsageLogs(logsRes.logs || []);
      
      setSelectedEquipment(freshEquipment);
      setInputValue('');
      setInputMode('used');
      setEditingLog(null);
    } catch (error) {
      console.error('Error fetching details:', error);
      // Fallback to using existing data
      setMaintenanceSchedules(eq.maintenance_schedules || []);
      setUsageLogs([]);
      setSelectedEquipment(eq);
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

  const handleSaveUsage = async (value) => {
    if (!value || value <= 0 || !selectedEquipment) return;
    
    setSaving(true);
    try {
      // Calculate new total usage
      const newTotalUsage = inputMode === 'current' ? value : currentUsage + value;
      
      await usageAPI.create({
        equipment_id: selectedEquipment.id,
        usage_value: newTotalUsage,  // Send total value, not incremental
        notes: null
      });
      
      // PM check is now handled by backend automatically
      
      await fetchEquipmentDetails(selectedEquipment);
      await fetchEquipment();
      setInputValue('');
    } catch (error) {
      console.error('Error saving usage:', error);
      alert(error.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
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
        equipment_id: selectedEquipment.id,
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

  // Equipment List View
  const renderEquipmentList = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Gauge className="w-8 h-8 text-green-500" />
              บันทึกการใช้งาน
            </h1>
            <p className="text-gray-400 mt-1">Usage Log</p>
          </div>
        </div>
      </div>

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
                key={eq.id}
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
                        <Gauge className={`w-6 h-6 ${
                          mostUrgent?.isOverdue 
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
                            className={`h-full rounded-full transition-all ${
                              getProgressColor(mostUrgent.remaining, parseFloat(mostUrgent.schedule.interval_value))
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
                          toggleListProgress(eq.id);
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
                                  <span className={`text-xs font-medium ${
                                    calc.isOverdue ? 'text-red-400' : calc.isDue ? 'text-amber-400' : 'text-green-400'
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
  );

  // Equipment Detail View
  const renderEquipmentDetail = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-800 pb-6">
        <Button variant="ghost" size="icon" onClick={() => setSelectedEquipment(null)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <p className="text-gray-500 text-sm">บันทึกการใช้งาน</p>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{selectedEquipment.equipment_name || selectedEquipment.name}</h1>
            {selectedEquipment.equipment_code && (
              <span className="text-sm text-gray-500 font-mono">({selectedEquipment.equipment_code})</span>
            )}
          </div>
          {(selectedEquipment.location || selectedEquipment.equipment_type) && (
            <p className="text-sm text-gray-500 mt-1">
              {selectedEquipment.location && <span>📍 {selectedEquipment.location}</span>}
              {selectedEquipment.location && selectedEquipment.equipment_type && <span className="mx-2">•</span>}
              {selectedEquipment.equipment_type && <span>🏭 {selectedEquipment.equipment_type}</span>}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-sm">ชั่วโมงสะสม</p>
          <p className="text-2xl font-bold text-green-400">{parseFloat(currentUsage).toLocaleString()} <span className="text-base text-gray-400">ชม.</span></p>
        </div>
      </div>

      {/* Input Section */}
      <Card className="border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-500" />
            เพิ่มชั่วโมงการใช้งาน
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex p-1 bg-gray-800 rounded-lg">
            <button
              onClick={() => setInputMode('used')}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                inputMode === 'used'
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
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                inputMode === 'current'
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
          <div className="relative">
            <Input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={inputMode === 'used' ? 'ใช้ไปกี่ชั่วโมง?' : 'อ่านมิเตอร์ได้เท่าไหร่?'}
              className="text-center text-xl font-bold h-14 bg-gray-900 border-gray-700 pr-16"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">ชม.</span>
          </div>
          
          {/* Preview of new total or difference */}
          {inputValue && parseFloat(inputValue) > 0 && (
            <div className="bg-gray-900/50 rounded-lg p-3 text-center">
              {inputMode === 'current' ? (
                <>
                  <span className="text-gray-400 text-sm">เพิ่มมา: </span>
                  <span className={`font-bold text-lg ${parseFloat(inputValue) - currentUsage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {parseFloat(inputValue) - currentUsage >= 0 ? '+' : ''}{(parseFloat(inputValue) - currentUsage).toLocaleString()} ชม.
                  </span>
                </>
              ) : (
                <>
                  <span className="text-gray-400 text-sm">ค่าใหม่จะเป็น: </span>
                  <span className="text-green-400 font-bold text-lg">
                    {(currentUsage + parseFloat(inputValue)).toLocaleString()} ชม.
                  </span>
                </>
              )}
            </div>
          )}

          {/* Warning if meter value is less than current */}
          {inputMode === 'current' && inputValue && parseFloat(inputValue) < currentUsage && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
              <span className="text-red-400 text-sm">⚠️ ค่ามิเตอร์ต้องไม่น้อยกว่าค่าปัจจุบัน ({currentUsage.toLocaleString()} ชม.)</span>
            </div>
          )}
          
          {/* Save Button */}
          <Button
            onClick={() => handleSaveUsage(parseFloat(inputValue))}
            disabled={
              saving || 
              !inputValue || 
              parseFloat(inputValue) <= 0 ||
              (inputMode === 'current' && parseFloat(inputValue) < currentUsage)
            }
            className="w-full h-12 text-lg font-medium"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                กำลังบันทึก...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-5 h-5" />
                บันทึก
              </div>
            )}
          </Button>
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
                { label: 'ประเภท', value: selectedEquipment.category },
                { label: 'สถานที่', value: selectedEquipment.location },
                { label: 'รุ่น', value: selectedEquipment.model },
                { label: 'รหัสเครื่อง', value: selectedEquipment.serial_number },
              ].map((item, i) => (
                <div key={i} className="bg-gray-900/50 rounded-lg p-3">
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
                      <span className={`font-medium ${
                        calc.isOverdue 
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
            <div className="space-y-2">
              {usageLogs.slice(0, 10).map((log, index, arr) => {
                const isLatest = index === 0;
                const isEditing = editingLog?.id === log.id;
                
                // คำนวณค่าที่เพิ่มขึ้นจากรายการก่อนหน้า
                const currentValue = parseFloat(log.usage_value) || 0;
                const previousLog = arr[index + 1]; // รายการก่อนหน้า (เรียงจากใหม่ไปเก่า)
                const previousValue = previousLog ? parseFloat(previousLog.usage_value) || 0 : 0;
                const difference = currentValue - previousValue;
                
                return (
                  <div key={log.id} className="p-3 rounded-lg bg-gray-900/50 hover:bg-gray-900 transition-colors">
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
                      <div className="flex items-center gap-4">
                        <div className={`
                          w-10 h-10 rounded-lg flex items-center justify-center
                          ${isLatest ? 'bg-green-500/10' : 'bg-gray-800'}
                        `}>
                          <Activity className={`w-5 h-5 ${isLatest ? 'text-green-400' : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-white">
                              {currentValue.toLocaleString()}
                            </span>
                            <span className="text-gray-500">ชม.</span>
                            {previousLog && difference > 0 && (
                              <span className="text-sm text-green-400 font-medium">
                                (+{difference.toLocaleString()})
                              </span>
                            )}
                            {isLatest && (
                              <Badge className="bg-green-500/10 text-green-400 border-green-500/30">
                                ล่าสุด
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            📅 {log.log_date ? new Date(log.log_date).toLocaleDateString('th-TH', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            }) : '-'}
                            {log.created_at && (
                              <span className="ml-2">
                                🕐 {new Date(log.created_at).toLocaleTimeString('th-TH', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            )}
                          </p>
                        </div>
                        {isLatest && (
                          <button
                            onClick={() => handleStartEdit(log)}
                            className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
                          >
                            <Pencil className="w-4 h-4 text-gray-400" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return selectedEquipment ? renderEquipmentDetail() : renderEquipmentList();
}

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Search, Package, CheckCircle, AlertTriangle, RefreshCcw, Calendar, Power, Wrench, Clock, MapPin, HelpCircle, ChevronRight, Eye, Settings2, Zap } from 'lucide-react';
import { equipmentAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import MaintenanceForm from './MaintenanceForm';

const EquipmentManagement = ({ profile }) => {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSchedulesModal, setShowSchedulesModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('active');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [showTips, setShowTips] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ interval_value: '', start_from_usage: '', description: '' });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [formData, setFormData] = useState({
    equipment_code: '',
    equipment_type: '',
    equipment_name: '',
    description: '',
    location: '',
    maintenance_unit: '',
    initial_usage: '',
    current_usage: '',
    maintenance_interval: '',
    maintenance_schedules: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Maintenance Request State
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [maintenanceInitialData, setMaintenanceInitialData] = useState(null);

  const handleRequestMaintenance = (schedule) => {
    setMaintenanceInitialData({
      equipmentId: selectedEquipment.equipment_id,
      maintenanceType: 'routine',
      title: 'PM: ' + (schedule.description || 'Maintenance Schedule'),
      description: `Preventive Maintenance for schedule: ${schedule.description || 'Regular check'}`,
      scheduleId: schedule.id
    });
    setShowMaintenanceForm(true);
  };

  const equipmentTypes = [
    { value: 'conveyor', label: 'สายพาน', icon: '🔄' },
    { value: 'crusher', label: 'เครื่องบด', icon: '⚙️' },
    { value: 'feeder', label: 'เครื่องป้อน', icon: '📥' },
    { value: 'screen', label: 'ตะแกรง', icon: '📊' },
    { value: 'pump', label: 'ปั๊ม', icon: '💧' },
    { value: 'motor', label: 'มอเตอร์', icon: '🔌' },
    { value: 'generator', label: 'เครื่องปั่นไฟ', icon: '⚡' },
    { value: 'compressor', label: 'เครื่องอัด', icon: '🌀' },
    { value: 'other', label: 'อื่นๆ', icon: '📦' }
  ];

  const getMaintenanceUnitLabel = (unit, short = true) => {
    const labels = {
      kilometers: short ? 'กม.' : 'กิโลเมตร',
      hours: short ? 'ชม.' : 'ชั่วโมง',
      cycles: short ? 'รอบ' : 'รอบการใช้งาน',
      days: short ? 'วัน' : 'วัน'
    };
    return labels[unit] || unit;
  };

  const getMaintenanceStatus = (item) => {
    // If backend provided a direct status (like from /api/pm-status) we can respect it here if mapped
    if (item.status === 'overdue') return { status: 'overdue', label: 'เกินกำหนด!', color: 'red', remaining: 0 };
    if (item.status === 'approaching') return { status: 'close', label: 'ใกล้ถึงกำหนด', color: 'yellow', remaining: null };
    if (item.status === 'warning') return { status: 'close', label: 'ใกล้ถึงกำหนด', color: 'yellow', remaining: null };

    if (!item.maintenance_unit || !item.maintenance_schedules || item.maintenance_schedules.length === 0) {
      return { status: 'none', label: 'ยังไม่ตั้งค่า', color: 'gray', remaining: null };
    }

    const currentUsage = parseFloat(item.current_usage) || 0;
    let worstStatus = { status: 'ok', label: 'ปกติ', color: 'green', remaining: Infinity };

    for (const schedule of item.maintenance_schedules) {
      const startFrom = parseFloat(schedule.start_from_usage) || 0;
      const interval = parseFloat(schedule.interval_value) || 0;
      if (interval <= 0) continue;

      const usageFromStart = currentUsage - startFrom;
      const completedCycles = Math.floor(usageFromStart / interval);
      const nextDue = startFrom + ((completedCycles + 1) * interval);
      const remaining = nextDue - currentUsage;

      const currentUsagePercentage = (interval - remaining) / interval;
      const reached80Percent = currentUsagePercentage >= 0.8;

      if (remaining < 0) {
        return { status: 'overdue', label: 'เกินกำหนด!', color: 'red', remaining: Math.abs(remaining) };
      } else if (reached80Percent || remaining <= interval * 0.2 || remaining <= 24) {
        // Fallback frontend mirror: checks 80%, interval * 20%, or absolute 24 remaining.
        if (worstStatus.status !== 'overdue' && remaining < worstStatus.remaining) {
          worstStatus = { status: 'close', label: 'ใกล้ถึงกำหนด', color: 'yellow', remaining };
        }
      } else if (remaining < worstStatus.remaining) {
        worstStatus = { status: 'ok', label: 'ปกติ', color: 'green', remaining };
      }
    }

    return worstStatus;
  };

  const getEquipmentIcon = (type) => {
    const found = equipmentTypes.find(t => t.value === type);
    return found?.icon || '📦';
  };

  useEffect(() => {
    fetchEquipment();
    // ซ่อน tips หลังจากผู้ใช้มีเครื่องจักร 3 ตัวขึ้นไป
    const hideTips = localStorage.getItem('hideEquipmentTips');
    if (hideTips) setShowTips(false);
  }, [filterActive]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      // Always fetch all equipment, filter on client side
      const data = await equipmentAPI.getAll(true);
      setEquipment(data.equipment || []);
    } catch (err) {
      console.error('Error fetching equipment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ต้องอยู่ step 2 ถึงจะ submit ได้
    if (currentStep !== 2) {
      console.log('Not on step 2, moving to step 2 instead of submitting');
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingEquipment) {
        await equipmentAPI.update(editingEquipment.equipment_id, formData);
      } else {
        await equipmentAPI.create(formData);
      }

      setShowModal(false);
      resetForm();
      fetchEquipment();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setEditingEquipment(item);
    setFormData({
      equipment_code: item.equipment_code || '',
      equipment_type: item.equipment_type || '',
      equipment_name: item.equipment_name || '',
      description: item.description || '',
      location: item.location || '',
      maintenance_unit: item.maintenance_unit || '',
      initial_usage: item.initial_usage || '',
      current_usage: item.current_usage || '',
      maintenance_interval: item.maintenance_schedules?.[0]?.interval_value || '',
      maintenance_schedules: item.maintenance_schedules || []
    });
    setCurrentStep(1);
    setShowModal(true);
  };

  const handleDelete = async (item) => {
    if (!confirm(`คุณต้องการลบเครื่องจักร "${item.equipment_name || item.equipment_code}" หรือไม่?\n\nการลบจะไม่สามารถกู้คืนได้`)) {
      return;
    }

    try {
      await equipmentAPI.delete(item.equipment_id, true);
      fetchEquipment();
    } catch (err) {
      // If hard delete fails (has maintenance records), fall back to soft delete
      if (err.message?.includes('maintenance records')) {
        if (confirm('เครื่องจักรนี้มีประวัติการซ่อมบำรุง ไม่สามารถลบออกได้\n\nต้องการปิดการใช้งานแทนหรือไม่?')) {
          try {
            await equipmentAPI.delete(item.equipment_id, false);
            fetchEquipment();
          } catch (fallbackErr) {
            alert(fallbackErr.message);
          }
        }
      } else {
        alert(err.message);
      }
    }
  };

  const handleToggle = async (item) => {
    try {
      await equipmentAPI.toggle(item.equipment_id);
      fetchEquipment();
    } catch (err) {
      alert(err.message);
    }
  };

  const _handleOpenSchedules = (item) => {
    setSelectedEquipment(item);
    setIsAddingSchedule(false);
    setNewSchedule({ interval_value: '', start_from_usage: '', description: '' });
    setShowSchedulesModal(true);
  };

  // เพิ่มรอบบำรุงรักษาใหม่
  const handleAddSchedule = async () => {
    if (!newSchedule.interval_value || parseFloat(newSchedule.interval_value) <= 0) {
      alert('กรุณากรอกค่าความถี่ที่มากกว่า 0');
      return;
    }

    setSavingSchedule(true);
    try {
      const updatedSchedules = [
        ...(selectedEquipment.maintenance_schedules || []),
        {
          interval_value: parseFloat(newSchedule.interval_value),
          start_from_usage: parseFloat(newSchedule.start_from_usage) || 0,
          description: newSchedule.description || ''
        }
      ];

      await equipmentAPI.update(selectedEquipment.equipment_id, {
        ...selectedEquipment,
        maintenance_schedules: updatedSchedules
      });

      // Refresh data
      await fetchEquipment();

      // Update selectedEquipment with new data
      const updatedData = await equipmentAPI.getAll(filterActive === 'inactive');
      const updated = (updatedData.equipment || []).find(e => e.equipment_id === selectedEquipment.equipment_id);
      if (updated) {
        setSelectedEquipment(updated);
      }

      setIsAddingSchedule(false);
      setNewSchedule({ interval_value: '', start_from_usage: '', description: '' });
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  // ลบรอบบำรุงรักษา
  const handleDeleteSchedule = async (scheduleIndex) => {
    if (!confirm('ต้องการลบรอบบำรุงรักษานี้หรือไม่?')) return;

    setSavingSchedule(true);
    try {
      const updatedSchedules = selectedEquipment.maintenance_schedules.filter((_, idx) => idx !== scheduleIndex);

      await equipmentAPI.update(selectedEquipment.equipment_id, {
        ...selectedEquipment,
        maintenance_schedules: updatedSchedules
      });

      // Refresh data
      await fetchEquipment();

      // Update selectedEquipment with new data
      const updatedData = await equipmentAPI.getAll(filterActive === 'inactive');
      const updated = (updatedData.equipment || []).find(e => e.equipment_id === selectedEquipment.equipment_id);
      if (updated) {
        setSelectedEquipment(updated);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  const resetForm = () => {
    setFormData({
      equipment_code: '',
      equipment_type: '',
      equipment_name: '',
      description: '',
      location: '',
      maintenance_unit: '',
      initial_usage: '',
      current_usage: '',
      maintenance_interval: '',
      maintenance_schedules: []
    });
    setEditingEquipment(null);
    setCurrentStep(1);
    setError(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const hideTipsForever = () => {
    localStorage.setItem('hideEquipmentTips', 'true');
    setShowTips(false);
  };

  // รวบรวมสถานที่ทั้งหมดจาก equipment
  const allLocations = [...new Set(equipment.map(e => e.location).filter(Boolean))];

  const filteredEquipment = equipment.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      item.equipment_code?.toLowerCase().includes(searchLower) ||
      item.equipment_name?.toLowerCase().includes(searchLower) ||
      item.equipment_type?.toLowerCase().includes(searchLower) ||
      item.location?.toLowerCase().includes(searchLower)
    );

    // Filter by active status
    const matchesActive = filterActive === 'all' ||
      (filterActive === 'active' && item.is_active) ||
      (filterActive === 'inactive' && !item.is_active);

    // Filter by maintenance status
    const status = getMaintenanceStatus(item).status;
    const matchesStatus = filterStatus === 'all' || status === filterStatus;

    // Filter by equipment type
    const matchesType = filterType === 'all' || item.equipment_type === filterType;

    // Filter by location
    const matchesLocation = filterLocation === 'all' || item.location === filterLocation;

    return matchesSearch && matchesActive && matchesStatus && matchesType && matchesLocation;
  });

  // แยกเครื่องจักรตามสถานะ
  const overdueEquipment = filteredEquipment.filter(e => getMaintenanceStatus(e).status === 'overdue');
  const closeEquipment = filteredEquipment.filter(e => getMaintenanceStatus(e).status === 'close');
  const okEquipment = filteredEquipment.filter(e => {
    const status = getMaintenanceStatus(e).status;
    return status !== 'overdue' && status !== 'close';
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">กำลังโหลดข้อมูลเครื่องจักร...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
            </div>
            จัดการเครื่องจักร
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">เพิ่มและจัดการเครื่องจักรสำหรับติดตามการบำรุงรักษา</p>
        </div>
      </div>

      {/* Quick Tips for New Users */}
      {showTips && equipment.length < 3 && (
        <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg mt-0.5">
                  <HelpCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">เริ่มต้นใช้งาน</h3>
                  <p className="text-gray-400 text-sm">
                    เพิ่มเครื่องจักรของคุณเพื่อเริ่มติดตามการบำรุงรักษา ระบบจะแจ้งเตือนเมื่อถึงกำหนดซ่อมบำรุง
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                      <span className="mr-1">1️⃣</span> เพิ่มเครื่องจักร
                    </Badge>
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                      <span className="mr-1">2️⃣</span> ตั้งค่ารอบบำรุงรักษา
                    </Badge>
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                      <span className="mr-1">3️⃣</span> รับการแจ้งเตือน
                    </Badge>
                  </div>
                </div>
              </div>
              <button
                onClick={hideTipsForever}
                className="text-gray-500 hover:text-gray-300 p-1"
                title="ซ่อนคำแนะนำ"
              >
                <X size={18} />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {equipment.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-colors cursor-pointer" onClick={() => setSearchTerm('')}>
            <CardContent className="p-4 min-h-[80px] flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-white">{equipment.length}</div>
              <div className="text-xs text-gray-500 mt-1 text-center">เครื่องจักรทั้งหมด</div>
            </CardContent>
          </Card>
          <Card className={`border-gray-800 hover:border-green-500/50 transition-colors cursor-pointer ${okEquipment.length > 0 ? 'bg-green-500/5' : 'bg-gray-900/50'}`}>
            <CardContent className="p-4 min-h-[80px] flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-green-400">{equipment.filter(e => e.is_active && getMaintenanceStatus(e).status === 'ok').length}</div>
              <div className="text-xs text-gray-500 mt-1 text-center">สถานะปกติ</div>
            </CardContent>
          </Card>
          <Card className={`border-gray-800 hover:border-yellow-500/50 transition-colors cursor-pointer ${closeEquipment.length > 0 ? 'bg-yellow-500/5' : 'bg-gray-900/50'}`}>
            <CardContent className="p-4 min-h-[80px] flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-yellow-400">{closeEquipment.length}</div>
              <div className="text-xs text-gray-500 mt-1 text-center">ใกล้ถึงกำหนด</div>
            </CardContent>
          </Card>
          <Card className={`border-gray-800 hover:border-red-500/50 transition-colors cursor-pointer ${overdueEquipment.length > 0 ? 'bg-red-500/5 animate-pulse' : 'bg-gray-900/50'}`}>
            <CardContent className="p-4 min-h-[80px] flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-red-400">{overdueEquipment.length}</div>
              <div className="text-xs text-gray-500 mt-1 text-center">เกินกำหนด</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alert for Overdue */}
      {overdueEquipment.length > 0 && (
        <Card className="bg-red-500/10 border-red-500/30 animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-400">⚠️ มีเครื่องจักรที่เกินกำหนดบำรุงรักษา!</h3>
                <p className="text-gray-400 text-sm mt-1">
                  {overdueEquipment.map(e => e.equipment_name || e.equipment_code).join(', ')}
                </p>
              </div>
              <span className="text-xs text-red-300 bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2">
                โปรดติดต่อผู้ดูแลเพื่อจัดการรอบบำรุงรักษา
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Add */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="🔍 ค้นหาเครื่องจักร..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-white pl-12 pr-4 py-3 rounded-xl text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
        </div>
        <Button variant="ghost" size="icon" onClick={fetchEquipment} className="border border-gray-800">
          <RefreshCcw className="w-5 h-5" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Active/Inactive Filter */}
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-white px-4 py-2.5 rounded-xl text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none"
        >
          <option value="active">🟢 เปิดใช้งาน</option>
          <option value="inactive">⚫ ปิดใช้งาน</option>
          <option value="all">📋 ทั้งหมด</option>
        </select>
        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-white px-4 py-2.5 rounded-xl text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none"
        >
          <option value="all">📊 สถานะทั้งหมด</option>
          <option value="ok">✅ ปกติ</option>
          <option value="close">⚠️ ใกล้ครบกำหนด</option>
          <option value="overdue">🔴 เกินกำหนด</option>
          <option value="none">⚪ ยังไม่ตั้งค่า</option>
        </select>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-white px-4 py-2.5 rounded-xl text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none"
        >
          <option value="all">🏭 ประเภททั้งหมด</option>
          {equipmentTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.icon} {type.label}
            </option>
          ))}
        </select>

        {/* Location Filter */}
        {allLocations.length > 0 && (
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="bg-gray-900 border border-gray-800 text-white px-4 py-2.5 rounded-xl text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none"
          >
            <option value="all">📍 สถานที่ทั้งหมด</option>
            {allLocations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        )}

        {/* Clear Filters */}
        {(filterStatus !== 'all' || filterType !== 'all' || filterLocation !== 'all') && (
          <button
            onClick={() => {
              setFilterStatus('all');
              setFilterType('all');
              setFilterLocation('all');
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl text-sm transition-colors"
          >
            <X className="w-4 h-4" />
            ล้างตัวกรอง
          </button>
        )}

        {/* Active filter count */}
        {(filterStatus !== 'all' || filterType !== 'all' || filterLocation !== 'all') && (
          <Badge className="bg-green-500/10 text-green-400 border-green-500/30 self-center">
            กรอง {filteredEquipment.length} จาก {equipment.length} รายการ
          </Badge>
        )}
      </div>

      {/* Add Equipment Button - Large & Prominent */}
      <Button
        onClick={openCreateModal}
        className="w-full py-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-lg font-semibold rounded-xl shadow-lg shadow-blue-500/20"
      >
        <Plus className="w-6 h-6 mr-2" />
        เพิ่มเครื่องจักรใหม่
      </Button>

      {/* Equipment List */}
      <div className="space-y-3">
        {filteredEquipment.length === 0 ? (
          <Card className="p-12 text-center bg-gray-950/50 border-dashed border-gray-800">
            <div className="text-6xl mb-4">🏭</div>
            <CardTitle className="text-gray-500 text-xl">ยังไม่มีเครื่องจักร</CardTitle>
            <p className="text-gray-600 text-sm mt-2 max-w-md mx-auto">
              {searchTerm ? 'ไม่พบเครื่องจักรที่ตรงกับคำค้นหา' : 'เริ่มต้นด้วยการเพิ่มเครื่องจักรตัวแรกของคุณ เพื่อติดตามการบำรุงรักษา'}
            </p>
            {!searchTerm && (
              <Button onClick={openCreateModal} className="mt-6 bg-blue-600 hover:bg-blue-500">
                <Plus className="w-5 h-5 mr-2" />
                เพิ่มเครื่องจักรตัวแรก
              </Button>
            )}
          </Card>
        ) : (
          filteredEquipment.map((item, index) => {
            const maintenanceStatus = getMaintenanceStatus(item);
            const itemKey = item.equipment_id || item.id || item.equipment_code || `equipment-${index}`;

            return (
              <Card
                key={itemKey}
                className={`transition-all hover:shadow-lg ${!item.is_active ? 'opacity-50' : ''} ${maintenanceStatus.status === 'overdue'
                  ? 'border-red-500/50 bg-red-500/5 shadow-red-500/10'
                  : maintenanceStatus.status === 'close'
                    ? 'border-yellow-500/50 bg-yellow-500/5'
                    : 'border-gray-800 hover:border-gray-700'
                  }`}
              >
                <CardContent className="p-0">
                  {/* Main Content */}
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`text-3xl sm:text-4xl p-2 rounded-xl ${item.is_active
                        ? maintenanceStatus.status === 'overdue' ? 'bg-red-500/10' :
                          maintenanceStatus.status === 'close' ? 'bg-yellow-500/10' :
                            'bg-blue-500/10'
                        : 'bg-gray-800'
                        }`}>
                        {getEquipmentIcon(item.equipment_type)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-bold text-white text-lg truncate">
                            {item.equipment_name || item.equipment_code}
                          </h3>
                          {item.source === 'system' && (
                            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">🔒 ระบบ</Badge>
                          )}
                          {!item.is_active && (
                            <Badge className="bg-gray-700 text-gray-400 text-xs">ปิดใช้งาน</Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                          <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-400 text-xs">
                            {item.equipment_code}
                          </span>
                          {item.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {item.location}
                            </span>
                          )}
                        </div>

                        {/* Maintenance Status */}
                        {item.maintenance_unit && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Badge
                              className={`text-xs ${maintenanceStatus.status === 'overdue'
                                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                : maintenanceStatus.status === 'close'
                                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                  : maintenanceStatus.status === 'ok'
                                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                    : 'bg-gray-700 text-gray-400'
                                }`}
                            >
                              {maintenanceStatus.status === 'overdue' && '🔴 '}
                              {maintenanceStatus.status === 'close' && '🟡 '}
                              {maintenanceStatus.status === 'ok' && '🟢 '}
                              {maintenanceStatus.label}
                            </Badge>
                            <span className="text-xs text-gray-600">
                              <Clock size={10} className="inline mr-1" />
                              {item.current_usage || 0} {getMaintenanceUnitLabel(item.maintenance_unit)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons - Always visible, large touch targets */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-800/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        className="justify-center py-3 text-blue-400 hover:bg-blue-500/10 border border-blue-500/30"
                      >
                        <Pencil size={18} className="mr-1.5" />
                        แก้ไข
                      </Button>

                      {item.source !== 'system' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(item)}
                          className={`justify-center py-3 border ${item.is_active
                            ? 'text-orange-400 hover:bg-orange-500/10 border-orange-500/30'
                            : 'text-green-400 hover:bg-green-500/10 border-green-500/30'
                            }`}
                        >
                          <Power size={18} className="mr-1.5" />
                          {item.is_active ? 'ปิด' : 'เปิด'}
                        </Button>
                      )}

                      {item.source !== 'system' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item)}
                          className="justify-center py-3 text-red-400 hover:bg-red-500/10 border border-red-500/30"
                        >
                          <Trash2 size={18} className="mr-1.5" />
                          ลบ
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal - Step-by-Step Wizard - Full Screen on Mobile */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
          <Card className="w-full h-full sm:h-auto sm:max-w-lg border-gray-800 shadow-2xl animate-in slide-in-from-bottom duration-300 sm:zoom-in sm:max-h-[90vh] overflow-hidden flex flex-col bg-gray-950">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-5 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-bold">
                    {editingEquipment ? '✏️ แก้ไขเครื่องจักร' : '➕ เพิ่มเครื่องจักรใหม่'}
                  </CardTitle>
                  <CardDescription className="text-blue-100 mt-1 text-sm">
                    ขั้นตอนที่ {currentStep} จาก 2
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowModal(false)}
                  className="text-white hover:bg-white/10"
                >
                  <X size={24} />
                </Button>
              </div>

              {/* Progress Steps - Clickable */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`flex-1 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${currentStep === 1
                    ? 'bg-white text-blue-600'
                    : currentStep > 1
                      ? 'bg-white/80 text-blue-600 hover:bg-white'
                      : 'bg-white/30 text-white'
                    }`}
                >
                  1. ข้อมูลพื้นฐาน
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (formData.equipment_type && formData.equipment_code) {
                      setCurrentStep(2);
                    }
                  }}
                  disabled={!formData.equipment_type || !formData.equipment_code}
                  className={`flex-1 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${currentStep === 2
                    ? 'bg-white text-blue-600'
                    : 'bg-white/30 text-white hover:bg-white/40 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                >
                  2. หน่วยการวัด
                </button>
              </div>
            </CardHeader>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
              <CardContent className="p-5 space-y-5 bg-gray-950 flex-1 overflow-y-auto">
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                    <AlertTriangle size={20} />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* Step 1: Basic Info */}
                {currentStep === 1 && (
                  <div className="space-y-5">
                    {/* Step Header */}
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <h3 className="text-blue-400 font-semibold text-sm flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                        ข้อมูลพื้นฐาน
                      </h3>
                      <p className="text-gray-400 text-xs mt-1 ml-8">กรอกรหัสและประเภทเครื่องจักร</p>
                    </div>

                    {/* Equipment Type - Visual Selection */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-300">
                        ประเภทเครื่องจักร *
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {equipmentTypes.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, equipment_type: type.value })}
                            className={`p-3 rounded-xl border-2 transition-all text-center ${formData.equipment_type === type.value
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-gray-800 hover:border-gray-700 bg-gray-900'
                              }`}
                          >
                            <div className="text-2xl mb-1">{type.icon}</div>
                            <div className="text-xs text-gray-400">{type.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">รหัสเครื่องจักร *</label>
                        <input
                          type="text"
                          required
                          value={formData.equipment_code}
                          onChange={(e) => setFormData({ ...formData, equipment_code: e.target.value.toUpperCase() })}
                          placeholder="เช่น CV-001"
                          className="w-full bg-gray-900 border border-gray-800 text-white px-4 py-3 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">ชื่อ</label>
                        <input
                          type="text"
                          value={formData.equipment_name}
                          onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
                          placeholder="ชื่อเรียกง่ายๆ"
                          className="w-full bg-gray-900 border border-gray-800 text-white px-4 py-3 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">สถานที่ตั้ง</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="เช่น สายการผลิต A"
                        className="w-full bg-gray-900 border border-gray-800 text-white px-4 py-3 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">รายละเอียด (ถ้ามี)</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="รายละเอียดเพิ่มเติม..."
                        rows={2}
                        className="w-full bg-gray-900 border border-gray-800 text-white px-4 py-3 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Maintenance Tracking */}
                {currentStep === 2 && (
                  <div className="space-y-5">
                    {/* Step Header */}
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <h3 className="text-green-400 font-semibold text-sm flex items-center gap-2">
                        <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                        หน่วยการวัด
                      </h3>
                      <p className="text-gray-400 text-xs mt-1 ml-8">เลือกหน่วยสำหรับติดตามการใช้งาน (ไม่บังคับ)</p>
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                      <div className="flex items-start gap-3">
                        <Zap className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-300 text-sm">การติดตามการใช้งาน</h4>
                          <p className="text-gray-400 text-xs mt-1">
                            ระบบจะคำนวณและแจ้งเตือนเมื่อถึงกำหนดบำรุงรักษาโดยอัตโนมัติ
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Maintenance Unit - Visual Selection */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-300">หน่วยที่ใช้ติดตาม</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'kilometers', label: 'กิโลเมตร', icon: '🛣️', desc: 'ติดตามตามระยะทาง' },
                          { value: 'hours', label: 'ชั่วโมง', icon: '⏱️', desc: 'ติดตามตามเวลาใช้งาน' },
                          { value: 'cycles', label: 'รอบการใช้งาน', icon: '🔄', desc: 'ติดตามตามจำนวนรอบ' },
                          { value: 'days', label: 'วัน', icon: '📅', desc: 'ติดตามตามวันที่' },
                        ].map((unit) => (
                          <button
                            key={unit.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, maintenance_unit: unit.value })}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${formData.maintenance_unit === unit.value
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-gray-800 hover:border-gray-700 bg-gray-900'
                              }`}
                          >
                            <div className="text-xl mb-1">{unit.icon}</div>
                            <div className="text-sm text-white font-medium">{unit.label}</div>
                            <div className="text-xs text-gray-500">{unit.desc}</div>
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, maintenance_unit: '' })}
                        className={`w-full p-3 rounded-xl border transition-all text-center text-sm ${!formData.maintenance_unit
                          ? 'border-gray-600 bg-gray-800 text-gray-300'
                          : 'border-gray-800 hover:border-gray-700 bg-gray-900 text-gray-500'
                          }`}
                      >
                        ⏭️ ข้ามการตั้งค่านี้ (ตั้งค่าทีหลังได้)
                      </button>
                    </div>

                    {formData.maintenance_unit && (
                      <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300">
                            ค่าเริ่มต้น ({getMaintenanceUnitLabel(formData.maintenance_unit, false)})
                          </label>
                          <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-1">
                            ค่าเริ่มต้น = ค่าที่อ่านได้จากมิเตอร์ตอนเริ่มใช้งาน/เริ่มเก็บข้อมูล
                          </p>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.initial_usage}
                            onChange={(e) => setFormData({ ...formData, initial_usage: e.target.value })}
                            placeholder="0"
                            className="w-full bg-gray-900 border border-gray-800 text-white px-4 py-3 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300">
                            ค่าปัจจุบัน ({getMaintenanceUnitLabel(formData.maintenance_unit, false)})
                          </label>
                          <p className="text-xs text-blue-300/90 bg-blue-500/10 border border-blue-500/20 rounded-md px-2 py-1">
                            ค่าปัจจุบัน = ค่ามิเตอร์ ณ ตอนนี้ (ระบบตีความเป็น ค่าเริ่มต้น + ชั่วโมง/ระยะ/รอบ ที่ใช้งานเพิ่ม)
                          </p>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.current_usage}
                            onChange={(e) => setFormData({ ...formData, current_usage: e.target.value })}
                            placeholder="0"
                            className="w-full bg-gray-900 border border-gray-800 text-white px-4 py-3 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                        </div>

                        <div className="space-y-2 col-span-2 mt-2 pt-4 border-t border-gray-800">
                          <label className="text-sm font-medium text-blue-400 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            รอบการบำรุงรักษา (Maintenance Interval)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={formData.maintenance_interval || ''}
                              onChange={(e) => setFormData({ ...formData, maintenance_interval: e.target.value })}
                              placeholder={`แจ้งเตือนทุกๆ ... ${getMaintenanceUnitLabel(formData.maintenance_unit, false)}`}
                              className="flex-1 bg-gray-900 border border-gray-800 text-white px-4 py-3 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                            <div className="flex items-center px-4 bg-gray-900 border border-gray-800 rounded-xl text-gray-500 text-sm">
                              ทุกๆ X {getMaintenanceUnitLabel(formData.maintenance_unit, false)}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            * ระบบจะแจ้งเตือนอัตโนมัติเมื่อครบกำหนดรอบที่ตั้งไว้ (จากค่าเริ่มต้น {formData.initial_usage || 0})
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>

              <div className="flex gap-3 p-5 bg-gray-950 border-t border-gray-800">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentStep(1);
                    }}
                  >
                    ← ย้อนกลับ
                  </Button>
                )}
                {currentStep === 1 ? (
                  <Button
                    type="button"
                    className="flex-[2] bg-blue-600 hover:bg-blue-500"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentStep(2);
                    }}
                    disabled={!formData.equipment_type || !formData.equipment_code}
                  >
                    ถัดไป → หน่วยการวัด
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="flex-[2] bg-green-600 hover:bg-green-500"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span>
                        กำลังบันทึก...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle size={18} />
                        {editingEquipment ? 'บันทึกการแก้ไข' : 'เพิ่มเครื่องจักร'}
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Maintenance Schedules Modal - Full Screen on Mobile */}
      {showSchedulesModal && selectedEquipment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
          <Card className="w-full h-full sm:h-auto sm:max-w-2xl border-gray-800 shadow-2xl animate-in slide-in-from-bottom duration-300 sm:zoom-in sm:max-h-[90vh] overflow-hidden flex flex-col bg-gray-950">
            <CardHeader className="bg-gradient-to-r from-green-600 to-green-500 text-white p-5 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{getEquipmentIcon(selectedEquipment.equipment_type)}</div>
                  <div>
                    <CardTitle className="text-xl font-bold">
                      รอบการบำรุงรักษา
                    </CardTitle>
                    <CardDescription className="text-green-100">
                      {selectedEquipment.equipment_name || selectedEquipment.equipment_code}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowSchedulesModal(false);
                    setSelectedEquipment(null);
                  }}
                  className="text-white hover:bg-white/10"
                >
                  <X size={24} />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-5 bg-gray-950 flex-1 overflow-y-auto min-h-0">
              {/* Equipment Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-900/50 rounded-xl">
                <div>
                  <div className="text-xs text-gray-500 mb-1">สถานที่</div>
                  <div className="text-white font-medium">{selectedEquipment.location || '-'}</div>
                </div>
                {selectedEquipment.maintenance_unit && (
                  <>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">หน่วยติดตาม</div>
                      <div className="text-white font-medium">{getMaintenanceUnitLabel(selectedEquipment.maintenance_unit, false)}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-gray-500 mb-1">ค่าการใช้งานปัจจุบัน</div>
                      <div className="text-2xl font-bold text-green-400">
                        {(selectedEquipment.current_usage || 0).toLocaleString()} {getMaintenanceUnitLabel(selectedEquipment.maintenance_unit)}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Schedules */}
              {!selectedEquipment.maintenance_unit ? (
                <div className="p-8 text-center bg-gray-900/50 rounded-xl border border-dashed border-gray-700">
                  <div className="text-4xl mb-3">⚙️</div>
                  <h4 className="text-gray-300 font-medium mb-2">ยังไม่ได้ตั้งค่าการติดตาม</h4>
                  <p className="text-gray-500 text-sm mb-4">
                    กำหนดหน่วยติดตาม (กม., ชม., รอบ, หรือวัน) เพื่อเริ่มตั้งค่ารอบบำรุงรักษา
                  </p>
                  <Button
                    onClick={() => {
                      setShowSchedulesModal(false);
                      handleEdit(selectedEquipment);
                    }}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    <Settings2 size={16} className="mr-2" />
                    ตั้งค่าเลย
                  </Button>
                </div>
              ) : selectedEquipment.maintenance_schedules && selectedEquipment.maintenance_schedules.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Calendar size={14} />
                    ตารางรอบการบำรุงรักษา
                  </h4>
                  {selectedEquipment.maintenance_schedules.map((schedule, index) => {
                    const currentUsage = parseFloat(selectedEquipment.current_usage) || 0;
                    const startFrom = parseFloat(schedule.start_from_usage) || 0;
                    const interval = parseFloat(schedule.interval_value) || 0;

                    const usageFromStart = currentUsage - startFrom;
                    const completedCycles = interval > 0 ? Math.floor(usageFromStart / interval) : 0;
                    const nextDue = startFrom + ((completedCycles + 1) * interval);
                    const remaining = nextDue - currentUsage;
                    const progress = interval > 0 ? ((interval - remaining) / interval) * 100 : 0;

                    const isOverdue = remaining < 0;
                    const isClose = remaining >= 0 && remaining <= interval * 0.2;

                    return (
                      <div
                        key={schedule.id || `schedule-${index}`}
                        className={`p-4 rounded-xl border ${isOverdue
                          ? 'bg-red-500/10 border-red-500/30'
                          : isClose
                            ? 'bg-yellow-500/10 border-yellow-500/30'
                            : 'bg-gray-900 border-gray-800'
                          }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="text-white font-medium flex items-center gap-2">
                              <Wrench size={16} />
                              ทุกๆ {(schedule.interval_value || 0).toLocaleString()} {getMaintenanceUnitLabel(selectedEquipment.maintenance_unit)}
                            </p>
                            {schedule.description && (
                              <p className="text-gray-500 text-sm mt-1">{schedule.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                isOverdue
                                  ? 'bg-red-500/20 text-red-400'
                                  : isClose
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-green-500/20 text-green-400'
                              }
                            >
                              {isOverdue ? '🔴 เกินกำหนด' : isClose ? '🟡 ใกล้ถึง' : '🟢 ปกติ'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`px-2 h-7 gap-1 ${isOverdue ? 'text-orange-400 hover:text-orange-300 hover:bg-orange-500/10' : 'text-gray-400 hover:text-gray-300'}`}
                              onClick={() => handleRequestMaintenance(schedule)}
                              title="แจ้งซ่อมบำรุง"
                            >
                              <Wrench size={14} />
                              <span className="text-xs">แจ้งซ่อม</span>
                            </Button>
                            <button
                              onClick={() => handleDeleteSchedule(index)}
                              disabled={savingSchedule}
                              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                              title="ลบรอบนี้"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isOverdue
                                ? 'bg-red-500'
                                : isClose
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                                }`}
                              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">
                              เริ่มจาก: {startFrom.toLocaleString()}
                            </span>
                            <span className={isOverdue ? 'text-red-400 font-medium' : 'text-gray-400'}>
                              {isOverdue ? `เกินมา ${Math.abs(remaining).toLocaleString()}` : `เหลืออีก ${remaining.toLocaleString()}`} {getMaintenanceUnitLabel(selectedEquipment.maintenance_unit)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Schedule button removed by request */}

                  {/* Add Schedule Form */}
                  {isAddingSchedule && (
                    <div className="p-4 bg-green-500/5 border border-green-500/30 rounded-xl space-y-4">
                      <h5 className="text-green-400 font-medium flex items-center gap-2">
                        <Plus size={16} />
                        เพิ่มรอบบำรุงรักษาใหม่
                      </h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">ความถี่ ({getMaintenanceUnitLabel(selectedEquipment.maintenance_unit)}) *</label>
                          <input
                            type="number"
                            value={newSchedule.interval_value}
                            onChange={(e) => setNewSchedule({ ...newSchedule, interval_value: e.target.value })}
                            placeholder="เช่น 5000"
                            className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:border-green-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">เริ่มนับจาก</label>
                          <input
                            type="number"
                            value={newSchedule.start_from_usage}
                            onChange={(e) => setNewSchedule({ ...newSchedule, start_from_usage: e.target.value })}
                            placeholder="0"
                            className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:border-green-500 outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">รายละเอียด (ไม่บังคับ)</label>
                        <input
                          type="text"
                          value={newSchedule.description}
                          onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                          placeholder="เช่น เปลี่ยนน้ำมันเครื่อง"
                          className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:border-green-500 outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsAddingSchedule(false);
                            setNewSchedule({ interval_value: '', start_from_usage: '', description: '' });
                          }}
                          disabled={savingSchedule}
                        >
                          ยกเลิก
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-500"
                          onClick={handleAddSchedule}
                          disabled={savingSchedule || !newSchedule.interval_value}
                        >
                          {savingSchedule ? '⏳ กำลังบันทึก...' : '✓ บันทึกรอบบำรุงรักษา'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-6 text-center bg-gray-900/50 rounded-xl border border-dashed border-gray-700">
                    <div className="text-4xl mb-3">📅</div>
                    <h4 className="text-gray-300 font-medium mb-2">ยังไม่มีรอบบำรุงรักษา</h4>
                    <p className="text-gray-500 text-sm">
                      เพิ่มรอบบำรุงรักษาเพื่อให้ระบบแจ้งเตือนเมื่อถึงกำหนด
                    </p>
                  </div>

                  {/* Add first schedule button removed by request */}

                  {/* Add Schedule Form */}
                  {isAddingSchedule && (
                    <div className="p-4 bg-green-500/5 border border-green-500/30 rounded-xl space-y-4">
                      <h5 className="text-green-400 font-medium flex items-center gap-2">
                        <Plus size={16} />
                        เพิ่มรอบบำรุงรักษาใหม่
                      </h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">ความถี่ ({getMaintenanceUnitLabel(selectedEquipment.maintenance_unit)}) *</label>
                          <input
                            type="number"
                            value={newSchedule.interval_value}
                            onChange={(e) => setNewSchedule({ ...newSchedule, interval_value: e.target.value })}
                            placeholder="เช่น 5000"
                            className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:border-green-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">เริ่มนับจาก</label>
                          <input
                            type="number"
                            value={newSchedule.start_from_usage}
                            onChange={(e) => setNewSchedule({ ...newSchedule, start_from_usage: e.target.value })}
                            placeholder="0"
                            className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:border-green-500 outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">รายละเอียด (ไม่บังคับ)</label>
                        <input
                          type="text"
                          value={newSchedule.description}
                          onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                          placeholder="เช่น เปลี่ยนน้ำมันเครื่อง"
                          className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:border-green-500 outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsAddingSchedule(false);
                            setNewSchedule({ interval_value: '', start_from_usage: '', description: '' });
                          }}
                          disabled={savingSchedule}
                        >
                          ยกเลิก
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-500"
                          onClick={handleAddSchedule}
                          disabled={savingSchedule || !newSchedule.interval_value}
                        >
                          {savingSchedule ? '⏳ กำลังบันทึก...' : '✓ บันทึกรอบบำรุงรักษา'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>

            <div className="flex gap-3 p-5 bg-gray-950 border-t border-gray-800 flex-shrink-0">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setShowSchedulesModal(false);
                  setSelectedEquipment(null);
                  setIsAddingSchedule(false);
                }}
              >
                ปิด
              </Button>
              {/* Footer add-schedule button removed by request */}
            </div>
          </Card>
        </div>
      )}

      {/* Maintenance Request Modal */}
      {showMaintenanceForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[9999] overflow-y-auto w-full h-full">
          <div className="bg-gray-900 w-full max-w-2xl rounded-2xl border border-gray-800 shadow-2xl my-auto relative">
            <div className="flex justify-between items-center p-5 border-b border-gray-800 sticky top-0 bg-gray-900 z-10 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Wrench className="text-orange-500" />
                  แจ้งซ่อมบำรุงตามรอบ (PM)
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  {selectedEquipment?.equipment_name} - {selectedEquipment?.equipment_code}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowMaintenanceForm(false)}>
                <X size={20} />
              </Button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <MaintenanceForm
                userId={profile?.id}
                initialData={maintenanceInitialData}
                onSuccess={() => {
                  setShowMaintenanceForm(false);
                  fetchEquipment(); // Refresh data
                }}
                onCancel={() => setShowMaintenanceForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentManagement;

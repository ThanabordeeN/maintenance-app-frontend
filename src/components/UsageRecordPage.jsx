import { useState, useEffect } from 'react';
import { 
  Gauge, 
  Search, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  Plus,
  ChevronLeft
} from 'lucide-react';
import { equipmentAPI } from '../services/api';
import Button from './ui/Button';
import { Card, CardContent } from './ui/Card';
import Badge from './ui/Badge';

const UsageRecordPage = ({ profile }) => {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [addValue, setAddValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const unitLabels = {
    kilometers: 'กม.',
    hours: 'ชม.',
    cycles: 'รอบ',
    days: 'วัน'
  };

  const unitFull = {
    kilometers: 'กิโลเมตร',
    hours: 'ชั่วโมง',
    cycles: 'รอบ',
    days: 'วัน'
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const response = await equipmentAPI.getAll();
      const trackableEquipment = response.equipment.filter(eq => eq.maintenance_unit);
      setEquipment(trackableEquipment);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEquipment = (eq) => {
    setSelectedEquipment(eq);
    setAddValue('');
  };

  const handleBack = () => {
    setSelectedEquipment(null);
    setAddValue('');
  };

  // Quick add buttons
  const quickAddValues = [1, 5, 10, 50];

  const getNextMaintenance = (eq) => {
    if (!eq.maintenance_schedules?.length) return null;

    let closest = null;
    const currentUsage = parseFloat(eq.current_usage) || 0;

    for (const schedule of eq.maintenance_schedules) {
      const interval = schedule.interval_value;
      const startFrom = schedule.start_from_usage || 0;
      const usageSinceStart = currentUsage - startFrom;
      const currentCycle = Math.floor(usageSinceStart / interval);
      const nextPoint = startFrom + (currentCycle + 1) * interval;
      const remaining = nextPoint - currentUsage;

      if (!closest || remaining < closest.remaining) {
        closest = { ...schedule, remaining, nextPoint, interval };
      }
    }
    return closest;
  };

  const handleSaveUsage = async () => {
    if (!selectedEquipment || !addValue) return;

    const currentUsage = parseFloat(selectedEquipment.current_usage) || 0;
    const addAmount = parseFloat(addValue);
    const newUsage = currentUsage + addAmount;

    try {
      setSaving(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

      await equipmentAPI.update(selectedEquipment.id, {
        current_usage: newUsage
      });

      // Trigger PM check after updating usage
      try {
        await fetch(`${API_URL}/check-pm`);
      } catch (err) {
        console.error('Error triggering PM check:', err);
      }

      // Check if maintenance triggered
      const nextMaint = getNextMaintenance(selectedEquipment);
      if (nextMaint && newUsage >= nextMaint.nextPoint) {
        try {
          await fetch(`${API_URL}/maintenance/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              equipmentId: selectedEquipment.id,
              userId: profile?.userId || 1,
              maintenanceType: 'ตามรอบการบำรุงรักษา',
              priority: 'normal',
              status: 'pending',
              category: 'mechanical',
              title: `บำรุงรักษาตามรอบ - ${selectedEquipment.equipment_name}`,
              description: `ถึงรอบบำรุงรักษา: ${nextMaint.description || `ทุกๆ ${nextMaint.interval} ${unitFull[selectedEquipment.maintenance_unit]}`}\n\nการใช้งานปัจจุบัน: ${newUsage} ${unitFull[selectedEquipment.maintenance_unit]}`
            })
          });
        } catch (err) {
          console.error('Error creating maintenance record:', err);
        }
      }

      setSuccessMessage(`+${addAmount} ${unitLabels[selectedEquipment.maintenance_unit]} → ${newUsage.toLocaleString()} ${unitLabels[selectedEquipment.maintenance_unit]}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);

      await fetchEquipment();
      
      // Update local state
      setSelectedEquipment(prev => ({ ...prev, current_usage: newUsage }));
      setAddValue('');

    } catch (error) {
      console.error('Error saving usage:', error);
      alert('เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const filteredEquipment = equipment.filter(eq => 
    eq.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.equipment_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  // Equipment Detail View
  if (selectedEquipment) {
    const currentUsage = parseFloat(selectedEquipment.current_usage) || 0;
    const addAmount = parseFloat(addValue) || 0;
    const newUsage = currentUsage + addAmount;
    const nextMaint = getNextMaintenance(selectedEquipment);
    const willTriggerMaint = nextMaint && newUsage >= nextMaint.nextPoint;

    return (
      <div className="max-w-md mx-auto space-y-4">
        {/* Success Toast */}
        {showSuccess && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top fade-in duration-300">
            <div className="bg-green-500 text-white px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>เลือกเครื่องจักรอื่น</span>
        </button>

        {/* Equipment Info Card */}
        <Card className="border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-4">
            <h2 className="text-xl font-bold text-white">{selectedEquipment.equipment_name}</h2>
            <p className="text-cyan-100 text-sm">{selectedEquipment.equipment_code}</p>
          </div>
          <CardContent className="p-4">
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-1">ใช้งานปัจจุบัน</p>
              <div className="text-4xl font-bold text-white">
                {currentUsage.toLocaleString()}
                <span className="text-xl text-gray-400 ml-2">{unitLabels[selectedEquipment.maintenance_unit]}</span>
              </div>
            </div>

            {/* Next Maintenance */}
            {nextMaint && (
              <div className={`rounded-lg p-3 ${
                nextMaint.remaining < nextMaint.interval * 0.1 
                  ? 'bg-red-500/10 border border-red-500/30' 
                  : 'bg-gray-800'
              }`}>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">รอบบำรุงรักษาถัดไป</span>
                  <span className={`font-medium ${
                    nextMaint.remaining < nextMaint.interval * 0.1 ? 'text-red-400' : 'text-cyan-400'
                  }`}>
                    เหลือ {nextMaint.remaining.toLocaleString()} {unitLabels[selectedEquipment.maintenance_unit]}
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      nextMaint.remaining < nextMaint.interval * 0.1 ? 'bg-red-500' : 'bg-cyan-500'
                    }`}
                    style={{ width: `${Math.min(((nextMaint.interval - nextMaint.remaining) / nextMaint.interval) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Usage Card */}
        <Card className="border-green-500/30">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-500" />
              เพิ่มการใช้งาน
            </h3>

            {/* Quick Add Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {quickAddValues.map(val => (
                <button
                  key={val}
                  onClick={() => setAddValue(val.toString())}
                  className={`py-3 rounded-lg font-medium transition-all ${
                    addValue === val.toString()
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  +{val}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div>
              <label className="text-sm text-gray-500 mb-1 block">หรือใส่ค่าเอง</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 font-bold">+</span>
                  <input
                    type="number"
                    value={addValue}
                    onChange={(e) => setAddValue(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full pl-8 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-lg text-center focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />
                </div>
                <span className="text-gray-400 w-12">{unitLabels[selectedEquipment.maintenance_unit]}</span>
              </div>
            </div>

            {/* Preview */}
            {addAmount > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">ค่าใหม่จะเป็น</span>
                  <span className="text-xl font-bold text-green-400">
                    {newUsage.toLocaleString()} {unitLabels[selectedEquipment.maintenance_unit]}
                  </span>
                </div>
              </div>
            )}

            {/* Maintenance Warning */}
            {willTriggerMaint && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5" />
                <div>
                  <p className="text-orange-400 font-medium text-sm">จะถึงรอบบำรุงรักษา</p>
                  <p className="text-orange-300/70 text-xs mt-1">ระบบจะสร้างใบแจ้งซ่อมอัตโนมัติ</p>
                </div>
              </div>
            )}

            {/* Save Button */}
            <Button
              onClick={handleSaveUsage}
              disabled={saving || !addValue || addAmount <= 0}
              className="w-full bg-green-600 hover:bg-green-500 py-3 text-lg disabled:opacity-50"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  กำลังบันทึก...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" />
                  บันทึก
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Equipment List View
  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-cyan-500/20 rounded-full mb-3">
          <Gauge className="w-7 h-7 text-cyan-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">บันทึกการใช้งาน</h1>
        <p className="text-gray-500 text-sm mt-1">เลือกเครื่องจักรที่ต้องการบันทึก</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="ค้นหาเครื่องจักร..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      {/* Equipment List */}
      {filteredEquipment.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Gauge className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>ไม่พบเครื่องจักร</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEquipment.map(eq => {
            const nextMaint = getNextMaintenance(eq);
            const isUrgent = nextMaint && nextMaint.remaining < nextMaint.interval * 0.1;
            
            return (
              <button
                key={eq.id}
                onClick={() => handleSelectEquipment(eq)}
                className={`w-full p-4 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  isUrgent 
                    ? 'bg-gradient-to-r from-red-900/30 to-gray-800 border border-red-500/30' 
                    : 'bg-gray-800 hover:bg-gray-750'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">{eq.equipment_name}</h3>
                    <p className="text-sm text-gray-500">{eq.equipment_code}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-cyan-400">
                      {(eq.current_usage || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">{unitLabels[eq.maintenance_unit]}</div>
                  </div>
                </div>
                
                {nextMaint && (
                  <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">รอบบำรุงรักษา</span>
                      <Badge variant={isUrgent ? 'destructive' : 'secondary'} className="text-[10px]">
                        เหลือ {nextMaint.remaining.toLocaleString()} {unitLabels[eq.maintenance_unit]}
                      </Badge>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isUrgent ? 'bg-red-500' : 'bg-cyan-500'}`}
                        style={{ width: `${Math.min(((nextMaint.interval - nextMaint.remaining) / nextMaint.interval) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UsageRecordPage;

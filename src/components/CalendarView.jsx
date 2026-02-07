import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Plus,
  Wrench,
  Clock,
  X
} from 'lucide-react';
import { maintenanceAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

const DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    fetchSchedules();
  }, [year, month]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      // Get all maintenance records
      const records = await maintenanceAPI.getAll();
      // Filter and map records that have scheduled_date or created_at
      const scheduledRecords = (records || []).map(record => ({
        ...record,
        scheduled_date: record.scheduled_date || record.created_at
      }));
      setSchedules(scheduledRecords);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const days = [];
    
    // Previous month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        date: daysInPrevMonth - i,
        isCurrentMonth: false,
        fullDate: new Date(year, month - 1, daysInPrevMonth - i)
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        isCurrentMonth: true,
        fullDate: new Date(year, month, i)
      });
    }
    
    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: i,
        isCurrentMonth: false,
        fullDate: new Date(year, month + 1, i)
      });
    }
    
    return days;
  }, [year, month]);

  const getSchedulesForDate = (date) => {
    return schedules.filter(s => {
      const scheduleDate = new Date(s.scheduled_date);
      return scheduleDate.toDateString() === date.toDateString();
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'overdue': return 'bg-red-500';
      default: return 'bg-amber-500';
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      in_progress: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      completed: 'bg-green-500/10 text-green-400 border-green-500/30',
      overdue: 'bg-red-500/10 text-red-400 border-red-500/30',
    };
    const labels = {
      pending: 'รอดำเนินการ',
      scheduled: 'กำหนดแล้ว',
      in_progress: 'กำลังดำเนินการ',
      completed: 'เสร็จสิ้น',
      overdue: 'เกินกำหนด',
    };
    return (
      <Badge className={styles[status] || styles.pending}>
        {labels[status] || status}
      </Badge>
    );
  };

  const selectedDateSchedules = selectedDate ? getSchedulesForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Calendar className="w-8 h-8 text-green-500" />
              ปฏิทินซ่อมบำรุง
            </h1>
            <p className="text-gray-400 mt-1">Maintenance Calendar</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2 border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-xl">
                {MONTHS[month]} {year + 543}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                const daySchedules = getSchedulesForDate(day.fullDate);
                const isSelected = selectedDate?.toDateString() === day.fullDate.toDateString();
                
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(day.fullDate)}
                    className={`
                      min-h-[80px] p-2 rounded-lg border cursor-pointer transition-all
                      ${day.isCurrentMonth ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-900/20 border-gray-800/50'}
                      ${isToday(day.fullDate) ? 'ring-2 ring-green-500' : ''}
                      ${isSelected ? 'border-green-500 bg-green-500/10' : 'hover:border-gray-700'}
                    `}
                  >
                    <span className={`
                      text-sm font-medium
                      ${day.isCurrentMonth ? 'text-white' : 'text-gray-600'}
                      ${isToday(day.fullDate) ? 'text-green-400' : ''}
                    `}>
                      {day.date}
                    </span>
                    
                    {/* Schedule indicators */}
                    <div className="mt-1 space-y-1">
                      {daySchedules.slice(0, 2).map((s, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(s.status)}`} />
                          <span className="text-xs text-gray-400 truncate">{s.title || s.description}</span>
                        </div>
                      ))}
                      {daySchedules.length > 2 && (
                        <span className="text-xs text-gray-500">+{daySchedules.length - 2} รายการ</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 justify-center">
              {[
                { color: 'bg-amber-500', label: 'รอดำเนินการ' },
                { color: 'bg-blue-500', label: 'กำหนดแล้ว' },
                { color: 'bg-green-500', label: 'เสร็จสิ้น' },
                { color: 'bg-red-500', label: 'เกินกำหนด' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-sm text-gray-400">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        <Card className="border-gray-800">
          <CardHeader>
            <CardTitle>
              {selectedDate ? (
                <>
                  {selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear() + 543}
                </>
              ) : (
                'เลือกวันที่'
              )}
            </CardTitle>
            <CardDescription>
              {selectedDateSchedules.length} กำหนดการ
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-500">คลิกที่วันในปฏิทินเพื่อดูรายละเอียด</p>
              </div>
            ) : selectedDateSchedules.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-500">ไม่มีกำหนดการในวันนี้</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateSchedules.map((schedule) => (
                  <Card key={schedule.id} className="bg-gray-900/50 border-gray-800">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Wrench className="w-5 h-5 text-green-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-white">
                            {schedule.title || schedule.description}
                          </h4>
                          {schedule.equipment_name && (
                            <p className="text-sm text-gray-400 mt-1">
                              {schedule.equipment_name}
                            </p>
                          )}
                          <div className="mt-2">
                            {getStatusBadge(schedule.status)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

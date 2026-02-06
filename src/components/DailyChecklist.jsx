import { useState, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, 
  Calendar,
  Check, 
  X, 
  Camera,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Users,
  Play,
  CheckCheck,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { checklistsAPI, getImageUrl } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

export default function DailyChecklist({ userId, userName }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [templates, setTemplates] = useState([]);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [imageUploading, setImageUploading] = useState({});
  const [showHelp, setShowHelp] = useState(false);
  const [passingAll, setPassingAll] = useState({});
  const fileInputRefs = useRef({});

  const frequencyLabels = {
    'daily': 'ประจำวัน',
    'weekly': 'ประจำสัปดาห์',
    'monthly': 'ประจำเดือน'
  };

  const frequencyColors = {
    'daily': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    'weekly': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    'monthly': 'bg-amber-500/10 text-amber-400 border-amber-500/30'
  };

  useEffect(() => {
    fetchDailyChecklists();
  }, [selectedDate]);

  const getDateString = (date) => {
    return date.toISOString().split('T')[0];
  };

  const isToday = (date) => {
    const today = new Date();
    return getDateString(date) === getDateString(today);
  };

  const shouldShowTemplate = (template) => {
    const dayOfWeek = selectedDate.getDay();
    const dayOfMonth = selectedDate.getDate();
    
    switch(template.frequency) {
      case 'daily':
        return true;
      case 'weekly':
        return dayOfWeek === 1;
      case 'monthly':
        return dayOfMonth === 1;
      default:
        return true;
    }
  };

  const fetchDailyChecklists = async () => {
    try {
      setLoading(true);
      
      const templatesRes = await checklistsAPI.getTemplates();
      const allTemplates = templatesRes.templates || [];
      
      const dateTemplates = allTemplates.filter(t => t.is_active && shouldShowTemplate(t));
      setTemplates(dateTemplates);
      
      const dateStr = getDateString(selectedDate);
      const responsesRes = await checklistsAPI.getDailyResponses(dateStr);
      
      const responseMap = {};
      (responsesRes.responses || []).forEach(resp => {
        responseMap[resp.template_id] = resp;
      });
      setResponses(responseMap);
      
    } catch (error) {
      console.error('Error fetching daily checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckItem = async (templateId, itemId, passed) => {
    const key = `${templateId}-${itemId}`;
    setSaving(prev => ({ ...prev, [key]: true }));
    
    try {
      await checklistsAPI.checkDailyItem({
        template_id: templateId,
        template_item_id: itemId,
        schedule_date: getDateString(selectedDate),
        is_passed: passed,
        checked_by: userId
      });
      
      await fetchDailyChecklists();
    } catch (error) {
      console.error('Error checking item:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const handlePassAll = async (template) => {
    if (!confirm(`ยืนยันผ่านทั้งหมด ${template.items?.length || 0} รายการ?`)) return;
    
    setPassingAll(prev => ({ ...prev, [template.id]: true }));
    
    try {
      for (const item of (template.items || [])) {
        await checklistsAPI.checkDailyItem({
          template_id: template.id,
          template_item_id: item.id,
          schedule_date: getDateString(selectedDate),
          is_passed: true,
          checked_by: userId
        });
      }
      await fetchDailyChecklists();
    } catch (error) {
      console.error('Error passing all:', error);
      alert('เกิดข้อผิดพลาด');
    } finally {
      setPassingAll(prev => ({ ...prev, [template.id]: false }));
    }
  };

  const handleAddNote = async (templateId, itemId, note) => {
    try {
      await checklistsAPI.updateDailyItemNote({
        template_id: templateId,
        template_item_id: itemId,
        schedule_date: getDateString(selectedDate),
        notes: note
      });
      await fetchDailyChecklists();
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleImageUpload = async (templateId, itemId, file) => {
    const key = `${templateId}-${itemId}`;
    setImageUploading(prev => ({ ...prev, [key]: true }));
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('template_id', templateId);
      formData.append('template_item_id', itemId);
      formData.append('schedule_date', getDateString(selectedDate));
      formData.append('checked_by', userId);
      
      await checklistsAPI.uploadDailyItemImage(formData);
      await fetchDailyChecklists();
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('เกิดข้อผิดพลาดในการอัพโหลดรูป');
    } finally {
      setImageUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  const getItemResponse = (templateId, itemId) => {
    const response = responses[templateId];
    if (!response || !response.items) return null;
    return response.items.find(item => item.template_item_id === itemId);
  };

  const getTemplateProgress = (template) => {
    const total = template.items?.length || 0;
    if (total === 0) return { checked: 0, total: 0, passed: 0, failed: 0, percent: 0 };
    
    let checked = 0;
    let passed = 0;
    let failed = 0;
    
    (template.items || []).forEach(item => {
      const resp = getItemResponse(template.id, item.id);
      if (resp && resp.is_passed !== null) {
        checked++;
        if (resp.is_passed) passed++;
        else failed++;
      }
    });
    
    return { checked, total, passed, failed, percent: Math.round((checked / total) * 100) };
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const formatThaiDate = (date) => {
    return date.toLocaleDateString('th-TH', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <Card className="p-12 text-center border-gray-800">
        <Loader2 className="w-10 h-10 animate-spin text-green-500 mx-auto" />
        <p className="mt-4 text-gray-400">กำลังโหลด Daily Checklist...</p>
      </Card>
    );
  }

  // Active Template View (Checking Mode)
  if (activeTemplate) {
    const progress = getTemplateProgress(activeTemplate);
    const canEdit = isToday(selectedDate); // Can only edit today's checklist
    
    return (
      <div className="space-y-4">
        {/* Read-only Warning */}
        {!canEdit && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
            <div>
              <p className="text-yellow-400 font-medium">โหมดดูอย่างเดียว</p>
              <p className="text-yellow-400/70 text-sm">ไม่สามารถแก้ไข checklist ย้อนหลังได้ สามารถแก้ไขได้เฉพาะวันนี้เท่านั้น</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-4 border-b border-gray-800 pb-4">
          <Button
            variant="ghost"
            onClick={() => setActiveTemplate(null)}
            className="rounded-xl"
          >
            <ChevronLeft size={20} />
            กลับ
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{activeTemplate.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <Badge className={frequencyColors[activeTemplate.frequency]}>
                {frequencyLabels[activeTemplate.frequency]}
              </Badge>
              <span className="text-sm text-gray-500">
                {progress.checked}/{progress.total} รายการ ({progress.percent}%)
              </span>
            </div>
          </div>
          
          {/* Pass All Button - Only show for today */}
          {canEdit && progress.checked < progress.total && (
            <Button
              onClick={() => handlePassAll(activeTemplate)}
              disabled={passingAll[activeTemplate.id]}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              {passingAll[activeTemplate.id] ? (
                <Loader2 size={18} className="animate-spin mr-2" />
              ) : (
                <CheckCheck size={18} className="mr-2" />
              )}
              ผ่านทั้งหมด
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-800/50 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              progress.failed > 0 ? 'bg-gradient-to-r from-green-500 to-red-500' : 'bg-green-500'
            }`}
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        {/* Items List */}
        <div className="space-y-3">
          {(activeTemplate.items || []).map((item, index) => {
            const itemResp = getItemResponse(activeTemplate.id, item.id);
            const savingKey = `${activeTemplate.id}-${item.id}`;
            const isSaving = saving[savingKey];
            const isUploading = imageUploading[savingKey];
            const isPassed = itemResp?.is_passed === true;
            const isFailed = itemResp?.is_passed === false;
            const isChecked = isPassed || isFailed;
            
            return (
              <Card 
                key={item.id}
                className={`border-2 transition-all ${
                  isPassed ? 'bg-green-500/10 border-green-500/50' :
                  isFailed ? 'bg-red-500/10 border-red-500/50' : 
                  'border-gray-700 hover:border-gray-600'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Item Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${
                          isPassed ? 'bg-green-500 text-white' :
                          isFailed ? 'bg-red-500 text-white' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {isChecked ? (isPassed ? <Check size={20} /> : <X size={20} />) : index + 1}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${isChecked ? 'text-gray-300' : 'text-white'}`}>
                            {item.description}
                          </p>
                          {item.required && !isChecked && (
                            <span className="text-red-400 text-xs">*จำเป็น</span>
                          )}
                          
                          {/* Checked by info */}
                          {itemResp?.checked_by_name && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <User size={12} />
                              <span>{itemResp.checked_by_name}</span>
                              {itemResp.checked_at && (
                                <>
                                  <Clock size={12} />
                                  <span>{new Date(itemResp.checked_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Note input for failed */}
                      {isFailed && (
                        <div className="mt-3 ml-13">
                          <input
                            type="text"
                            placeholder="📝 ระบุสาเหตุที่ไม่ผ่าน..."
                            defaultValue={itemResp?.notes || ''}
                            onBlur={(e) => canEdit && handleAddNote(activeTemplate.id, item.id, e.target.value)}
                            readOnly={!canEdit}
                            className={`w-full px-4 py-3 border-2 rounded-xl text-white focus:outline-none ${
                              canEdit 
                                ? 'bg-red-500/10 border-red-500/30 focus:border-red-500' 
                                : 'bg-gray-800/50 border-gray-700/50 cursor-not-allowed'
                            }`}
                          />
                        </div>
                      )}
                      
                      {/* Image preview */}
                      {itemResp?.image_url && (
                        <div className="mt-3 ml-13">
                          <img 
                            src={getImageUrl(itemResp.image_url)} 
                            alt="Checklist" 
                            className="h-24 w-auto rounded-xl object-cover cursor-pointer hover:opacity-80 border-2 border-gray-700"
                            onClick={() => window.open(getImageUrl(itemResp.image_url), '_blank')}
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      {/* Pass/Fail Buttons */}
                      <button
                        onClick={() => handleCheckItem(activeTemplate.id, item.id, true)}
                        disabled={!canEdit || isSaving}
                        className={`flex-1 sm:w-24 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                          !canEdit
                            ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed border-2 border-gray-700/50'
                            : isPassed
                              ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                              : 'bg-gray-800 text-gray-400 hover:bg-green-500/20 hover:text-green-400 border-2 border-gray-700 hover:border-green-500/50'
                        }`}
                        title={!canEdit ? 'ดูอย่างเดียว - ไม่สามารถแก้ไขได้' : ''}
                      >
                        {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                        <span className="sm:hidden">ผ่าน</span>
                      </button>
                      
                      <button
                        onClick={() => handleCheckItem(activeTemplate.id, item.id, false)}
                        disabled={!canEdit || isSaving}
                        className={`flex-1 sm:w-24 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                          !canEdit
                            ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed border-2 border-gray-700/50'
                            : isFailed
                              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                              : 'bg-gray-800 text-gray-400 hover:bg-red-500/20 hover:text-red-400 border-2 border-gray-700 hover:border-red-500/50'
                        }`}
                        title={!canEdit ? 'ดูอย่างเดียว - ไม่สามารถแก้ไขได้' : ''}
                      >
                        {isSaving ? <Loader2 size={20} className="animate-spin" /> : <X size={20} />}
                        <span className="sm:hidden">ไม่ผ่าน</span>
                      </button>
                      
                      {/* Camera Button */}
                      {canEdit && (
                        <>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            ref={el => fileInputRefs.current[savingKey] = el}
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleImageUpload(activeTemplate.id, item.id, e.target.files[0]);
                              }
                            }}
                          />
                          <button
                            onClick={() => fileInputRefs.current[savingKey]?.click()}
                            disabled={isUploading}
                            className={`flex-1 sm:w-24 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border-2 ${
                              itemResp?.image_url 
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' 
                                : 'bg-gray-800 text-gray-400 hover:text-blue-400 border-gray-700 hover:border-blue-500/50'
                            }`}
                          >
                            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                            <span className="sm:hidden">ถ่ายรูป</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Complete Message */}
        {progress.checked === progress.total && progress.total > 0 && (
          <Card className="bg-green-500/10 border-green-500/30 p-6 text-center">
            <Sparkles className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-green-400">ตรวจเสร็จสิ้น!</h3>
            <p className="text-gray-400 mt-1">
              ผ่าน {progress.passed} รายการ | ไม่ผ่าน {progress.failed} รายการ
            </p>
            <Button
              onClick={() => setActiveTemplate(null)}
              className="mt-4 bg-green-600 hover:bg-green-500"
            >
              กลับหน้าหลัก
            </Button>
          </Card>
        )}
      </div>
    );
  }

  // Main View (Template Selection)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-2xl">
            <ClipboardCheck className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Daily Checklist</h1>
            <p className="text-gray-400 mt-1">ตรวจเช็คประจำวัน</p>
          </div>
        </div>
        
        {/* Help Button */}
        <Button
          variant="ghost"
          onClick={() => setShowHelp(!showHelp)}
          className="text-gray-400"
        >
          <HelpCircle size={18} className="mr-2" />
          วิธีใช้งาน
        </Button>
      </div>

      {/* Help Guide */}
      {showHelp && (
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4">
            <h3 className="font-bold text-blue-400 mb-3 flex items-center gap-2">
              <HelpCircle size={18} />
              วิธีใช้งาน Daily Checklist
            </h3>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">1</div>
                <div>
                  <p className="font-medium text-white">เลือกรายการ</p>
                  <p className="text-gray-400">กดปุ่ม "เริ่มตรวจ" ที่รายการที่ต้องการ</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">2</div>
                <div>
                  <p className="font-medium text-white">ตรวจและบันทึก</p>
                  <p className="text-gray-400">กด ✓ ผ่าน หรือ ✗ ไม่ผ่าน พร้อมถ่ายรูป</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">3</div>
                <div>
                  <p className="font-medium text-white">ระบุหมายเหตุ</p>
                  <p className="text-gray-400">ถ้าไม่ผ่านให้ระบุสาเหตุ</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Navigation */}
      <Card className="bg-gray-800/30 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => changeDate(-1)}
              className="rounded-xl"
            >
              <ChevronLeft size={20} />
              วันก่อน
            </Button>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Calendar size={18} className="text-green-400" />
                <span className="text-lg font-bold text-white">
                  {formatThaiDate(selectedDate)}
                </span>
              </div>
              {isToday(selectedDate) && (
                <Badge className="bg-green-500/20 text-green-400 mt-1">วันนี้</Badge>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => changeDate(1)}
              className="rounded-xl"
              disabled={selectedDate >= new Date()}
            >
              วันหน้า
              <ChevronRight size={20} />
            </Button>
          </div>
          
          {!isToday(selectedDate) && (
            <div className="text-center mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                className="rounded-xl"
              >
                กลับวันนี้
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-gray-800/30 border-gray-700">
          <div className="text-3xl font-black text-white">{templates.length}</div>
          <div className="text-xs text-gray-500">รายการทั้งหมด</div>
        </Card>
        <Card className="p-4 bg-green-500/10 border-green-500/30">
          <div className="text-3xl font-black text-green-400">
            {templates.reduce((acc, t) => acc + getTemplateProgress(t).passed, 0)}
          </div>
          <div className="text-xs text-green-400/70">ผ่าน ✓</div>
        </Card>
        <Card className="p-4 bg-red-500/10 border-red-500/30">
          <div className="text-3xl font-black text-red-400">
            {templates.reduce((acc, t) => acc + getTemplateProgress(t).failed, 0)}
          </div>
          <div className="text-xs text-red-400/70">ไม่ผ่าน ✗</div>
        </Card>
        <Card className="p-4 bg-yellow-500/10 border-yellow-500/30">
          <div className="text-3xl font-black text-yellow-400">
            {templates.reduce((acc, t) => acc + (t.items?.length || 0) - getTemplateProgress(t).checked, 0)}
          </div>
          <div className="text-xs text-yellow-400/70">รอตรวจ</div>
        </Card>
      </div>

      {/* Checklists */}
      {templates.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-gray-700">
          <ClipboardCheck size={64} className="mx-auto text-gray-600 mb-4" />
          <p className="text-xl text-gray-400 font-medium">ไม่มีรายการตรวจเช็คสำหรับวันนี้</p>
          <p className="text-gray-600 text-sm mt-2">สร้าง Checklist Template ใน Checklist Manager ก่อน</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {templates.map(template => {
            const progress = getTemplateProgress(template);
            const isComplete = progress.checked === progress.total && progress.total > 0;
            const isNotStarted = progress.checked === 0;
            
            return (
              <Card 
                key={template.id} 
                className={`border-2 overflow-hidden transition-all ${
                  isComplete ? 'bg-green-500/5 border-green-500/30' : 
                  isNotStarted ? 'border-gray-700 hover:border-green-500/50' :
                  'border-yellow-500/30 bg-yellow-500/5'
                }`}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Template Info */}
                    <div className="flex-1 p-5">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                          isComplete ? 'bg-green-500 text-white' : 
                          isNotStarted ? 'bg-gray-800 text-gray-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {isComplete ? <CheckCircle2 size={28} /> : <ClipboardCheck size={28} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-white">{template.name}</h3>
                            <Badge className={frequencyColors[template.frequency]}>
                              {frequencyLabels[template.frequency]}
                            </Badge>
                          </div>
                          {template.description && (
                            <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                          )}
                          
                          {/* Progress */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-400">
                                {progress.checked}/{progress.total} รายการ
                              </span>
                              <span className={`font-bold ${
                                isComplete ? 'text-green-400' : 
                                isNotStarted ? 'text-gray-500' : 'text-yellow-400'
                              }`}>
                                {progress.percent}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${
                                  progress.failed > 0 ? 'bg-gradient-to-r from-green-500 via-yellow-500 to-red-500' : 
                                  isComplete ? 'bg-green-500' : 'bg-yellow-500'
                                }`}
                                style={{ width: `${progress.percent}%` }}
                              />
                            </div>
                          </div>
                          
                          {/* Stats */}
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className="flex items-center gap-1 text-green-400">
                              <Check size={12} />
                              {progress.passed} ผ่าน
                            </span>
                            <span className="flex items-center gap-1 text-red-400">
                              <X size={12} />
                              {progress.failed} ไม่ผ่าน
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    <div className="p-4 sm:p-5 flex items-center justify-center border-t sm:border-t-0 sm:border-l border-gray-800 bg-gray-800/30">
                      <Button
                        onClick={() => setActiveTemplate(template)}
                        className={`w-full sm:w-auto px-8 py-4 text-lg rounded-2xl font-bold ${
                          isComplete 
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                            : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30'
                        }`}
                      >
                        {isComplete ? (
                          <>
                            <CheckCircle2 size={22} className="mr-2" />
                            ดูผลตรวจ
                          </>
                        ) : isNotStarted ? (
                          <>
                            <Play size={22} className="mr-2" />
                            เริ่มตรวจ
                          </>
                        ) : (
                          <>
                            <Play size={22} className="mr-2" />
                            ตรวจต่อ
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

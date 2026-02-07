import { useState, useEffect } from 'react';
import { X, ClipboardCheck, Check, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { checklistsAPI } from '../services/api';

export default function ChecklistModal({ 
  maintenanceRecordId, 
  equipmentId, 
  userId, 
  onClose, 
  onSuccess 
}) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [responses, setResponses] = useState({});
  const [notes, setNotes] = useState({});
  const [generalNotes, setGeneralNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingResponses, setExistingResponses] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const templatesRes = await checklistsAPI.getTemplates();
      const allTemplates = templatesRes.templates || [];
      const maintenanceTemplates = allTemplates.filter(t => !t.frequency || t.frequency === 'none');
      setTemplates(maintenanceTemplates);
      
      if (maintenanceRecordId) {
        try {
          const responsesRes = await checklistsAPI.getResponses({ maintenance_record_id: maintenanceRecordId });
          setExistingResponses(responsesRes.responses || []);
        } catch (e) {
          console.log('No existing responses');
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    const initialResponses = {};
    const initialNotes = {};
    (template.items || []).forEach(item => {
      initialResponses[item.id] = null;
      initialNotes[item.id] = '';
    });
    setResponses(initialResponses);
    setNotes(initialNotes);
  };

  const handleResponseChange = (itemId, value) => {
    setResponses(prev => ({ ...prev, [itemId]: value }));
  };

  const handleNoteChange = (itemId, value) => {
    setNotes(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) return;

    const requiredItems = (selectedTemplate.items || []).filter(item => item.required);
    const missingRequired = requiredItems.filter(item => responses[item.id] === null);
    
    if (missingRequired.length > 0) {
      alert(`กรุณากรอกรายการที่จำเป็น: ${missingRequired.map(i => i.description).join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      const items = (selectedTemplate.items || []).map(item => ({
        template_item_id: item.id,
        item_text: item.description,
        response_value: String(responses[item.id] ?? ''),
        is_passed: responses[item.id] === true || responses[item.id] === 'pass',
        notes: notes[item.id] || null
      }));

      await checklistsAPI.submitResponse({
        template_id: selectedTemplate.id,
        maintenance_record_id: maintenanceRecordId,
        equipment_id: equipmentId,
        completed_by: userId,
        notes: generalNotes,
        items
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error submitting checklist:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก Checklist');
    } finally {
      setSubmitting(false);
    }
  };

  const allItemsAnswered = selectedTemplate?.items?.every(item => 
    !item.required || responses[item.id] !== null
  );

  const categoryLabels = {
    'daily': 'ประจำวัน',
    'weekly': 'ประจำสัปดาห์',
    'monthly': 'ประจำเดือน',
    'inspection': 'ตรวจสอบ',
    'repair': 'ซ่อม',
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black animate-in fade-in duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto"></div>
          <p className="mt-4 text-zinc-400 font-medium">กำลังโหลด Checklist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black animate-in fade-in duration-200">
      
      {/* Header */}
      <header className="flex-none bg-zinc-950 border-b border-zinc-800/50">
        <div className="flex items-center h-16 px-4">
          <button
            onClick={selectedTemplate ? () => setSelectedTemplate(null) : onClose}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 transition-all"
          >
            {selectedTemplate ? <ArrowLeft size={24} className="text-zinc-400" /> : <X size={24} className="text-zinc-400" />}
          </button>
          <div className="flex-1 ml-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-sky-400" />
              <h1 className="text-lg font-semibold text-white">
                {selectedTemplate ? selectedTemplate.name : 'เลือก Checklist'}
              </h1>
            </div>
            <p className="text-sm text-zinc-500">
              {selectedTemplate 
                ? `${selectedTemplate.items?.length || 0} รายการตรวจ`
                : 'เลือกเทมเพลตที่ต้องการใช้'}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-32">
        
        {/* Existing Responses */}
        {existingResponses.length > 0 && !selectedTemplate && (
          <div className="p-4 bg-emerald-500/10 border-b border-emerald-500/20">
            <p className="text-emerald-400 font-medium flex items-center gap-2">
              <Check size={16} />
              มี Checklist ที่กรอกแล้ว {existingResponses.length} รายการ
            </p>
            <div className="mt-2 space-y-1">
              {existingResponses.map(resp => (
                <div key={resp.id} className="text-sm text-zinc-400">
                  • {resp.template_name} - {new Date(resp.completed_at).toLocaleString('th-TH')}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Template Selection */}
        {!selectedTemplate ? (
          <div className="p-4 space-y-3">
            
            {templates.length === 0 ? (
              <div className="text-center py-16 text-zinc-500">
                <ClipboardCheck size={48} className="mx-auto mb-4 opacity-30" />
                <p className="font-medium">ไม่มี Checklist Template</p>
                <p className="text-sm mt-1">สร้างเทมเพลตก่อนใช้งาน</p>
              </div>
            ) : (
              templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 active:scale-[0.98] transition-all"
                >
                  <div className="w-14 h-14 rounded-xl bg-sky-600 flex items-center justify-center shadow-lg">
                    <ClipboardCheck size={28} className="text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400 mb-1">
                      {categoryLabels[template.category] || template.category}
                    </span>
                    <p className="text-lg font-semibold text-white">
                      {template.name}
                    </p>
                    {template.description && (
                      <p className="text-sm text-zinc-500 mt-0.5">{template.description}</p>
                    )}
                    <p className="text-xs text-zinc-600 mt-1">
                      {template.items?.length || 0} รายการตรวจ
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          /* Checklist Form */
          <div className="p-4 space-y-4">
            
            {/* Items */}
            {(selectedTemplate.items || []).map((item, index) => (
              <div 
                key={item.id} 
                className={`p-4 rounded-2xl border-2 transition-all ${
                  responses[item.id] === true
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : responses[item.id] === false
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    responses[item.id] === true
                      ? 'bg-emerald-500 text-white'
                      : responses[item.id] === false
                      ? 'bg-red-500 text-white'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {responses[item.id] === true ? <Check size={16} /> : 
                     responses[item.id] === false ? <X size={16} /> : 
                     index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{item.description}</p>
                      {item.required && (
                        <span className="text-red-400 text-xs">*</span>
                      )}
                    </div>
                    
                    {/* Response buttons - Large touch targets */}
                    <div className="flex gap-3 mt-3">
                      <button
                        type="button"
                        onClick={() => handleResponseChange(item.id, true)}
                        className={`flex-1 h-14 rounded-xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                          responses[item.id] === true
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
                        }`}
                      >
                        <Check size={22} />
                        ผ่าน
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResponseChange(item.id, false)}
                        className={`flex-1 h-14 rounded-xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                          responses[item.id] === false
                            ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
                        }`}
                      >
                        <X size={22} />
                        ไม่ผ่าน
                      </button>
                    </div>

                    {/* Note input if failed */}
                    {responses[item.id] === false && (
                      <input
                        type="text"
                        placeholder="หมายเหตุ (ทำไมไม่ผ่าน)"
                        value={notes[item.id] || ''}
                        onChange={(e) => handleNoteChange(item.id, e.target.value)}
                        className="w-full mt-3 px-4 py-3 bg-zinc-950 border-2 border-red-900/50 rounded-xl text-white focus:outline-none focus:border-red-500"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* General notes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-400">หมายเหตุเพิ่มเติม</label>
              <textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="หมายเหตุทั่วไป..."
                className="w-full h-24 px-4 py-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl text-white focus:outline-none focus:border-zinc-600 resize-none"
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer Actions */}
      <footer className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800/50 p-4 pb-8">
        {selectedTemplate ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setSelectedTemplate(null)}
              className="flex-1 h-14 rounded-xl font-semibold text-zinc-300 bg-zinc-800 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <ArrowLeft size={20} />
              ย้อนกลับ
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allItemsAnswered || submitting}
              className="flex-[2] h-14 rounded-xl font-semibold text-white bg-sky-600 hover:bg-sky-500 shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:bg-zinc-700 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save size={20} />
                  บันทึก Checklist
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className="w-full h-14 rounded-xl font-semibold text-zinc-300 bg-zinc-800 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <X size={20} />
            ปิด
          </button>
        )}
      </footer>
    </div>
  );
}

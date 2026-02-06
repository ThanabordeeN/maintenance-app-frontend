import { useState, useEffect } from 'react';
import { 
  ClipboardList,
  Plus,
  Search,
  Trash2,
  Edit2,
  Copy,
  ArrowLeft,
  GripVertical,
  Check,
  X,
  Save,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { checklistsAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

export default function ChecklistManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await checklistsAPI.getTemplates();
      setTemplates(res.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      if (editData.id) {
        await checklistsAPI.updateTemplate(editData.id, editData);
      } else {
        await checklistsAPI.createTemplate(editData);
      }
      fetchTemplates();
      setShowModal(false);
      setEditData(null);
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('ยืนยันการลบเทมเพลต?')) return;
    try {
      await checklistsAPI.deleteTemplate(id);
      fetchTemplates();
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleDuplicate = async (template) => {
    try {
      const newTemplate = {
        ...template,
        name: `${template.name} (สำเนา)`,
        id: undefined
      };
      await checklistsAPI.createTemplate(newTemplate);
      fetchTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
    }
  };

  const addItem = () => {
    setEditData({
      ...editData,
      items: [...(editData.items || []), { 
        id: Date.now(), 
        description: '', 
        required: true,
        order_index: (editData.items || []).length 
      }]
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...editData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditData({ ...editData, items: newItems });
  };

  const removeItem = (index) => {
    const newItems = editData.items.filter((_, i) => i !== index);
    setEditData({ ...editData, items: newItems });
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredTemplates = templates.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryColors = {
    'daily': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    'weekly': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    'monthly': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    'inspection': 'bg-green-500/10 text-green-400 border-green-500/30',
    'repair': 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  const categoryLabels = {
    'daily': 'ประจำวัน',
    'weekly': 'ประจำสัปดาห์',
    'monthly': 'ประจำเดือน',
    'inspection': 'ตรวจสอบ',
    'repair': 'ซ่อม',
  };

  if (loading) {
    return (
      <Card className="p-12 text-center border-dashed">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mx-auto"></div>
        <p className="mt-4 text-gray-500 font-medium">กำลังโหลดเทมเพลต...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-green-500" />
              จัดการเช็คลิสต์
            </h1>
            <p className="text-gray-400 mt-1">Checklist Templates</p>
          </div>
        </div>
        <Button onClick={() => {
          setEditData({ name: '', category: 'inspection', description: '', items: [] });
          setShowModal(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มเทมเพลต
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="ค้นหาเทมเพลต..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'เทมเพลตทั้งหมด', value: templates.length },
          { label: 'ตรวจสอบ', value: templates.filter(t => t.category === 'inspection').length },
          { label: 'ประจำวัน', value: templates.filter(t => t.category === 'daily').length },
          { label: 'ซ่อมบำรุง', value: templates.filter(t => t.category === 'repair').length },
        ].map((stat, i) => (
          <Card key={i} className="border-gray-800">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-gray-400 text-center">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <ClipboardList className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-500 font-medium">ไม่พบเทมเพลต</p>
          <Button 
            className="mt-4"
            onClick={() => {
              setEditData({ name: '', category: 'inspection', description: '', items: [] });
              setShowModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            สร้างเทมเพลตใหม่
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <Card 
              key={template.id} 
              className="border-gray-800 hover:border-green-500/50 transition-all cursor-pointer"
              onClick={() => toggleExpand(template.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={categoryColors[template.category] || 'bg-gray-500/10 text-gray-400'}>
                        {categoryLabels[template.category] || template.category}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-white">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {template.items?.length || 0} รายการ
                    </p>
                  </div>
                  <div className="flex items-center">
                    {expandedItems[template.id] ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded items */}
                {expandedItems[template.id] && template.items?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
                    {template.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-5 h-5 rounded border border-gray-600 flex items-center justify-center">
                          <span className="text-xs text-gray-500">{i + 1}</span>
                        </div>
                        <span className="text-gray-300">{item.description}</span>
                        {item.required && (
                          <span className="text-red-400 text-xs">*</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800" onClick={e => e.stopPropagation()}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setEditData(template);
                      setShowModal(true);
                    }}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    แก้ไข
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDuplicate(template)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && editData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <div className="flex items-center justify-between">
                <CardTitle>{editData.id ? 'แก้ไขเทมเพลต' : 'เพิ่มเทมเพลตใหม่'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">ชื่อเทมเพลต *</label>
                <input
                  type="text"
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="เช่น ตรวจสอบเครื่องบดประจำวัน"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">หมวดหมู่</label>
                <select
                  value={editData.category || 'inspection'}
                  onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="inspection">ตรวจสอบ</option>
                  <option value="daily">ประจำวัน</option>
                  <option value="weekly">ประจำสัปดาห์</option>
                  <option value="monthly">ประจำเดือน</option>
                  <option value="repair">ซ่อมบำรุง</option>
                </select>
              </div>

              {/* Frequency (for Daily Checklist) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">ความถี่ (สำหรับ Daily Checklist)</label>
                <select
                  value={editData.frequency || 'daily'}
                  onChange={(e) => setEditData({ ...editData, frequency: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="daily">ทุกวัน</option>
                  <option value="weekly">ทุกสัปดาห์ (วันจันทร์)</option>
                  <option value="monthly">ทุกเดือน (วันที่ 1)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">กำหนดว่า checklist นี้จะแสดงในหน้า Daily Checklist เมื่อไหร่</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">รายละเอียด</label>
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="รายละเอียดเพิ่มเติม"
                />
              </div>

              {/* Checklist Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-300">รายการตรวจสอบ</label>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="w-3 h-3 mr-1" />
                    เพิ่มรายการ
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editData.items || []).map((item, index) => (
                    <div key={item.id || index} className="flex items-center gap-2 p-3 bg-gray-900/50 rounded-lg">
                      <GripVertical className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-500 text-sm w-6">{index + 1}.</span>
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                        placeholder="รายการตรวจสอบ"
                      />
                      <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.required !== false}
                          onChange={(e) => updateItem(index, 'required', e.target.checked)}
                          className="rounded border-gray-600 text-green-500 focus:ring-green-500"
                        />
                        จำเป็น
                      </label>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-400 hover:text-red-300"
                        onClick={() => removeItem(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {(editData.items || []).length === 0 && (
                    <p className="text-center text-gray-500 py-4">ยังไม่มีรายการ</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                  ยกเลิก
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleSaveTemplate}
                  disabled={!editData.name}
                >
                  <Save className="w-4 h-4 mr-2" />
                  บันทึก
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

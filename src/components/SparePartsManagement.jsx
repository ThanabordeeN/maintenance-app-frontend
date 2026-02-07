import { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle,
  ArrowLeft,
  Pencil,
  Trash2,
  X,
  Save,
  ChevronRight,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  DollarSign,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { sparePartsAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

export default function SparePartsManagement() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustType, setAdjustType] = useState('in');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    part_code: '',
    part_name: '',
    description: '',
    category: '',
    unit: 'ชิ้น',
    unit_price: '',
    current_stock: '',
    min_stock_level: '',
    max_stock_level: '',
    location: '',
    supplier: ''
  });

  useEffect(() => {
    fetchParts();
  }, [showLowStock]);

  const fetchParts = async () => {
    try {
      setLoading(true);
      const res = await sparePartsAPI.getAll({ lowStock: showLowStock });
      setParts(res.parts || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingPart) {
        await sparePartsAPI.update(editingPart.id, formData);
      } else {
        await sparePartsAPI.create(formData);
      }
      setShowModal(false);
      resetForm();
      fetchParts();
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!adjustQty || parseInt(adjustQty) <= 0) {
      alert('กรุณาระบุจำนวน');
      return;
    }
    setIsSubmitting(true);
    try {
      await sparePartsAPI.adjustStock(selectedPart.id, {
        type: adjustType,
        quantity: parseInt(adjustQty),
        notes: adjustNote
      });
      setShowAdjustModal(false);
      setAdjustQty('');
      setAdjustNote('');
      fetchParts();
      if (selectedPart) {
        const res = await sparePartsAPI.getById(selectedPart.id);
        setSelectedPart(res.part);
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (part) => {
    setEditingPart(part);
    setFormData({
      part_code: part.part_code || '',
      part_name: part.part_name || '',
      description: part.description || '',
      category: part.category || '',
      unit: part.unit || 'ชิ้น',
      unit_price: part.unit_price || '',
      current_stock: part.current_stock || '',
      min_stock_level: part.min_stock_level || '',
      max_stock_level: part.max_stock_level || '',
      location: part.location || '',
      supplier: part.supplier || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingPart(null);
    setFormData({
      part_code: '',
      part_name: '',
      description: '',
      category: '',
      unit: 'ชิ้น',
      unit_price: '',
      current_stock: '',
      min_stock_level: '',
      max_stock_level: '',
      location: '',
      supplier: ''
    });
  };

  const filteredParts = parts.filter(p => 
    p.part_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.part_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: parts.length,
    lowStock: parts.filter(p => (p.current_stock || 0) <= (p.min_stock_level || 0)).length,
    totalValue: parts.reduce((sum, p) => sum + ((p.current_stock || 0) * (p.unit_price || 0)), 0)
  };

  if (loading) {
    return (
      <Card className="p-12 text-center border-dashed">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mx-auto"></div>
        <p className="mt-4 text-gray-500 font-medium">กำลังโหลดข้อมูลอะไหล่...</p>
      </Card>
    );
  }

  // Detail View
  if (selectedPart) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-800 pb-6">
          <Button variant="ghost" size="icon" onClick={() => setSelectedPart(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{selectedPart.part_name}</h1>
            <p className="text-gray-400">{selectedPart.part_code}</p>
          </div>
          <Button variant="outline" onClick={() => handleEdit(selectedPart)}>
            <Pencil className="w-4 h-4 mr-2" />
            แก้ไข
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Stock Card */}
          <Card className="border-gray-800 md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-green-500" />
                สต็อกปัจจุบัน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-5xl font-bold text-white">{selectedPart.current_stock || 0}</p>
                  <p className="text-gray-500">{selectedPart.unit}</p>
                </div>
                <Button onClick={() => { setShowAdjustModal(true); setAdjustType('in'); }} className="bg-green-600 hover:bg-green-500">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  ปรับสต็อก
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-gray-900/30 border-gray-700">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">ขั้นต่ำ</p>
                    <p className="text-xl font-bold text-amber-400">{selectedPart.min_stock_level || 0}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900/30 border-gray-700">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">ขั้นสูง</p>
                    <p className="text-xl font-bold text-blue-400">{selectedPart.max_stock_level || 0}</p>
                  </CardContent>
                </Card>
              </div>

              {(selectedPart.current_stock || 0) <= (selectedPart.min_stock_level || 0) && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400">สต็อกต่ำกว่าขั้นต่ำ ควรสั่งซื้อเพิ่ม</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-gray-800">
            <CardHeader>
              <CardTitle className="text-sm text-gray-400">รายละเอียด</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-gray-500">หมวดหมู่</p>
                <p className="text-white">{selectedPart.category || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">ราคาต่อหน่วย</p>
                <p className="text-white">฿{(selectedPart.unit_price || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">มูลค่าสต็อก</p>
                <p className="text-green-400 font-bold">
                  ฿{((selectedPart.current_stock || 0) * (selectedPart.unit_price || 0)).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">ตำแหน่งจัดเก็บ</p>
                <p className="text-white">{selectedPart.location || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">ผู้จำหน่าย</p>
                <p className="text-white">{selectedPart.supplier || '-'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Adjust Stock Modal */}
        {showAdjustModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>ปรับสต็อก</span>
                  <Button variant="ghost" size="icon" onClick={() => setShowAdjustModal(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  {[
                    { value: 'in', label: 'รับเข้า', icon: TrendingUp, color: 'green' },
                    { value: 'out', label: 'เบิกออก', icon: TrendingDown, color: 'red' },
                  ].map(t => (
                    <Button
                      key={t.value}
                      variant={adjustType === t.value ? 'default' : 'outline'}
                      className={`flex-1 ${
                        adjustType === t.value
                          ? t.value === 'in'
                            ? 'bg-green-600'
                            : 'bg-red-600'
                          : ''
                      }`}
                      onClick={() => setAdjustType(t.value)}
                    >
                      <t.icon className="w-4 h-4 mr-2" />
                      {t.label}
                    </Button>
                  ))}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">จำนวน</label>
                  <input
                    type="number"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">หมายเหตุ</label>
                  <input
                    type="text"
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                    placeholder="เหตุผลในการปรับ"
                  />
                </div>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-500" 
                  onClick={handleAdjustStock}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Package className="w-8 h-8 text-green-500" />
              จัดการอะไหล่
            </h1>
            <p className="text-gray-400 mt-1">Spare Parts Management</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-green-600 hover:bg-green-500">
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มอะไหล่
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <Package className="w-8 h-8 text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-gray-500 text-center">รายการทั้งหมด</p>
          </CardContent>
        </Card>
        <Card className={`border-gray-800 ${stats.lowStock > 0 ? 'bg-red-500/10' : 'bg-gray-900/50'}`}>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <AlertTriangle className={`w-8 h-8 mb-2 ${stats.lowStock > 0 ? 'text-red-400' : 'text-gray-500'}`} />
            <p className={`text-2xl font-bold ${stats.lowStock > 0 ? 'text-red-400' : 'text-white'}`}>{stats.lowStock}</p>
            <p className="text-xs text-gray-500 text-center">สต็อกต่ำ</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <DollarSign className="w-8 h-8 text-green-400 mb-2" />
            <p className="text-2xl font-bold text-green-400">฿{stats.totalValue.toLocaleString()}</p>
            <p className="text-xs text-gray-500 text-center">มูลค่ารวม</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="p-4 bg-gray-900/50 border-gray-800">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหารหัส, ชื่อ หรือหมวดหมู่..."
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
            />
          </div>
          <Button
            variant={showLowStock ? 'default' : 'outline'}
            onClick={() => setShowLowStock(!showLowStock)}
            className={showLowStock ? 'bg-red-600' : ''}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            สต็อกต่ำ
          </Button>
        </div>
      </Card>

      {/* Parts List */}
      {filteredParts.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Package className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-500 font-medium">
            {searchTerm ? 'ไม่พบอะไหล่ที่ค้นหา' : 'ยังไม่มีข้อมูลอะไหล่'}
          </p>
          {!searchTerm && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="mt-4 bg-green-600 hover:bg-green-500">
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มอะไหล่ชิ้นแรก
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredParts.map((part) => {
            const isLow = (part.current_stock || 0) <= (part.min_stock_level || 0);
            return (
              <Card 
                key={part.id} 
                className={`border-gray-800 hover:border-green-500/50 transition-colors cursor-pointer ${isLow ? 'border-l-4 border-l-red-500' : ''}`}
                onClick={() => setSelectedPart(part)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isLow ? 'bg-red-500/20' : 'bg-green-500/10'}`}>
                      <Package className={`w-6 h-6 ${isLow ? 'text-red-400' : 'text-green-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white truncate">{part.part_name}</h3>
                        <Badge variant="outline" className="text-[10px] border-gray-600 text-gray-400">
                          {part.part_code}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        {part.category && <span>{part.category}</span>}
                        {part.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {part.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${isLow ? 'text-red-400' : 'text-white'}`}>
                        {part.current_stock || 0}
                      </p>
                      <p className="text-xs text-gray-500">{part.unit}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-2xl border-gray-800 my-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{editingPart ? 'แก้ไขอะไหล่' : 'เพิ่มอะไหล่ใหม่'}</span>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">รหัสอะไหล่ *</label>
                    <input
                      type="text"
                      value={formData.part_code}
                      onChange={(e) => setFormData({...formData, part_code: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">ชื่ออะไหล่ *</label>
                    <input
                      type="text"
                      value={formData.part_name}
                      onChange={(e) => setFormData({...formData, part_name: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">หมวดหมู่</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">หน่วย</label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">ราคาต่อหน่วย</label>
                    <input
                      type="number"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">จำนวนปัจจุบัน</label>
                    <input
                      type="number"
                      value={formData.current_stock}
                      onChange={(e) => setFormData({...formData, current_stock: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">ขั้นต่ำ</label>
                    <input
                      type="number"
                      value={formData.min_stock_level}
                      onChange={(e) => setFormData({...formData, min_stock_level: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">ขั้นสูง</label>
                    <input
                      type="number"
                      value={formData.max_stock_level}
                      onChange={(e) => setFormData({...formData, max_stock_level: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">ตำแหน่งจัดเก็บ</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">ผู้จำหน่าย</label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                    ยกเลิก
                  </Button>
                  <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-500" disabled={isSubmitting}>
                    <Save className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

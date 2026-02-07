import { useState, useEffect } from 'react';
import { 
  Building2,
  Plus,
  Search,
  Trash2,
  Edit2,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  User,
  Shield,
  X,
  Save
} from 'lucide-react';
import { vendorsAPI, equipmentAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

export default function VendorManagement() {
  const [vendors, setVendors] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    fetchVendors();
    fetchEquipment();
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await vendorsAPI.getAll();
      setVendors(res.vendors || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipment = async () => {
    try {
      const res = await equipmentAPI.getAll();
      setEquipment(res.equipment || res || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (editData.id) {
        await vendorsAPI.update(editData.id, editData);
      } else {
        await vendorsAPI.create(editData);
      }
      fetchVendors();
      setShowModal(false);
      setEditData(null);
    } catch (error) {
      console.error('Error saving vendor:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('ยืนยันการลบผู้ขาย/ผู้ให้บริการ?')) return;
    try {
      await vendorsAPI.delete(id);
      fetchVendors();
      if (selectedVendor?.id === id) {
        setSelectedVendor(null);
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
    }
  };

  const getVendorEquipment = (vendorId) => {
    return equipment.filter(eq => eq.vendor_id === vendorId);
  };

  const getWarrantyStatus = (warrantyEnd) => {
    if (!warrantyEnd) return null;
    const endDate = new Date(warrantyEnd);
    const now = new Date();
    const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'expired', label: 'หมดประกัน', className: 'bg-gray-500/10 text-gray-400 border-gray-500/30' };
    } else if (diffDays <= 30) {
      return { status: 'expiring', label: 'ใกล้หมด', className: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    } else {
      return { status: 'active', label: 'มีประกัน', className: 'bg-green-500/10 text-green-400 border-green-500/30' };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredVendors = vendors.filter(v => 
    v.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const typeLabels = {
    supplier: 'ซัพพลายเออร์',
    manufacturer: 'ผู้ผลิต',
    service: 'ผู้ให้บริการ',
    contractor: 'ผู้รับเหมา',
  };

  if (loading) {
    return (
      <Card className="p-12 text-center border-dashed">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mx-auto"></div>
        <p className="mt-4 text-gray-500 font-medium">กำลังโหลดข้อมูล...</p>
      </Card>
    );
  }

  // Vendor Detail View
  if (selectedVendor) {
    const vendorEquipment = getVendorEquipment(selectedVendor.id);
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-gray-800 pb-6">
          <Button variant="ghost" size="icon" onClick={() => setSelectedVendor(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{selectedVendor.vendor_name}</h1>
            <p className="text-gray-400">{typeLabels[selectedVendor.vendor_type] || selectedVendor.vendor_type}</p>
          </div>
          <Button variant="outline" onClick={() => {
            setEditData(selectedVendor);
            setShowModal(true);
          }}>
            <Edit2 className="w-4 h-4 mr-2" />
            แก้ไข
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-800">
          {[
            { key: 'info', label: 'ข้อมูลทั่วไป' },
            { key: 'equipment', label: `อุปกรณ์ (${vendorEquipment.length})` },
            { key: 'warranty', label: 'การรับประกัน' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">ข้อมูลติดต่อ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { icon: User, label: 'ผู้ติดต่อ', value: selectedVendor.contact_person },
                  { icon: Phone, label: 'โทรศัพท์', value: selectedVendor.phone },
                  { icon: Mail, label: 'อีเมล', value: selectedVendor.email },
                  { icon: MapPin, label: 'ที่อยู่', value: selectedVendor.address },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-900/30 rounded-lg">
                    <item.icon className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className="text-white">{item.value || '-'}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">หมายเหตุ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-900/30 rounded-lg min-h-[150px]">
                  <p className="text-gray-300">{selectedVendor.notes || 'ไม่มีหมายเหตุ'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'equipment' && (
          <div className="space-y-4">
            {vendorEquipment.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <Building2 className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-500 font-medium">ไม่มีอุปกรณ์ที่เกี่ยวข้อง</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vendorEquipment.map(eq => {
                  const warranty = getWarrantyStatus(eq.warranty_end);
                  return (
                    <Card key={eq.id} className="border-gray-800">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-white">{eq.name}</h4>
                        <p className="text-sm text-gray-400">{eq.equipment_code}</p>
                        {warranty && (
                          <div className="mt-3">
                            <Badge className={warranty.className}>{warranty.label}</Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              หมดประกัน: {formatDate(eq.warranty_end)}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'warranty' && (
          <div className="space-y-4">
            <Card className="border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  ข้อมูลการรับประกัน
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vendorEquipment.filter(eq => eq.warranty_end).length === 0 ? (
                  <p className="text-gray-500 text-center py-8">ไม่มีข้อมูลการรับประกัน</p>
                ) : (
                  <div className="space-y-3">
                    {vendorEquipment
                      .filter(eq => eq.warranty_end)
                      .sort((a, b) => new Date(a.warranty_end) - new Date(b.warranty_end))
                      .map(eq => {
                        const warranty = getWarrantyStatus(eq.warranty_end);
                        return (
                          <div key={eq.id} className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
                            <div>
                              <h4 className="font-medium text-white">{eq.name}</h4>
                              <p className="text-sm text-gray-400">หมดประกัน: {formatDate(eq.warranty_end)}</p>
                            </div>
                            {warranty && <Badge className={warranty.className}>{warranty.label}</Badge>}
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // Vendor List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Building2 className="w-8 h-8 text-green-500" />
              จัดการผู้ขาย
            </h1>
            <p className="text-gray-400 mt-1">Vendor Management</p>
          </div>
        </div>
        <Button onClick={() => {
          setEditData({ 
            vendor_name: '', 
            vendor_type: 'supplier',
            contact_person: '',
            phone: '',
            email: '',
            address: '',
            notes: ''
          });
          setShowModal(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มผู้ขาย
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="ค้นหาผู้ขาย..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'ผู้ขายทั้งหมด', value: vendors.length },
          { label: 'ซัพพลายเออร์', value: vendors.filter(v => v.vendor_type === 'supplier').length },
          { label: 'ผู้ให้บริการ', value: vendors.filter(v => v.vendor_type === 'service').length },
          { label: 'ผู้ผลิต', value: vendors.filter(v => v.vendor_type === 'manufacturer').length },
        ].map((stat, i) => (
          <Card key={i} className="border-gray-800">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-gray-400 text-center">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Vendors Grid */}
      {filteredVendors.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Building2 className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-500 font-medium">ไม่พบผู้ขาย</p>
          <Button 
            className="mt-4"
            onClick={() => {
              setEditData({ 
                vendor_name: '', 
                vendor_type: 'supplier',
                contact_person: '',
                phone: '',
                email: '',
                address: '',
                notes: ''
              });
              setShowModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มผู้ขายใหม่
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map(vendor => (
            <Card 
              key={vendor.id} 
              className="border-gray-800 hover:border-green-500/50 transition-all cursor-pointer"
              onClick={() => setSelectedVendor(vendor)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-green-400" />
                  </div>
                  <Badge className="bg-gray-700/50 text-gray-300">
                    {typeLabels[vendor.vendor_type] || vendor.vendor_type}
                  </Badge>
                </div>
                <h3 className="font-medium text-white mb-1">{vendor.vendor_name}</h3>
                {vendor.contact_person && (
                  <p className="text-sm text-gray-400 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {vendor.contact_person}
                  </p>
                )}
                {vendor.phone && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" />
                    {vendor.phone}
                  </p>
                )}
                
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800" onClick={e => e.stopPropagation()}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setSelectedVendor(vendor)}
                  >
                    ดูรายละเอียด
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => handleDelete(vendor.id)}
                  >
                    <Trash2 className="w-4 h-4" />
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
                <CardTitle>{editData.id ? 'แก้ไขผู้ขาย' : 'เพิ่มผู้ขายใหม่'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">ชื่อบริษัท *</label>
                  <input
                    type="text"
                    value={editData.vendor_name || ''}
                    onChange={(e) => setEditData({ ...editData, vendor_name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">ประเภท</label>
                  <select
                    value={editData.vendor_type || 'supplier'}
                    onChange={(e) => setEditData({ ...editData, vendor_type: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="supplier">ซัพพลายเออร์</option>
                    <option value="manufacturer">ผู้ผลิต</option>
                    <option value="service">ผู้ให้บริการ</option>
                    <option value="contractor">ผู้รับเหมา</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">ผู้ติดต่อ</label>
                  <input
                    type="text"
                    value={editData.contact_person || ''}
                    onChange={(e) => setEditData({ ...editData, contact_person: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">โทรศัพท์</label>
                  <input
                    type="text"
                    value={editData.phone || ''}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">อีเมล</label>
                  <input
                    type="email"
                    value={editData.email || ''}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">ที่อยู่</label>
                  <textarea
                    value={editData.address || ''}
                    onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">หมายเหตุ</label>
                  <textarea
                    value={editData.notes || ''}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                  ยกเลิก
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleSave}
                  disabled={!editData.vendor_name}
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

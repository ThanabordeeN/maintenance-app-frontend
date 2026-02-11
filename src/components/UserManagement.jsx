import { useState, useEffect } from 'react';
import { usersAPI } from '../services/users';
import {
  Users, UserPlus, Edit2, Trash2, Shield, User as UserIcon,
  Search, ShieldCheck, Mail, Calendar, AlertCircle, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

const UserManagement = ({ profile }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [settings, setSettings] = useState({
    ALLOW_REGISTRATION: true,
    ALLOW_WHITELIST: true
  });
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [formData, setFormData] = useState({
    lineUserId: '',
    displayName: '',
    role: 'technician',
    status: 'active'
  });

  useEffect(() => {
    if (profile?.userId) {
      loadUsers();
      loadSettings();
    }
  }, [profile]);

  const loadSettings = async () => {
    try {
      const response = await usersAPI.getSettings();
      if (response.success) {
        setSettings({
          ALLOW_REGISTRATION: response.settings.ALLOW_REGISTRATION === 'true',
          ALLOW_WHITELIST: response.settings.ALLOW_WHITELIST === 'true'
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleToggleSetting = async (key) => {
    try {
      setUpdatingSettings(true);
      const newSettings = { ...settings, [key]: !settings[key] };
      await usersAPI.updateSettings(profile.userId, newSettings);
      setSettings(newSettings);
      showToast('อัพเดทการตั้งค่าสำเร็จ');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.list(profile.userId);
      setUsers(response.users || []);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    alert(`${type === 'error' ? 'Error: ' : ''}${message}`);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await usersAPI.add(profile.userId, formData);
      showToast('เพิ่มผู้ใช้สำเร็จ', 'success');
      setShowAddModal(false);
      setFormData({ lineUserId: '', displayName: '', role: 'technician' });
      loadUsers();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await usersAPI.update(profile.userId, selectedUser.id, {
        displayName: formData.displayName,
        role: formData.role,
        status: formData.status
      });
      showToast('อัพเดทข้อมูลสำเร็จ', 'success');
      setShowEditModal(false);
      setSelectedUser(null);
      setFormData({ lineUserId: '', displayName: '', role: 'technician' });
      loadUsers();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?')) return;

    try {
      await usersAPI.delete(profile.userId, userId);
      showToast('ลบผู้ใช้สำเร็จ', 'success');
      loadUsers();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      lineUserId: user.line_user_id,
      displayName: user.display_name,
      role: user.role,
      status: user.status
    });
    setShowEditModal(true);
  };

  const handleApproveUser = async (user) => {
    try {
      await usersAPI.update(profile.userId, user.id, { status: 'active' });
      showToast('อนุมัติผู้ใช้สำเร็จ');
      loadUsers();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleRejectUser = async (user) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะปฏิเสธผู้ใช้ ${user.display_name}?`)) return;
    try {
      await usersAPI.update(profile.userId, user.id, { status: 'rejected' });
      showToast('ปฏิเสธผู้ใช้สำเร็จ');
      loadUsers();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      moderator: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      technician: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      supervisor: 'bg-green-500/20 text-green-400 border-green-500/30',
      user: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return badges[role] || badges.technician;
  };

  const getRoleIcon = (role) => {
    return role === 'moderator' ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />;
  };

  const filteredUsers = users.filter(user =>
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.line_user_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card className="p-12 text-center border-dashed">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mx-auto"></div>
        <p className="mt-4 text-gray-500 font-medium">กำลังโหลดรายชื่อผู้ใช้...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="text-green-500" size={28} />
            User Management
          </h2>
          <p className="text-gray-400 text-sm mt-1">จัดการรายชื่อผู้ใช้งานและกำหนดสิทธิ์</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-6 py-6 font-bold shadow-lg shadow-purple-500/20 flex items-center gap-2"
        >
          <UserPlus size={20} />
          เพิ่มผู้ใช้ใหม่
        </Button>
      </div>

      {/* System Settings Toggles */}
      {profile.role === 'admin' && (
        <Card className="bg-gray-900 border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck size={16} className="text-green-500" />
              การตั้งค่าระบบความปลอดภัย
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">ระบบ Whitelist (บังคับใช้งาน)</p>
                  <p className="text-xs text-gray-500">ผู้ใช้ใหม่ทุกคนต้องได้รับการอนุมัติจากผู้ดูแลระบบก่อนเข้าใช้งาน</p>
                </div>
                <Badge className="bg-gray-800 text-gray-400 border-gray-700 font-black">MANDATORY</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-950 rounded-xl border border-gray-800">
                <div>
                  <p className="font-bold text-white">เปิดรับลงทะเบียน</p>
                  <p className="text-xs text-gray-500">อนุญาตให้คนนอกสามารถกดขอเข้าระบบเพื่อรอรับการอนุมัติได้</p>
                </div>
                <button
                  disabled={updatingSettings}
                  onClick={() => handleToggleSetting('ALLOW_REGISTRATION')}
                  className={`w-12 h-6 rounded-full transition-colors relative ${settings.ALLOW_REGISTRATION ? 'bg-green-600' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.ALLOW_REGISTRATION ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-500 group-focus-within:text-green-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="ค้นหาด้วยชื่อ หรือ Line ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-11 pr-4 py-4 bg-gray-900 border border-gray-800 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-xl"
        />
      </div>

      {/* Users Table */}
      {/* Users List (Responsive Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-gray-950/50 border-dashed border-gray-800 rounded-2xl">
            <AlertCircle className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <div className="text-gray-600 text-lg font-semibold">ไม่พบรายชื่อผู้ใช้</div>
            <p className="text-gray-500 text-sm mt-1">ลองใช้คำสำคัญอื่นในการค้นหา</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className="group relative bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all hover:shadow-lg hover:shadow-black/50"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex-none">
                  <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center border border-gray-700 group-hover:border-green-500/50 transition-colors overflow-hidden">
                    {user.picture_url ? (
                      <img src={user.picture_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="text-gray-500" size={24} />
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white text-lg truncate group-hover:text-green-400 transition-colors">
                          {user.display_name}
                        </h3>
                        {user.status === 'pending' && (
                          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-[10px] py-0 px-1.5 uppercase font-black">
                            Pending
                          </Badge>
                        )}
                        {user.status === 'rejected' && (
                          <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-[10px] py-0 px-1.5 uppercase font-black">
                            Rejected
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-mono truncate">{user.line_user_id}</p>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${getRoleBadge(user.role)}`}>
                      {getRoleIcon(user.role)}
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Overlay / Bottom Bar */}
              <div className="mt-4 pt-4 border-t border-gray-800 flex justify-end gap-2">
                {user.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleRejectUser(user)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all text-sm font-medium"
                    >
                      <X size={16} />
                      ปฏิเสธ
                    </button>
                    <button
                      onClick={() => handleApproveUser(user)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-green-400 hover:bg-green-500/10 border border-transparent hover:border-green-500/30 transition-all text-sm font-medium"
                    >
                      <ShieldCheck size={16} />
                      อนุมัติ
                    </button>
                  </>
                )}
                {user.status !== 'pending' && (
                  <>
                    <button
                      onClick={() => openEditModal(user)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-purple-400 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/30 transition-all text-sm font-medium"
                    >
                      <Edit2 size={16} />
                      แก้ไข
                    </button>
                    {user.id !== profile?.userId && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all text-sm font-medium"
                      >
                        <Trash2 size={16} />
                        ลบ
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <Card className="w-full h-full sm:h-auto sm:max-w-md border-gray-800 shadow-2xl animate-in slide-in-from-bottom duration-200 sm:zoom-in bg-gray-950 flex flex-col sm:block">
            <CardHeader className="border-b border-gray-800 pb-4">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-purple-400" />
                เพิ่มผู้ใช้ใหม่
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex-1 overflow-y-auto sm:overflow-visible">
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400">LINE User ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.lineUserId}
                    onChange={(e) => setFormData({ ...formData, lineUserId: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400">ชื่อแสดง *</label>
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="ชื่อผู้ใช้"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400">สิทธิ์การใช้งาน *</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none"
                  >
                    <option value="technician">ช่างซ่อม</option>
                    <option value="supervisor">หัวหน้างาน</option>
                    <option value="moderator">ผู้ดูแลระบบ</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4 sm:pb-0 pb-8">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 rounded-xl h-12 font-bold"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-12 font-bold"
                  >
                    บันทึกข้อมูล
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <Card className="w-full h-full sm:h-auto sm:max-w-md border-gray-800 shadow-2xl animate-in slide-in-from-bottom duration-200 sm:zoom-in bg-gray-950 flex flex-col sm:block">
            <CardHeader className="border-b border-gray-800 pb-4">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Edit2 className="w-6 h-6 text-blue-400" />
                แก้ไขข้อมูลผู้ใช้
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex-1 overflow-y-auto sm:overflow-visible">
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="space-y-2 opacity-60">
                  <label className="text-sm font-semibold text-gray-400">LINE User ID</label>
                  <input
                    type="text"
                    disabled
                    value={formData.lineUserId}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400">ชื่อแสดง *</label>
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400">สิทธิ์การใช้งาน *</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    disabled={selectedUser.role === 'admin' && selectedUser.id === profile?.userId}
                  >
                    <option value="technician">ช่างซ่อม</option>
                    <option value="supervisor">หัวหน้างาน</option>
                    <option value="moderator">ผู้ดูแลระบบ</option>
                    <option value="admin">Administator</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400">สถานะ *</label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  >
                    <option value="active">ปกติ (Active)</option>
                    <option value="pending">รอการตรวจสอบ (Pending)</option>
                    <option value="rejected">ระงับการใช้งาน (Rejected)</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4 sm:pb-0 pb-8">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedUser(null);
                    }}
                    className="flex-1 rounded-xl h-12 font-bold"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 font-bold"
                  >
                    บันทึก
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

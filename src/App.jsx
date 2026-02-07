import { useState, useEffect } from 'react';
import { RefreshCcw, AlertTriangle, Ban, ClipboardCopy, Wrench, X, Plus, LogOut, ChevronLeft } from 'lucide-react';
import useLiff from './hooks/useLiff';
import MaintenanceList from './components/MaintenanceList';
import MaintenanceForm from './components/MaintenanceForm';
import UserManagement from './components/UserManagement';
import EquipmentManagement from './components/EquipmentManagement';
import UsageLog from './components/UsageLog';
import Header from './components/Header';
import Button from './components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/Card';
// New CMMS Components
import Dashboard from './components/Dashboard';
import SparePartsManagement from './components/SparePartsManagement';
import NotificationsCenter from './components/NotificationsCenter';
import CalendarView from './components/CalendarView';
import ChecklistManager from './components/ChecklistManager';
import VendorManagement from './components/VendorManagement';
import DailyChecklist from './components/DailyChecklist';
// Procurement Components
import PurchaseRequisitionList from './components/PurchaseRequisitionList';
import PurchaseOrderList from './components/PurchaseOrderList';
import PartsReturnList from './components/PartsReturnList';

function App() {
  const { isLoggedIn, isLoading, profile, error, lineUserId, logout } = useLiff();
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentView, setCurrentView] = useState('maintenance'); // 'maintenance' or 'users'

  const handleCreateSuccess = () => {
    setShowForm(false);
    setRefreshKey(prev => prev + 1); // Refresh list
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-900/50 bg-red-950/10">
          <CardHeader className="text-center">
            <div className="bg-red-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <CardTitle className="text-red-500">เกิดข้อผิดพลาด</CardTitle>
            <CardDescription className="text-gray-400 whitespace-pre-line mt-2">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => {
                logout();
                window.location.reload();
              }}
              variant="outline"
              className="w-full border-red-900/50 hover:bg-red-900/20 text-red-400"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Logout และ Login ใหม่
            </Button>
            
            {error.includes('permission') || error.includes('scope') || error.includes('Token') ? (
              <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg text-left">
                <p className="text-sm text-yellow-500 font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> วิธีแก้ไข:
                </p>
                <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside">
                  <li>ไปที่ <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-yellow-500">LINE Developers Console</a></li>
                  <li>เลือก Provider และ Channel ของคุณ</li>
                  <li>แก้ไข LIFF app Scopes: <strong className="text-yellow-500">profile</strong> และ <strong className="text-yellow-500">openid</strong></li>
                  <li>กลับมาที่หน้านี้แล้วกด "Logout และ Login ใหม่"</li>
                </ol>
              </div>
            ) : error.includes('not found') || error.includes('not authorized') || error.includes('Unauthorized') ? (
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg text-left space-y-4">
                <div className="flex items-start gap-3">
                  <Ban className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-500 font-semibold">ไม่มีสิทธิ์เข้าถึง</p>
                    <p className="text-xs text-gray-400 mt-1">
                      LINE User ID ของคุณยังไม่ได้ถูกเพิ่มในระบบ กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์การเข้าถึง
                    </p>
                  </div>
                </div>
                {lineUserId && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-semibold">LINE User ID ของคุณ:</p>
                    <div className="flex items-center gap-2 bg-gray-900 rounded-md p-2 border border-gray-800">
                      <code className="flex-1 text-xs text-gray-300 font-mono break-all select-all">
                        {lineUserId}
                      </code>
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(lineUserId);
                          alert('คัดลอก LINE User ID แล้ว!');
                        }}
                        variant="secondary"
                        size="sm"
                        className="h-7 px-2 bg-gray-800"
                      >
                        <ClipboardCopy className="w-3.5 h-3.5 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-sm text-gray-500">
                กรุณาติดต่อผู้ดูแลระบบหากคุณควรมีสิทธิ์เข้าถึง
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">กำลังเข้าสู่ระบบ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header 
        profile={profile} 
        onLogout={logout}
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      
      <main className="container mx-auto px-4 py-8">
        {currentView === 'users' ? (
          // User Management View (Moderator Only)
          ['admin', 'moderator'].includes(profile.role) ? (
            <UserManagement profile={profile} />
          ) : (
            <Card className="border-red-900/50 bg-red-950/10 p-8 text-center max-w-2xl mx-auto">
              <Ban className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-red-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</CardTitle>
              <CardDescription className="mt-2">เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการผู้ใช้ได้</CardDescription>
              <Button
                onClick={() => setCurrentView('maintenance')}
                variant="outline"
                className="mt-6"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                กลับหน้าหลัก
              </Button>
            </Card>
          )
        ) : currentView === 'equipment' ? (
          // Equipment Management View (Moderator Only)
          ['admin', 'moderator'].includes(profile.role) ? (
            <EquipmentManagement profile={profile} />
          ) : (
            <Card className="border-red-900/50 bg-red-950/10 p-8 text-center max-w-2xl mx-auto">
              <Ban className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-red-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</CardTitle>
              <CardDescription className="mt-2">เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการเครื่องจักรได้</CardDescription>
              <Button
                onClick={() => setCurrentView('maintenance')}
                variant="outline"
                className="mt-6"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                กลับหน้าหลัก
              </Button>
            </Card>
          )
        ) : currentView === 'usage' ? (
          // Usage Log View (All Users)
          <UsageLog profile={profile} />
        ) : currentView === 'dashboard' ? (
          // Dashboard View (Admin/Moderator Only)
          ['admin', 'moderator'].includes(profile.role) ? (
            <Dashboard onBack={() => setCurrentView('maintenance')} />
          ) : (
            <Card className="border-red-900/50 bg-red-950/10 p-8 text-center max-w-2xl mx-auto">
              <Ban className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-red-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</CardTitle>
              <CardDescription className="mt-2">เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเข้าถึง Dashboard ได้</CardDescription>
              <Button onClick={() => setCurrentView('maintenance')} variant="outline" className="mt-6">
                <ChevronLeft className="w-4 h-4 mr-2" />กลับหน้าหลัก
              </Button>
            </Card>
          )
        ) : currentView === 'spareParts' ? (
          // Spare Parts Management (Moderator Only)
          ['admin', 'moderator'].includes(profile.role) ? (
            <SparePartsManagement onBack={() => setCurrentView('maintenance')} />
          ) : (
            <Card className="border-red-900/50 bg-red-950/10 p-8 text-center max-w-2xl mx-auto">
              <Ban className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-red-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</CardTitle>
              <CardDescription className="mt-2">เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการอะไหล่ได้</CardDescription>
              <Button onClick={() => setCurrentView('maintenance')} variant="outline" className="mt-6">
                <ChevronLeft className="w-4 h-4 mr-2" />กลับหน้าหลัก
              </Button>
            </Card>
          )
        ) : currentView === 'notifications' ? (
          // Notifications Center (All Users)
          <NotificationsCenter onBack={() => setCurrentView('maintenance')} profile={profile} />
        ) : currentView === 'calendar' ? (
          // Calendar View (All Users)
          <CalendarView 
            onBack={() => setCurrentView('maintenance')} 
            onSelectMaintenance={(id) => {
              // Could navigate to maintenance detail
              console.log('Selected maintenance:', id);
            }}
          />
        ) : currentView === 'checklists' ? (
          // Checklist Manager (Moderator Only)
          ['admin', 'moderator'].includes(profile.role) ? (
            <ChecklistManager onBack={() => setCurrentView('maintenance')} />
          ) : (
            <Card className="border-red-900/50 bg-red-950/10 p-8 text-center max-w-2xl mx-auto">
              <Ban className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-red-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</CardTitle>
              <CardDescription className="mt-2">เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการ Checklists ได้</CardDescription>
              <Button onClick={() => setCurrentView('maintenance')} variant="outline" className="mt-6">
                <ChevronLeft className="w-4 h-4 mr-2" />กลับหน้าหลัก
              </Button>
            </Card>
          )
        ) : currentView === 'dailyChecklist' ? (
          // Daily Checklist (All Users)
          <DailyChecklist userId={profile.userId} userName={profile.displayName} />
        ) : currentView === 'vendors' ? (
          // Vendor Management (Moderator Only)
          ['admin', 'moderator'].includes(profile.role) ? (
            <VendorManagement onBack={() => setCurrentView('maintenance')} />
          ) : (
            <Card className="border-red-900/50 bg-red-950/10 p-8 text-center max-w-2xl mx-auto">
              <Ban className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-red-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</CardTitle>
              <CardDescription className="mt-2">เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการผู้ขายได้</CardDescription>
              <Button onClick={() => setCurrentView('maintenance')} variant="outline" className="mt-6">
                <ChevronLeft className="w-4 h-4 mr-2" />กลับหน้าหลัก
              </Button>
            </Card>
          )
        ) : currentView === 'requisitions' ? (
          // Purchase Requisitions (Admin/Moderator Only)
          ['admin', 'moderator'].includes(profile.role) ? (
            <PurchaseRequisitionList 
              onBack={() => setCurrentView('maintenance')} 
              userId={profile.userId}
              userRole={profile.role}
            />
          ) : (
            <Card className="border-red-900/50 bg-red-950/10 p-8 text-center max-w-2xl mx-auto">
              <Ban className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-red-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</CardTitle>
              <CardDescription className="mt-2">เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถอนุมัติใบขอเบิกได้</CardDescription>
              <Button onClick={() => setCurrentView('maintenance')} variant="outline" className="mt-6">
                <ChevronLeft className="w-4 h-4 mr-2" />กลับหน้าหลัก
              </Button>
            </Card>
          )
        ) : currentView === 'purchaseOrders' ? (
          // Purchase Orders (Admin/Moderator Only)
          ['admin', 'moderator'].includes(profile.role) ? (
            <PurchaseOrderList 
              onBack={() => setCurrentView('maintenance')} 
              userId={profile.userId}
              userRole={profile.role}
            />
          ) : (
            <Card className="border-red-900/50 bg-red-950/10 p-8 text-center max-w-2xl mx-auto">
              <Ban className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-red-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</CardTitle>
              <CardDescription className="mt-2">เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการใบสั่งซื้อได้</CardDescription>
              <Button onClick={() => setCurrentView('maintenance')} variant="outline" className="mt-6">
                <ChevronLeft className="w-4 h-4 mr-2" />กลับหน้าหลัก
              </Button>
            </Card>
          ) : currentView === 'partsReturns' ? (
          // Parts Returns (Admin/Moderator Only)
          ['admin', 'moderator'].includes(profile.role) ? (
            <PartsReturnList 
              onBack={() => setCurrentView('maintenance')} 
              userId={profile.userId}
              userRole={profile.role}
            />
          ) : (
            <Card className="border-red-900/50 bg-red-950/10 p-8 text-center max-w-2xl mx-auto">
              <Ban className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-red-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</CardTitle>
              <CardDescription className="mt-2">เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการใบขอคืนได้</CardDescription>
              <Button onClick={() => setCurrentView('maintenance')} variant="outline" className="mt-6">
                <ChevronLeft className="w-4 h-4 mr-2" />กลับหน้าหลัก
              </Button>
            </Card>
          )        ) : (
          // Maintenance View (All Users)
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-6">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Wrench className="w-8 h-8 text-green-500" />
                  ระบบแจ้งซ่อม
                </h1>
                <p className="text-gray-400 mt-1">ติดตามและรายงานสถานะเครื่องจักรในโรงงาน</p>
              </div>
              <Button
                onClick={() => setShowForm(!showForm)}
                className={showForm ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-green-600 hover:bg-green-500'}
              >
                {showForm ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    ปิดฟอร์ม
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    แจ้งซ่อมใหม่
                  </>
                )}
              </Button>
            </div>

            <MaintenanceList key={refreshKey} />

            {/* Modal Maintenance Form */}
            {showForm && (
              <MaintenanceForm 
                userId={profile.userId} 
                onSuccess={handleCreateSuccess}
                onCancel={() => setShowForm(false)}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

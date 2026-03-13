import { useState } from 'react';
import { RefreshCcw, AlertTriangle, Ban, ClipboardCopy, Wrench, X, Plus, LogOut, ChevronLeft, Gauge, Crown, Shield, Eye } from 'lucide-react';
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
import NotificationsCenter from './components/NotificationsCenter';


function App() {
  const { isLoggedIn, isLoading, profile, error, lineUserId, logout, devLogin, isDev, liff } = useLiff();
  const [showForm, setShowForm] = useState(false);
  const [showUsageLog, setShowUsageLog] = useState(false);
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400 mb-6">กำลังเข้าสู่ระบบ...</p>

          {/* Dev Login Buttons - Only shown in development mode */}
          {isDev && (
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <div className="flex items-center gap-2 justify-center mb-3">
                <Wrench className="w-5 h-5 text-yellow-500" />
                <span className="text-yellow-500 font-semibold">Development Mode</span>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Skip LINE LIFF authentication for local development
              </p>

              <div className="grid gap-2">
                <button
                  onClick={() => devLogin('admin')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-500 hover:to-indigo-500 text-white font-medium transition-all duration-200 shadow-lg shadow-purple-500/20 text-sm"
                >
                  <Crown className="w-4 h-4" />
                  Login as Admin
                </button>


                <button
                  onClick={() => devLogin('supervisor')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 rounded-lg hover:from-orange-500 hover:to-amber-500 text-white font-medium transition-all duration-200 shadow-lg shadow-orange-500/20 text-sm"
                >
                  <Eye className="w-4 h-4" />
                  Login as Supervisor
                </button>

                <button
                  onClick={() => devLogin('technician')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg hover:from-blue-500 hover:to-cyan-500 text-white font-medium transition-all duration-200 shadow-lg shadow-blue-500/20 text-sm"
                >
                  <Wrench className="w-4 h-4" />
                  Login as Technician
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                Instantly switch between roles for testing
              </p>
            </div>
          )}

          {/* Manual LIFF Login (only shown in Dev when not auto-redirecting) */}
          {isDev && !isLoggedIn && (
            <button
              onClick={() => liff.login()}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 border border-green-500/30 rounded-lg hover:bg-gray-700 text-green-400 font-medium transition-all duration-200"
            >
              Line Login (Real)
            </button>
          )}
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
          // User Management View (Admin Only)
          profile.role === 'admin' ? (
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
          // Equipment Management View (Admin + Supervisor)
          ['admin', 'supervisor'].includes(profile.role) ? (
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

        
        ) : currentView === 'notifications' ? (
          // Notifications Center (All Users)
          <NotificationsCenter onBack={() => setCurrentView('maintenance')} profile={profile} />
        ) : (     // Maintenance View (All Users)
          <div className="space-y-8">
            <div className="space-y-6">
              {/* Hero Section */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-900/50 to-emerald-950/30 border border-green-500/20 p-6 sm:p-10 shadow-2xl shadow-green-900/10">
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="p-2 bg-green-500/20 rounded-lg backdrop-blur-sm">
                        <Wrench className="w-6 h-6 text-green-400" />
                      </div>
                      <span className="text-green-400 font-medium tracking-wide text-sm uppercase">Maintenance System</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                      ระบบแจ้งซ่อมออนไลน์
                    </h1>
                    <p className="text-green-100/60 text-lg max-w-lg">
                      ติดตามสถานะเครื่องจักรและจัดการงานซ่อมบำรุงอย่างมีประสิทธิภาพ
                    </p>
                  </div>
                  {/* Stats or Decor could go here */}
                </div>

                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-green-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowForm(true)}
                  className="group relative overflow-hidden p-6 rounded-2xl bg-gray-900/80 border border-gray-800 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-900/20 text-left"
                >
                  <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:bg-green-500/20">
                      <Plus className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-green-400 transition-colors">แจ้งซ่อมใหม่</h3>
                      <p className="text-sm text-gray-500 mt-1">Create Request</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => setShowUsageLog(true)}
                  className="group relative overflow-hidden p-6 rounded-2xl bg-gray-900/80 border border-gray-800 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-900/20 text-left"
                >
                  <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:bg-cyan-500/20">
                      <Gauge className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">บันทึกการใช้งาน</h3>
                      <p className="text-sm text-gray-500 mt-1">Log Usage</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
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

              {/* Modal Usage Log */}
              {showUsageLog && (
                <UsageLog
                  userId={profile?.userId}
                  onClose={() => setShowUsageLog(false)}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

import { useState } from 'react';
import { Shield, Wrench, LogOut, User, LayoutDashboard, Package, Gauge, Bell, Calendar, ClipboardList, ClipboardCheck, Building2, ChevronDown, BarChart3, Cog } from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';
import NotificationBell from './NotificationBell';

const Header = ({ profile, onLogout, currentView, onViewChange }) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  return (
    <header className="bg-gray-950 shadow-sm border-b border-gray-800 sticky top-0 z-40 backdrop-blur-md bg-gray-950/80">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-black shadow-lg shadow-green-500/20">
              <Wrench className="w-6 h-6" />
            </div>
            <div className="hidden xs:block">
              <h1 className="text-lg font-bold text-white leading-tight">Maintenance</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold font-mono">SmartQuary EVR</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            {/* Desktop Navigation */}
            {profile && (
              <nav className="hidden md:flex items-center gap-1">
                <Button
                  variant={currentView === 'maintenance' ? 'secondary' : 'ghost'}
                  onClick={() => onViewChange('maintenance')}
                  size="sm"
                  className={currentView === 'maintenance' ? 'bg-gray-800 text-green-400' : ''}
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  แจ้งซ่อม
                </Button>
                <Button
                  variant={currentView === 'dashboard' ? 'secondary' : 'ghost'}
                  onClick={() => onViewChange('dashboard')}
                  size="sm"
                  className={currentView === 'dashboard' ? 'bg-gray-800 text-blue-400' : ''}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                <Button
                  variant={currentView === 'calendar' ? 'secondary' : 'ghost'}
                  onClick={() => onViewChange('calendar')}
                  size="sm"
                  className={currentView === 'calendar' ? 'bg-gray-800 text-indigo-400' : ''}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  ปฏิทิน
                </Button>
                <Button
                  variant={currentView === 'usage' ? 'secondary' : 'ghost'}
                  onClick={() => onViewChange('usage')}
                  size="sm"
                  className={currentView === 'usage' ? 'bg-gray-800 text-cyan-400' : ''}
                >
                  <Gauge className="w-4 h-4 mr-2" />
                  Usage Log
                </Button>
                <Button
                  variant={currentView === 'dailyChecklist' ? 'secondary' : 'ghost'}
                  onClick={() => onViewChange('dailyChecklist')}
                  size="sm"
                  className={currentView === 'dailyChecklist' ? 'bg-gray-800 text-green-400' : ''}
                >
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  Daily Check
                </Button>
                
                {/* More Menu (Admin) */}
                {['admin', 'moderator'].includes(profile.role) && (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className={['equipment', 'spareParts', 'checklists', 'vendors', 'users'].includes(currentView) ? 'bg-gray-800 text-amber-400' : ''}
                    >
                      <Cog className="w-4 h-4 mr-2" />
                      จัดการ
                      <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} />
                    </Button>
                    
                    {showMoreMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                        <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-50 py-1">
                          <button
                            onClick={() => { onViewChange('equipment'); setShowMoreMenu(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-800 transition-colors ${currentView === 'equipment' ? 'text-blue-400' : 'text-gray-300'}`}
                          >
                            <Package className="w-4 h-4" />
                            อุปกรณ์
                          </button>
                          <button
                            onClick={() => { onViewChange('spareParts'); setShowMoreMenu(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-800 transition-colors ${currentView === 'spareParts' ? 'text-emerald-400' : 'text-gray-300'}`}
                          >
                            <Cog className="w-4 h-4" />
                            อะไหล่
                          </button>
                          <button
                            onClick={() => { onViewChange('checklists'); setShowMoreMenu(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-800 transition-colors ${currentView === 'checklists' ? 'text-teal-400' : 'text-gray-300'}`}
                          >
                            <ClipboardList className="w-4 h-4" />
                            Checklists
                          </button>
                          <button
                            onClick={() => { onViewChange('vendors'); setShowMoreMenu(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-800 transition-colors ${currentView === 'vendors' ? 'text-amber-400' : 'text-gray-300'}`}
                          >
                            <Building2 className="w-4 h-4" />
                            ผู้ขาย
                          </button>
                          <div className="border-t border-gray-800 my-1" />
                          <button
                            onClick={() => { onViewChange('users'); setShowMoreMenu(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-800 transition-colors ${currentView === 'users' ? 'text-purple-400' : 'text-gray-300'}`}
                          >
                            <Shield className="w-4 h-4" />
                            ผู้ใช้
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                {/* Notifications Bell */}
                <NotificationBell profile={profile} onViewChange={onViewChange} />
              </nav>
            )}
          
            {profile && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-white leading-none">{profile.displayName}</p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      {['admin', 'moderator'].includes(profile.role) && (
                        <Badge variant="default" className="bg-purple-500/10 text-purple-400 border-purple-500/20 py-0 px-1.5 text-[10px]">
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="relative group">
                    <img
                      src={profile.pictureUrl}
                      alt={profile.displayName}
                      className="w-9 h-9 rounded-full border border-gray-700 ring-2 ring-transparent group-hover:ring-green-500/50 transition-all object-cover"
                      style={{ width: '36px', height: '36px', maxWidth: '36px', maxHeight: '36px' }}
                    />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-gray-950 rounded-full"></div>
                  </div>
                </div>
                
                <div className="h-6 w-px bg-gray-800 hidden sm:block"></div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onLogout}
                  className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 h-9 w-9"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {profile && (
          <nav className="md:hidden flex gap-1 mt-4 pt-3 border-t border-gray-900 overflow-x-auto pb-1">
            <Button
              variant={currentView === 'maintenance' ? 'secondary' : 'ghost'}
              onClick={() => onViewChange('maintenance')}
              className={`flex-shrink-0 text-xs px-2 ${currentView === 'maintenance' ? 'text-green-400' : ''}`}
              size="sm"
            >
              <Wrench className="w-4 h-4 mr-1" />
              แจ้งซ่อม
            </Button>
            <Button
              variant={currentView === 'dashboard' ? 'secondary' : 'ghost'}
              onClick={() => onViewChange('dashboard')}
              className={`flex-shrink-0 text-xs px-2 ${currentView === 'dashboard' ? 'text-blue-400' : ''}`}
              size="sm"
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              Dashboard
            </Button>
            <Button
              variant={currentView === 'calendar' ? 'secondary' : 'ghost'}
              onClick={() => onViewChange('calendar')}
              className={`flex-shrink-0 text-xs px-2 ${currentView === 'calendar' ? 'text-indigo-400' : ''}`}
              size="sm"
            >
              <Calendar className="w-4 h-4 mr-1" />
              ปฏิทิน
            </Button>
            <Button
              variant={currentView === 'usage' ? 'secondary' : 'ghost'}
              onClick={() => onViewChange('usage')}
              className={`flex-shrink-0 text-xs px-2 ${currentView === 'usage' ? 'text-cyan-400' : ''}`}
              size="sm"
            >
              <Gauge className="w-4 h-4 mr-1" />
              Usage
            </Button>
            <Button
              variant={currentView === 'dailyChecklist' ? 'secondary' : 'ghost'}
              onClick={() => onViewChange('dailyChecklist')}
              className={`flex-shrink-0 text-xs px-2 ${currentView === 'dailyChecklist' ? 'text-green-400' : ''}`}
              size="sm"
            >
              <ClipboardCheck className="w-4 h-4 mr-1" />
              Daily
            </Button>
            {['admin', 'moderator'].includes(profile.role) && (
              <>
                <Button
                  variant={currentView === 'spareParts' ? 'secondary' : 'ghost'}
                  onClick={() => onViewChange('spareParts')}
                  className={`flex-shrink-0 text-xs px-2 ${currentView === 'spareParts' ? 'text-emerald-400' : ''}`}
                  size="sm"
                >
                  <Cog className="w-4 h-4 mr-1" />
                  อะไหล่
                </Button>
                <Button
                  variant={currentView === 'equipment' ? 'secondary' : 'ghost'}
                  onClick={() => onViewChange('equipment')}
                  className={`flex-shrink-0 text-xs px-2 ${currentView === 'equipment' ? 'text-blue-400' : ''}`}
                  size="sm"
                >
                  <Package className="w-4 h-4 mr-1" />
                  อุปกรณ์
                </Button>
                <Button
                  variant={currentView === 'checklists' ? 'secondary' : 'ghost'}
                  onClick={() => onViewChange('checklists')}
                  className={`flex-shrink-0 text-xs px-2 ${currentView === 'checklists' ? 'text-teal-400' : ''}`}
                  size="sm"
                >
                  <ClipboardList className="w-4 h-4 mr-1" />
                  Checklist
                </Button>
                <Button
                  variant={currentView === 'vendors' ? 'secondary' : 'ghost'}
                  onClick={() => onViewChange('vendors')}
                  className={`flex-shrink-0 text-xs px-2 ${currentView === 'vendors' ? 'text-amber-400' : ''}`}
                  size="sm"
                >
                  <Building2 className="w-4 h-4 mr-1" />
                  ผู้ขาย
                </Button>
                <Button
                  variant={currentView === 'users' ? 'secondary' : 'ghost'}
                  onClick={() => onViewChange('users')}
                  className={`flex-shrink-0 text-xs px-2 ${currentView === 'users' ? 'text-purple-400' : ''}`}
                  size="sm"
                >
                  <Shield className="w-4 h-4 mr-1" />
                  ผู้ใช้
                </Button>
              </>
            )}
            <Button
              variant={currentView === 'notifications' ? 'secondary' : 'ghost'}
              onClick={() => onViewChange('notifications')}
              className={`flex-shrink-0 text-xs px-2 ${currentView === 'notifications' ? 'text-purple-400' : ''}`}
              size="sm"
            >
              <Bell className="w-4 h-4" />
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;

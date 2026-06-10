import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  AlertTriangle,
  Wrench,
  Package,
  Calendar,
  Settings,
  ArrowLeft,
  Smartphone,
  X
} from 'lucide-react';
import { notificationsAPI } from '../services/api';
import { formatThaiDateTime } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { registerPush, unregisterPush } from '../hooks/usePushNotification';

// ── Push state helpers ─────────────────────────────────────────────────────────

function getBrowserPushState() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

async function hasPushSubscription() {
  if (!('serviceWorker' in navigator)) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

// ── Toggle component ───────────────────────────────────────────────────────────

function Toggle({ on, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      className={`w-12 h-6 rounded-full transition-all ${on ? 'bg-green-500' : 'bg-gray-600'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function NotificationsCenter({ profile }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState(null);

  // Push state
  const [pushState, setPushState] = useState('default'); // 'default'|'granted'|'denied'|'unsupported'
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const userId = profile?.id || profile?.userId;

  // ── Fetch data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchNotifications();
    fetchPreferences();
    refreshPushState();
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.getAll(userId);
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await notificationsAPI.getPreferences(userId);
      setPreferences(res.preferences);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshPushState = useCallback(async () => {
    const state = getBrowserPushState();
    setPushState(state);
    if (state === 'granted') {
      const subscribed = await hasPushSubscription();
      setPushSubscribed(subscribed);
    } else {
      setPushSubscribed(false);
    }
  }, []);

  // ── Push toggle ─────────────────────────────────────────────────────────────

  const handlePushToggle = async (enable) => {
    if (pushLoading) return;
    setPushLoading(true);
    try {
      if (enable) {
        await registerPush(userId);
        await refreshPushState();
      } else {
        await unregisterPush();
        await refreshPushState();
      }
    } catch (e) {
      console.error('Push toggle error:', e);
    } finally {
      setPushLoading(false);
    }
  };

  // push toggle is ON when: permission granted AND subscribed
  const pushOn = pushState === 'granted' && pushSubscribed;

  // ── In-app preference toggle ────────────────────────────────────────────────

  const handleUpdatePreference = async (key, value) => {
    try {
      const newPrefs = { ...preferences, [key]: value };
      setPreferences(newPrefs);
      await notificationsAPI.updatePreferences(userId, { [key]: value });
    } catch (e) {
      console.error(e);
    }
  };

  // ── Notification list helpers ───────────────────────────────────────────────

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { console.error(e); }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) { console.error(e); }
  };

  const getIcon = (category) => {
    switch (category) {
      case 'maintenance': return Wrench;
      case 'parts': return Package;
      case 'schedule': return Calendar;
      default: return Bell;
    }
  };

  const getIconStyle = (type) => {
    switch (type) {
      case 'warning': return 'bg-amber-500/10 text-amber-400';
      case 'error': return 'bg-red-500/10 text-red-400';
      case 'success': return 'bg-green-500/10 text-green-400';
      default: return 'bg-blue-500/10 text-blue-400';
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
    return formatThaiDateTime(dateString);
  };

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Card className="p-12 text-center border-dashed">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mx-auto" />
        <p className="mt-4 text-gray-500 font-medium">กำลังโหลดการแจ้งเตือน...</p>
      </Card>
    );
  }

  // ── Preferences view ────────────────────────────────────────────────────────

  if (showPreferences) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-800 pb-6">
          <Button variant="ghost" size="icon" onClick={() => setShowPreferences(false)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Settings className="w-6 h-6 text-green-500" />
            ตั้งค่าการแจ้งเตือน
          </h1>
        </div>

        {/* ── Channel toggles ── */}
        <Card className="border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">ช่องทางการแจ้งเตือน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* In-app */}
            {preferences && (
              <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-white">แจ้งเตือนในแอป</p>
                    <p className="text-xs text-gray-500">แสดงใน Notification Center</p>
                  </div>
                </div>
                <Toggle
                  on={preferences.enable_in_app}
                  onChange={(v) => handleUpdatePreference('enable_in_app', v)}
                />
              </div>
            )}

            {/* Push */}
            <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-white">Push Notification</p>
                  <p className="text-xs text-gray-500">
                    {pushState === 'unsupported' && 'browser ไม่รองรับ'}
                    {pushState === 'denied' && (
                      <span className="text-yellow-400">
                        ถูกบล็อก — กด 🔒 ที่ address bar → Allow
                      </span>
                    )}
                    {pushState === 'default' && 'แจ้งเตือนแม้ปิด tab แล้ว'}
                    {pushState === 'granted' && pushSubscribed && 'เปิดอยู่ — แจ้งเตือนแม้ปิด tab แล้ว'}
                    {pushState === 'granted' && !pushSubscribed && 'ยังไม่ได้ subscribe'}
                  </p>
                </div>
              </div>
              {pushState === 'denied' || pushState === 'unsupported' ? (
                <Toggle on={false} onChange={() => {}} disabled />
              ) : (
                <Toggle
                  on={pushOn}
                  onChange={handlePushToggle}
                  disabled={pushLoading}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Event type toggles ── */}
        <Card className="border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">ประเภทการแจ้งเตือน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {preferences && [
              { key: 'notify_new_ticket', label: 'ใบงานใหม่' },
              { key: 'notify_assigned', label: 'ได้รับมอบหมายงาน' },
              { key: 'notify_status_change', label: 'สถานะเปลี่ยน' },
              { key: 'notify_overdue', label: 'งานเกินกำหนด / PM ใกล้ถึง' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
                <span className="text-white">{item.label}</span>
                <Toggle
                  on={preferences[item.key]}
                  onChange={(v) => handleUpdatePreference(item.key, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Notification list ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Bell className="w-8 h-8 text-green-500" />
          การแจ้งเตือน
          {unreadCount > 0 && <Badge className="bg-red-500 text-white">{unreadCount}</Badge>}
        </h1>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              อ่านทั้งหมด
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setShowPreferences(true)}>
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <BellOff className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-500 font-medium">ไม่มีการแจ้งเตือน</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = getIcon(notification.category);
            return (
              <Card
                key={notification.id}
                className={`border-gray-800 cursor-pointer transition-all hover:border-green-500/50 ${!notification.is_read ? 'border-l-4 border-l-green-500 bg-green-500/5' : ''}`}
                onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getIconStyle(notification.type)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-white">{notification.title}</h3>
                        {!notification.is_read && <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-2" />}
                      </div>
                      {notification.message && <p className="text-sm text-gray-400 mt-1">{notification.message}</p>}
                      <p className="text-xs text-gray-500 mt-2">{formatTime(notification.created_at)}</p>
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

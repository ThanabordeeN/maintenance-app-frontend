import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { registerPush } from '../hooks/usePushNotification';

export default function PushNotificationBanner({ userId }) {
  const [state, setState] = useState('idle'); // idle | asking | granted | denied | unsupported

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'granted') setState('granted');
    else if (Notification.permission === 'denied') setState('denied');
    // default → idle (show banner)
  }, []);

  async function handleAllow() {
    setState('asking');
    try {
      await registerPush(userId);
      // registerPush calls requestPermission internally
      if (Notification.permission === 'granted') setState('granted');
      else setState('denied');
    } catch {
      setState('denied');
    }
  }

  // granted หรือ unsupported → ไม่แสดงอะไร
  if (state === 'granted' || state === 'unsupported' || state === 'idle-dismissed') return null;

  // denied → บอก user วิธีเปิดใน settings
  if (state === 'denied') {
    return (
      <div className="mx-4 mt-4 p-3 rounded-lg border border-yellow-800/50 bg-yellow-950/20 flex items-start gap-3">
        <BellOff className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-yellow-400 font-medium">การแจ้งเตือนถูกบล็อกไว้</p>
          <p className="text-xs text-gray-400 mt-0.5">
            กดไอคอน 🔒 ที่ address bar → Notifications → Allow
          </p>
        </div>
      </div>
    );
  }

  // default → show banner prompt
  return (
    <div className="mx-4 mt-4 p-3 rounded-lg border border-green-800/50 bg-green-950/20 flex items-center gap-3">
      <Bell className="w-5 h-5 text-green-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium">เปิดการแจ้งเตือน</p>
        <p className="text-xs text-gray-400">รับแจ้งเตือนเมื่อมีงานใหม่หรือสถานะเปลี่ยน</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleAllow}
          disabled={state === 'asking'}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white transition-colors"
        >
          {state === 'asking' ? 'กำลังขอ...' : 'เปิดเลย'}
        </button>
        <button
          onClick={() => setState('idle-dismissed')}
          className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

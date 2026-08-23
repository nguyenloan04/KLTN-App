import { useState, useCallback, useEffect, useRef } from 'react';
import { DeviceEventEmitter, AppState, AppStateStatus } from 'react-native';
import { request } from '@/services/apiClient';

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  dataJson: string | null;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await request<number>('/api/notifications/unread-count');
      setUnreadCount(data);
    } catch (e) {
      console.log('Error fetching unread count', e);
    }
  }, []);

  const fetchNotifications = useCallback(async (reset = false) => {
    try {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      const currentPage = reset ? 0 : pageRef.current;
      const data = await request<any>(`/api/notifications?page=${currentPage}&size=20`);
      if (data) {
        const content = data.content;
        setNotifications(prev => reset ? content : [...prev, ...content]);
        setHasMore(!data.last);
        pageRef.current = currentPage + 1;
        setPage(pageRef.current);
      }
    } catch (e) {
      console.log('Error fetching notifications', e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await request<void>(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      DeviceEventEmitter.emit('notificationRead');
    } catch (e) {
      console.log('Error marking as read', e);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await request<void>('/api/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      DeviceEventEmitter.emit('notificationRead');
    } catch (e) {
      console.log('Error marking all as read', e);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    
    const subscription = DeviceEventEmitter.addListener('notificationRead', () => {
      fetchUnreadCount();
    });

    const pushSubscription = DeviceEventEmitter.addListener('notificationReceived', () => {
      fetchUnreadCount();
      fetchNotifications(true);
    });

    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        fetchUnreadCount();
      }
    });

    return () => {
      subscription.remove();
      pushSubscription.remove();
      appStateSubscription.remove();
    };
  }, [fetchUnreadCount, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    hasMore,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead
  };
}

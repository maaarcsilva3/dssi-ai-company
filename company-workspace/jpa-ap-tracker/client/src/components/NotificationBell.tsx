import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationsPayload {
  items: NotificationItem[];
  unreadCount: number;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<NotificationsPayload>('/notifications?limit=30'),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const unread = q.data?.unreadCount ?? 0;

  return (
    <div className="notif-bell" ref={ref}>
      <button
        type="button"
        className={`tab notif-trigger${open ? ' active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
      >
        Notifications
        {unread > 0 && <span className="notif-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <strong>Notifications</strong>
            <button
              type="button"
              className="btn ghost small notif-mark-all"
              disabled={!unread || markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              Mark all read
            </button>
          </div>
          {(q.data?.items.length ?? 0) === 0 && <p className="notif-empty">No notifications.</p>}
          {q.data?.items.map((n) => (
            <div
              key={n.id}
              className={`notif-item${n.read_at ? '' : ' unread'}`}
              onClick={() => {
                if (!n.read_at) markRead.mutate(n.id);
                if (n.link) {
                  setOpen(false);
                  navigate(n.link);
                }
              }}
            >
              <div className="notif-title">{n.title}</div>
              {n.body && <div className="notif-body">{n.body}</div>}
              <div className="notif-time">{new Date(n.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

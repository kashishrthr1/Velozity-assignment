import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ActivityFeedItem } from '../types';
import { activityApi } from '../api/activity';
import { useSocket } from '../context/SocketContext';

interface ActivityFeedProps {
  projectId?: string; // if provided, join that project room
}

export function ActivityFeed({ projectId }: ActivityFeedProps) {
  const { socket, isConnected } = useSocket();
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const lastEventTimeRef = React.useRef<string>(new Date().toISOString());

  const loadInitial = useCallback(async () => {
    try {
      const data = await activityApi.getAll();
      setItems(data);
      if (data.length > 0) {
        lastEventTimeRef.current = data[0].createdAt;
      }
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // Join project room when projectId is provided
  useEffect(() => {
    if (!socket || !projectId) return;
    socket.emit('joinProject', projectId);
    return () => { socket.emit('leaveProject', projectId); };
  }, [socket, projectId]);

  // Real-time activity events
  useEffect(() => {
    if (!socket) return;

    const handleActivity = (data: { message: string; taskId: string; projectId: string; timestamp: string }) => {
      const newItem: ActivityFeedItem = {
        id: `live-${Date.now()}`,
        projectId: data.projectId,
        userId: '',
        taskId: data.taskId,
        actionType: 'STATUS_CHANGED',
        message: data.message,
        createdAt: data.timestamp,
      };
      setItems((prev) => [newItem, ...prev.slice(0, 49)]);
      lastEventTimeRef.current = data.timestamp;
    };

    socket.on('activity', handleActivity);
    return () => { socket.off('activity', handleActivity); };
  }, [socket]);

  // Catch-up on reconnect
  useEffect(() => {
    if (!socket) return;

    const handleCatchup = (events: ActivityFeedItem[]) => {
      if (events.length === 0) return;
      setItems((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const newEvents = events.filter((e) => !existingIds.has(e.id));
        return [...newEvents, ...prev].slice(0, 50);
      });
    };

    socket.on('catchupEvents', handleCatchup);

    socket.on('connect', () => {
      // On reconnect, request missed events
      socket.emit('catchup', { since: lastEventTimeRef.current });
    });

    return () => {
      socket.off('catchupEvents', handleCatchup);
      socket.off('connect');
    };
  }, [socket]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-brand-600" />
          <h3 className="font-semibold text-sm">Live Activity Feed</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <><Wifi size={14} className="text-green-500" /><span className="text-xs text-green-500">Live</span></>
          ) : (
            <><WifiOff size={14} className="text-gray-400" /><span className="text-xs text-gray-400">Offline</span></>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">No activity yet</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.id} className="p-3 hover:bg-gray-50 transition-colors">
                <p className="text-sm text-gray-700">{item.message}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

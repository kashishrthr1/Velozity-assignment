import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, AlertTriangle, Users, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { projectsApi } from '../api/projects';
import { ActivityFeed } from '../components/ActivityFeed';
import { StatusBadge, PriorityBadge, OverdueBadge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useSocket } from '../context/SocketContext';
import type { AdminStats, PMStats, DevStats, Task } from '../types';

export function DashboardPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [stats, setStats] = useState<AdminStats | PMStats | DevStats | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await projectsApi.getStats();
        setStats(data);
        if (user?.role === 'ADMIN') {
          setOnlineCount((data as AdminStats).onlineUsers);
        }
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  // Live online count via WebSocket (Admin only)
  useEffect(() => {
    if (!socket || user?.role !== 'ADMIN') return;
    const handleCount = (data: { count: number }) => setOnlineCount(data.count);
    socket.on('onlineCount', handleCount);
    return () => { socket.off('onlineCount', handleCount); };
  }, [socket, user]);

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name}</p>
      </div>

      {user?.role === 'ADMIN' && stats && <AdminDashboard stats={stats as AdminStats} onlineCount={onlineCount} />}
      {user?.role === 'PROJECT_MANAGER' && stats && <PMDashboard stats={stats as PMStats} />}
      {user?.role === 'DEVELOPER' && stats && <DevDashboard stats={stats as DevStats} />}
    </div>
  );
}

function AdminDashboard({ stats, onlineCount }: { stats: AdminStats; onlineCount: number }) {
  const taskStatusMap: Record<string, number> = {};
  stats.tasksByStatus.forEach((t) => { taskStatusMap[t.status] = t._count; });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<FolderKanban className="text-brand-600" />} label="Total Projects" value={stats.totalProjects} color="blue" />
        <StatCard icon={<AlertTriangle className="text-red-500" />} label="Overdue Tasks" value={stats.overdueCount} color="red" />
        <StatCard icon={<CheckCircle className="text-green-500" />} label="Completed Tasks" value={taskStatusMap['DONE'] || 0} color="green" />
        <StatCard icon={<Users className="text-purple-500" />} label="Users Online" value={onlineCount} color="purple" live />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><TrendingUp size={16} /> Tasks by Status</h3>
          <div className="space-y-3">
            {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].map((s) => (
              <div key={s} className="flex items-center justify-between">
                <StatusBadge status={s as 'TODO'} />
                <span className="font-semibold text-sm">{taskStatusMap[s] || 0}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 h-96">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}

function PMDashboard({ stats }: { stats: PMStats }) {
  const priorityMap: Record<string, number> = {};
  stats.tasksByPriority.forEach((t) => { priorityMap[t.priority] = t._count; });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<FolderKanban className="text-brand-600" />} label="My Projects" value={stats.projects.length} color="blue" />
        <StatCard icon={<AlertTriangle className="text-red-500" />} label="Critical Tasks" value={priorityMap['CRITICAL'] || 0} color="red" />
        <StatCard icon={<Clock className="text-orange-500" />} label="Due This Week" value={stats.upcomingTasks.length} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-sm mb-4">My Projects</h3>
          <div className="space-y-3">
            {stats.projects.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-gray-400">{p._count?.tasks} tasks</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>{p.status}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Clock size={16} /> Due This Week</h3>
          <div className="space-y-3">
            {stats.upcomingTasks.length === 0 ? (
              <p className="text-sm text-gray-400">No upcoming deadlines</p>
            ) : stats.upcomingTasks.map((t) => (
              <div key={t.id} className="flex items-start justify-between p-3 rounded-lg border border-gray-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-gray-400">{t.assignedTo?.name} · {t.project?.name}</p>
                </div>
                <PriorityBadge priority={t.priority} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="h-80"><ActivityFeed /></div>
    </div>
  );
}

function DevDashboard({ stats }: { stats: DevStats }) {
  const overdue = stats.tasks.filter((t) => t.isOverdue);
  const inProgress = stats.tasks.filter((t) => t.status === 'IN_PROGRESS');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<FolderKanban className="text-brand-600" />} label="My Tasks" value={stats.tasks.length} color="blue" />
        <StatCard icon={<AlertCircle className="text-orange-500" />} label="In Progress" value={inProgress.length} color="orange" />
        <StatCard icon={<AlertTriangle className="text-red-500" />} label="Overdue" value={overdue.length} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-sm mb-4">My Tasks (sorted by priority + due date)</h3>
            <div className="space-y-3">
              {stats.tasks.length === 0 ? (
                <p className="text-sm text-gray-400">No tasks assigned yet</p>
              ) : stats.tasks.map((t: Task) => (
                <Link key={t.id} to={`/projects/${t.projectId}`} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      {t.isOverdue && <OverdueBadge />}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{t.project?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="h-96"><ActivityFeed /></div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, color, live,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'red' | 'green' | 'purple' | 'orange';
  live?: boolean;
}) {
  const colorMap = {
    blue: 'bg-blue-50',
    red: 'bg-red-50',
    green: 'bg-green-50',
    purple: 'bg-purple-50',
    orange: 'bg-orange-50',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
        {live && (
          <span className="flex items-center gap-1 text-xs text-green-500">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </span>
        )}
      </div>
      <p className="text-2xl font-bold mt-3">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

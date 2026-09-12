import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectsApi } from '../api/projects';
import { tasksApi } from '../api/tasks';
import { usersApi } from '../api/users';
import { TaskCard } from '../components/TaskCard';
import { TaskFiltersBar } from '../components/TaskFilters';
import { ActivityFeed } from '../components/ActivityFeed';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { Task, User, Project, TaskFilters } from '../types';
import toast from 'react-hot-toast';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [developers, setDevelopers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Initialize filters from URL params
  const [filters, setFilters] = useState<TaskFilters>({
    status: (searchParams.get('status') as TaskFilters['status']) || undefined,
    priority: (searchParams.get('priority') as TaskFilters['priority']) || undefined,
    dueDateFrom: searchParams.get('dueDateFrom') || undefined,
    dueDateTo: searchParams.get('dueDateTo') || undefined,
  });

  const [form, setForm] = useState({
    title: '', description: '', assignedToId: '', priority: 'MEDIUM',
    status: 'TODO', dueDate: '',
  });

  const loadTasks = useCallback(async () => {
    if (!id) return;
    try {
      const data = await tasksApi.getByProject(id, filters);
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  }, [id, filters]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const [p, devs] = await Promise.all([
          projectsApi.getById(id),
          usersApi.getDevelopers().catch(() => []),
        ]);
        setProject(p);
        setDevelopers(devs);
      } catch {
        toast.error('Failed to load project');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setCreating(true);
    try {
      await tasksApi.create({
        ...form,
        projectId: id,
        dueDate: new Date(form.dueDate).toISOString(),
        assignedToId: form.assignedToId || undefined,
      });
      toast.success('Task created');
      setShowCreate(false);
      loadTasks();
    } catch {
      toast.error('Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (!project) return <div className="text-center py-20 text-gray-500">Project not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/projects" className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-gray-500 text-sm">{project.client?.name} · {project.createdBy?.name}</p>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER') && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700"
          >
            <Plus size={16} /> Add Task
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <TaskFiltersBar filters={filters} onFiltersChange={setFilters} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-gray-400">No tasks found</div>
            ) : (
              tasks.map((t) => <TaskCard key={t.id} task={t} onUpdated={loadTasks} />)
            )}
          </div>
        </div>
        <div className="h-96 xl:h-auto">
          <ActivityFeed projectId={id} />
        </div>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Task" size="lg">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Assign To</label>
              <select value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Unassigned</option>
                {developers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due Date *</label>
              <input type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)}
              className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={creating}
              className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-60">
              {creating ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

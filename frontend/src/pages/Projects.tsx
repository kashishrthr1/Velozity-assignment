import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, FolderKanban } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { projectsApi } from '../api/projects';
import { clientsApi } from '../api/clients';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { Project, Client } from '../types';
import toast from 'react-hot-toast';

export function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', clientId: '', status: 'ACTIVE' });

  const load = async () => {
    try {
      const [p, c] = await Promise.all([projectsApi.getAll(), clientsApi.getAll().catch(() => [])]);
      setProjects(p);
      setClients(c);
    } catch (err) {
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await projectsApi.create(form);
      toast.success('Project created');
      setShowCreate(false);
      setForm({ name: '', description: '', clientId: '', status: 'ACTIVE' });
      load();
    } catch {
      toast.error('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 text-sm mt-1">{projects.length} project(s)</p>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER') && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 transition-colors"
          >
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow block">
            <div className="flex items-start justify-between mb-3">
              <FolderKanban size={20} className="text-brand-600 mt-0.5" />
              <span className={`text-xs px-2 py-1 rounded-full ${
                p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                p.status === 'ON_HOLD' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>{p.status.replace('_', ' ')}</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{p.name}</h3>
            {p.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{p.description}</p>}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
              <span>{p.client?.name}</span>
              <span>{p._count?.tasks} tasks</span>
            </div>
          </Link>
        ))}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Project">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
            <select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Select a client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)}
              className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={creating}
              className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-60">
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

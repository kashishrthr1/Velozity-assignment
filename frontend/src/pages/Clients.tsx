import React, { useState, useEffect } from 'react';
import { Building2, Plus, Mail, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clientsApi } from '../api/clients';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { Client } from '../types';
import toast from 'react-hot-toast';

export function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' });

  const load = async () => {
    try {
      const data = await clientsApi.getAll();
      setClients(data);
    } catch { toast.error('Failed to load clients'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await clientsApi.create(form);
      toast.success('Client created');
      setShowCreate(false);
      setForm({ name: '', email: '', phone: '', company: '' });
      load();
    } catch { toast.error('Failed to create client'); }
    finally { setCreating(false); }
  };

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-gray-500 text-sm">{clients.length} client(s)</p>
        </div>
        {user?.role === 'ADMIN' && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700">
            <Plus size={16} /> New Client
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
                <Building2 size={18} className="text-brand-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{c.name}</h3>
                <p className="text-xs text-gray-500">{c.company}</p>
              </div>
            </div>
            <div className="space-y-1.5 text-sm text-gray-600">
              <div className="flex items-center gap-2"><Mail size={14} /><span>{c.email}</span></div>
              {c.phone && <div className="flex items-center gap-2"><Phone size={14} /><span>{c.phone}</span></div>}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Client">
        <form onSubmit={handleCreate} className="space-y-4">
          {(['name', 'email', 'phone', 'company'] as const).map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium mb-1 capitalize">{field}{field !== 'phone' ? ' *' : ''}</label>
              <input type={field === 'email' ? 'email' : 'text'} required={field !== 'phone'}
                value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          ))}
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

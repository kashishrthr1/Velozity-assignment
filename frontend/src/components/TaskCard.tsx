import React from 'react';
import { Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import type { Task, TaskStatus } from '../types';
import { StatusBadge, PriorityBadge, OverdueBadge } from './ui/Badge';
import { tasksApi } from '../api/tasks';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface TaskCardProps {
  task: Task;
  onUpdated: () => void;
}

const STATUS_OPTIONS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export function TaskCard({ task, onUpdated }: TaskCardProps) {
  const { user } = useAuth();

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      await tasksApi.update(task.id, { status: newStatus });
      toast.success('Task status updated');
      onUpdated();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const canChangeStatus = user?.role !== 'ADMIN' || true; // all roles can change status of accessible tasks

  return (
    <div className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow ${
      task.isOverdue ? 'border-red-300' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-sm text-gray-900 flex-1">{task.title}</h4>
        <div className="flex flex-col gap-1 items-end">
          <StatusBadge status={task.status} />
          {task.isOverdue && <OverdueBadge />}
        </div>
      </div>
      {task.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>}
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <div className="flex items-center gap-1">
          <Calendar size={12} />
          <span className={task.isOverdue ? 'text-red-500 font-medium' : ''}>
            {format(new Date(task.dueDate), 'MMM d, yyyy')}
          </span>
        </div>
        {task.assignedTo && (
          <div className="flex items-center gap-1">
            <User size={12} />
            <span>{task.assignedTo.name}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <PriorityBadge priority={task.priority} />
        {canChangeStatus && task.status !== 'DONE' && (
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer hover:border-brand-500"
            onClick={(e) => e.stopPropagation()}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

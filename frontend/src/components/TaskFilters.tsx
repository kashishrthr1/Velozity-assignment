import React from 'react';
import { useSearchParams } from 'react-router-dom';
import type { TaskStatus, TaskPriority, TaskFilters } from '../types';

interface TaskFiltersProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
}

export function TaskFiltersBar({ filters, onFiltersChange }: TaskFiltersProps) {
  const [, setSearchParams] = useSearchParams();

  const update = (key: keyof TaskFilters, value: string | undefined) => {
    const next = { ...filters, [key]: value || undefined };
    // Remove undefined keys
    Object.keys(next).forEach((k) => {
      if (next[k as keyof TaskFilters] === undefined) delete next[k as keyof TaskFilters];
    });
    onFiltersChange(next);
    // Sync to URL
    const params: Record<string, string> = {};
    if (next.status) params.status = next.status;
    if (next.priority) params.priority = next.priority;
    if (next.dueDateFrom) params.dueDateFrom = next.dueDateFrom;
    if (next.dueDateTo) params.dueDateTo = next.dueDateTo;
    setSearchParams(params);
  };

  const clearAll = () => {
    onFiltersChange({});
    setSearchParams({});
  };

  const hasFilters = Object.keys(filters).length > 0;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={filters.status || ''}
        onChange={(e) => update('status', e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="">All Statuses</option>
        <option value="TODO">To Do</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="IN_REVIEW">In Review</option>
        <option value="DONE">Done</option>
      </select>

      <select
        value={filters.priority || ''}
        onChange={(e) => update('priority', e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="">All Priorities</option>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="CRITICAL">Critical</option>
      </select>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500">From:</label>
        <input
          type="date"
          value={filters.dueDateFrom ? filters.dueDateFrom.split('T')[0] : ''}
          onChange={(e) => update('dueDateFrom', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500">To:</label>
        <input
          type="date"
          value={filters.dueDateTo ? filters.dueDateTo.split('T')[0] : ''}
          onChange={(e) => update('dueDateTo', e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : undefined)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {hasFilters && (
        <button onClick={clearAll} className="text-sm text-red-500 hover:text-red-700 underline">
          Clear filters
        </button>
      )}
    </div>
  );
}

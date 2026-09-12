export type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isOnline?: boolean;
  lastSeen?: string;
  createdAt?: string;
}

export interface AuthUser extends User {
  // same as User, just re-exported for clarity
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  clientId: string;
  createdById: string;
  client?: { id: string; name: string };
  createdBy?: { id: string; name: string };
  _count?: { tasks: number };
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  isOverdue: boolean;
  projectId: string;
  assignedToId?: string;
  createdById: string;
  assignedTo?: { id: string; name: string; email: string };
  createdBy?: { id: string; name: string };
  project?: { id: string; name: string; createdById: string };
  taskLogs?: TaskLog[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskLog {
  id: string;
  taskId: string;
  changedById: string;
  oldStatus?: TaskStatus;
  newStatus: TaskStatus;
  note?: string;
  createdAt: string;
  changedBy?: { name: string };
}

export interface ActivityFeedItem {
  id: string;
  projectId?: string;
  userId: string;
  taskId?: string;
  actionType: string;
  message: string;
  createdAt: string;
  user?: { name: string };
  task?: { title: string };
}

export interface Notification {
  id: string;
  userId: string;
  taskId?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  task?: { title: string; projectId: string };
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export interface AdminStats {
  totalProjects: number;
  tasksByStatus: Array<{ status: TaskStatus; _count: number }>;
  overdueCount: number;
  onlineUsers: number;
}

export interface PMStats {
  projects: Project[];
  tasksByPriority: Array<{ priority: TaskPriority; _count: number }>;
  upcomingTasks: Task[];
}

export interface DevStats {
  tasks: Task[];
}

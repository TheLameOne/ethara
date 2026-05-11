export interface User {
  id: string
  name: string
  email: string
  created_at: string
}

export interface ProjectMember {
  user: User
  role: 'admin' | 'member'
}

export interface Project {
  id: string
  name: string
  description: string | null
  created_by: string | null
  created_at: string
  members: ProjectMember[]
}

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Task {
  id: string
  title: string
  description: string | null
  due_date: string | null
  priority: TaskPriority
  status: TaskStatus
  project_id: string
  assigned_to: string | null
  created_by: string | null
  created_at: string
  assignee: User | null
  assignees: User[]
}

export interface OverdueTaskItem {
  id: string
  title: string
  project_name: string
  due_date: string
  priority: string
}

export interface UpcomingTaskItem {
  id: string
  title: string
  project_name: string
  due_date: string
  priority: string
}

export interface DashboardStats {
  total_tasks: number
  todo: number
  in_progress: number
  done: number
  overdue: number
  completion_rate: number
  tasks_per_user: { user_id: string; user_name: string; task_count: number }[]
  priority_breakdown: { high: number; medium: number; low: number }
  recent_overdue: OverdueTaskItem[]
  upcoming_tasks: UpcomingTaskItem[]
}

export interface Token {
  access_token: string
  token_type: string
}

import api from './client'
import type { Task } from '@/types'

export const tasksApi = {
  list: (projectId: string) =>
    api.get<Task[]>(`/projects/${projectId}/tasks`).then((r) => r.data),

  get: (taskId: string) =>
    api.get<Task>(`/tasks/${taskId}`).then((r) => r.data),

  create: (
    projectId: string,
    data: {
      title: string
      description?: string
      due_date?: string
      priority: string
      assignee_ids?: string[]
    },
  ) => api.post<Task>(`/projects/${projectId}/tasks`, data).then((r) => r.data),

  update: (taskId: string, data: Partial<Task> & { assignee_ids?: string[] }) =>
    api.put<Task>(`/tasks/${taskId}`, data).then((r) => r.data),

  delete: (taskId: string) => api.delete(`/tasks/${taskId}`),
}

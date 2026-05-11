import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { projectsApi } from '@/api/projects'
import { tasksApi } from '@/api/tasks'
import { useAuthStore } from '@/store/authStore'
import type { Task, TaskStatus } from '@/types'
import {
  ArrowLeft,
  Plus,
  UserPlus,
  Trash2,
  Calendar,
  AlertCircle,
  X,
} from 'lucide-react'
import { format, isPast, parseISO } from 'date-fns'
import { listVariants, itemVariants, backdropVariants, modalVariants } from '@/lib/animations'

const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'todo', label: 'To Do', color: 'bg-surface-card text-body-strong' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-accent-teal/10 text-accent-teal' },
  { key: 'done', label: 'Done', color: 'bg-success/10 text-success' },
]

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-surface-card text-muted',
  medium: 'bg-accent-amber/10 text-accent-amber',
  high: 'bg-error/10 text-error',
}

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  assignee_ids: z.array(z.string()),
})
type TaskForm = z.infer<typeof taskSchema>

const memberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']),
})
type MemberForm = z.infer<typeof memberSchema>

function TaskCard({
  task,
  isAdmin,
  onStatusChange,
  onDelete,
}: {
  task: Task
  isAdmin: boolean
  onStatusChange: (id: string, status: TaskStatus) => void
  onDelete: (id: string) => void
}) {
  const isOverdue =
    task.due_date && task.status !== 'done' && isPast(parseISO(task.due_date))
  const isDone = task.status === 'done'

  return (
    <motion.div
      className={`bg-canvas border border-hairline rounded-lg p-4 space-y-2 cursor-default transition-opacity ${isDone ? 'opacity-60' : ''}`}
      whileHover={{ y: -2, boxShadow: '0 4px 16px rgba(20,20,19,0.06)' }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-medium text-body-strong leading-snug ${isDone ? 'line-through' : ''}`}>{task.title}</p>
        {isAdmin && (
          <button
            onClick={() => onDelete(task.id)}
            className="text-hairline hover:text-error transition-colors shrink-0"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-muted line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[task.priority]}`}
        >
          {task.priority}
        </span>
        {task.due_date && (
          <span
            className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-error' : 'text-muted-soft'}`}
          >
            {isOverdue && <AlertCircle size={11} />}
            <Calendar size={11} />
            {format(parseISO(task.due_date), 'MMM d')}
          </span>
        )}
        {task.assignees && task.assignees.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {task.assignees.map((a) => (
              <span
                key={a.id}
                title={a.name}
                className="w-5 h-5 rounded-full bg-surface-cream-strong text-ink flex items-center justify-center text-[10px] font-bold shrink-0"
              >
                {a.name[0].toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex rounded-md border border-hairline overflow-hidden">
        {COLUMNS.map((col) => (
          <button
            key={col.key}
            type="button"
            onClick={() => onStatusChange(task.id, col.key)}
            className={`flex-1 py-1 text-[11px] font-medium font-sans transition-colors ${
              task.status === col.key
                ? col.color
                : 'bg-canvas text-muted hover:text-body-strong'
            }`}
          >
            {col.label}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  })

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => tasksApi.list(id!),
    enabled: !!id,
  })

  const isAdmin =
    project?.members.find((m) => m.user.id === currentUser?.id)?.role === 'admin'

  const createTaskMut = useMutation({
    mutationFn: (data: TaskForm) =>
      tasksApi.create(id!, {
        title: data.title,
        description: data.description,
        due_date: data.due_date || undefined,
        priority: data.priority,
        assignee_ids: data.assignee_ids,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Task created')
      setShowTaskModal(false)
      resetTask()
    },
    onError: () => toast.error('Failed to create task'),
  })

  const updateStatusMut = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      tasksApi.update(taskId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const deleteTaskMut = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Task deleted')
    },
    onError: () => toast.error('Failed to delete task'),
  })

  const addMemberMut = useMutation({
    mutationFn: (data: MemberForm) => projectsApi.addMember(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] })
      toast.success('Member added')
      setShowMemberModal(false)
      resetMember()
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to add member'
      toast.error(msg)
    },
  })

  const removeMemberMut = useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(id!, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] })
      toast.success('Member removed')
    },
    onError: () => toast.error('Failed to remove member'),
  })

  const {
    register: registerTask,
    handleSubmit: handleTaskSubmit,
    reset: resetTask,
    watch: watchTask,
    setValue: setTaskValue,
    formState: { errors: taskErrors },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: 'medium', assignee_ids: [] },
  })

  const {
    register: registerMember,
    handleSubmit: handleMemberSubmit,
    reset: resetMember,
    formState: { errors: memberErrors },
  } = useForm<MemberForm>({
    resolver: zodResolver(memberSchema),
    defaultValues: { role: 'member' },
  })

  if (loadingProject) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-hairline rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 bg-hairline rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!project) return <div className="text-muted">Project not found</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/projects"
          className="flex items-center gap-1 text-sm text-muted hover:text-ink mb-3 transition-colors"
        >
          <ArrowLeft size={14} /> Projects
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-[36px] font-normal text-ink tracking-[-0.5px] leading-[1.15]">{project.name}</h1>
            {project.description && (
              <p className="text-muted text-sm mt-1">{project.description}</p>
            )}
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <motion.button
                onClick={() => setShowMemberModal(true)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 text-sm font-medium font-sans border border-hairline text-muted hover:border-primary hover:text-ink px-3 h-9 rounded-md transition-colors"
              >
                <UserPlus size={14} /> Add Member
              </motion.button>
              <motion.button
                onClick={() => setShowTaskModal(true)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 text-sm font-medium font-sans bg-primary text-on-primary hover:bg-primary-active px-3 h-9 rounded-md transition-colors"
              >
                <Plus size={14} /> Add Task
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Members */}
      <motion.div
        className="flex items-center gap-2 flex-wrap"
        variants={listVariants}
        initial="hidden"
        animate="show"
      >
          <span className="text-xs text-muted font-medium uppercase tracking-[1.5px]">
          Members:
        </span>
        {project.members.map((m) => (
          <motion.div
            key={m.user.id}
            variants={itemVariants}
            className="flex items-center gap-1.5 bg-surface-card border border-hairline rounded-full px-3 py-1 text-xs"
          >
            <span className="w-5 h-5 rounded-full bg-surface-cream-strong text-ink flex items-center justify-center font-bold text-[10px]">
              {m.user.name[0].toUpperCase()}
            </span>
            <span className="text-body-strong">{m.user.name}</span>
            <span
              className={`text-[10px] uppercase tracking-[1.5px] font-medium ${
                m.role === 'admin' ? 'text-primary' : 'text-muted'
              }`}
            >
              {m.role}
            </span>
            {isAdmin && m.user.id !== currentUser?.id && (
              <button
                onClick={() => setConfirmRemoveId(m.user.id)}
                className="w-5 h-5 flex items-center justify-center rounded text-muted hover:text-error hover:bg-error/10 ml-1 transition-colors shrink-0"
                title="Remove member"
              >
                <X size={11} />
              </button>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Kanban board */}
      {loadingTasks ? (
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 bg-hairline rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          variants={listVariants}
          initial="hidden"
          animate="show"
        >
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key)
            return (
              <motion.div key={col.key} className="space-y-3" variants={itemVariants}>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${col.color}`}>
                    {col.label}
                  </span>
                  <span className="text-xs text-muted-soft">{colTasks.length}</span>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isAdmin={!!isAdmin}
                      onStatusChange={(taskId, status) =>
                        updateStatusMut.mutate({ taskId, status })
                      }
                      onDelete={(taskId) => deleteTaskMut.mutate(taskId)}
                    />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="border-2 border-dashed border-hairline rounded-lg h-20 flex items-center justify-center">
                      <span className="text-xs text-muted-soft">No tasks</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Create Task Modal */}
      <AnimatePresence>
      {showTaskModal && (
        <motion.div
          className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.target === e.currentTarget && (setShowTaskModal(false), resetTask())}
        >
          <motion.div
            className="bg-canvas border border-hairline rounded-lg p-6 w-full max-w-md"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-2xl font-normal text-ink tracking-[-0.3px]">New Task</h2>
              <button
                type="button"
                onClick={() => { setShowTaskModal(false); resetTask() }}
                className="w-8 h-8 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface-card transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <form
              onSubmit={handleTaskSubmit((d) => createTaskMut.mutate(d))}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-body-strong font-sans mb-1.5">
                  Title *
                </label>
                <input
                  {...registerTask('title')}
                  className="w-full bg-canvas border border-hairline rounded-md px-[14px] py-[10px] text-sm text-ink h-10 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow"
                />
                {taskErrors.title && (
                  <p className="text-error text-xs mt-1">{taskErrors.title.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-body-strong font-sans mb-1.5">
                  Description
                </label>
                <textarea
                  {...registerTask('description')}
                  rows={3}
                  className="w-full bg-canvas border border-hairline rounded-md px-[14px] py-[10px] text-sm text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none transition-shadow"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-body-strong font-sans mb-1.5">
                    Due Date
                  </label>
                  <input
                    {...registerTask('due_date')}
                    type="date"
                    className="w-full bg-canvas border border-hairline rounded-md px-[14px] py-[10px] text-sm text-ink h-10 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-body-strong font-sans mb-1.5">
                    Priority
                  </label>
                  <select
                    {...registerTask('priority')}
                    className="w-full bg-canvas border border-hairline rounded-md px-[14px] py-[10px] text-sm text-ink h-10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/15"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-body-strong font-sans mb-1.5">
                  Assignees
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto border border-hairline rounded-md px-3 py-2">
                  {project.members.map((m) => {
                    const ids = watchTask('assignee_ids') ?? []
                    return (
                      <label key={m.user.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ids.includes(m.user.id)}
                          onChange={(e) => {
                            const cur = watchTask('assignee_ids') ?? []
                            setTaskValue(
                              'assignee_ids',
                              e.target.checked
                                ? [...cur, m.user.id]
                                : cur.filter((uid) => uid !== m.user.id),
                            )
                          }}
                          className="rounded border-hairline accent-primary"
                        />
                        <span className="text-sm text-body-strong font-sans">{m.user.name}</span>
                        <span className="text-xs text-muted">{m.role}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowTaskModal(false); resetTask() }}
                  className="px-4 h-10 text-sm font-sans text-body-strong bg-canvas border border-hairline rounded-md hover:border-primary hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={createTaskMut.isPending}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-4 h-10 text-sm font-sans bg-primary text-on-primary rounded-md hover:bg-primary-active disabled:opacity-60"
                >
                  {createTaskMut.isPending ? 'Creating…' : 'Create'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Add Member Modal */}
      <AnimatePresence>
      {showMemberModal && (
        <motion.div
          className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.target === e.currentTarget && (setShowMemberModal(false), resetMember())}
        >
          <motion.div
            className="bg-canvas border border-hairline rounded-lg p-6 w-full max-w-sm"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-2xl font-normal text-ink tracking-[-0.3px]">Add Member</h2>
              <button
                type="button"
                onClick={() => { setShowMemberModal(false); resetMember() }}
                className="w-8 h-8 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface-card transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <form
              onSubmit={handleMemberSubmit((d) => addMemberMut.mutate(d))}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-body-strong font-sans mb-1.5">
                  Email *
                </label>
                <input
                  {...registerMember('email')}
                  type="email"
                  placeholder="user@example.com"
                  className="w-full bg-canvas border border-hairline rounded-md px-[14px] py-[10px] text-sm text-ink h-10 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow"
                />
                {memberErrors.email && (
                  <p className="text-error text-xs mt-1">{memberErrors.email.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-body-strong font-sans mb-1.5">
                  Role
                </label>
                <select
                  {...registerMember('role')}
                  className="w-full bg-canvas border border-hairline rounded-md px-[14px] py-[10px] text-sm text-ink h-10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/15"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowMemberModal(false); resetMember() }}
                  className="px-4 h-10 text-sm font-sans text-body-strong bg-canvas border border-hairline rounded-md hover:border-primary hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={addMemberMut.isPending}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-4 h-10 text-sm font-sans bg-primary text-on-primary rounded-md hover:bg-primary-active disabled:opacity-60"
                >
                  {addMemberMut.isPending ? 'Adding…' : 'Add'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Confirm Remove Member dialog */}
      <AnimatePresence>
        {confirmRemoveId && (
          <motion.div
            className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.target === e.currentTarget && setConfirmRemoveId(null)}
          >
            <motion.div
              className="bg-canvas border border-hairline rounded-lg p-6 w-full max-w-sm shadow-lg"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-display text-2xl font-normal text-ink tracking-[-0.3px]">Remove member?</h2>
                <button
                  type="button"
                  onClick={() => setConfirmRemoveId(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface-card transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm text-muted font-sans mb-6">
                This member will lose access to the project and all its tasks.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmRemoveId(null)}
                  className="px-4 h-10 text-sm font-sans text-body-strong bg-canvas border border-hairline rounded-md hover:border-primary hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={() => {
                    removeMemberMut.mutate(confirmRemoveId)
                    setConfirmRemoveId(null)
                  }}
                  disabled={removeMemberMut.isPending}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-4 h-10 text-sm font-sans bg-error text-white rounded-md hover:bg-error/90 disabled:opacity-60 transition-colors"
                >
                  Remove
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

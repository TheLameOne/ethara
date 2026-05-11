import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { dashboardApi } from '@/api/dashboard'
import type { OverdueTaskItem, UpcomingTaskItem } from '@/types'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListTodo,
  Circle,
  Users,
  TrendingUp,
  CalendarDays,
  CalendarClock,
} from 'lucide-react'
import { listVariants, itemVariants } from '@/lib/animations'

// ── helpers ──────────────────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string, variant: 'overdue' | 'upcoming') {
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)

  if (variant === 'overdue') {
    if (diff === 0) return 'Today'
    if (diff === -1) return 'Yesterday'
    return `${Math.abs(diff)}d ago`
  }
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `In ${diff}d`
}

const priorityConfig: Record<string, { label: string; dot: string; bar: string; text: string }> = {
  high:   { label: 'High',   dot: 'bg-error',        bar: 'bg-error',        text: 'text-error' },
  medium: { label: 'Medium', dot: 'bg-accent-amber',  bar: 'bg-accent-amber', text: 'text-accent-amber' },
  low:    { label: 'Low',    dot: 'bg-success',       bar: 'bg-success',      text: 'text-success' },
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, color,
}: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -2, boxShadow: '0 4px 16px rgba(20,20,19,0.06)' }}
      className="bg-surface-card border border-hairline rounded-lg p-5 flex items-center gap-4 cursor-default"
    >
      <div className={`p-2.5 rounded-md shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="font-display text-3xl font-normal text-ink leading-none">{value}</p>
        <p className="text-xs text-muted font-sans mt-1 truncate">{label}</p>
      </div>
    </motion.div>
  )
}

function CompletionRing({ pct }: { pct: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0 -rotate-90">
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" className="stroke-hairline" />
      <motion.circle
        cx="32" cy="32" r={r} fill="none" strokeWidth="5"
        strokeLinecap="round"
        className="stroke-success"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
      />
    </svg>
  )
}

function PriorityBar({ count, total, colorKey, delay }: {
  count: number; total: number; colorKey: string; delay: number
}) {
  const cfg = priorityConfig[colorKey]
  const pct = total > 0 ? Math.min(100, (count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
      <span className="text-sm text-body-strong font-sans w-14 shrink-0">{cfg.label}</span>
      <div className="flex-1 h-1.5 bg-hairline rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${cfg.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay, ease: 'easeOut' }}
        />
      </div>
      <span className="text-sm text-muted tabular-nums w-5 text-right shrink-0">{count}</span>
    </div>
  )
}

function TaskRow({ item, variant }: { item: OverdueTaskItem | UpcomingTaskItem; variant: 'overdue' | 'upcoming' }) {
  const cfg = priorityConfig[item.priority] ?? priorityConfig.medium
  const rel = formatRelativeDate(item.due_date, variant)
  const dateColor = variant === 'overdue' ? 'text-error' : 'text-muted'
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-hairline-soft last:border-0">
      <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-body-strong font-sans truncate">{item.title}</p>
        <p className="text-xs text-muted font-sans mt-0.5 truncate">{item.project_name}</p>
      </div>
      <span className={`text-xs font-sans tabular-nums shrink-0 ${dateColor}`}>{rel}</span>
    </div>
  )
}

// ── loading skeleton ──────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-hairline rounded-md" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-hairline rounded-lg" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="h-40 bg-hairline rounded-lg" />
        <div className="h-40 bg-hairline rounded-lg" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="h-52 bg-hairline rounded-lg" />
        <div className="h-52 bg-hairline rounded-lg" />
      </div>
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.stats,
  })

  if (isLoading) return <DashboardSkeleton />
  if (!data) return null

  const totalForPriority = data.priority_breakdown.high + data.priority_breakdown.medium + data.priority_breakdown.low

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <h1 className="font-display text-[48px] font-normal text-ink tracking-[-1px] leading-[1.1]">Dashboard</h1>
        <p className="text-muted text-sm font-sans mt-1">Overview of all tasks across your projects</p>
      </motion.div>

      {/* Section 1 — 6 stat cards */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 gap-4"
        variants={listVariants}
        initial="hidden"
        animate="show"
      >
        <StatCard label="Total Tasks"  value={data.total_tasks}  icon={<ListTodo   size={18} className="text-primary"      />} color="bg-primary/10" />
        <StatCard label="To Do"        value={data.todo}          icon={<Circle     size={18} className="text-muted"        />} color="bg-surface-cream-strong" />
        <StatCard label="In Progress"  value={data.in_progress}   icon={<Clock      size={18} className="text-accent-teal"  />} color="bg-accent-teal/10" />
        <StatCard label="Done"         value={data.done}          icon={<CheckCircle2 size={18} className="text-success"    />} color="bg-success/10" />
        <StatCard label="Overdue"      value={data.overdue}       icon={<AlertTriangle size={18} className="text-error"    />} color="bg-error/10" />
        {/* Completion card — custom layout */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -2, boxShadow: '0 4px 16px rgba(20,20,19,0.06)' }}
          className="bg-surface-card border border-hairline rounded-lg p-5 flex items-center gap-3 cursor-default"
        >
          <CompletionRing pct={data.completion_rate} />
          <div>
            <p className="font-display text-3xl font-normal text-ink leading-none">{data.completion_rate}%</p>
            <p className="text-xs text-muted font-sans mt-1">Completion</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Section 2 — Priority breakdown + Tasks per member */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Priority breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-surface-card border border-hairline rounded-lg p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-muted" />
            <h2 className="text-sm font-medium text-body-strong font-sans">Priority breakdown</h2>
          </div>
          <div className="space-y-4">
            <PriorityBar count={data.priority_breakdown.high}   total={totalForPriority} colorKey="high"   delay={0.3} />
            <PriorityBar count={data.priority_breakdown.medium} total={totalForPriority} colorKey="medium" delay={0.36} />
            <PriorityBar count={data.priority_breakdown.low}    total={totalForPriority} colorKey="low"    delay={0.42} />
          </div>
        </motion.div>

        {/* Tasks per member */}
        {data.tasks_per_user.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="bg-surface-card border border-hairline rounded-lg p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Users size={16} className="text-muted" />
              <h2 className="text-sm font-medium text-body-strong font-sans">Tasks per member</h2>
            </div>
            <div className="space-y-4">
              {data.tasks_per_user.map((row, i) => (
                <div key={row.user_id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-surface-cream-strong text-ink flex items-center justify-center text-xs font-bold shrink-0">
                    {row.user_name[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-body-strong font-sans">{row.user_name}</span>
                      <span className="text-muted tabular-nums text-xs">{row.task_count}</span>
                    </div>
                    <div className="h-1.5 bg-hairline rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (row.task_count / (data.total_tasks || 1)) * 100)}%` }}
                        transition={{ duration: 0.8, delay: 0.35 + i * 0.06, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="bg-surface-card border border-hairline rounded-lg p-6 flex items-center justify-center"
          >
            <div className="text-center">
              <Users size={28} className="text-muted mx-auto mb-2" />
              <p className="text-sm text-muted font-sans">No assignments yet</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Section 3 — Overdue + Upcoming */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Overdue tasks */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="bg-surface-card border border-hairline rounded-lg p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock size={16} className="text-error" />
            <h2 className="text-sm font-medium text-body-strong font-sans">Overdue tasks</h2>
            {data.overdue > 5 && (
              <span className="ml-auto text-xs font-medium font-sans bg-error/10 text-error px-2 py-0.5 rounded-full">
                +{data.overdue - 5} more
              </span>
            )}
          </div>
          {data.recent_overdue.length > 0 ? (
            <div>
              {data.recent_overdue.map((item) => (
                <TaskRow key={item.id} item={item} variant="overdue" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle2 size={28} className="text-success mb-2" />
              <p className="text-sm text-success font-sans font-medium">No overdue tasks</p>
              <p className="text-xs text-muted font-sans mt-0.5">Everything is on track</p>
            </div>
          )}
        </motion.div>

        {/* Upcoming this week */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-surface-card border border-hairline rounded-lg p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={16} className="text-accent-teal" />
            <h2 className="text-sm font-medium text-body-strong font-sans">Upcoming this week</h2>
          </div>
          {data.upcoming_tasks.length > 0 ? (
            <div>
              {data.upcoming_tasks.map((item) => (
                <TaskRow key={item.id} item={item} variant="upcoming" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CalendarDays size={28} className="text-muted mb-2" />
              <p className="text-sm text-muted font-sans font-medium">All clear for the week</p>
              <p className="text-xs text-muted font-sans mt-0.5">No tasks due in the next 7 days</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

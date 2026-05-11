import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { projectsApi } from '@/api/projects'
import { Plus, ChevronRight, Folder } from 'lucide-react'
import { listVariants, itemVariants, backdropVariants, modalVariants } from '@/lib/animations'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export function ProjectsPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  })

  const createMut = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project created')
      setShowModal(false)
      reset()
    },
    onError: () => toast.error('Failed to create project'),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[48px] font-normal text-ink tracking-[-1px] leading-[1.1]">Projects</h1>
          <p className="text-muted text-sm font-sans mt-1">All projects you belong to</p>
        </div>
        <motion.button
          onClick={() => setShowModal(true)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 bg-primary hover:bg-primary-active text-on-primary text-sm font-medium font-sans px-5 h-10 rounded-md transition-colors"
        >
          <Plus size={16} />
          New Project
        </motion.button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-hairline rounded-lg animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-2 border-dashed border-hairline rounded-lg py-20 text-center text-muted"
        >
          <Folder size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-sans text-sm">No projects yet.</p>
          <p className="font-sans text-xs text-muted-soft mt-1">Create one to get started.</p>
        </motion.div>
      ) : (
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={listVariants}
          initial="hidden"
          animate="show"
        >
          {projects.map((p) => (
            <motion.div
              key={p.id}
              variants={itemVariants}
              whileHover={{ y: -3, boxShadow: '0 4px 16px rgba(20,20,19,0.06)' }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                to={`/projects/${p.id}`}
                className="block bg-surface-card border border-hairline rounded-lg p-8 hover:shadow-[0_1px_3px_rgba(20,20,19,0.08)] transition-all group h-full"
              >
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-surface-cream-strong rounded-md mb-4">
                    <Folder size={18} className="text-primary" />
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-hairline group-hover:text-primary transition-colors mt-1"
                  />
                </div>
                <h2 className="font-medium text-body-strong text-sm font-sans">{p.name}</h2>
                {p.description && (
                  <p className="text-muted text-xs mt-1 line-clamp-2">{p.description}</p>
                )}
                <p className="text-xs text-muted-soft font-sans mt-3">
                  {p.members.length} member{p.members.length !== 1 ? 's' : ''}
                </p>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create project modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.target === e.currentTarget && (setShowModal(false), reset())}
          >
            <motion.div
              className="bg-canvas border border-hairline rounded-lg p-6 w-full max-w-md"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <h2 className="font-display text-2xl font-normal text-ink tracking-[-0.3px] mb-5">New Project</h2>
              <form
                onSubmit={handleSubmit((d) => createMut.mutate(d))}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-body-strong font-sans mb-1.5">
                    Name *
                  </label>
                  <input
                    {...register('name')}
                    className="w-full bg-canvas border border-hairline rounded-md px-[14px] py-[10px] text-sm text-ink h-10 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-body-strong font-sans mb-1.5">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full bg-canvas border border-hairline rounded-md px-[14px] py-[10px] text-sm text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none transition-shadow"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); reset() }}
                    className="px-4 h-10 text-sm font-sans text-body-strong bg-canvas border border-hairline rounded-md hover:border-primary hover:text-ink transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    disabled={createMut.isPending}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-4 h-10 text-sm font-sans bg-primary text-on-primary rounded-md hover:bg-primary-active disabled:opacity-60"
                  >
                    {createMut.isPending ? 'Creating…' : 'Create'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

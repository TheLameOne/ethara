import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sun, Moon } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { DottedSurface } from '@/components/ui/dotted-surface'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [showPassword, setShowPassword] = useState(false)
  const { theme, toggle } = useThemeStore()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      const token = await authApi.login(data)
      useAuthStore.setState({ token: token.access_token })
      const user = await authApi.me()
      login(token.access_token, user)
      navigate('/')
    } catch {
      toast.error('Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center auth-bg px-4">
      <DottedSurface className="blur-[1px]" />

      {/* Theme toggle */}
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="fixed top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-canvas/70 border border-hairline shadow-sm backdrop-blur-sm text-muted hover:text-ink hover:bg-canvas transition-all"
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 bg-canvas border border-hairline rounded-xl shadow-[0_2px_8px_rgba(20,20,19,0.06),0_8px_32px_rgba(20,20,19,0.04)] p-8 w-full max-w-[400px]"
      >
        {/* Coral top-accent line */}
        <div className="absolute top-0 inset-x-0 h-[2px] rounded-t-xl bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        {/* Wordmark */}
        <div className="mb-8 text-center">
          <span className="font-display text-2xl text-ink tracking-[-0.3px] select-none">✦ Ethara</span>
        </div>

        {/* Heading */}
        <div className="mb-6">
          <h1 className="font-display text-[32px] font-normal text-ink leading-[1.15] tracking-[-0.5px] mb-1.5">
            Welcome back
          </h1>
          <p className="text-muted text-[13px] font-sans">Sign in to continue to your workspace</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-[13px] font-medium text-body-strong font-sans mb-1.5">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-soft pointer-events-none" />
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className="w-full bg-surface-soft border border-hairline rounded-md pl-9 pr-3.5 text-sm text-ink font-sans h-10 focus:outline-none focus:bg-canvas focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-soft"
              />
            </div>
            {errors.email && (
              <p className="text-error text-xs mt-1.5 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-error inline-block shrink-0" />
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-[13px] font-medium text-body-strong font-sans mb-1.5">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-soft pointer-events-none" />
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full bg-surface-soft border border-hairline rounded-md pl-9 pr-10 text-sm text-ink font-sans h-10 focus:outline-none focus:bg-canvas focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-soft"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-soft hover:text-muted transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-error text-xs mt-1.5 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-error inline-block shrink-0" />
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="pt-1">
            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-primary hover:bg-primary-active text-on-primary font-sans text-sm font-medium h-10 rounded-md transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Signing in…' : <><span>Sign in</span><ArrowRight size={14} /></>}
            </motion.button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-5 border-t border-hairline text-center">
          <p className="text-[13px] text-muted font-sans">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary hover:text-primary-active font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

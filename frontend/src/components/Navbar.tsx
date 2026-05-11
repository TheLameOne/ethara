import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { LogOut, LayoutDashboard, FolderKanban, Sun, Moon } from 'lucide-react'
import { SparkleIcon } from '@/components/ui/SparkleIcon'

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const { pathname } = useLocation()
  const active = pathname === to || (to !== '/' && pathname.startsWith(to))

  return (
    <Link
      to={to}
      className={`relative flex items-center gap-1.5 text-sm font-medium font-sans transition-colors px-1 pb-0.5 ${
        active ? 'text-ink' : 'text-muted hover:text-ink'
      }`}
    >
      {icon}
      {label}
      {active && (
        <motion.span
          layoutId="nav-underline"
          className="absolute -bottom-[17px] left-0 right-0 h-[2px] bg-primary rounded-full"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
    </Link>
  )
}

export function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { theme, toggle } = useThemeStore()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-canvas border-b border-hairline sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="font-display text-xl text-ink tracking-[-0.3px] select-none flex items-center gap-1.5">
          <SparkleIcon size={18} color="#cc785c" />
          Ethara
        </Link>

        <nav className="flex items-center gap-7">
          <NavLink to="/" icon={<LayoutDashboard size={15} />} label="Dashboard" />
          <NavLink to="/projects" icon={<FolderKanban size={15} />} label="Projects" />
        </nav>

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <motion.button
            onClick={toggle}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92, rotate: 15 }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface-card transition-colors"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </motion.button>

          {/* Divider */}
          <div className="w-px h-4 bg-hairline" />
          {/* Avatar + name */}
          <div className="flex items-center gap-2.5 pl-1">
            <div className="w-7 h-7 rounded-full bg-surface-card border border-hairline flex items-center justify-center shrink-0">
              <span className="font-sans text-[11px] font-semibold text-ink leading-none">
                {user?.name?.[0]?.toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-body-strong font-medium font-sans hidden sm:block leading-none">
              {user?.name}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-hairline mx-1 hidden sm:block" />

          {/* Logout */}
          <motion.button
            onClick={handleLogout}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            title="Sign out"
            className="flex items-center gap-1.5 text-xs text-muted hover:text-error font-sans transition-colors px-2 py-1.5 rounded-md hover:bg-error/8"
          >
            <LogOut size={14} />
            <span className="hidden sm:block">Sign out</span>
          </motion.button>
        </div>
      </div>
    </header>
  )
}

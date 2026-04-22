import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useAppStore } from '../../store/app'
import type { Toast } from '../../types'

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  info:    Info,
  warning: AlertTriangle,
}

const STYLES = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  error:   'border-red-500/30 bg-red-500/10 text-red-400',
  info:    'border-blue-500/30 bg-blue-500/10 text-blue-400',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
}

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useAppStore()
  const Icon = ICONS[toast.type]
  return (
    <motion.div
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg backdrop-blur-sm min-w-72 max-w-sm ${STYLES[toast.type]}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-gray-200">{toast.message}</span>
      <button onClick={() => removeToast(toast.id)} className="text-gray-500 hover:text-gray-300 transition">
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  )
}

export default function ToastContainer() {
  const { toasts } = useAppStore()
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
      </AnimatePresence>
    </div>
  )
}

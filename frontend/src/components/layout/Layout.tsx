import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useAppStore } from '../../store/app'
import ToastContainer from '../ui/Toast'
import TaskModal from '../tasks/TaskModal'
import NotificationPoller from '../NotificationPoller'
import PWAInstall from '../PWAInstall'
import { AnimatePresence } from 'framer-motion'

export default function Layout() {
  const { taskModalOpen, sidebarCollapsed } = useAppStore()

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
      <AnimatePresence>
        {taskModalOpen && <TaskModal />}
      </AnimatePresence>
      <NotificationPoller />
      <PWAInstall />
    </div>
  )
}

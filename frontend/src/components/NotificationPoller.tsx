import { useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api, endpoints } from '../lib/api'
import { useAppStore } from '../store/app'
import { requestPermission, showNotification, playAlertSound } from '../lib/notifications'
import type { Reminder } from '../types'
import { format } from 'date-fns'

export default function NotificationPoller() {
  const { addToast } = useAppStore()
  const shownIds = useRef<Set<string>>(new Set())

  const { data: pending } = useQuery<Reminder[]>({
    queryKey: ['pending-reminders-poll'],
    queryFn: () => api.get(endpoints.pendingRems).then(r => r.data),
    refetchInterval: 60_000,
  })

  const markSent = useMutation({
    mutationFn: (id: string) => api.post(`${endpoints.reminders}${id}/sent`),
  })

  useEffect(() => { requestPermission() }, [])

  useEffect(() => {
    if (!pending?.length) return
    for (const rem of pending) {
      if (shownIds.current.has(rem.id)) continue
      shownIds.current.add(rem.id)
      const body = rem.message ?? (rem.task_title ? `Task: ${rem.task_title}` : undefined)
      showNotification(rem.title, body, rem.id)
      playAlertSound()
      addToast(rem.title, 'warning')
      markSent.mutate(rem.id)
    }
  }, [pending])

  return null
}

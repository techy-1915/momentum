// Native local notifications via Capacitor (Android/iOS) with browser fallback

let LocalNotifications: any = null

async function getNative() {
  if (LocalNotifications) return LocalNotifications
  try {
    const cap = (window as any).Capacitor
    if (cap?.isNativePlatform?.()) {
      const mod = await import('@capacitor/local-notifications')
      LocalNotifications = mod.LocalNotifications
    }
  } catch {}
  return LocalNotifications
}

export async function requestNotificationPermission(): Promise<boolean> {
  const native = await getNative()
  if (native) {
    const { display } = await native.requestPermissions()
    return display === 'granted'
  }
  // Browser fallback
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  return (await Notification.requestPermission()) === 'granted'
}

export async function scheduleLocalReminder(params: {
  id: number
  title: string
  body?: string
  at: Date
}): Promise<void> {
  const native = await getNative()
  if (native) {
    await native.schedule({
      notifications: [{
        id: params.id,
        title: params.title,
        body: params.body ?? '',
        schedule: { at: params.at, allowWhileIdle: true },
        sound: 'default',
        smallIcon: 'ic_stat_notify',
        iconColor: '#7C3AED',
      }],
    })
    return
  }
  // Browser: nothing to schedule, handled by polling
}

export async function cancelLocalReminder(id: number): Promise<void> {
  const native = await getNative()
  if (native) {
    await native.cancel({ notifications: [{ id }] }).catch(() => {})
  }
}

export function reminderIdFromUUID(uuid: string): number {
  // Convert UUID to stable int (Capacitor needs integer ID)
  let hash = 0
  for (const ch of uuid) {
    hash = (Math.imul(31, hash) + ch.charCodeAt(0)) | 0
  }
  return Math.abs(hash)
}

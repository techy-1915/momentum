import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstall() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    // Detect iOS Safari (doesn't fire beforeinstallprompt)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
    const standalone = (window.navigator as any).standalone
    setIsIOS(ios && !standalone)

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const wasAlreadyDismissed = sessionStorage.getItem('pwa-dismissed') === '1'
  if (wasAlreadyDismissed || dismissed) return null
  if (!prompt && !isIOS) return null

  const handleInstall = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      setPrompt(null)
      setDismissed(true)
    }
  }

  const handleDismiss = () => {
    sessionStorage.setItem('pwa-dismissed', '1')
    setDismissed(true)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(360px,calc(100vw-32px))]"
      >
        <div className="bg-gray-900 border border-primary-600/40 rounded-2xl p-4 shadow-2xl shadow-black/50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-100 text-sm">Install Momentum</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {isIOS
                  ? 'Add to Home Screen for the best experience'
                  : 'Install as an app for offline access & fast launch'}
              </p>
            </div>
            <button onClick={handleDismiss} className="text-gray-600 hover:text-gray-400 transition p-0.5 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {isIOS ? (
            <div className="mt-3 space-y-2">
              {!showIOSGuide ? (
                <button onClick={() => setShowIOSGuide(true)}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> How to install on iPhone
                </button>
              ) : (
                <div className="bg-gray-800 rounded-xl p-3 text-xs text-gray-300 space-y-1.5">
                  <p className="font-medium text-gray-200 mb-2">Install on iPhone / iPad:</p>
                  <p>1. Tap the <strong className="text-primary-400">Share</strong> button <span className="font-mono">⬆</span> in Safari</p>
                  <p>2. Scroll down and tap <strong className="text-primary-400">"Add to Home Screen"</strong></p>
                  <p>3. Tap <strong className="text-primary-400">"Add"</strong> in the top right</p>
                  <p className="text-gray-500 pt-1">Momentum will appear on your Home Screen like a native app.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2 mt-3">
              <button onClick={handleDismiss}
                className="flex-1 py-2 border border-gray-700 rounded-xl text-gray-400 text-xs hover:bg-gray-800 transition">
                Not now
              </button>
              <button onClick={handleInstall}
                className="flex-1 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Install App
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

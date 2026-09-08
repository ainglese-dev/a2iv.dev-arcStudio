import React from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  Zap,
  Clock,
  Cpu,
} from 'lucide-react'
import type { ToastItem } from '../../types'

interface ToastContainerProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-card toast-${toast.type} pointer-events-auto p-3.5 rounded-xl border shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-top-2 duration-200 ${
            toast.type === 'fallback'
              ? 'bg-[#18151f]/95 border-amber-500/60 ring-1 ring-amber-500/20 text-amber-200'
              : toast.type === 'success'
              ? 'bg-[#0f1917]/95 border-emerald-500/50 ring-1 ring-emerald-500/20 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-[#1e1215]/95 border-rose-500/60 ring-1 ring-rose-500/20 text-rose-200'
              : 'bg-[#131522]/95 border-[#2b3045] ring-1 ring-indigo-500/20 text-zinc-200'
          }`}
        >
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              {toast.type === 'fallback' ? (
                <div className="toast-icon-box p-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <Zap className="w-3.5 h-3.5 animate-pulse" />
                </div>
              ) : toast.type === 'success' ? (
                <div className="toast-icon-box p-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              ) : toast.type === 'error' ? (
                <div className="toast-icon-box p-1 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
              ) : (
                <div className="toast-icon-box p-1 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                  <Info className="w-3.5 h-3.5" />
                </div>
              )}

              <div className="min-w-0">
                <span className="toast-title font-semibold text-xs text-white block truncate font-sans">
                  {toast.title}
                </span>
              </div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="toast-dismiss p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors shrink-0"
              title="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Body Message */}
          <p className="toast-message mt-1.5 text-xs text-zinc-300 leading-relaxed font-sans pl-7">
            {toast.message}
          </p>

          {/* Model & Telemetry Bar if present */}
          {(toast.model || toast.reason || toast.durationMs !== undefined) && (
            <div className="toast-telemetry mt-2.5 pt-2 border-t border-white/10 pl-7 flex items-center justify-between gap-2 flex-wrap text-[11px] font-mono">
              <div className="flex items-center gap-2">
                {toast.model && (
                  <span
                    className={`toast-model-badge px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 font-mono uppercase tracking-wider ${
                      toast.type === 'fallback'
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                        : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                    }`}
                  >
                    <Cpu className="w-2.5 h-2.5" />
                    {toast.type === 'fallback' ? 'Active: ' : 'Active: '}
                    {toast.model}
                  </span>
                )}
              </div>

              {toast.durationMs !== undefined && (
                <span className="toast-duration text-zinc-500 text-[10px] flex items-center gap-1 font-mono">
                  <Clock className="w-2.5 h-2.5" />
                  {toast.durationMs}ms
                </span>
              )}
            </div>
          )}

          {/* Fallback Reason Drawer */}
          {toast.reason && (
            <div className="mt-2 pl-7">
              <div className="toast-reason-box p-2 rounded bg-black/40 border border-amber-500/20 text-[10px] font-mono text-amber-300/90 leading-relaxed break-words">
                <strong className="toast-reason-label text-amber-400 font-semibold block mb-0.5">Failover Trigger:</strong>
                {toast.reason}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

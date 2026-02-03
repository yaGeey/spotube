import { useState } from 'react'
import { TRPCClientError } from '@trpc/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
   faTriangleExclamation,
   faServer,
   faRotateRight,
   faChevronDown,
   faChevronUp,
   faTerminal,
   faFileCircleXmark,
} from '@fortawesome/free-solid-svg-icons'
import { twMerge } from 'tailwind-merge'

interface ErrorDisplayProps {
   error?: Error | TRPCClientError<any> | null | unknown
   reset?: () => void
   className?: string
}

export default function ErrorDisplay({ error, reset, className }: ErrorDisplayProps) {
   const [isExpanded, setIsExpanded] = useState(false)

   if (!error) return null

   // Визначаємо тип помилки
   const isTrpcError = error instanceof TRPCClientError
   const message = error instanceof Error ? error.message : 'Unknown error occurred'

   // Витягуємо статус код (якщо є)
   const httpStatus = isTrpcError ? error.data?.httpStatus : null
   const errorCode = isTrpcError ? error.data?.code : null

   // Логіка вибору іконки та заголовка
   let icon = faTriangleExclamation
   let title = 'Something went wrong'

   if (httpStatus === 404) {
      icon = faFileCircleXmark
      title = 'Not Found'
   } else if (httpStatus && httpStatus >= 500) {
      icon = faServer
      title = 'Server Error'
   } else if (httpStatus === 401 || httpStatus === 403) {
      title = 'Access Denied'
   }

   return (
      <div className={twMerge('flex flex-col items-center justify-center h-full p-6 w-full', className)}>
         <div className="w-full max-w-md bg-zinc-900/50 border border-white/10 rounded-xl p-6 shadow-xl backdrop-blur-md">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-5">
               <div className="h-14 w-14 bg-red-500/10 rounded-full flex items-center justify-center mb-4 ring-1 ring-red-500/20">
                  <FontAwesomeIcon icon={icon} className="text-2xl text-red-500" />
               </div>

               <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>

               {/* Код помилки (якщо є) */}
               {(errorCode || httpStatus) && (
                  <span className="mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-red-500/10 text-red-400 uppercase tracking-wider border border-red-500/10">
                     {errorCode || `Error ${httpStatus}`}
                  </span>
               )}
            </div>

            {/* Message */}
            <p className="text-zinc-400 text-center mb-6 text-sm leading-relaxed">{message}</p>

            {/* Buttons Area */}
            <div className="flex flex-col gap-3">
               {reset && (
                  <button
                     onClick={reset}
                     className="group flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 active:scale-95 transition-all text-white rounded-lg font-medium text-sm shadow-lg shadow-red-900/20"
                  >
                     <FontAwesomeIcon icon={faRotateRight} className="group-hover:rotate-180 transition-transform duration-500" />
                     Try Again
                  </button>
               )}

               {/* Toggle Details */}
               <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-1 py-2"
               >
                  <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="text-[10px]" />
                  {isExpanded ? 'Hide Technical Details' : 'Show Technical Details'}
               </button>
            </div>

            {/* Tech Details Block */}
            {isExpanded && (
               <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="bg-black/40 rounded-lg border border-white/5 overflow-hidden">
                     <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border-b border-white/5 text-zinc-500">
                        <FontAwesomeIcon icon={faTerminal} className="text-[10px]" />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Debug Info</span>
                     </div>
                     <pre className="p-3 text-[10px] leading-4 text-red-200/70 font-mono overflow-auto max-h-48 whitespace-pre-wrap break-all scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {JSON.stringify(error, null, 2)}
                        {error instanceof Error && error.stack && `\n\n${error.stack}`}
                     </pre>
                  </div>
               </div>
            )}
         </div>
      </div>
   )
}

import { useAudioStore } from '@/src/audio_store/useAudioStore'
import { useEffect, useRef } from 'react'
import { twJoin } from 'tailwind-merge'

// 3rd argument is useCapture:
// true - captures scrolls in child elements
// false - Подія скролу на елементах div не спливає до window

export default function VideoSlot() {
   const slotRef = useRef<HTMLDivElement>(null)
   const isVideoVisible = useAudioStore((state) => state.isVisible)
   const current = useAudioStore((state) => state.current)
   const isPip = useAudioStore((state) => state.isPip)
   const isVisible = isVideoVisible && current !== null

   const setPipStyles = (ref: HTMLDivElement) => {
      ref.style.position = 'fixed'
      ref.style.zIndex = '1000'
      ref.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)'

      ref.style.top = 'auto'
      ref.style.left = 'auto'
      ref.style.bottom = '20px'
      ref.style.right = '20px'

      ref.style.width = '300px'
      ref.style.height = 'auto'
      ref.style.aspectRatio = '16 / 9'
   }

   useEffect(() => {
      const syncPos = () => {
         if (slotRef.current) {
            const absoluteContainer = useAudioStore.getState().absoluteContainer
            if (!absoluteContainer) return

            if (isPip) {
               setPipStyles(absoluteContainer)
               return
            }
            if (!isVisible) {
               absoluteContainer.style.top = '-9999px'
               return
            }

            const rect = slotRef.current.getBoundingClientRect()

            absoluteContainer.style.left = `${rect.left}px`
            absoluteContainer.style.top = `${rect.top}px`
            absoluteContainer.style.width = `${rect.width}px`
            absoluteContainer.style.height = `${rect.height}px`
         }
      }

      syncPos() // init pos
      window.addEventListener('resize', syncPos)
      window.addEventListener('scroll', syncPos, true)
      return () => {
         window.removeEventListener('resize', syncPos)
         window.removeEventListener('scroll', syncPos, true)

         // Clear pos on unmount
         const absoluteContainer = useAudioStore.getState().absoluteContainer
         const isPip = useAudioStore.getState().isPip
         if (absoluteContainer) {
            if (isPip) setPipStyles(absoluteContainer)
            else absoluteContainer.style.top = '-9999px'
         }
      }
   }, [isVisible, isPip])
   return <div ref={slotRef} className={twJoin('aspect-video', isVisible ? 'w-full' : 'hidden')} />
}

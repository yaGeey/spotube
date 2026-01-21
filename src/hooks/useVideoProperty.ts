import React, { useSyncExternalStore } from 'react'

export default function useVideoProperty(videoElement: HTMLVideoElement | null, property: keyof HTMLVideoElementEventMap) {
   return useSyncExternalStore(
      (cb) => {
         if (!videoElement) return () => {}

         videoElement.addEventListener(property, cb)
         return () => {
            videoElement.removeEventListener(property, cb)
         }
      },
      () => (videoElement ? videoElement[property] : null),
      () => null,
   )
}

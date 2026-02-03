import React, { useEffect, useRef } from 'react'
import { motion, useAnimate } from 'framer-motion'

export default function MovingLine({
   children,
   speed = 15,
   repeatDelay = 3,
}: {
   children: React.ReactNode
   speed?: number
   repeatDelay?: number
}) {
   const [scope, animate] = useAnimate()
   const containerRef = useRef<HTMLDivElement>(null)
   const spanRef = useRef<HTMLSpanElement>(null)
   useEffect(() => {
      if (!spanRef.current || !containerRef.current) return
      const spanWidth = spanRef.current.offsetWidth
      const containerWidth = containerRef.current.offsetWidth
      const distance = spanWidth > containerWidth ? spanWidth - containerWidth : 0
      const animation = animate(
         spanRef.current,
         { x: distance > 1 ? -distance : 0 },
         {
            duration: distance ? distance / speed : 0,
            repeat: Infinity,
            repeatType: 'reverse',
            repeatDelay,
            ease: 'linear',
         },
      )
      return () => animation.stop()
   }, [children, speed, repeatDelay, animate])
   return (
      <motion.div className="w-full relative overflow-hidden h-5 z-1000" ref={containerRef}>
         <span ref={spanRef} className="absolute top-1/2 -translate-y-1/2 left-0 w-fit whitespace-nowrap">
            {children}
         </span>
      </motion.div>
   )
}

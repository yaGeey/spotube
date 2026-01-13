import React, { useEffect } from 'react'

export default function Progress({
   value,
   setValue,
   props,
   step,
   setOnRelease = false,
}: {
   props?: React.HTMLAttributes<HTMLDivElement>
   setValue: React.Dispatch<React.SetStateAction<number>> | ((val: number) => void)
   value: number
   step: number
   setOnRelease?: boolean
}) {
   const [isDragging, setIsDragging] = React.useState(false)
   const [localValue, setLocalValue] = React.useState<number | null>(null)
   const barRef = React.useRef<HTMLDivElement>(null)

   function setNewValue(e: MouseEvent) {
      if (!barRef.current) return

      const rect = barRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const percentage = Math.max(0, Math.min(1, clickX / rect.width))
      const newValue = Math.round(percentage * 100)

      if (setOnRelease && isDragging) setLocalValue(newValue)
      else setValue(newValue)
   }

   useEffect(() => {
      if (!isDragging) return

      const handleMouseUp = () => {
         setIsDragging(false)
         if (setOnRelease && localValue !== null) {
            setValue(localValue)
            setLocalValue(null)
         }
      }

      document.addEventListener('mousemove', setNewValue)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
         document.removeEventListener('mousemove', setNewValue)
         document.removeEventListener('mouseup', handleMouseUp)
      }
   }, [isDragging, setValue, setOnRelease, localValue])

   return (
      <div
         ref={barRef}
         className="h-1 bg-neutral-600 rounded-full w-full relative group cursor-pointer"
         onWheel={(e) => {
            let newValue
            if (e.deltaY < 0) newValue = Math.min(value + step, 100)
            else newValue = Math.max(value - step, 0)
            setValue(newValue)
         }}
         onMouseDown={(e) => {
            if (e.button !== 0) return
            setIsDragging(true)
         }}
         onClick={(e) => {
            setNewValue(e.nativeEvent)
         }}
         {...props}
      >
         <div
            className="absolute top-0 left-0 h-full bg-white rounded-full group-hover:bg-green-500"
            style={{ width: `${localValue !== null ? localValue : value}%` }}
         ></div>
         <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100"
            style={{ left: `${localValue !== null ? localValue : value}%` }}
         ></div>
      </div>
   )
}

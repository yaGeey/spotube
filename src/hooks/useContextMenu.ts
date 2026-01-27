import React, { useEffect } from 'react'

export default function useContextMenu() {
   const [pos, setPos] = React.useState({ x: 0, y: 0 })
   function handleContextMenu(e: React.MouseEvent) {
      e.preventDefault()
      setPos({ x: e.clientX, y: e.clientY })
   }
   // Ефект для закриття при кліку
   useEffect(() => {
      const handleClick = () => setPos({ x: 0, y: 0 })
      document.addEventListener('click', handleClick)
      document.addEventListener('scroll', handleClick)
      return () => {
         document.removeEventListener('click', handleClick)
         document.removeEventListener('scroll', handleClick)
      }
   }, [])
   return { top: pos.y, left: pos.x, handleContextMenu, isOpen: Boolean(pos.x || pos.y) }
}

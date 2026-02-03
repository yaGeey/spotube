import { useState } from 'react'

export type ContextMenuItem = {
   name: string
} & ({ function: () => void } | { items: ContextMenuItem[] })

function ContextMenuItem({ item }: { item: ContextMenuItem }) {
   const [showSubmenu, setShowSubmenu] = useState(false)
   const hasSubmenu = 'items' in item

   return (
      <div
         className="relative"
         onMouseEnter={() => hasSubmenu && setShowSubmenu(true)}
         onMouseLeave={() => hasSubmenu && setShowSubmenu(false)}
      >
         <div
            className="_px-3 py-1 hover:text-accent cursor-pointer rounded-md flex justify-between items-center"
            onClick={() => !hasSubmenu && 'function' in item && item.function()}
         >
            <span>{item.name}</span>
            {hasSubmenu && <span className="ml-2">▶</span>}
         </div>
         {hasSubmenu && showSubmenu && (
            <div className="absolute left-full top-0 ml-0 bg-main-lighter border-2 border-accent-darker rounded-md p-1 flex flex-col gap-1">
               {item.items.map((subItem, index) => (
                  <ContextMenuItem key={index} item={subItem} />
               ))}
            </div>
         )}
      </div>
   )
}

export default function ContextMenu({ items, top, left }: { items: ContextMenuItem[]; top: number; left: number }) {
   return (
      <div
         className="absolute bg-main-lighter border-2 border-accent-darker rounded-md p-1 flex flex-col gap-1 z-1000"
         style={{ top, left }}
      >
         {items.map((item, index) => (
            <ContextMenuItem key={index} item={item} />
         ))}
      </div>
   )
}

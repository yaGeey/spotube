import React from 'react'

export default function ContextMenu({
   items,
   top,
   left,
}: {
   items: { name: string; function: () => void }[]
   top: number
   left: number
}) {
   return (
      <div
         className="absolute bg-main-lighter border-2 border-accent-darker rounded-md p-1 flex flex-col gap-1 z-1000"
         style={{ top, left }}
      >
         {items.map((item, index) => (
            <div key={index} className=" hover:text-accent cursor-pointer rounded-md" onClick={item.function}>
               {item.name}
            </div>
         ))}
      </div>
   )
}

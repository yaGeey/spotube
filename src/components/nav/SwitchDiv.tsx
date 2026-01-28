import { twMerge } from 'tailwind-merge'

interface SwitchDivProps {
   items: {
      text: string
      fn: () => void
      visible?: boolean
   }[]
   activeId: string
}

export default function SwitchDiv({ items, activeId }: SwitchDivProps) {
   const visibleItems = items.filter((item) => item.visible !== false)
   const activeIndex = visibleItems.findIndex((item) => item.text === activeId)
   const isValidIndex = activeIndex !== -1

   return (
      <div className="relative w-fit text-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-gradient-x rounded-full flex items-center px-0.5 py-0.5">
         <div
            className={twMerge(
               'absolute transition-all duration-300 ease-in-out border-3 border-text rounded-full h-full z-0',
               !isValidIndex && 'opacity-0',
            )}
            style={{
               width: '3rem', // w-12 = 3rem
               transform: `translateX(${activeIndex * 100}%)`,
            }}
         ></div>
         {visibleItems.map((item) => (
            <button
               key={item.text}
               onClick={item.fn}
               className={twMerge(
                  'z-10 w-12 text-center cursor-pointer font-medium relative transition-colors',
                  item.text === activeId ? 'text-white' : 'text-white/70 hover:text-white',
               )}
            >
               {item.text}
            </button>
         ))}
      </div>
   )
}

import React from 'react'
import { twMerge } from 'tailwind-merge'

export default function SwitchDiv({ value, setValue }: { value: 'info' | 'yt'; setValue: (val: 'info' | 'yt') => void }) {
   return (
      <div className="relative w-fit text-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-gradient-x rounded-full flex items-center">
         <div
            className={twMerge(
               'transition-all absolute outline-2 outline-text bg-main/50 outline-offset-[-2px] rounded-full py-0.5 w-12 h-full z-1',
               value === 'info' ? 'left-0' : 'left-[calc(100%-3rem)] transition-all duration-300 ease-in-out',
            )}
         ></div>
         <span onClick={(e) => setValue('info')} className={twMerge('z-2 w-12 text-center')}>
            Info
         </span>
         <span onClick={(e) => setValue('yt')} className={twMerge('z-2 w-12 text-center')}>
            yt
         </span>
      </div>
   )
}

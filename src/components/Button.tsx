import { ButtonHTMLAttributes, Ref } from 'react'
import { twMerge as tw } from 'tailwind-merge'

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
   ref?: Ref<HTMLButtonElement>
   textClassName?: string
}
export default function Button({ onClick, ref, className, textClassName, children, ...props }: BtnProps) {
   return (
      <button
         onClick={onClick}
         ref={ref}
         {...props}
         className={tw(
            'text-white text-sm px-3 py-0 text-nowrap bg-accent border-2 border-pink-400 rounded-lg flex justify-center items-center gap-1 hover:shadow-md transition-all hover:brightness-110 disabled:brightness-75 active:brightness-90',
            className,
         )}
      >
         <span className={textClassName}>{children}</span>
      </button>
   )
}

import { twMerge } from 'tailwind-merge'

export default function Loading({ className }: { className?: string }) {
   return (
      <svg
         className={twMerge('w-12 h-12 fill-accent stroke-accent', className)}
         xmlns="http://www.w3.org/2000/svg"
         viewBox="0 0 200 200"
      >
         <circle strokeWidth="15" r="15" cx="40" cy="100">
            <animate
               attributeName="opacity"
               calcMode="spline"
               dur="2"
               values="1;0;1;"
               keySplines=".5 0 .5 1;.5 0 .5 1"
               repeatCount="indefinite"
               begin="-.4"
            ></animate>
         </circle>
         <circle strokeWidth="15" r="15" cx="100" cy="100">
            <animate
               attributeName="opacity"
               calcMode="spline"
               dur="2"
               values="1;0;1;"
               keySplines=".5 0 .5 1;.5 0 .5 1"
               repeatCount="indefinite"
               begin="-.2"
            ></animate>
         </circle>
         <circle strokeWidth="15" r="15" cx="160" cy="100">
            <animate
               attributeName="opacity"
               calcMode="spline"
               dur="2"
               values="1;0;1;"
               keySplines=".5 0 .5 1;.5 0 .5 1"
               repeatCount="indefinite"
               begin="0"
            ></animate>
         </circle>
      </svg>
   )
}

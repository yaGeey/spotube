import { useContext } from 'react'
import { twMerge } from 'tailwind-merge'
import { TableFiltersContext } from './TableContext'
import { PlaylistItemWithRelations } from '@/electron/lib/prisma'
import { CellContext } from '@tanstack/react-table'

export default function TagsCell({ info }: { info: CellContext<PlaylistItemWithRelations, string[]> }) {
   const tags = info.getValue()

   const globalFilters = useContext(TableFiltersContext)
   const currentFilter = globalFilters.find((f) => f.id === 'tags')
   const filterValue = (currentFilter?.value ?? []) as string[]
   return (
      <div className="px-0.5 text-xs/4 text-text-subtle max-w-[150px] max-h-12 overflow-y-auto scrollbar-hide hidden lg:block">
         <div className="flex flex-wrap gap-1">
            {Array.isArray(tags) &&
               tags.map((t) => {
                  const isActive = filterValue.includes(t) ?? false
                  return (
                     <span
                        key={t}
                        onClick={(e) => {
                           e.stopPropagation()
                           if (isActive) {
                              // Remove from filter
                              const newFilter = filterValue.filter((name) => name !== t)
                              info.column.setFilterValue(newFilter)
                           } else {
                              // Add to filter
                              info.column.setFilterValue([...(filterValue ?? []), t])
                           }
                        }}
                        className={twMerge(
                           'cursor-pointer hover:text-white transition-colors hover:underline',
                           isActive ? 'text-green-400 font-bold underline' : '',
                        )}
                     >
                        #{t}
                     </span>
                  )
               })}
         </div>
      </div>
   )
}

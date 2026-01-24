import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function InfoIcon({ data }: { data: string | undefined | null }) {
   if (!data) return null
   const cleared = data.split('<a')[0]
   return (
      <FontAwesomeIcon
         className="text-xs text-text-subtle hover:text-white transition-colors ml-1 cursor-pointer"
         icon={faCircleInfo}
         onClick={() => console.log(cleared)}
      />
   )
}

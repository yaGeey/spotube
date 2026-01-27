import AnimatedEqualizer from '../icons/AnimatedEqualizer'
import { useAudioStore } from '@/src/audio_store/useAudioStore'

export default function StatusCell({ trackId, posIdx }: { trackId: number; posIdx: number }) {
   const isActive = useAudioStore((state) => state.current?.id === trackId)
   const isPlaying = useAudioStore((state) => state.isPlaying)

   return (
      <div className="w-12 text-center text-text-subtle">
         {isActive ? (
            <div className="flex justify-center">
               <AnimatedEqualizer isPlaying={isPlaying} />
            </div>
         ) : (
            <span className="group-hover:hidden">{posIdx}</span>
         )}
      </div>
   )
}

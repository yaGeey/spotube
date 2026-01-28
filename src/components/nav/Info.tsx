import React from 'react'
import TrackInfo from '../TrackInfo' // припустимо шлях
import YtVideoCards from '../YtVideoCards' // припустимо шлях
import SwitchDiv from './SwitchDiv'
import { useAudioStore } from '@/src/audio_store/useAudioStore'

export type Options = 'YT' | 'Info'
export default function Info() {
   const current = useAudioStore((state) => state.current)

   const showInfo = Boolean(current?.lastFM || current?.artists.some((a) => a.lastFM))
   const showYt = Boolean(current && current?.yt.length > 1)

   const [selected, setSelected] = React.useState<Options>('YT')

   return (
      <div className="fixed right-0 top-[30px] bottom-[90px] w-[320px] overflow-y-auto">
         <div className="flex justify-end px-4">
            <SwitchDiv
               activeId={selected}
               items={[
                  {
                     text: 'Info',
                     fn: () => setSelected('Info'),
                     visible: showInfo,
                  },
                  {
                     text: 'YT',
                     fn: () => setSelected('YT'),
                     visible: showYt,
                  },
               ]}
            />
         </div>
         <div className="px-3 pb-4 pt-0.5">
            {selected === 'YT' && current && <YtVideoCards data={current} />}
            {selected === 'Info' && current && <TrackInfo data={current} />}
         </div>
      </div>
   )
}

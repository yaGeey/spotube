import { trpc, vanillaTrpc } from '../utils/trpc'
import { RelatedVideo } from '../lib/InnertubeClient'

export default function YtVideoCardsNative({ videos }: { videos: RelatedVideo[] }) {
   return (
      <div className="flex flex-col gap-4 px-3 py-4 overflow-y-auto h-full cursor-pointer">
         {videos.map((v) => (
            <div
               key={v.id}
               className="bg-accent/5 text-sm border-l-4 text-text-subtle border-accent/50 rounded-lg p-3 flex flex-col gap-1"
               onClick={() => vanillaTrpc.system.openExternalLink.mutate(`https://www.youtube.com/watch?v=${v.id}`)}
               // onContextMenu={() => updateDefaultVideo({ track: current, youtubeVideoId: v.id })}
            >
               <img src={v.thumbnailUrl} alt={v.title} className="w-full rounded-md" />
               <p className="text-white font-medium text-base w-full line-clamp-2 mb-1 mt-2">{v.title}</p>
               <p className="text-xs">{v.metadata[0]}</p>
               <p className="text-xs">{v.metadata[1]}</p>
            </div>
         ))}
      </div>
   )
}

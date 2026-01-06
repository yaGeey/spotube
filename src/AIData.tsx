import { GoogleGenAI } from '@google/genai'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { useParams, useSearchParams } from 'react-router-dom'

export default function AIPage() {
   const searchParams = useSearchParams()
   const title = searchParams[0].get('title')
   const artist = searchParams[0].get('artist')

   const { data, isFetching } = useQuery({
      queryKey: ['ai-music-data', title, artist],
      queryFn: async (): Promise<PrismaJson.AiMusicData> => {
         const cached = await window.ipcRenderer.invoke('ai-get-music-cache', title, artist)
         if (cached) return cached

         const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY! })

         const responseSchema = {
            type: 'object',
            properties: {
               title: { type: 'string' },
               artists: {
                  type: 'array',
                  items: {
                     type: 'object',
                     properties: {
                        name: { type: 'string' },
                        role: { type: 'string' },
                        type: { type: 'string' },
                        originCountry: { type: 'string' },
                        yearsActive: { type: 'string' },
                        fullArticle: { type: 'string', description: 'Long markdown article about the artist' },
                     },
                     required: ['name', 'role', 'fullArticle', 'type', 'originCountry', 'yearsActive'],
                  },
               },
               album: {
                  type: 'object',
                  properties: {
                     title: { type: 'string' },
                     fullArticle: { type: 'string' },
                  },
               },
               year: { type: 'number' },
               source: { type: 'string' },
               genre: {
                  type: 'object',
                  properties: {
                     primary: { type: 'string' },
                     secondary: { type: 'array', items: { type: 'string' } },
                  },
               },
               bpm: { type: 'number' },
               themes: { type: 'array', items: { type: 'string' } },
               moods: { type: 'array', items: { type: 'string' } },
               instruments: { type: 'array', items: { type: 'string' } },
               shortHook: { type: 'string' },
               fullArticle: { type: 'string', description: 'Extremely detailed long-form markdown article about the song' },
               similarTracks: {
                  type: 'array',
                  items: {
                     type: 'object',
                     properties: {
                        title: { type: 'string' },
                        artist: { type: 'string' },
                        reason: { type: 'string' },
                     },
                  },
               },
            },
            // prettier-ignore
            required: [
         'title', 'artists', 'album', 'year', 'source', 
         'genre', 'shortHook', 'fullArticle', 'similarTracks'
         ],
         }

         console.warn(`Generating AI data for ${artist} - ${title}`)
         const prompt = `You are a professional music journalist. Write extremely long (800+ words) 'fullArticle' sections with rich Markdown formatting (headers, bolding, lists). Focus on technical details, history, and deep lyrical meaning. Generate a massive wiki entry for the song: ${artist} - ${title}. Also provide concise answers for the other fields.`
         const res = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
               {
                  role: 'user',
                  parts: [{ text: prompt }],
               },
            ],
            config: {
               responseMimeType: 'application/json',
               temperature: 0.7,
               responseJsonSchema: responseSchema,
            tools: []
            },
         })
         const data = JSON.parse(res.text as string) as PrismaJson.AiMusicData

         // Fix escaped newlines if Gemini returns them
         data.fullArticle = data.fullArticle.replace(/\\n/g, '\n')
         data.artists.forEach((a) => {
            a.fullArticle = a.fullArticle.replace(/\\n/g, '\n')
         })

         console.log('AI Response sample:', {
            fullArticle: data.fullArticle.substring(0, 200),
            artistArticle: data.artists[0]?.fullArticle.substring(0, 100),
         })

         await window.ipcRenderer.invoke('ai-set-music-cache', data)
         return data
      },
   })

   return (
      <div className="max-w-5xl mx-auto p-6 bg-black text-white min-h-screen font-sans">
         <div className="flex justify-between items-center border-b border-zinc-800 pb-6 mb-8">
            <h1 className="text-3xl font-black tracking-tighter">MUSIC_DB // AI_WIKI</h1>
            {isFetching && (
               <span className="bg-white text-black font-bold py-2 px-6 rounded-full hover:bg-zinc-200 transition-all disabled:opacity-50">
                  Analyze...
               </span>
            )}
         </div>

         {data && (
            <div className="space-y-12">
               {/* Header Section */}
               <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2">
                     <h2 className="text-6xl font-black mb-4 uppercase tracking-tighter">{data.title}</h2>
                     <p className="text-2xl text-zinc-400 font-medium leading-tight">{data.shortHook}</p>
                  </div>
                  <div className="bg-zinc-900 p-6 rounded-2xl space-y-3">
                     <div className="flex justify-between">
                        <span className="text-zinc-500">YEAR:</span> <span>{data.year}</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-zinc-500">BPM:</span> <span>{data.bpm}</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-zinc-500">GENRE:</span> <span className="text-right">{data.genre.primary}</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-zinc-500">SUBGENRES:</span>{' '}
                        <span className="text-right">{data.genre.secondary.join(', ')}</span>
                     </div>
                     <div className="pt-3 border-t border-zinc-800 text-xs text-zinc-500 leading-relaxed">SOURCE: {data.source}</div>
                  </div>
               </section>

               {/* Main Article */}
               <section className="prose prose-invert prose-zinc prose-lg max-w-none bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800">
                  <ReactMarkdown
                     components={{
                        h1: ({ children }) => <h1 className="text-4xl font-black mb-4">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-3xl font-bold mb-3 mt-8">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-2xl font-bold mb-2 mt-6">{children}</h3>,
                        strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                        p: ({ children }) => <p className="mb-4 leading-relaxed text-zinc-300">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc ml-6 mb-4 space-y-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal ml-6 mb-4 space-y-2">{children}</ol>,
                     }}
                  >
                     {data.fullArticle}
                  </ReactMarkdown>
               </section>

               {/* Artists Grid */}
               <section>
                  <h3 className="text-3xl font-bold mb-8 flex items-center gap-3">
                     <span className="w-8 h-8 bg-white rounded-full text-black flex items-center justify-center text-sm">01</span>
                     ARTIST_FILES
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     {data.artists.map((artist, i) => (
                        <div key={i} className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 hover:border-zinc-600 transition-colors">
                           <div className="flex justify-between items-start mb-6">
                              <div>
                                 <h4 className="text-2xl font-bold">{artist.name}</h4>
                                 <p className="text-zinc-500">
                                    {artist.role} • {artist.originCountry}
                                 </p>
                              </div>
                              <span className="text-xs bg-zinc-800 px-3 py-1 rounded-full">{artist.yearsActive}</span>
                           </div>
                           <div className="prose prose-invert prose-sm max-w-none">
                              <ReactMarkdown
                                 components={{
                                    p: ({ children }) => <p className="mb-3 text-zinc-400 leading-relaxed">{children}</p>,
                                    strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                                 }}
                              >
                                 {artist.fullArticle}
                              </ReactMarkdown>
                           </div>
                        </div>
                     ))}
                  </div>
               </section>

               {/* Similar Tracks */}
               <section className="pb-20">
                  <h3 className="text-3xl font-bold mb-8 flex items-center gap-3">
                     <span className="w-8 h-8 bg-white rounded-full text-black flex items-center justify-center text-sm">02</span>
                     RELATED_FREQUENCIES
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {data.similarTracks.map((track, i) => (
                        <div key={i} className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-2xl">
                           <h5 className="font-bold text-lg">{track.title}</h5>
                           <p className="text-zinc-500 mb-3">{track.artist}</p>
                           <p className="text-sm text-zinc-400 leading-snug">{track.reason}</p>
                        </div>
                     ))}
                  </div>
               </section>
            </div>
         )}
      </div>
   )
}

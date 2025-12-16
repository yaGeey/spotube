export function formatDuration(totalSeconds: number): string {
   const secods = Math.floor(totalSeconds)
   const hours = Math.floor(secods / 3600)
   const minutes = Math.floor((secods % 3600) / 60)
   const seconds = secods % 60
   const parts = []

   if (hours > 0) parts.push(hours.toString())
   parts.push(minutes.toString())
   parts.push(seconds.toString().padStart(2, '0'))
   return parts.join(':')
}

export function parseISODurationToMs(duration: string): number {
   const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)

   if (!match) return 0

   const hours = parseInt(match[1] || '0', 10)
   const minutes = parseInt(match[2] || '0', 10)
   const seconds = parseInt(match[3] || '0', 10)

   return (hours * 3600 + minutes * 60 + seconds) * 1000
}

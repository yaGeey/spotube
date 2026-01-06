export function formatDuration(totalSeconds: number): string {
   const floored = Math.floor(totalSeconds)
   const hours = Math.floor(floored / 3600)
   const minutes = Math.floor((floored % 3600) / 60)
   const seconds = floored % 60
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

export function toLocale(date: Date): string {
   return date.toLocaleDateString(navigator.language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
   })
}

export function formatRelativeTime(isoString: string | Date): string {
   const date = new Date(isoString)
   const now = new Date()
   const diffMs = now.getTime() - date.getTime()
   const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

   if (diffDays === 0) return 'Сьогодні'
   if (diffDays === 1) return 'Вчора'
   if (diffDays < 7) return `${diffDays} дн. тому`

   return toLocale(date)
}

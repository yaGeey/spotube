export const getStorageValue = (key: string, def: number | boolean | string) => {
   if (typeof window === 'undefined') return def
   const saved = localStorage.getItem(key)
   if (!saved) return def
   if (typeof def === 'boolean') return saved === '1'
   if (typeof def === 'number') return parseInt(saved, 10)
   return saved
}

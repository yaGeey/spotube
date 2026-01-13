/**
 * Creates a new object containing all non-function properties of the original object.
 */
export function omitFunctions<T extends object>(originalObject: T): T {
   // Use Object.entries() to get an array of [key, value] pairs.
   const filteredEntries = Object.entries(originalObject).filter(([key, value]) => {
      // Filter out entries where the value is a function.
      return typeof value !== 'function'
   })

   // Use Object.fromEntries() to convert the filtered entries back to a new object.
   return Object.fromEntries(filteredEntries) as T
}


export function safeSerialize<T extends object>(obj: T): T {
   const seen = new WeakSet()

   return JSON.parse(
      JSON.stringify(obj, (key, value) => {
         // 1. Якщо це функція - видаляємо
         if (typeof value === 'function') {
            return undefined
         }
         // 2. Якщо це об'єкт і ми його вже бачили - це цикл, видаляємо
         if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
               return '[Circular]' // Або undefined, якщо хочеш просто видалити
            }
            seen.add(value)
         }
         return value
      })
   )
}
export function getUserLanguageScript() {
   const userLocale = navigator.language.split(/[_-]/)[0]

   const scriptMap: Record<string, string[]> = {
      cyrillic: ['ru', 'uk', 'bg', 'sr', 'mk', 'be'],
      // 'latin': ['en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'sv', 'no', 'da', 'fi', 'ro', 'hu', 'vi'],
      korean: ['ko'],
      japanese: ['ja'],
      chinese: ['zh'],
   }

   const foundEntries = Object.entries(scriptMap).filter(([_, langs]) => langs.includes(userLocale))

   // Використовуємо Set, щоб не було дублікатів (наприклад, якщо мова і так latin)
   const recommendedSet = new Set(['latin'])
   if (foundEntries) foundEntries.forEach(([k, v]) => recommendedSet.add(k))

   return Array.from(recommendedSet)
}

export interface TrackInfo {
   artists: string[]
   title: string
}

export interface TrackInfo {
   artists: string[]
   title: string
}

export function extractTrackInfoStrict(videoTitle: string): TrackInfo | null {
   // 1. Словник сміття, яке ми видаляємо БЕЗУМОВНО
   // Тут ми не боїмося видалити feat, бо для feat у нас буде окремий парсер нижче
   const garbagePatterns = [
      /\(official\s*(music)?\s*video\)/iy,
      /\[official\s*(music)?\s*video\]/iy,
      /\(official\s*audio\)/iy,
      /\[official\s*audio\]/iy,
      /\(lyrics\)/iy,
      /\[lyrics\]/iy,
      /\(visualizer\)/iy,
      /\b(4k|hd|hq|1080p)\b/iy,
      /\[video\]/iy,
      /\[audio\]/iy,
      /\[mv\]/iy,
   ]

   let cleanTitle = videoTitle
   garbagePatterns.forEach((p) => (cleanTitle = cleanTitle.replace(p, '')))
   cleanTitle = cleanTitle.trim()

   // 2. СТРОГА ПЕРЕВІРКА: Шукаємо роздільник " - "
   // Якщо немає чіткого розділення "Артист - Трек", ми нічого не робимо (return null)
   const separatorMatch = cleanTitle.match(/\s+[-–—]\s+/)

   if (!separatorMatch) {
      return null // <--- Ось тут відсіюються всі "складні" та нестандартні назви
   }

   // Розбиваємо строго на 2 частини по першому входженню тире
   const separator = separatorMatch[0]
   const parts = cleanTitle.split(separator)

   // Left = Artists, Right = Title + (feat...)
   let leftPart = parts[0].trim()
   // Якщо в назві є ще тире, ми їх повертаємо назад в Title
   let rightPart = parts.slice(1).join(separator).trim()

   // Якщо одна з частин пуста — це сміття
   if (!leftPart || !rightPart) return null

   // 3. Функція для витягування feat/ft з рядка
   const feats: string[] = []

   const extractFeats = (text: string): string => {
      // Шукає: (feat. Name), (ft. Name), [feat. Name], feat. Name (без дужок в кінці)
      const featRegex = /[([]?(?:feat\.?|ft\.?|featuring)\s+(.+?)[)\]]?$/i
      const match = text.match(featRegex)

      if (match && match[1]) {
         // Чистимо імена від закриваючих дужок, якщо вони потрапили
         const rawNames = match[1].replace(/[)\]]+$/, '')

         // Розбиваємо: "Name1, Name2 & Name3"
         const names = rawNames.split(/,|&|\s+and\s+/).map((s) => s.trim())
         feats.push(...names)

         // Видаляємо feat з назви
         return text.replace(match[0], '').trim()
      }
      return text
   }

   // Шукаємо фіти переважно в правій частині (Title), але іноді бувають і зліва
   rightPart = extractFeats(rightPart) // Title (feat. X)
   leftPart = extractFeats(leftPart) // Artist (feat. X) - Title (рідше, але буває)

   // 4. Розбиваємо ліву частину (Artist) на окремих артистів
   // Наприклад: "Artist A, Artist B & Artist C"
   const mainArtists = leftPart
      .split(/,|&|\s+and\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

   // 5. Фінальна зачистка назви від пустих дужок () []
   rightPart = rightPart.replace(/\(\s*\)|\[\s*\]/g, '').trim()

   // Об'єднуємо головних артистів та фітів
   const allArtists = [...mainArtists, ...feats]

   // Видаляємо дублікати (Set)
   const uniqueArtists = Array.from(new Set(allArtists))

   return {
      artists: uniqueArtists,
      title: rightPart,
   }
}

export function extractTrackInfo(videoTitle: string): TrackInfo | null {
   // 1. Словник "сміття"
   // Важливо: Lookahead (?!...) захищає [feat. X], щоб ми не видалили його як сміття
   const garbagePatterns = [
      /\(official\s*(music)?\s*video\)/iy,
      /\(official\s*audio\)/iy,
      /\(lyrics\)/iy,
      /\(visualizer\)/iy,
      /\(.*?ver\.\)/iy,
      /\b(4k|hd|hq|1080p)\b/iy,
      /\[(?!.*?(?:feat|ft|featuring|with)).*?\]/iy,
   ]

   // 2. Очищення
   let cleanTitle = videoTitle
   garbagePatterns.forEach((pattern) => {
      cleanTitle = cleanTitle.replace(pattern, '')
   })
   cleanTitle = cleanTitle.trim()

   let rawArtist = ''
   let rawTitle = ''

   // 3. Розділення на "Ліва частина" (Artist) і "Права частина" (Title)
   const separators = [
      /\s-\s/,
      /\s–\s/,
      /\s—\s/, // тире різних видів
      /\s:\s/,
      /\s\|\s/,
      /\s\/\/\s/,
   ]

   let splitFound = false

   // Пріоритет: "Title by Artist"
   const byMatch = cleanTitle.match(/^(.+?)\s+by\s+(.+)$/i)
   if (byMatch && byMatch[2]) {
      rawTitle = byMatch[1].trim()
      rawArtist = byMatch[2].trim()
      splitFound = true
   } else {
      for (const separator of separators) {
         const parts = cleanTitle.split(separator)
         if (parts.length >= 2) {
            rawArtist = parts[0].trim()
            rawTitle = parts.slice(1).join(' ').trim()

            // Валідація
            if (rawArtist.length > 0 && rawArtist.length < 50 && !/video|audio/i.test(rawArtist)) {
               splitFound = true
               break
            }
         }
      }
   }

   if (!splitFound) return null

   // 4. Логіка витягування імен (Helper)
   // Приймає рядок, повертає { cleanString, names[] }
   const extractNames = (text: string): { cleaned: string; extracted: string[] } => {
      const foundNames: string[] = []

      // Регулярка для пошуку блоку feat: (feat. Name1, Name2)
      const featRegex = /[([]?(?:feat\.?|ft\.?|featuring|with)\s+(.+?)[)\]]?$/i
      const match = text.match(featRegex)

      let cleanText = text

      if (match && match[1]) {
         // Видаляємо блок feat з тексту
         cleanText = text.replace(match[0], '').trim()

         // Видаляємо можливі закриваючі дужки в кінці самих імен
         const rawNames = match[1].replace(/[)\]]$/, '')

         // Розбиваємо список імен (Name1, Name2 & Name3)
         splitAndCleanNames(rawNames).forEach((n) => foundNames.push(n))
      }

      // Чистимо дужки, якщо вони стали пустими: "Song ()" -> "Song"
      cleanText = cleanText.replace(/\(\s*\)|\[\s*\]/g, '').trim()

      return { cleaned: cleanText, extracted: foundNames }
   }

   // Хелпер для розбиття рядка імен за комами та амперсандами
   const splitAndCleanNames = (str: string): string[] => {
      return str
         .split(/,|&|\s+and\s+|\s+x\s+(?=[A-Z])/) // ' x ' теж іноді роздільник, але обережно
         .map((s) => s.trim())
         .filter((s) => s.length > 0)
   }

   // --- ЕТАП ОБРОБКИ ---

   const allArtists = new Set<string>()

   // А. Обробка Title (шукаємо feat в назві)
   const titleObj = extractNames(rawTitle)
   titleObj.extracted.forEach((a) => allArtists.add(a))
   const finalTitle = titleObj.cleaned

   // Б. Обробка Artist (шукаємо feat в полі артиста, наприклад "Artist ft. X")
   const artistObj = extractNames(rawArtist)
   artistObj.extracted.forEach((a) => allArtists.add(a))

   // В. Розбиваємо самого основного артиста (наприклад "Skrillex & Diplo")
   splitAndCleanNames(artistObj.cleaned).forEach((a) => allArtists.add(a))

   return {
      artists: Array.from(allArtists),
      title: finalTitle,
   }
}

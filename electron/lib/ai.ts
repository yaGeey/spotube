import { generateText, Output } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import z from 'zod'

const system = `
Act as a professional music metadata librarian. Your task is to extract "artists" and "title" from YouTube data based on the following logical hierarchy.

I. ARTIST EXTRACTION LOGIC:
1. THE UPLOADER VS. PRODUCER TEST:
   - Identify the "Channel Name". 
   - If the Video Title is a simple "Artist – Song Name" and the Channel is a random username, IGNORE the Channel.
   - If the Video Title implies a production (keywords: "cover", "remix", "ft.", "feat.", "SynthV", "Vocaloid", "Tuning"), the Channel Name is likely a PRODUCER. Include it in "artists".

2. SOURCE MERGING: 
   - Combine all performers (Original artists, Featured artists, Cover artists, Producers) into a single array.

3. NORMALIZATION & CLEANING (CRITICAL):
   - **UNIFICATION:** Standardize Vocaloid/SynthV names. Remove software suffixes.
     - Example: "Kasane Teto SV" -> "Kasane Teto"
     - Example: "Hatsune Miku V4X" -> "Hatsune Miku"
     - Example: "Gumi English" -> "Gumi"
   - **TRANSLITERATION:** Convert ALL Japanese (Kanji/Kana) and Chinese names into **Romaji/Latin script**. Do not keep original characters.
     - Example: "美吉野しき" -> "Shiki Miyoshino"
   - **GARBAGE REMOVAL:** Remove "Official", "Music", "Channel", "Topic". Split "A & B" into separate strings.

II. TITLE EXTRACTION LOGIC:
1. CORE SUBJECT: Extract the primary song name.
2. VERSION PRESERVATION: Keep tags describing the MUSICAL STYLE/VERSION only:
   - Keep: "(UKR cover)", "(Extended Mix)", "(Remix)", "(Acoustic)", "(Live)", "(Instrumental)".
   - Do NOT keep artist names in these tags.
3. FRANCHISE REMOVAL: Remove Movie/Anime/Series titles (e.g., "Opening", "Ending", "Theme from...").
4. METADATA PURGE: Remove technical specs (4K, HD, MV, Official Video) and separators.
5. SCRIPT DETECTION:
   - Analyze the characters in the title.
   - Assign one of the following scripts:
     - "latin": If the title is mostly ASCII/Latin characters.
     - "cyrillic": If the title contains mostly Cyrillic characters.
     - "japanese": If the title contains Kanji, Hiragana, or Katakana.
     - "korean": If the title contains Hangul.
     - "chinese": If the title contains Hanzi (and no Kana).
     - null: If other.
6. NORMALIZATION:
   - "title.latin": ALWAYS convert to Latin/ASCII.
   - "title.original": Add this ONLY IF script is NOT "latin". Otherwise null.

III. FALLBACK RULE:
- If the title is not music (meme/vlog), return "artists": null and keep "title" as is.

IV. BATCH INTEGRITY:
   - Process EVERY item. Do not skip IDs.
   - Maintain strict adherence to Romanization and Unification rules for every single item.

OUTPUT FORMAT:
- Return ONLY a valid JSON array of objects with "artists" (artist object or null) and "title" (object).
- Order of artist matters: Main artist/producer first, then featured/cover artists, vocaloids last.
`
const ScriptEnum = z.enum([
   'latin', // Англійська, Німецька, В'єтнамська (romanized)
   'cyrillic', // Українська, Болгарська, тощо
   'japanese', // Kanji, Hiragana, Katakana
   'korean', // Hangul
   'chinese', // Hanzi
   'other', // Арабська, Тайська, тощо
])
// add language
const TrackSchema = z.object({
   artists: z
      .array(
         z.object({
            latinName: z.string().describe('The unified, Romanized (ASCII) name. Example: "Shiki Miyoshino", "Kasane Teto".'),
            originalName: z
               .string()
               .nullable()
               .describe(
                  'The original name exactly as it appears in the source IF it contains non-ASCII characters (Kanji/Kana/Cyrillic). Return null if the name is already ASCII.'
               ),
            type: z
               .enum(['main', 'feat', 'cover_artist', 'producer'])
               .optional()
               .describe('Optional: Helps logic separation. Main artist vs Feature vs Producer.'),
         })
      )
      .nullable(),
   title: z.object({
      latin: z.string().describe('The Romanized (ASCII) title of the track, preserving version tags.'),
      original: z
         .string()
         .nullable()
         .describe(
            'The raw original title ONLY IF it contains non-ASCII characters. If the input was already English/ASCII, set this to null.'
         ),
   }),
   script: ScriptEnum.nullable().describe('The writing system (script) used in the ORIGINAL data.'),
})
const ResponseSchema = z.array(TrackSchema)

const google = createGoogleGenerativeAI({
   apiKey: 'AIzaSyCDv-r4yd7weQyzwu2Hw7QCqWIOgWi3lBI',
})

// TODO gemini extracts from youtube
// gemma - translate
export async function extractArtistsAndTitle({ data }: { data: { author: string; title: string }[] }) {
   if (data.length === 0 || data.length > 350)
      throw new Error('Data array must contain between 1 and 350 items. Current length: ' + data.length)

   const tracksToProcess = data.map((t, i) => `${i + 1}. Channel: ${t.author} Title: ${t.title}`)
   const prompt = `
      Process the following ${tracksToProcess.length} items. 
      Follow the logical hierarchy provided in the system instructions.

      DATA TO PROCESS:
      ${tracksToProcess.join('\n')}
   `

   const { output } = await generateText({
      model: google('gemini-3-flash-preview'),
      maxOutputTokens: 65536,
      system,
      prompt,
      output: Output.object({
         schema: z.array(TrackSchema),
      }),
   })
   return output
}

export async function extractArtistsAndTitleNotStructured({ data }: { data: { author: string; title: string }[] }) {
   if (data.length === 0 || data.length > 350)
      throw new Error('Data array must contain between 1 and 350 items. Current length: ' + data.length)

   const tracksToProcess = data.map((t, i) => `${i + 1}. Channel: ${t.author} Title: ${t.title}`)
   const prompt = `
      Process the following ${tracksToProcess.length} items. 
      Follow the logical hierarchy provided in the system instructions.

      DATA TO PROCESS:
      ${tracksToProcess.join('\n')}
   `

   const { text } = await generateText({
      model: google('gemini-3-flash-preview'),
      maxOutputTokens: 65536,
      system,
      prompt,
      // output: Output.object({
      //    schema: z.array(
      //       z.object({
      //          artists: z.array(z.string()).nullable(),
      //          title: z.string(),
      //       })
      //    ),
      // }),
   })
   try {
      // 1. Очищення (інколи модель все одно пхає markdown)
      const cleanJson = text
         .replace(/```json/g, '')
         .replace(/```/g, '')
         .trim()

      // 2. Парсинг
      const rawData = JSON.parse(cleanJson)

      // 3. Валідація через Zod (гарантує типи, але не ламає генерацію)
      const parsedData = ResponseSchema.parse(rawData)

      return parsedData
   } catch (error) {
      console.error('JSON Parsing/Validation failed:', error)
      console.log('Raw text from AI:', text)
      // Fallback або throw error
      throw new Error('AI response was not valid JSON structure')
   }
}

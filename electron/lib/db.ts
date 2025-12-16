import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3') as typeof import('better-sqlite3')

export const sql = (strings: TemplateStringsArray, ...values: any[]): string => {
   return strings.reduce((result, str, i) => result + str + (values[i] || ''), '')
}

export const db = new Database('spotube.db')
db.pragma('journal_mode = WAL')

export default db

import { v5 as uuidv5 } from 'uuid';

// 1. Твій "секретний" Namespace. Згенеруй свій і встав сюди.
// Це гарантує, що твої ID унікальні для твого додатку.
const TRACK_ID_NAMESPACE = 'a4b9a1e0-4e8c-4211-a47f-1d18721c08da';

/**
 * Генерує детермінований UUID v5 для треку.
 * Один і той самий artist + title завжди поверне той самий ID.
 */
export function generateTrackId(artist: string, title: string): string {
  // 2. Створюємо унікальний рядок. 
  // Важливо, щоб "artist1-title2" і "artist1title-2" не були однаковими.
  // Використовуй .trim() та унікальний роздільник.
  const name = `${artist.trim()}|${title.trim()}`;
  
  // 3. Генеруємо UUID v5
  return uuidv5(name, TRACK_ID_NAMESPACE);
}

// --- Приклад використання ---

const id1 = generateTrackId('My Artist', 'My Title');
const id2 = generateTrackId('My Artist', 'My Title');
const id3 = generateTrackId('Another Artist', 'My Title');

console.log(id1); 
// Виведе: 'f7c8f9b9-d0b8-5c1a-8b0f-8c3b4b0e1b1a' (приклад)

console.log(id2); 
// Виведе: 'f7c8f9b9-d0b8-5c1a-8b0f-8c3b4b0e1b1a' (той самий!)

console.log(id1 === id2); // true

console.log(id1 === id3); // false
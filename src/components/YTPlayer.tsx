// src/components/ManualYouTubePlayer.tsx
import React, { useEffect, useRef, useState } from 'react'

// Extend Window interface for YouTube IFrame API
declare global {
   interface Window {
      YT: any
      onYouTubeIframeAPIReady?: () => void
   }
}

// Твій список ID, який ти отримав з main.ts
const videoIds = ['L_LUpnjgPso', 'M7lc1UVf-VE', 'dQw4w9WgXcQ'] // Приклади

function ManualYouTubePlayer() {
   const [isApiReady, setIsApiReady] = useState(() => !!window.YT)

   // Ref для збереження *об'єкта* плеєра (щоб викликати .playVideo(), .pauseVideo())
   const playerRef = useRef<any>(null)

   // Ref для DOM-елемента <div>, куди YouTube "вмонтує" iframe
   const playerDivRef = useRef<HTMLDivElement>(null)

   // === КРОК 1: Завантажуємо YouTube IFrame API ===
   useEffect(() => {
      // Якщо API вже завантажено (наприклад, іншим компонентом)
      if (window.YT) return

      // Встановлюємо глобальну функцію, яку викличе скрипт
      window.onYouTubeIframeAPIReady = () => {
         setIsApiReady(true)
      }

      // Створюємо тег <script> і додаємо його на сторінку
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(tag)

      // Прибираємо за собою при розмонтуванні
      return () => {
         delete window.onYouTubeIframeAPIReady
      }
   }, [])

   // === КРОК 2: Створюємо плеєр, коли API готовий ===
   useEffect(() => {
      // Чекаємо, поки:
      // 1. API готовий
      // 2. Наш <div> для плеєра вже в DOM
      // 3. Плеєр ще не створено
      if (isApiReady && playerDivRef.current && !playerRef.current) {
         // Створюємо новий плеєр
         playerRef.current = new window.YT.Player(playerDivRef.current, {
            videoId: videoIds[0], // Початкове відео
            playerVars: {
               autoplay: 1,
               mute: 0,
               playsinline: 1, // Важливо для деяких середовищ
               enablejsapi: 1, // ОБОВ'ЯЗКОВО для керування
            },
            // events: {
            //   'onReady': (event) => event.target.playVideo(),
            // }
         })
      }
   }, [isApiReady]) // <-- Запускаємо цей ефект, коли isApiReady зміниться

   // === КРОK 3: Функції для керування ===
   const play = () => {
      playerRef.current?.playVideo()
   }

   const pause = () => {
      playerRef.current?.pauseVideo()
   }

   const playRandom = () => {
      const randomId = videoIds[Math.floor(Math.random() * videoIds.length)]

      // Це ключова функція: завантажити нове відео в *існуючий* плеєр
      // Це те, що тобі потрібно для "багато відео"
      playerRef.current?.loadVideoById(randomId)
   }

   return (
      <div>
         <h3>Керування (вручну):</h3>
         <button onClick={play}>Play</button>
         <button onClick={pause}>Pause</button>
         <button onClick={playRandom}>Грати Рандомний</button>

         <hr />

         {/* Цей <div> буде автоматично замінений на <iframe> */}
         <div ref={playerDivRef} />
      </div>
   )
}

export default ManualYouTubePlayer

import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
   resolve: {
      alias: {
         '@': path.resolve(__dirname, '.'),
      },
   },
   plugins: [
      react({
         babel: {
            plugins: ['babel-plugin-react-compiler'],
         },
      }),
      tailwindcss(),
      electron({
         main: {
            // Shortcut of `build.lib.entry`.
            entry: 'electron/main.ts',

            vite: {
               resolve: {
                  alias: {
                     // Дублюємо аліас сюди, щоб Electron теж розумів '@'
                     '@': path.resolve(__dirname, '.'),
                  },
               },
               build: {
                  rollupOptions: {
                     // ВАЖЛИВО: external має бути ТУТ, бо sqlite використовується в electron/main.ts
                     external: ['better-sqlite3', '@prisma/adapter-better-sqlite3', 'youtubei', 'googleapis'],
                  },
               },
            },
         },
         preload: {
            // Shortcut of `build.rollupOptions.input`.
            // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
            input: path.join(__dirname, 'electron/preload.ts'),
         },
         // Ployfill the Electron and Node.js API for Renderer process.
         // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
         // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
         renderer:
            process.env.NODE_ENV === 'test'
               ? // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
                 undefined
               : {},
      }),
   ],
   build: {
      rollupOptions: {
         // Додаємо сюди модулі, які не треба бандлити
         external: [
            'better-sqlite3',
            '@prisma/adapter-better-sqlite3',
            // Якщо ваш згенерований клієнт лежить далеко, іноді його теж краще робити external,
            // але зазвичай достатньо нативних драйверів.
         ],
      },
   },
})

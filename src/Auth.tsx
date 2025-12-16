import { useEffect, useState } from 'react'
import useTime from './hooks/useTime'

export default function Auth() {
   const [token, setToken] = useState<string | null>(null)
   const [expiresAt, setExpiresAt] = useState<number | null>(null)
   const time = useTime()

   // Перевіряємо чи є збережений токен
   const checkExistingToken = async () => {
      const tokenData: any = await window.ipcRenderer.invoke('get-spotify-token')
      if (tokenData) {
         setToken(tokenData.access_token)
         setExpiresAt(tokenData.expires_at)
      }
   }

   // При завантаженні компонента перевіряємо чи є збережений токен
   useEffect(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      checkExistingToken()

      // Слухаємо повідомлення про новий токен з main process
      const handleToken = (_event: any, data: any) => {
         console.log('✅ Отримано Spotify токен:', data)
         setToken(data.access_token)
         setExpiresAt(Date.now() + data.expires_in * 1000)
      }

      window.ipcRenderer.on('spotify-token', handleToken)
      return () => {
         window.ipcRenderer.off('spotify-token', handleToken)
      }
   }, [])

   // Logout - видаляємо токен
   const handleLogout = async () => {
      await window.ipcRenderer.invoke('clear-spotify-token')
      setToken(null)
      setExpiresAt(null)
      console.log('🔓 Токен видалено')
   }

   // Форматуємо час до закінчення токена
   const getTimeRemaining = () => {
      if (!expiresAt) return 'N/A'
      const minutes = Math.floor((expiresAt - time.getTime()) / 1000 / 60)
      return `${minutes} хв`
   }

   return (
      <div style={{ marginBottom: '20px' }}>
         <h3>Spotify Auth</h3>
         {token ? (
            <div>
               <p style={{ color: 'green' }}>✅ Авторизовано</p>
               <p>
                  <strong>Token:</strong> {token}...
               </p>
               <p>
                  <strong>Діє ще:</strong> {getTimeRemaining()}
               </p>
               <button onClick={handleLogout}>Вийти (Logout)</button>
               <button onClick={checkExistingToken} style={{ marginLeft: '10px' }}>
                  Перевірити токен
               </button>
            </div>
         ) : (
            <div>
               <p style={{ color: 'red' }}>❌ Не авторизовано</p>
               <button onClick={() => window.ipcRenderer.send('spotify-login')}>Увійти через Spotify</button>
            </div>
         )}
      </div>
   )
}

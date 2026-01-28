export default function Error({ msg }: { msg?: string }) {
   return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
         <h1 className="text-2xl font-bold mb-4">An error occurred</h1>
         <p className="text-red-500">{msg || 'Something went wrong. Please try again later.'}</p>
      </div>
   )
}

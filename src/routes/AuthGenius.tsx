import React from 'react'
import Button from '../components/Button'
import { trpc } from '../utils/trpc'

export default function AuthGenius() {
   const mutation = trpc.genius.oauth.useMutation()
   function handleOauth() {
      mutation.mutate()
   }
   return (
      <div>
         <Button onClick={handleOauth}>Auth</Button>
      </div>
   )
}

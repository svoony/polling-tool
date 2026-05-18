'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createSession() {
    setLoading(true)
    setError('')
    const code = generateCode()
    const { error: insertError } = await supabase.from('sessions').insert({ code })
    if (insertError) {
      setError('Failed to create session. Check your Supabase connection.')
      setLoading(false)
      return
    }
    router.push(`/host/${code}`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Event Lobby</CardTitle>
          <CardDescription>Create a session and share the QR code with your audience.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button onClick={createSession} disabled={loading} size="lg" className="w-full">
            {loading ? 'Creating...' : 'Create Session'}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

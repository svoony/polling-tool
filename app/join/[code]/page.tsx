'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!joined) return

    const channel = supabase.channel(`room:${code}`)
    channelRef.current = channel

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ name })
      }
    })

    return () => { supabase.removeChannel(channel) }
  }, [joined, code, name])

  async function joinSession() {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const { data: session } = await supabase
      .from('sessions')
      .select('id, status')
      .eq('code', code)
      .single()

    if (!session) {
      setError('Session not found. Check the code and try again.')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase
      .from('participants')
      .insert({ session_id: session.id, name: name.trim() })

    if (insertError) {
      setError('Could not join. Please try again.')
    } else {
      setJoined(true)
    }
    setLoading(false)
  }

  if (joined) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="flex flex-col items-center gap-3 pt-8 pb-8">
            <div className="text-5xl">👋</div>
            <p className="text-xl font-semibold">You&apos;re in, {name}!</p>
            <p className="text-gray-500">Waiting for the host to start...</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Join Session</CardTitle>
          <p className="text-gray-500 font-mono text-lg tracking-widest">{code}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && joinSession()}
            maxLength={50}
            autoFocus
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button onClick={joinSession} disabled={loading || !name.trim()} className="w-full">
            {loading ? 'Joining...' : 'Join'}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

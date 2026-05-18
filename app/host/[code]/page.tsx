'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'react-qr-code'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Participant = {
  name: string
  presence_ref: string
}

export default function HostPage() {
  const { code } = useParams<{ code: string }>()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [joinUrl, setJoinUrl] = useState('')

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/join/${code}`)
  }, [code])

  useEffect(() => {
    const channel = supabase.channel(`room:${code}`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ name: string }>()
        const all = Object.values(state)
          .flat()
          .map((p) => ({ name: p.name, presence_ref: p.presence_ref }))
        setParticipants(all)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [code])

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Scan to Join</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {joinUrl && (
              <div className="bg-white p-4 rounded-lg border">
                <QRCode value={joinUrl} size={220} />
              </div>
            )}
            <p className="text-3xl font-mono font-bold tracking-widest">{code}</p>
            {joinUrl && (
              <p className="text-xs text-gray-400 break-all text-center">{joinUrl}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Participants
              <Badge variant="secondary">{participants.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {participants.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Waiting for participants...</p>
            ) : (
              <ul className="space-y-2">
                {participants.map((p) => (
                  <li key={p.presence_ref} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                    <span className="w-2 h-2 bg-green-400 rounded-full shrink-0" />
                    <span className="text-sm">{p.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

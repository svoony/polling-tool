'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function Home() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createSession() {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    const code = generateCode()
    const { error: insertError } = await supabase.from('sessions').insert({ code })
    if (insertError) {
      setError('Failed to create session. Check your Supabase connection.')
      setLoading(false)
      return
    }
    router.push(`/host/${code}?prompt=${encodeURIComponent(prompt.trim())}`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl p-8 border border-zinc-800 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-4xl font-black text-yellow-400 tracking-tight">Event Lobby</h1>
          <p className="text-zinc-400 mt-2">Enter your word cloud question to get started.</p>
        </div>

        <input
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          placeholder="e.g. Describe today in one word"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createSession()}
          maxLength={120}
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={createSession}
          disabled={loading || !prompt.trim()}
          className="w-full bg-yellow-400 text-zinc-900 font-black text-lg rounded-xl py-3 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating...' : 'Create Session →'}
        </button>
      </div>
    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Mock data — replace with real Supabase queries later
const MOCK_TODAY = [
  { id: 1, client: 'Sarah Chen', style: 'Japanese sleeve · 3hr', time: '10:00 AM', deposit: 80, status: 'confirmed' },
  { id: 2, client: 'Jake Morrison', style: 'Geometric · 2hr', time: '1:30 PM', deposit: 60, status: 'confirmed' },
  { id: 3, client: 'Priya Nair', style: 'Floral forearm · 2hr', time: '4:00 PM', deposit: 50, status: 'pending' },
  { id: 4, client: 'Dylan Park', style: 'Script lettering · 1hr', time: '6:30 PM', deposit: 40, status: 'pending' },
]

const MOCK_UPCOMING = [
  { id: 5, client: 'Lena Hart', detail: '2:00 PM · Black & grey portrait', day: 30, month: 'May' },
  { id: 6, client: 'Carlos Vega', detail: '11:00 AM · Traditional eagle', day: 31, month: 'May' },
  { id: 7, client: 'Amara Osei', detail: '3:00 PM · Tribal back piece', day: 1, month: 'Jun' },
  { id: 8, client: 'Tina Walters', detail: '10:00 AM · Watercolor bird', day: 2, month: 'Jun' },
  { id: 9, client: 'Ryan Cho + 4 more', detail: 'Various times · See full schedule', day: 3, month: 'Jun' },
]

type ArtistRow = { id: string; name: string; studio_id: string }

export default function ArtistDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [artist, setArtist] = useState<ArtistRow | null>(null)
  const [studioSlug, setStudioSlug] = useState('my-studio')
  const [artistId, setArtistId] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: artistRow } = await supabase
        .from('artists')
        .select('id, name, studio_id')
        .eq('user_id', session.user.id)
        .single()

      if (artistRow) {
        const row = artistRow as ArtistRow
        setArtist(row)
        setArtistId(row.id)

        const { data: studioRow } = await supabase
          .from('studios')
          .select('subdomain')
          .eq('id', row.studio_id)
          .single()

        if (studioRow) setStudioSlug((studioRow as { subdomain: string }).subdomain)
      }
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const bookingLink = `inkbook.tech/book/${studioSlug}/${artistId}`

  function copyLink() {
    navigator.clipboard.writeText(bookingLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
      Loading...
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A', color: '#E8E8E8', fontFamily: 'sans-serif' }}>

      {/* Sidebar */}
      <aside style={{ width: 220, background: '#111', borderRight: '1px solid #1E1E1E', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #1E1E1E' }}>
          <div style={{ fontSize: 22, color: '#D4A853', fontWeight: 600 }}>InkBook</div>
          <div style={{ fontSize: 10, color: '#555', letterSpacing: 3, textTransform: 'uppercase', marginTop: 2 }}>Artist Portal</div>
        </div>
        <nav style={{ padding: '16px 0', flex: 1 }}>
          {[
            { label: 'Dashboard', active: true },
            { label: 'My Schedule', active: false },
            { label: 'Portfolio', active: false },
            { label: 'Earnings', active: false },
            { label: 'Settings', active: false },
          ].map(item => (
            <div key={item.label} style={{
              padding: '10px 20px', fontSize: 13.5, cursor: 'pointer',
              color: item.active ? '#D4A853' : '#777',
              borderLeft: item.active ? '2px solid #D4A853' : '2px solid transparent',
              background: item.active ? 'rgba(212,168,83,0.06)' : 'transparent',
            }}>
              {item.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1E1E1E' }}>
          <div style={{ fontSize: 13, color: '#BBB' }}>{artist?.name || 'Artist'}</div>
          <div style={{ fontSize: 11, color: '#555' }}>Artist</div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        <h1 style={{ fontSize: 26, color: '#F0F0F0', fontWeight: 400, marginBottom: 4 }}>
          Your Dashboard
        </h1>
        <p style={{ fontSize: 13, color: '#555', marginBottom: 28 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: "Today's Bookings", value: MOCK_TODAY.length, sub: `${MOCK_TODAY.filter(b => b.status === 'confirmed').length} confirmed` },
            { label: "This Month's Earnings", value: `$3,240`, sub: '18 confirmed bookings' },
            { label: 'Next 7 Days', value: MOCK_UPCOMING.length, sub: 'appointments upcoming' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#111', border: '1px solid rgba(212,168,83,0.2)', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>{stat.label}</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: '#D4A853' }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#444', marginTop: 6 }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Booking link */}
        <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 10, padding: '18px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Your Booking Link</div>
            <div style={{ fontFamily: 'monospace', fontSize: 13.5, color: '#D4A853', wordBreak: 'break-all' }}>{bookingLink}</div>
          </div>
          <button onClick={copyLink} style={{
            background: copied ? 'rgba(93,191,138,0.08)' : 'rgba(212,168,83,0.1)',
            border: `1px solid ${copied ? 'rgba(93,191,138,0.3)' : 'rgba(212,168,83,0.3)'}`,
            borderRadius: 8, color: copied ? '#5DBF8A' : '#D4A853',
            fontSize: 13, padding: '9px 18px', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {copied ? '✅ Copied!' : '📋 Copy Link'}
          </button>
        </div>

        {/* Two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Today */}
          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#BBB' }}>Today&apos;s Bookings</span>
              <span style={{ fontSize: 11, background: 'rgba(212,168,83,0.12)', color: '#D4A853', borderRadius: 20, padding: '2px 10px' }}>{MOCK_TODAY.length} total</span>
            </div>
            {MOCK_TODAY.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', padding: '13px 20px', borderBottom: '1px solid #161616', gap: 14 }}>
                <div style={{ fontSize: 12, color: '#D4A853', fontWeight: 500, width: 52, flexShrink: 0 }}>{b.time}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, color: '#CCC', fontWeight: 500 }}>{b.client}</div>
                  <div style={{ fontSize: 11.5, color: '#555', marginTop: 2 }}>{b.style}</div>
                </div>
                <div style={{ fontSize: 13, color: '#777' }}>${b.deposit}</div>
                <span style={{
                  fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 500,
                  background: b.status === 'confirmed' ? 'rgba(93,191,138,0.1)' : 'rgba(212,168,83,0.1)',
                  color: b.status === 'confirmed' ? '#5DBF8A' : '#D4A853',
                }}>{b.status}</span>
              </div>
            ))}
          </div>

          {/* Next 7 days */}
          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#BBB' }}>Next 7 Days</span>
              <span style={{ fontSize: 11, background: 'rgba(212,168,83,0.12)', color: '#D4A853', borderRadius: 20, padding: '2px 10px' }}>{MOCK_UPCOMING.length} upcoming</span>
            </div>
            {MOCK_UPCOMING.map(u => (
              <div key={u.id} style={{ display: 'flex', padding: '12px 20px', borderBottom: '1px solid #161616', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 44, flexShrink: 0, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, color: '#D4A853', fontWeight: 600, lineHeight: 1 }}>{u.day}</div>
                  <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>{u.month}</div>
                </div>
                <div style={{ width: 1, height: 36, background: '#1E1E1E', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, color: '#CCC', fontWeight: 500 }}>{u.client}</div>
                  <div style={{ fontSize: 11.5, color: '#555', marginTop: 2 }}>{u.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

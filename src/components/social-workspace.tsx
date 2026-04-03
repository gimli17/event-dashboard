'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from './user-provider'

interface SocialPost {
  id: string
  title: string
  copy: string
  platform: string
  status: string
  author: string | null
  assigned_to: string | null
  content_links: string | null
  hashtags: string | null
  scheduled_date: string | null
  posted_date: string | null
  posted_url: string | null
  engagement_likes: number
  engagement_comments: number
  engagement_shares: number
  engagement_views: number
  notes: string | null
  dan_feedback: string | null
  created_at: string
}

type View = 'dashboard' | 'compose' | 'library' | 'post-detail'

const platformColors: Record<string, string> = {
  instagram: 'bg-pink-500', linkedin: 'bg-blue', tiktok: 'bg-black', all: 'bg-muted',
}
const platformLabels: Record<string, string> = {
  instagram: 'Instagram', linkedin: 'LinkedIn', tiktok: 'TikTok', all: 'All Platforms',
}
const statusColors: Record<string, string> = {
  draft: 'text-muted bg-black/5', review: 'text-purple bg-purple-light/20', approved: 'text-green bg-green/10', posted: 'text-blue bg-blue/10',
}
const statusLabels: Record<string, string> = {
  draft: 'DRAFT', review: 'IN REVIEW', approved: 'APPROVED', posted: 'POSTED',
}

const teamMembers = ['Cody', 'Sabrina', 'Joe', 'Danny', 'Connor', 'Gib', 'Emily', 'Kendall', 'Alex', 'Liam', 'Dave', 'Tom', 'Kevin']

export function SocialWorkspace() {
  const { displayName } = useUser()
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('dashboard')
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null)
  const [filter, setFilter] = useState<'all' | 'draft' | 'review' | 'approved' | 'posted'>('all')
  const [platformFilter, setPlatformFilter] = useState<string>('all')

  // Compose state
  const [compTitle, setCompTitle] = useState('')
  const [compCopy, setCompCopy] = useState('')
  const [compPlatform, setCompPlatform] = useState('instagram')
  const [compAssignee, setCompAssignee] = useState('')
  const [compLinks, setCompLinks] = useState('')
  const [compHashtags, setCompHashtags] = useState('')
  const [compDate, setCompDate] = useState('')
  const [compNotes, setCompNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('social_posts').select('*').order('created_at', { ascending: false })
      if (data) setPosts(data as SocialPost[])
      setLoading(false)
    }
    fetch()
  }, [])

  const handleAiDraft = async () => {
    if (!aiPrompt.trim() || aiGenerating) return
    setAiGenerating(true)
    try {
      const res = await fetch('/api/draft-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim(), platform: compPlatform }),
      })
      const data = await res.json()
      if (data.copy) setCompCopy(data.copy)
      if (data.hashtags) setCompHashtags(data.hashtags)
      if (data.notes) setCompNotes(prev => prev ? prev + '\n\nAI Notes: ' + data.notes : 'AI Notes: ' + data.notes)
    } catch (e) {
      console.error('AI draft failed:', e)
    }
    setAiGenerating(false)
  }

  const handleCreate = async () => {
    if (!compTitle.trim() || !compCopy.trim() || saving) return
    setSaving(true)
    const { data } = await supabase.from('social_posts').insert({
      title: compTitle.trim(),
      copy: compCopy.trim(),
      platform: compPlatform,
      status: 'draft',
      author: displayName,
      assigned_to: compAssignee || null,
      content_links: compLinks.trim() || null,
      hashtags: compHashtags.trim() || null,
      scheduled_date: compDate || null,
      notes: compNotes.trim() || null,
    } as never).select().single()
    if (data) setPosts(prev => [data as SocialPost, ...prev])
    setCompTitle(''); setCompCopy(''); setCompLinks(''); setCompHashtags(''); setCompDate(''); setCompNotes(''); setCompAssignee('')
    setSaving(false)
    setView('dashboard')
  }

  const handleStatusChange = async (postId: string, newStatus: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: newStatus, ...(newStatus === 'posted' ? { posted_date: new Date().toISOString() } : {}) } : p))
    await supabase.from('social_posts').update({ status: newStatus, ...(newStatus === 'posted' ? { posted_date: new Date().toISOString() } : {}), updated_at: new Date().toISOString() } as never).eq('id', postId)
    if (selectedPost?.id === postId) setSelectedPost(prev => prev ? { ...prev, status: newStatus } : null)
  }

  const handleUpdateEngagement = async (postId: string, field: string, value: number) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, [field]: value } : p))
    await supabase.from('social_posts').update({ [field]: value } as never).eq('id', postId)
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    setPosts(prev => prev.filter(p => p.id !== postId))
    await supabase.from('social_posts').delete().eq('id', postId)
    if (selectedPost?.id === postId) { setSelectedPost(null); setView('dashboard') }
  }

  // Stats
  const totalPosts = posts.length
  const postedCount = posts.filter(p => p.status === 'posted').length
  const totalLikes = posts.reduce((s, p) => s + p.engagement_likes, 0)
  const totalViews = posts.reduce((s, p) => s + p.engagement_views, 0)
  const totalComments = posts.reduce((s, p) => s + p.engagement_comments, 0)
  const totalShares = posts.reduce((s, p) => s + p.engagement_shares, 0)
  const drafts = posts.filter(p => p.status === 'draft').length
  const inReview = posts.filter(p => p.status === 'review').length

  const filtered = posts.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false
    if (platformFilter !== 'all' && p.platform !== platformFilter) return false
    return true
  })

  if (loading) return <div className="flex-1 flex items-center justify-center bg-cream"><p className="text-muted text-sm">Loading...</p></div>

  return (
    <div className="flex-1 flex bg-cream">
      {/* Sidebar */}
      <div className="w-56 shrink-0 bg-amber-50 border-r-2 border-amber-200 flex flex-col">
        <div className="px-4 py-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-amber-800">Social</h2>
        </div>
        <nav className="flex-1 px-2 space-y-1">
          {[
            { id: 'dashboard' as View, label: 'Dashboard', icon: '📊' },
            { id: 'compose' as View, label: 'Compose', icon: '✍️' },
            { id: 'library' as View, label: 'Post Log', icon: '📋' },
          ].map(item => (
            <button key={item.id} onClick={() => { setView(item.id); setSelectedPost(null) }}
              className={`w-full text-left px-3 py-2.5 text-sm font-bold flex items-center gap-2 transition-colors rounded ${view === item.id ? 'bg-amber-200 text-amber-900' : 'text-amber-700 hover:bg-amber-100'}`}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-amber-200">
          <a href="/" className="text-[10px] font-bold uppercase tracking-widest text-amber-600 hover:text-amber-800">&larr; Back to Hub</a>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* ── DASHBOARD ── */}
        {view === 'dashboard' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold uppercase tracking-tight">Analytics Dashboard</h1>
              <button onClick={() => setView('compose')} className="bg-red text-white px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-red-bright transition-colors">
                + New Post
              </button>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              <div className="bg-white border-2 border-black/10 p-4">
                <p className="text-2xl font-bold">{totalPosts}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mt-1">Total Posts</p>
              </div>
              <div className="bg-white border-2 border-black/10 p-4">
                <p className="text-2xl font-bold text-green">{postedCount}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mt-1">Published</p>
              </div>
              <div className="bg-white border-2 border-black/10 p-4">
                <p className="text-2xl font-bold text-orange">{drafts + inReview}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mt-1">In Pipeline</p>
              </div>
              <div className="bg-white border-2 border-black/10 p-4">
                <p className="text-2xl font-bold text-red">{totalLikes.toLocaleString()}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mt-1">Total Likes</p>
              </div>
              <div className="bg-white border-2 border-black/10 p-4">
                <p className="text-2xl font-bold text-blue">{totalViews.toLocaleString()}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mt-1">Total Views</p>
              </div>
              <div className="bg-white border-2 border-black/10 p-4">
                <p className="text-2xl font-bold text-purple">{totalShares + totalComments}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mt-1">Engagement</p>
              </div>
            </div>

            {/* Platform breakdown */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {['instagram', 'linkedin', 'tiktok'].map(platform => {
                const platPosts = posts.filter(p => p.platform === platform || p.platform === 'all')
                const platPosted = platPosts.filter(p => p.status === 'posted')
                const platLikes = platPosts.reduce((s, p) => s + p.engagement_likes, 0)
                const platViews = platPosts.reduce((s, p) => s + p.engagement_views, 0)
                return (
                  <div key={platform} className="bg-white border-2 border-black/10 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-3 h-3 rounded-full ${platformColors[platform]}`} />
                      <h3 className="text-sm font-bold uppercase tracking-widest">{platformLabels[platform]}</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><p className="text-lg font-bold">{platPosts.length}</p><p className="text-[9px] text-muted uppercase">Posts</p></div>
                      <div><p className="text-lg font-bold">{platLikes}</p><p className="text-[9px] text-muted uppercase">Likes</p></div>
                      <div><p className="text-lg font-bold">{platViews}</p><p className="text-[9px] text-muted uppercase">Views</p></div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Recent posts */}
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted mb-3">Recent Posts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.slice(0, 6).map(post => (
                <button key={post.id} onClick={() => { setSelectedPost(post); setView('post-detail') }}
                  className="bg-white border-2 border-black/10 p-4 text-left hover:border-black/20 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${platformColors[post.platform]}`} />
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 ${statusColors[post.status]}`}>{statusLabels[post.status]}</span>
                  </div>
                  <h3 className="text-sm font-bold mb-1 line-clamp-1">{post.title}</h3>
                  <p className="text-xs text-muted line-clamp-2">{post.copy}</p>
                  {post.status === 'posted' && (
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted">
                      <span>{post.engagement_likes} likes</span>
                      <span>{post.engagement_views} views</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── COMPOSE ── */}
        {view === 'compose' && (
          <div className="p-8 max-w-3xl">
            <h1 className="text-2xl font-bold uppercase tracking-tight mb-6">Compose Post</h1>

            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Title / Campaign</label>
                <input type="text" value={compTitle} onChange={(e) => setCompTitle(e.target.value)}
                  placeholder="e.g., Ticket Launch Announcement"
                  className="w-full border-2 border-black bg-white px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue placeholder:text-muted/40" />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Platform</label>
                  <select value={compPlatform} onChange={(e) => setCompPlatform(e.target.value)}
                    className="w-full border-2 border-black/20 bg-white px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-black">
                    <option value="instagram">Instagram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="tiktok">TikTok</option>
                    <option value="all">All Platforms</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Assign To</label>
                  <select value={compAssignee} onChange={(e) => setCompAssignee(e.target.value)}
                    className="w-full border-2 border-black/20 bg-white px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-black">
                    <option value="">Unassigned</option>
                    {teamMembers.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Schedule Date</label>
                  <input type="date" value={compDate} onChange={(e) => setCompDate(e.target.value)}
                    className="w-full border-2 border-black/20 bg-white px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-black cursor-pointer" />
                </div>
              </div>

              {/* AI Draft */}
              <div className="bg-purple-light/10 border-2 border-purple-light/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-purple mb-2">AI Draft Assistant</p>
                <div className="flex gap-2">
                  <input type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAiDraft() }}
                    placeholder="Describe what you want to post about... (e.g., 'Announce ticket sales are live')"
                    className="flex-1 border-2 border-purple-light/40 bg-white px-3 py-2 text-sm focus:outline-none focus:border-purple placeholder:text-muted/40" />
                  <button onClick={handleAiDraft} disabled={!aiPrompt.trim() || aiGenerating}
                    className="bg-purple text-white px-5 py-2 text-xs font-bold uppercase tracking-widest hover:bg-purple-light transition-colors disabled:opacity-40 shrink-0">
                    {aiGenerating ? 'Drafting...' : 'Generate'}
                  </button>
                </div>
                <p className="text-[9px] text-muted mt-1">AI will draft copy, hashtags, and posting recommendations</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Post Copy</label>
                <textarea value={compCopy} onChange={(e) => setCompCopy(e.target.value)}
                  placeholder="Write your post copy..."
                  rows={6}
                  style={{ resize: 'vertical', minHeight: '150px' }}
                  className="w-full border-2 border-black/20 bg-white px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-blue placeholder:text-muted/30" />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Hashtags</label>
                <input type="text" value={compHashtags} onChange={(e) => setCompHashtags(e.target.value)}
                  placeholder="#BoulderRoots #MusicFest #Boulder2026"
                  className="w-full border-2 border-black/20 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-blue placeholder:text-muted/30" />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Content Links (images, videos, assets)</label>
                <input type="text" value={compLinks} onChange={(e) => setCompLinks(e.target.value)}
                  placeholder="Paste links to creative assets, one per line"
                  className="w-full border-2 border-black/20 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-blue placeholder:text-muted/30" />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Internal Notes</label>
                <textarea value={compNotes} onChange={(e) => setCompNotes(e.target.value)}
                  placeholder="Notes for the team..."
                  rows={3}
                  className="w-full border-2 border-black/20 bg-white px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-blue placeholder:text-muted/30" />
              </div>

              <div className="flex gap-3">
                <button onClick={handleCreate} disabled={!compTitle.trim() || !compCopy.trim() || saving}
                  className="bg-red text-white px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-red-bright transition-colors disabled:opacity-40">
                  {saving ? 'Saving...' : 'Save as Draft'}
                </button>
                <button onClick={() => setView('dashboard')} className="bg-black/5 text-black px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-black/10 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── POST LOG ── */}
        {view === 'library' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold uppercase tracking-tight">Post Log</h1>
              <button onClick={() => setView('compose')} className="bg-red text-white px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-red-bright transition-colors">
                + New Post
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              {['all', 'draft', 'review', 'approved', 'posted'].map(s => (
                <button key={s} onClick={() => setFilter(s as typeof filter)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${filter === s ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 hover:border-black'}`}>
                  {s === 'all' ? 'All' : statusLabels[s]}
                </button>
              ))}
              <div className="w-px h-6 bg-black/10" />
              {['all', 'instagram', 'linkedin', 'tiktok'].map(p => (
                <button key={p} onClick={() => setPlatformFilter(p)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${platformFilter === p ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 hover:border-black'}`}>
                  {p === 'all' ? 'All' : platformLabels[p]}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p className="text-muted text-center py-12 text-sm">No posts match this filter.</p>
            ) : (
              <div className="space-y-0 border-2 border-black/10">
                {filtered.map((post, i) => (
                  <button key={post.id} onClick={() => { setSelectedPost(post); setView('post-detail') }}
                    className={`w-full text-left px-5 py-4 hover:bg-cream-dark transition-colors flex items-center gap-4 ${i > 0 ? 'border-t border-black/5' : ''}`}>
                    <div className={`w-3 h-3 rounded-full shrink-0 ${platformColors[post.platform]}`} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold truncate">{post.title}</h3>
                      <p className="text-xs text-muted truncate">{post.copy}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {post.assigned_to && <span className="text-[10px] font-bold text-blue uppercase tracking-wider">{post.assigned_to}</span>}
                      {post.scheduled_date && <span className="text-[10px] text-muted">{new Date(post.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 ${statusColors[post.status]}`}>{statusLabels[post.status]}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── POST DETAIL ── */}
        {view === 'post-detail' && selectedPost && (
          <div className="p-8 max-w-4xl">
            <button onClick={() => { setView('library'); setSelectedPost(null) }} className="text-xs font-bold uppercase tracking-widest text-muted hover:text-black mb-4">&larr; Back to Post Log</button>

            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${platformColors[selectedPost.platform]}`} />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted">{platformLabels[selectedPost.platform]}</span>
                </div>
                <h1 className="text-2xl font-bold">{selectedPost.title}</h1>
                <div className="flex items-center gap-3 mt-2">
                  {selectedPost.author && <span className="text-xs text-muted">By {selectedPost.author}</span>}
                  {selectedPost.assigned_to && <span className="text-xs font-bold text-blue">{selectedPost.assigned_to}</span>}
                  {selectedPost.scheduled_date && <span className="text-xs text-muted">Scheduled: {selectedPost.scheduled_date}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 ${statusColors[selectedPost.status]}`}>{statusLabels[selectedPost.status]}</span>
                <button onClick={() => handleDelete(selectedPost.id)} className="text-xs font-bold text-red/40 hover:text-red uppercase tracking-widest">Delete</button>
              </div>
            </div>

            {/* Copy */}
            <div className="bg-white border-2 border-black/10 p-6 mb-4">
              <p className="text-sm font-bold uppercase tracking-widest text-muted mb-2">Post Copy</p>
              <p className="text-base leading-relaxed whitespace-pre-wrap">{selectedPost.copy}</p>
              {selectedPost.hashtags && <p className="text-sm text-blue mt-3">{selectedPost.hashtags}</p>}
            </div>

            {/* Content links */}
            {selectedPost.content_links && (
              <div className="bg-white border-2 border-black/10 p-6 mb-4">
                <p className="text-sm font-bold uppercase tracking-widest text-muted mb-2">Content Assets</p>
                {selectedPost.content_links.split('\n').filter(Boolean).map((link, i) => (
                  <a key={i} href={link.trim().startsWith('http') ? link.trim() : `https://${link.trim()}`} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue hover:text-red underline block">{link.trim()}</a>
                ))}
              </div>
            )}

            {/* Status workflow */}
            <div className="bg-white border-2 border-black/10 p-6 mb-4">
              <p className="text-sm font-bold uppercase tracking-widest text-muted mb-3">Status</p>
              <div className="flex gap-2">
                {['draft', 'review', 'approved', 'posted'].map(s => (
                  <button key={s} onClick={() => handleStatusChange(selectedPost.id, s)}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${selectedPost.status === s ? statusColors[s] + ' border-2 border-current' : 'bg-black/5 text-muted/40 hover:text-muted'}`}>
                    {statusLabels[s]}
                  </button>
                ))}
              </div>
              {selectedPost.posted_url && (
                <a href={selectedPost.posted_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue hover:text-red underline mt-2 block">View Live Post &rarr;</a>
              )}
            </div>

            {/* Engagement — only for posted */}
            {selectedPost.status === 'posted' && (
              <div className="bg-white border-2 border-black/10 p-6 mb-4">
                <p className="text-sm font-bold uppercase tracking-widest text-muted mb-3">Engagement</p>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Likes', field: 'engagement_likes', value: selectedPost.engagement_likes },
                    { label: 'Comments', field: 'engagement_comments', value: selectedPost.engagement_comments },
                    { label: 'Shares', field: 'engagement_shares', value: selectedPost.engagement_shares },
                    { label: 'Views', field: 'engagement_views', value: selectedPost.engagement_views },
                  ].map(metric => (
                    <div key={metric.field}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">{metric.label}</p>
                      <input type="number" value={metric.value}
                        onChange={(e) => handleUpdateEngagement(selectedPost.id, metric.field, parseInt(e.target.value) || 0)}
                        className="w-full border-2 border-black/20 bg-white px-3 py-2 text-lg font-bold focus:outline-none focus:border-blue" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedPost.notes && (
              <div className="bg-white border-2 border-black/10 p-6">
                <p className="text-sm font-bold uppercase tracking-widest text-muted mb-2">Internal Notes</p>
                <p className="text-sm text-muted">{selectedPost.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

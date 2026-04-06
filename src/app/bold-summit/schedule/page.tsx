import { Navbar } from '@/components/navbar'
import { BackLink } from '@/components/back-link'
import { SidebarButtons } from '@/components/sidebar-buttons'

export const dynamic = 'force-dynamic'

const schedule = [
  {
    day: 'Sunday',
    date: 'August 30, 2026',
    theme: 'Launch & Festival',
    sessions: [
      {
        time: 'Afternoon',
        title: 'Festival Close & Welcome Reception',
        description: 'The summit opens Sunday afternoon as the Boulder Roots Music Fest powers to its close. Partners gather at 4:00 PM for a welcome reception — a chance to meet, settle in, and set the tone for the days ahead.',
      },
      {
        time: 'Evening',
        title: 'Festival Closing & Exclusive Gathering',
        description: 'From there, the group moves to the festival\'s main closing event, sharing the experience alongside festival goers with access to private viewing areas within the venue. The evening culminates with an exclusive gathering for Bold Summit members at one of Boulder Roots\' most distinguished venues, featuring top-tier live talent.',
      },
    ],
  },
  {
    day: 'Monday',
    date: 'August 31, 2026',
    theme: 'Exploring the Next Era',
    sessions: [
      {
        time: 'Morning',
        title: 'Exploring the Next Era of Human Experience',
        description: 'The morning session centers on the theme Exploring the Next Era of Human Experience — with an opening conversation, curated roundtables, and moderated insights.',
      },
      {
        time: 'Afternoon',
        title: 'Activities & Immersions',
        description: 'The afternoon shifts to activities including guided hikes, road or mountain biking, yoga, and an advanced AI immersion experience.',
      },
      {
        time: 'Evening',
        title: 'High-Profile Speaker & Curated Dinner',
        description: 'The evening features a high-profile speaker followed by a curated dinner at one of Boulder\'s premier restaurants.',
      },
    ],
  },
  {
    day: 'Tuesday',
    date: 'September 1, 2026',
    theme: 'Dangers, Dilemmas & Where Do We Go From Here',
    sessions: [
      {
        time: 'Morning',
        title: 'Dangers, Dilemmas & Disruptions',
        description: 'The morning takes on the theme Dangers, Dilemmas & Disruptions, with keynotes and roundtables exploring how AI will transform work, creativity, and humanity\'s sense of purpose.',
      },
      {
        time: 'Afternoon',
        title: 'Where Do We Go From Here?',
        description: 'The afternoon shifts to the theme Where Do We Go From Here? — a closing keynote panel, participant voices from the summit, and final reflections before the summit adjourns at 4:00 PM.',
      },
    ],
  },
]

export default function BoldSummitSchedulePage() {
  return (
    <>
      <Navbar initiative="bold-summit" />
      <section className="bg-green text-white py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackLink />
            <div>
              <h1 className="text-2xl font-bold tracking-tight leading-none uppercase">Bold Summit Schedule</h1>
              <p className="text-xs text-white/50 mt-1">Sunday August 30 – Tuesday September 1, 2026</p>
            </div>
          </div>
          <SidebarButtons />
        </div>
      </section>

      <section className="bg-cream flex-1">
        <div className="max-w-5xl mx-auto px-6 py-10">
          {/* Option A badge */}
          <div className="flex items-center gap-3 mb-8">
            <span className="bg-green text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5">Option A</span>
            <span className="text-sm font-bold text-muted">Sunday Afternoon – Tuesday Afternoon</span>
          </div>

          {/* Schedule days */}
          <div className="space-y-8">
            {schedule.map((day) => (
              <div key={day.day} className="border-2 border-black/10 bg-white">
                {/* Day header */}
                <div className="bg-green text-white px-6 py-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight">{day.day}</h2>
                    <span className="text-xs font-bold tracking-wider opacity-60">{day.date}</span>
                  </div>
                  <p className="text-sm text-white/70 mt-1 italic">{day.theme}</p>
                </div>

                {/* Sessions */}
                <div className="divide-y divide-black/10">
                  {day.sessions.map((session, i) => (
                    <div key={i} className="px-6 py-5">
                      <div className="flex items-start gap-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-green bg-green/10 px-2.5 py-1 shrink-0 mt-0.5">{session.time}</span>
                        <div>
                          <h3 className="text-sm font-bold mb-2">{session.title}</h3>
                          <p className="text-sm text-muted leading-relaxed">{session.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Context note */}
          <div className="mt-8 border-l-4 border-green pl-4">
            <p className="text-xs text-muted leading-relaxed">
              The Bold Summit begins the afternoon of Boulder Roots Music Fest&apos;s final day, creating a seamless transition from the festival experience into three days of curated conversations, activities, and connection.
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-black text-white/40 text-center py-8">
        <p className="text-xs font-bold tracking-widest uppercase">Caruso Ventures &middot; Bold Summit</p>
      </footer>
    </>
  )
}

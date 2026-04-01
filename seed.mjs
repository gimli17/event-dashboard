import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ixzkkplnyblnmiqfrwcz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4emtrcGxueWJsbm1pcWZyd2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMTI1NTUsImV4cCI6MjA5MDU4ODU1NX0.No2UR0jGwQ6GyGsSLXXnTJOMR2PxcvhAw-V1FDHQSfQ'
)

const events = [
  { id: 'wed-bold-1', title: 'Bold Conversations That Matter — Day 1', day: 'wednesday', day_label: 'Wednesday 8/26', date: '2026-08-26', start_time: '12:30 PM', end_time: '4:15 PM', location: 'Highland City Club / Locations TBD', description: 'Session 1 (12:30–2:00 PM) & Session 2 (2:45–4:15 PM). Each 90-minute session brings together a small group of peer Founders for candid, high-signal roundtable conversations across Health & Well-Being, Culture & Community, and Tech & Innovation.', status: 'in-progress', access: 'founders', sponsorship_available: true, sponsor_name: null, time_block: 'early-afternoon' },
  { id: 'wed-film', title: 'Boulder Roots Evening of Film & Storytelling', day: 'wednesday', day_label: 'Wednesday 8/26', date: '2026-08-26', start_time: '5:15 PM', end_time: '9:15 PM', location: 'Dairy Arts Center / Gordon Gamm Theater', description: 'Founders-only cocktail reception (5:15–6:45 PM), followed by a fireside chat, independent film screening, and Q&A in the Gordon Gamm Theater (7:00–9:15 PM). Premium ticket holders join for the screening.', status: 'in-progress', access: 'founders-premium', sponsorship_available: true, sponsor_name: null, time_block: 'evening' },
  { id: 'thu-bold-2', title: 'Bold Conversations That Matter — Day 2', day: 'thursday', day_label: 'Thursday 8/27', date: '2026-08-27', start_time: '1:00 PM', end_time: '4:45 PM', location: 'Locations TBD', description: 'Session 3 (1:00–2:30 PM) & Session 4 (3:15–4:45 PM). Continuing the roundtable format across Health & Well-Being, Culture & Community, and Tech & Innovation tracks.', status: 'in-progress', access: 'founders', sponsorship_available: true, sponsor_name: null, time_block: 'early-afternoon' },
  { id: 'thu-opening', title: 'Opening Night Founder Celebration', day: 'thursday', day_label: 'Thursday 8/27', date: '2026-08-27', start_time: '6:00 PM', end_time: '10:00 PM', location: 'Caruso Residence', description: "Private, invitation-only evening at Dan and Cindy Caruso's home. Founder networking (6:00–7:30 PM), house band (7:30–8:00 PM), and headline talent performance (8:00–10:00 PM). Craft cocktails and gourmet bites.", status: 'in-progress', access: 'founders', sponsorship_available: false, sponsor_name: null, time_block: 'prime-time' },
  { id: 'weekend-lounge', title: 'Founders Lounge', day: 'all-weekend', day_label: 'Fri–Sun', date: '2026-08-28', start_time: '10:00 AM', end_time: '7:00 PM', location: 'Location TBD', description: 'Private, Founder-only space open all weekend. Open bar, wellness services, and dedicated hospitality. Fri 1:00–7:00 PM, Sat 10:00 AM–7:00 PM, Sun 10:00 AM–7:00 PM.', status: 'planning', access: 'founders', sponsorship_available: true, sponsor_name: null, time_block: 'all-day' },
  { id: 'fri-performing-arts', title: 'Performing Arts Moment', day: 'friday', day_label: 'Friday 8/28', date: '2026-08-28', start_time: '1:00 PM', end_time: '2:15 PM', location: 'Location TBD', description: 'Founders get 15-minute early access (12:45 PM). Performance open to all ticket holders.', status: 'planning', access: 'all-access', sponsorship_available: false, sponsor_name: null, time_block: 'early-afternoon' },
  { id: 'fri-warmup', title: 'Music Venue Warm Up', day: 'friday', day_label: 'Friday 8/28', date: '2026-08-28', start_time: '3:00 PM', end_time: '4:30 PM', location: 'Location TBD', description: 'Founders get 15-minute early access (2:45 PM). Talent TBD. Open to all ticket holders.', status: 'planning', access: 'all-access', sponsorship_available: false, sponsor_name: null, time_block: 'mid-afternoon' },
  { id: 'fri-endeavor', title: 'Endeavor Event — Private Sponsor Gathering', day: 'friday', day_label: 'Friday 8/28', date: '2026-08-28', start_time: '3:00 PM', end_time: '5:00 PM', location: 'Venue TBD', description: 'Private, curated gathering hosted by a major sponsor. Invite list determined by sponsor. Boulder Roots team assists with booking live music, artist meet-and-greets, or intimate salons.', status: 'planning', access: 'sponsor-private', sponsorship_available: true, sponsor_name: null, time_block: 'mid-afternoon' },
  { id: 'fri-cocktail', title: 'Welcome Cocktail Gathering', day: 'friday', day_label: 'Friday 8/28', date: '2026-08-28', start_time: '5:00 PM', end_time: '6:30 PM', location: 'Location TBD', description: 'Founders-only reception to build relationships while appreciating fine local artists and their art.', status: 'planning', access: 'founders', sponsorship_available: true, sponsor_name: null, time_block: 'late-afternoon' },
  { id: 'fri-headliner', title: 'Founder Mainstage Headliner', day: 'friday', day_label: 'Friday 8/28', date: '2026-08-28', start_time: '7:00 PM', end_time: '10:00 PM', location: 'Boulder Theater', description: 'Headliner performance. Founders enjoy reserved VIP areas, dedicated bar/lounge access, and complimentary food and drinks.', status: 'planning', access: 'all-access', sponsorship_available: true, sponsor_name: null, time_block: 'prime-time' },
  { id: 'fri-afterparty', title: 'Late Night After Party', day: 'friday', day_label: 'Friday 8/28', date: '2026-08-28', start_time: '9:00 PM', end_time: '11:00 PM', location: 'Location TBD', description: 'Elevated late-night gathering where headliner energy transitions into a late-night jam. Founders and Premium ticket holders.', status: 'planning', access: 'founders-premium', sponsorship_available: true, sponsor_name: null, time_block: 'after-hours' },
  { id: 'sat-morning-music', title: 'Founder Music Moment — Morning', day: 'saturday', day_label: 'Saturday 8/29', date: '2026-08-29', start_time: '10:00 AM', end_time: '11:00 AM', location: 'Music Venue TBD', description: 'Early entry for Founders (9:45 AM). Connect over drinks and settle into prime seating before general admission.', status: 'planning', access: 'all-access', sponsorship_available: false, sponsor_name: null, time_block: 'morning' },
  { id: 'sat-performing-arts', title: 'Performing Arts Moment', day: 'saturday', day_label: 'Saturday 8/29', date: '2026-08-29', start_time: '12:00 PM', end_time: '1:30 PM', location: 'Location TBD', description: "Founders early arrival at 11:45 AM. Shared cultural moment within one of Boulder's leading spaces, integrated with the broader audience.", status: 'planning', access: 'all-access', sponsorship_available: false, sponsor_name: null, time_block: 'early-afternoon' },
  { id: 'sat-afternoon-music', title: 'Founder Music Moment — Afternoon', day: 'saturday', day_label: 'Saturday 8/29', date: '2026-08-29', start_time: '2:00 PM', end_time: '3:30 PM', location: 'Music Venue TBD', description: 'Founders attend together with early access (1:45 PM) and prime seating, carrying the morning energy forward.', status: 'planning', access: 'all-access', sponsorship_available: false, sponsor_name: null, time_block: 'early-afternoon' },
  { id: 'sat-sponsor-early', title: 'Exclusive Private Events — Early Afternoon', day: 'saturday', day_label: 'Saturday 8/29', date: '2026-08-29', start_time: '2:00 PM', end_time: '4:00 PM', location: 'Venues TBD', description: 'Private Event 1 & 2. Curated sponsor gatherings designed in collaboration with Boulder Roots. Live music, artist meet-and-greets, or intimate salons.', status: 'planning', access: 'sponsor-private', sponsorship_available: true, sponsor_name: null, time_block: 'early-afternoon' },
  { id: 'sat-sponsor-late', title: 'Exclusive Private Events — Late Afternoon', day: 'saturday', day_label: 'Saturday 8/29', date: '2026-08-29', start_time: '4:15 PM', end_time: '6:15 PM', location: 'Venues TBD', description: 'Private Event 3 & 4. Champion Tier: 80 invites, Visionary Tier: 40 invites. Curated sponsor gatherings with tailored programming.', status: 'planning', access: 'sponsor-private', sponsorship_available: true, sponsor_name: null, time_block: 'late-afternoon' },
  { id: 'sat-headliner', title: 'Founder Mainstage Headliner', day: 'saturday', day_label: 'Saturday 8/29', date: '2026-08-29', start_time: '7:00 PM', end_time: '9:00 PM', location: 'Boulder Theater', description: 'Headliner performance. Dedicated Founder access to avoid lines, reserved VIP near main stage, exclusive bar/lounge with complimentary food and drinks.', status: 'planning', access: 'all-access', sponsorship_available: true, sponsor_name: null, time_block: 'prime-time' },
  { id: 'sat-afterparty', title: 'Exclusive Founder After Party', day: 'saturday', day_label: 'Saturday 8/29', date: '2026-08-29', start_time: '9:00 PM', end_time: '11:00 PM', location: 'Location TBD', description: 'Private, invitation-only evening centered on Founders, alongside select sponsors, artists, and cultural leaders.', status: 'planning', access: 'founders', sponsorship_available: true, sponsor_name: null, time_block: 'after-hours' },
  { id: 'sun-music-early', title: 'Founder Music Moment — Early Afternoon', day: 'sunday', day_label: 'Sunday 8/30', date: '2026-08-30', start_time: '12:00 PM', end_time: '1:30 PM', location: 'Music Venue TBD', description: 'Founders early entry (11:45 AM) and reserved seating. Bringing founders together once more in a shared cultural setting.', status: 'planning', access: 'all-access', sponsorship_available: false, sponsor_name: null, time_block: 'early-afternoon' },
  { id: 'sun-music-mid', title: 'Founder Music Moment — Mid Afternoon', day: 'sunday', day_label: 'Sunday 8/30', date: '2026-08-30', start_time: '2:00 PM', end_time: '3:30 PM', location: 'Music Venue TBD', description: "Founders early entry (1:45 PM) and reserved seating. The experience carries the weekend's relationships into one final cultural setting before the closing headliner.", status: 'planning', access: 'all-access', sponsorship_available: false, sponsor_name: null, time_block: 'mid-afternoon' },
  { id: 'sun-sponsor', title: 'Exclusive Private Event 5', day: 'sunday', day_label: 'Sunday 8/30', date: '2026-08-30', start_time: '4:15 PM', end_time: '6:15 PM', location: 'Venue TBD', description: 'Champion Tier: 80 invites, Visionary Tier: 40 invites. Curated sponsor gathering with tailored programming aligned with the spirit of Boulder Roots.', status: 'planning', access: 'sponsor-private', sponsorship_available: true, sponsor_name: null, time_block: 'late-afternoon' },
  { id: 'sun-headliner', title: 'Closing Headliner — Founder Mainstage Access', day: 'sunday', day_label: 'Sunday 8/30', date: '2026-08-30', start_time: '7:00 PM', end_time: '10:00 PM', location: 'Headliner Venue TBD', description: 'Festival closing headliner. Reserved Founder VIP seating. Bringing the 2nd Annual Boulder Roots Music Festival to a grounded close. Open to all ticket holders.', status: 'planning', access: 'all-access', sponsorship_available: true, sponsor_name: null, time_block: 'prime-time' },
]

const tasks = [
  { id: 't1', event_id: 'wed-bold-1', title: 'Confirm Highland City Club booking', category: 'venue', status: 'complete', assignee: null, notes: 'Confirmed for Session 1' },
  { id: 't2', event_id: 'wed-bold-1', title: 'Secure Session 2 venue', category: 'venue', status: 'not-started', assignee: null, notes: 'Location TBD' },
  { id: 't3', event_id: 'wed-bold-1', title: 'Recruit roundtable facilitators', category: 'talent', status: 'in-progress', assignee: null, notes: 'Need facilitators for 3 tracks' },
  { id: 't4', event_id: 'wed-bold-1', title: 'Identify expert guests for select roundtables', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't5', event_id: 'wed-bold-1', title: 'Sponsorship — session naming rights', category: 'sponsorship', status: 'not-started', assignee: null, notes: 'Open slot' },
  { id: 't6', event_id: 'wed-bold-1', title: 'Define track topics & descriptions', category: 'logistics', status: 'in-progress', assignee: null, notes: 'Health, Culture, Tech tracks' },
  { id: 't7', event_id: 'wed-bold-1', title: 'Founder invitations & RSVPs', category: 'marketing', status: 'not-started', assignee: null, notes: null },
  { id: 't8', event_id: 'wed-film', title: 'Confirm Dairy Arts Center & Gordon Gamm Theater', category: 'venue', status: 'in-progress', assignee: null, notes: 'Contract in progress' },
  { id: 't9', event_id: 'wed-film', title: 'Select independent film for screening', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't10', event_id: 'wed-film', title: 'Book fireside chat host & participants', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't11', event_id: 'wed-film', title: 'Sponsorship — cocktail reception presenting sponsor', category: 'sponsorship', status: 'not-started', assignee: null, notes: 'Open slot' },
  { id: 't12', event_id: 'wed-film', title: 'Cocktail reception catering & bar', category: 'logistics', status: 'not-started', assignee: null, notes: null },
  { id: 't13', event_id: 'wed-film', title: 'AV & projection setup', category: 'production', status: 'not-started', assignee: null, notes: null },
  { id: 't14', event_id: 'thu-bold-2', title: 'Secure Session 3 & 4 venues', category: 'venue', status: 'not-started', assignee: null, notes: 'Locations TBD' },
  { id: 't15', event_id: 'thu-bold-2', title: 'Confirm facilitators for Day 2', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't16', event_id: 'thu-bold-2', title: 'Sponsorship — Day 2 session sponsor', category: 'sponsorship', status: 'not-started', assignee: null, notes: 'Open slot' },
  { id: 't17', event_id: 'thu-bold-2', title: 'Catering & refreshments', category: 'logistics', status: 'not-started', assignee: null, notes: null },
  { id: 't18', event_id: 'thu-opening', title: 'Confirm Caruso Residence availability', category: 'venue', status: 'complete', assignee: null, notes: 'Confirmed with Dan & Cindy' },
  { id: 't19', event_id: 'thu-opening', title: 'Book headline talent', category: 'talent', status: 'in-progress', assignee: null, notes: 'In negotiations' },
  { id: 't20', event_id: 'thu-opening', title: 'Book house band', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't21', event_id: 'thu-opening', title: 'Craft cocktails & gourmet bites menu', category: 'logistics', status: 'not-started', assignee: null, notes: null },
  { id: 't22', event_id: 'thu-opening', title: 'Sound & stage setup at residence', category: 'production', status: 'not-started', assignee: null, notes: null },
  { id: 't23', event_id: 'weekend-lounge', title: 'Secure lounge venue', category: 'venue', status: 'not-started', assignee: null, notes: 'Location TBD' },
  { id: 't24', event_id: 'weekend-lounge', title: 'Lounge sponsorship — presenting partner', category: 'sponsorship', status: 'not-started', assignee: null, notes: 'Open slot — high visibility' },
  { id: 't25', event_id: 'weekend-lounge', title: 'Open bar & hospitality vendor', category: 'logistics', status: 'not-started', assignee: null, notes: null },
  { id: 't26', event_id: 'weekend-lounge', title: 'Wellness services coordination', category: 'logistics', status: 'not-started', assignee: null, notes: null },
  { id: 't27', event_id: 'weekend-lounge', title: 'Lounge design & furnishing', category: 'production', status: 'not-started', assignee: null, notes: null },
  { id: 't28', event_id: 'fri-performing-arts', title: 'Confirm performance venue', category: 'venue', status: 'not-started', assignee: null, notes: 'Location TBD' },
  { id: 't29', event_id: 'fri-performing-arts', title: 'Book performing artist/company', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't30', event_id: 'fri-performing-arts', title: 'Founder early access logistics', category: 'logistics', status: 'not-started', assignee: null, notes: '15-min early entry' },
  { id: 't31', event_id: 'fri-warmup', title: 'Confirm music venue', category: 'venue', status: 'not-started', assignee: null, notes: 'Location TBD' },
  { id: 't32', event_id: 'fri-warmup', title: 'Book talent', category: 'talent', status: 'not-started', assignee: null, notes: 'Talent TBD' },
  { id: 't33', event_id: 'fri-endeavor', title: 'Secure private event venue', category: 'venue', status: 'not-started', assignee: null, notes: 'Venue TBD' },
  { id: 't34', event_id: 'fri-endeavor', title: 'Confirm sponsor & invite list', category: 'sponsorship', status: 'not-started', assignee: null, notes: 'Open — seeking major sponsor' },
  { id: 't35', event_id: 'fri-endeavor', title: 'Book live music / featured artists', category: 'talent', status: 'not-started', assignee: null, notes: 'Subject to availability' },
  { id: 't36', event_id: 'fri-endeavor', title: 'Design tailored programming', category: 'production', status: 'not-started', assignee: null, notes: 'Meet-and-greets, salons, or dinners' },
  { id: 't37', event_id: 'fri-cocktail', title: 'Secure reception venue', category: 'venue', status: 'not-started', assignee: null, notes: 'Location TBD' },
  { id: 't38', event_id: 'fri-cocktail', title: 'Book featured local artists', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't39', event_id: 'fri-cocktail', title: 'Sponsorship — cocktail event sponsor', category: 'sponsorship', status: 'not-started', assignee: null, notes: 'Open slot' },
  { id: 't40', event_id: 'fri-cocktail', title: 'Catering & bar setup', category: 'logistics', status: 'not-started', assignee: null, notes: null },
  { id: 't41', event_id: 'fri-headliner', title: 'Confirm Boulder Theater booking', category: 'venue', status: 'in-progress', assignee: null, notes: 'Contract review' },
  { id: 't42', event_id: 'fri-headliner', title: 'Book Friday headliner', category: 'talent', status: 'in-progress', assignee: null, notes: 'In talks' },
  { id: 't43', event_id: 'fri-headliner', title: 'Sponsorship — mainstage presenting sponsor', category: 'sponsorship', status: 'not-started', assignee: null, notes: 'Open — premium slot' },
  { id: 't44', event_id: 'fri-headliner', title: 'VIP area & lounge setup', category: 'production', status: 'not-started', assignee: null, notes: 'Reserved Founder areas' },
  { id: 't45', event_id: 'fri-headliner', title: 'Complimentary F&B for lounge', category: 'logistics', status: 'not-started', assignee: null, notes: null },
  { id: 't46', event_id: 'fri-afterparty', title: 'Secure after-party venue', category: 'venue', status: 'not-started', assignee: null, notes: 'Location TBD' },
  { id: 't47', event_id: 'fri-afterparty', title: 'Book late-night jam talent', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't48', event_id: 'fri-afterparty', title: 'Sponsorship — after party sponsor', category: 'sponsorship', status: 'not-started', assignee: null, notes: 'Open slot' },
  { id: 't49', event_id: 'sat-morning-music', title: 'Confirm morning venue', category: 'venue', status: 'not-started', assignee: null, notes: 'Music Venue TBD' },
  { id: 't50', event_id: 'sat-morning-music', title: 'Book morning artist', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't51', event_id: 'sat-morning-music', title: 'Founder early access & seating logistics', category: 'logistics', status: 'not-started', assignee: null, notes: 'Early entry at 9:45 AM' },
  { id: 't52', event_id: 'sat-performing-arts', title: 'Confirm performance venue', category: 'venue', status: 'not-started', assignee: null, notes: 'Location TBD' },
  { id: 't53', event_id: 'sat-performing-arts', title: 'Book performing artist/company', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't54', event_id: 'sat-afternoon-music', title: 'Confirm afternoon venue', category: 'venue', status: 'not-started', assignee: null, notes: 'Music Venue TBD' },
  { id: 't55', event_id: 'sat-afternoon-music', title: 'Book afternoon artist', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't56', event_id: 'sat-sponsor-early', title: 'Secure 2 private event venues', category: 'venue', status: 'not-started', assignee: null, notes: 'Venues TBD' },
  { id: 't57', event_id: 'sat-sponsor-early', title: 'Confirm sponsors for Event 1 & 2', category: 'sponsorship', status: 'not-started', assignee: null, notes: 'Open — 2 slots' },
  { id: 't58', event_id: 'sat-sponsor-early', title: 'Book live music / featured artists', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't59', event_id: 'sat-sponsor-late', title: 'Secure 2 private event venues', category: 'venue', status: 'not-started', assignee: null, notes: 'Venues TBD' },
  { id: 't60', event_id: 'sat-sponsor-late', title: 'Confirm sponsors for Event 3 & 4', category: 'sponsorship', status: 'not-started', assignee: null, notes: 'Open — Champion (80) / Visionary (40)' },
  { id: 't61', event_id: 'sat-sponsor-late', title: 'Book live music / featured artists', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't62', event_id: 'sat-headliner', title: 'Confirm Boulder Theater booking', category: 'venue', status: 'in-progress', assignee: null, notes: 'Saturday date hold' },
  { id: 't63', event_id: 'sat-headliner', title: 'Book Saturday headliner', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't64', event_id: 'sat-headliner', title: 'Sponsorship — Saturday mainstage sponsor', category: 'sponsorship', status: 'not-started', assignee: null, notes: 'Open — premium slot' },
  { id: 't65', event_id: 'sat-headliner', title: 'VIP area, lounge & complimentary F&B', category: 'production', status: 'not-started', assignee: null, notes: null },
  { id: 't66', event_id: 'sat-afterparty', title: 'Secure after-party venue', category: 'venue', status: 'not-started', assignee: null, notes: 'Location TBD' },
  { id: 't67', event_id: 'sat-afterparty', title: 'Book entertainment', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't68', event_id: 'sat-afterparty', title: 'Sponsorship — Saturday after party sponsor', category: 'sponsorship', status: 'not-started', assignee: null, notes: 'Open slot' },
  { id: 't69', event_id: 'sat-afterparty', title: 'Catering & bar', category: 'logistics', status: 'not-started', assignee: null, notes: null },
  { id: 't70', event_id: 'sun-music-early', title: 'Confirm venue', category: 'venue', status: 'not-started', assignee: null, notes: 'Music Venue TBD' },
  { id: 't71', event_id: 'sun-music-early', title: 'Book artist', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't72', event_id: 'sun-music-mid', title: 'Confirm venue', category: 'venue', status: 'not-started', assignee: null, notes: 'Music Venue TBD' },
  { id: 't73', event_id: 'sun-music-mid', title: 'Book artist', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't74', event_id: 'sun-sponsor', title: 'Secure private event venue', category: 'venue', status: 'not-started', assignee: null, notes: 'Venue TBD' },
  { id: 't75', event_id: 'sun-sponsor', title: 'Confirm sponsor for Event 5', category: 'sponsorship', status: 'not-started', assignee: null, notes: 'Open — Champion (80) / Visionary (40)' },
  { id: 't76', event_id: 'sun-sponsor', title: 'Book live music / featured artists', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't77', event_id: 'sun-headliner', title: 'Confirm headliner venue', category: 'venue', status: 'not-started', assignee: null, notes: 'Headliner Venue TBD' },
  { id: 't78', event_id: 'sun-headliner', title: 'Book closing headliner', category: 'talent', status: 'not-started', assignee: null, notes: null },
  { id: 't79', event_id: 'sun-headliner', title: 'Sponsorship — closing night presenting sponsor', category: 'sponsorship', status: 'not-started', assignee: null, notes: 'Open — flagship slot' },
  { id: 't80', event_id: 'sun-headliner', title: 'Founder VIP seating & access', category: 'production', status: 'not-started', assignee: null, notes: null },
]

async function seed() {
  console.log('Seeding events...')
  const { error: eventsError } = await supabase.from('events').upsert(events)
  if (eventsError) {
    console.error('Events error:', eventsError)
    process.exit(1)
  }
  console.log(`  ✓ ${events.length} events inserted`)

  console.log('Seeding tasks...')
  const { error: tasksError } = await supabase.from('event_tasks').upsert(tasks)
  if (tasksError) {
    console.error('Tasks error:', tasksError)
    process.exit(1)
  }
  console.log(`  ✓ ${tasks.length} tasks inserted`)

  console.log('\nDone! Your Supabase database is seeded.')
}

seed()

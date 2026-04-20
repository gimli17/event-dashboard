-- Seed Sabrina's initial focus items across all 5 streams
-- Safe to re-run: on conflict do nothing on deterministic ids
-- Run AFTER supabase-migration-v21.sql

insert into daily_priorities (id, owner, stream, title, priority, deadline, sort_order, notes)
values
  -- Boulder Roots
  ('seed-brmf-sponsors', 'Sabrina', 'brmf', 'Zero orphaned sponsor prospects by EOD', 'ultra-high', '2026-04-20', 0,
    'Ensure every prospect tagged Very High, High, or Medium-High has a live thread with a named owner on the team. Goal is zero orphaned prospects by EOD.'),
  ('seed-brmf-tickets', 'Sabrina', 'brmf', 'Set run-rate & targets from ticket-mix review', 'ultra-high', '2026-04-20', 1,
    '150 tickets sold / $31K in revenue. Team is meeting this afternoon to break down the mix (GA vs. Premium vs. Founders), back into a weekly run-rate, and set clear targets against the Aug 26–30 window.'),
  ('seed-brmf-founders', 'Sabrina', 'brmf', 'Re-assign founder funnel off Dan/Emily (w/ Cody)', 'high', null, 2,
    'Cody and I are reviewing all remaining potential founders in the funnel to re-assign away from Dan/Emily.'),
  ('seed-brmf-portal', 'Sabrina', 'brmf', 'Review Bryan''s consolidated sponsor-portal tweaks', 'high', null, 3,
    'Bryan is collating the clarifications and tweaks from Friday''s team roleplay — will land on your dash as a single review doc once consolidated.'),
  ('seed-brmf-board', 'Sabrina', 'brmf', 'Sign off on board bios live on About page', 'high', '2026-04-20', 4,
    'All board bios are in. Alex and Kendall are slotting them into the About section today, pending your sign-off once live.'),
  ('seed-brmf-logos', 'Sabrina', 'brmf', 'Await Dave & Tom feedback on RMP logo concepts', 'medium', null, 5,
    'Kendall sent concepts to Dave and Tom Friday evening — awaiting their feedback. No action needed from you yet.'),

  -- Bold Summit
  ('seed-bs-mendelson', 'Sabrina', 'bold-summit', 'Send reply to Jason Mendelson (Mel, funnel, invitees)', 'ultra-high', null, 0,
    'A reply is teed up in your inbox covering Mel, the funnel priorities, and next-round invitees — ready for you to review and send.'),
  ('seed-bs-venue', 'Sabrina', 'bold-summit', 'Lock venue: St. Julien vs. Boulderado backstop', 'high', '2026-04-22', 1,
    'Per your feedback: Alex is reaching out to the Boulderado in parallel as a backstop to St. Julien, and we''re pressing St. Julien for conference room availability that holds 50 comfortably across both full days. In-person tour still on for Wednesday 4/22.'),
  ('seed-bs-gov', 'Sabrina', 'bold-summit', 'Attorney memo on 501(c)(3) + C-Corp IP holdco', 'high', null, 2,
    'We''ve engaged our nonprofit attorney to pressure-test Lars''s recommendation (501(c)(3) Foundation + C-Corp IP holdco + license agreement). Expect a memo back to you with his reaction and any structural risks flagged before we move on board composition or equity split.'),
  ('seed-bs-portal', 'Sabrina', 'bold-summit', 'Load Bold Summit Portal for walkthrough', 'medium', null, 3,
    'We''re loading tasks and prioritization into the portal backend this week and will ping you for a walkthrough once it''s in reviewable shape.'),

  -- Ensuring Colorado
  ('seed-ec-social', 'Sabrina', 'ensuring-colorado', 'Ship 2 LinkedIn + 2 TikTok posts off 9NEWS clips', 'ultra-high', null, 0,
    'Newsletter went out Friday. Kendall and Alex are drafting the next push — 2 LinkedIn + 2 TikTok posts, built around video clips from the 9NEWS interview and quote pulls from signatories. Targeting posts live early this week to keep the momentum compounding.'),
  ('seed-ec-journalist', 'Sabrina', 'ensuring-colorado', 'Draft journalist JD (Boulder Reporting Lab benchmark)', 'high', null, 1,
    'Pulling together a draft JD this week in response to your LinkedIn post on Boulder opening the door to metro districts — framed around evolving Engage Colorado into a durable Colorado news source (Boulder Reporting Lab benchmark). Will send for your input before we start sourcing.'),

  -- Investments
  ('seed-inv-bifrost', 'Sabrina', 'investments', 'Final pass on Bifrost CEO candidate directory', 'ultra-high', null, 0,
    'Incorporating your feedback (Colorado VCs as the big hunting ground, Infleqtion/Matt & Paul, deep-tech CO entrepreneurs, JPM/MS IB contacts, EQ board, Endeavor CO including EEs, Techstars leaders). Will send back updated directory for a final pass before we start outbound.'),
  ('seed-inv-captable', 'Sabrina', 'investments', 'Review Connor''s cap table draft', 'high', null, 1,
    'Connor''s draft is done — pending my review. Will land on your dash by midweek.'),
  ('seed-inv-theo', 'Sabrina', 'investments', 'Precall w/ Chris on Theo Squires Corp Dev fit', 'medium', null, 2,
    'Chris Pearson (via Cody) asked me to meet Theo given we share an MBA program. Holding a precall with Chris first to calibrate on role fit and whether Theo can handle startup-pace chaos. Low urgency — I''ll flag if anything comes of it.'),

  -- Loud Bear
  ('seed-lb-targets', 'Sabrina', 'loud-bear', 'Lock Loud Bear top-line targets & weekly tracker', 'ultra-high', '2026-04-20', 0,
    'Per your direction to set ambitious goals first and organize around them, we''re using today''s session to lock top-line targets (audience, guest cadence, revenue), a weekly tracker, and owner accountability before we add any more programming.'),
  ('seed-lb-guests', 'Sabrina', 'loud-bear', 'Review next Bear Roars guest list', 'high', null, 1,
    'Bringing a recommended list to the same session for your review — will follow up with the top picks and rationale once we align on the target profile.')
on conflict (id) do nothing;

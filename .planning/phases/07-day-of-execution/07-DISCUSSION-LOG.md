# Phase 7: Day-Of Execution - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 07-day-of-execution
**Areas discussed:** Departure checklist design, Float plan content & delivery, Departure trigger flow, Settings page for contacts/email

---

## Departure Checklist Design

### How should the departure checklist be structured?

| Option | Description | Selected |
|--------|-------------|----------|
| Claude-generated timeline | Claude reads trip data to generate a "T-minus" checklist. AI-generated each time. | |
| Template with data fill | Fixed template with time slots auto-populated from trip data. No Claude call. | |
| Hybrid | Fixed time-slot structure, Claude fills details and adds context-aware tips. | ✓ |

**User's choice:** Hybrid
**Notes:** None

### Where should the departure checklist live?

| Option | Description | Selected |
|--------|-------------|----------|
| New section in prep page | Add "Departure" section at bottom of /trips/[id]/prep | |
| Standalone departure page | Dedicated /trips/[id]/depart page | |
| Both | Summary in prep page, full interactive checklist on standalone departure page | ✓ |

**User's choice:** Both
**Notes:** None

### Should checklist items be interactive?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, check-off items | Each item has checkbox, progress persists, completion percentage | ✓ |
| Read-only reference | Just a list to read through, no state tracking | |

**User's choice:** Yes, check-off items
**Notes:** None

### What time slots should the template use?

| Option | Description | Selected |
|--------|-------------|----------|
| 3 slots | Night Before, Morning Of, Before Departure | |
| 4 slots | 2 Days Out, Night Before, Morning Of, Final Walk-Through | |
| You decide | Claude picks based on trip data and prep needed | ✓ |

**User's choice:** You decide
**Notes:** None

### Should the checklist include vehicle-specific items?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, pull from vehicle mods | Include items based on vehicle profile and mods | ✓ |
| Just a "vehicle ready" reminder | One generic vehicle inspection item | |

**User's choice:** Yes, pull from vehicle mods
**Notes:** None

### Should the checklist persist?

| Option | Description | Selected |
|--------|-------------|----------|
| Persist like packing list | Save to DB, load on mount, regenerate button. Same Phase 6 pattern. | ✓ |
| Session-only | Fresh each time, state in React only | |

**User's choice:** Persist like packing list
**Notes:** None

### How should unpacked items appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Highlighted warnings | Amber warnings for unpacked items with visual urgency | ✓ |
| Folded into time slots | Unpacked items appear in natural time slot, no separate warning | |

**User's choice:** Highlighted warnings
**Notes:** None

---

## Float Plan Content & Delivery

### How should emergency contact info be stored?

| Option | Description | Selected |
|--------|-------------|----------|
| Field on Trip model | Per-trip emergency contact | |
| User profile / settings | One global emergency contact | |
| Both | Global default in settings, overridable per trip | ✓ |

**User's choice:** Both
**Notes:** None

### Which email service?

| Option | Description | Selected |
|--------|-------------|----------|
| Resend | Simple API, free tier, React Email templates | |
| Nodemailer + Gmail | Free, uses Gmail account, no third-party dependency | ✓ |
| You decide | Claude picks best option | |

**User's choice:** Nodemailer + Gmail
**Notes:** User specifically wants emails in Gmail sent folder for searchability and reply threads. Prefers no third-party service for a personal tool.

### What should the float plan email include?

| Option | Description | Selected |
|--------|-------------|----------|
| Essential safety info | Trip name, dates, destination, gear summary, vehicle, contact | |
| Full trip brief | Everything above plus weather, meal plan, checklist status | |
| You decide | Claude determines right detail level | ✓ |

**User's choice:** You decide
**Notes:** None

### Should Claude compose the email or use a template?

| Option | Description | Selected |
|--------|-------------|----------|
| Claude-written | Natural, readable, adapts to context | ✓ |
| Fixed template | Structured HTML with data filled in | |
| Hybrid | Fixed structure with Claude summary paragraph | |

**User's choice:** Claude-written
**Notes:** None

### Map in email?

| Option | Description | Selected |
|--------|-------------|----------|
| Google Maps link | Coordinates link, simple, always works | ✓ |
| Static map image + link | Embedded map image plus link | |
| You decide | Claude picks simplest approach | |

**User's choice:** Google Maps link
**Notes:** User mentioned future idea of public-facing trip map with campsite notes. Deferred — start with Google Maps links.

### Store sent float plans?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, log each send | Record when sent, to whom, content | ✓ |
| No, Gmail is the record | Sent folder is sufficient | |

**User's choice:** Yes, log each send
**Notes:** None

---

## Departure Trigger Flow

### Where should "Send Float Plan" button live?

| Option | Description | Selected |
|--------|-------------|----------|
| On departure page | CTA at bottom of checklist page | |
| On both prep and departure | Available on both pages | |
| You decide | Claude picks natural placement | ✓ |

**User's choice:** You decide
**Notes:** None

### Should it trigger Phase 8's offline snapshot?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, combined action | One "I'm Leaving" button for both | |
| No, keep separate | Independent actions | |
| Prepare the hook | Own action now, design for Phase 8 to add alongside | ✓ |

**User's choice:** Prepare the hook
**Notes:** None

### Confirmation before sending?

| Option | Description | Selected |
|--------|-------------|----------|
| Preview then send | Show email content in modal before sending | |
| Confirm dialog only | Simple confirmation gate | |
| You decide | Claude picks right UX | ✓ |

**User's choice:** You decide
**Notes:** None

### Gmail credentials config?

| Option | Description | Selected |
|--------|-------------|----------|
| App password in .env | Standard, user creates App Password | ✓ |
| OAuth2 with refresh token | More secure, more setup | |
| You decide | Claude picks simplest secure approach | |

**User's choice:** App password in .env
**Notes:** None

---

## Settings Page

### How should settings be accessed?

| Option | Description | Selected |
|--------|-------------|----------|
| New settings page | /settings from top header gear icon | |
| Inline on first send | Prompt inline when no contact configured | |
| Both | Settings page + inline prompt on first use | ✓ |

**User's choice:** Both
**Notes:** None

---

## Claude's Discretion

- Number of time slots in departure checklist template
- Float plan email content detail level
- Confirmation UX for float plan send
- Send Float Plan button exact placement
- DepartureChecklist data model structure
- Settings page layout

## Deferred Ideas

- **SOS distress beacon** — emergency button sending live location to contacts and local first responders. Needs offline, location services, multi-contact list, pre-cached emergency numbers. Major feature, own phase.
- **Public-facing trip map** — shareable map with campsite notes for float plan email. Own design pass needed.
- **Return notification** — "I'm back" action to notify emergency contact. Could tie into Phase 9 learning loop.

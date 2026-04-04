# Siri / Reminders Inbox — Setup Guide

Say "Hey Siri, add to Outland" while driving. The Reminder lands in a list, a Shortcut picks it up that night, and it appears in the Outland Inbox as a triaged item ready to accept or discard.

---

## Step 1 — Create the Reminders List

1. Open **Reminders** on iPhone
2. Tap **Add List** (bottom left)
3. Name it exactly: **Outland Inbox**
4. Pick any color/icon — doesn't matter
5. Tap **Done**

That's it. You can now say "Hey Siri, remind me in Outland Inbox to…" and it lands there automatically.

---

## Step 2 — Find Your Mac Mini Tailscale IP

On the Mac mini (`lisa`), run:

```bash
tailscale ip -4
```

Note the address — something like `100.x.x.x`. The Shortcut will POST to:

```
http://100.x.x.x:3000/api/intake
```

Your iPhone must be connected to Tailscale for this to reach the Mac mini from anywhere.

---

## Step 3 — Create the Shortcut

Open **Shortcuts** on iPhone → tap **+** to create a new Shortcut.

### Shortcut steps (add in order):

**1. Get Reminders**
- Action: **Get Reminders**
- List: **Outland Inbox**
- Filter: **Is Not Completed** = true

**2. Repeat with Each**
- Action: **Repeat with Each** (loops over the reminders from step 1)

  Inside the loop:

  **3. Get Dictionary Value**
  - Action: **Get Details of Reminder**
  - Detail: **Title**
  - From: **Repeat Item** (the current reminder)
  - Save result as variable: `ReminderText`

  **4. Get Contents of URL**
  - Action: **Get Contents of URL**
  - URL: `http://100.x.x.x:3000/api/intake` ← replace with your Tailscale IP
  - Method: **POST**
  - Request Body: **Form**
  - Add fields:
    - Key: `text` → Value: **ReminderText** (variable from step 3)
    - Key: `sourceHint` → Value: `reminder` (literal text)

  **5. Mark as Completed**
  - Action: **Mark Reminder as Completed**
  - Reminder: **Repeat Item**

**End Repeat**

### Name the Shortcut
Name it **"Outland: Process Inbox"** — this is the name Siri uses if you want to trigger it manually.

---

## Step 4 — Set Up Automation (runs automatically)

1. In Shortcuts, tap **Automation** tab → **+** → **Personal Automation**
2. Trigger: **Time of Day** → 9:00 PM, Every Day
3. Action: **Run Shortcut** → select **Outland: Process Inbox**
4. Turn off **Ask Before Running**

Now every night at 9 PM the Shortcut processes any unread Reminders and sends them to Outland.

---

## Step 5 — Trigger with Siri

To add a Reminder using Siri while driving:

> "Hey Siri, remind me in **Outland Inbox** to look at the MSR Whisperlite stove."

Or you can set Siri to use Outland Inbox as the default for a shorter phrase — go to Settings → Siri & Search → Reminders → Default List → **Outland Inbox**.

With that set, you can just say:

> "Hey Siri, remind me to look at Jetboil flash sale."

And it lands in Outland Inbox automatically.

---

## How It Works

```
Siri dictation → Apple Reminders (Outland Inbox list)
                           ↓  (Shortcut runs at 9 PM)
              POST /api/intake?text=…&sourceHint=reminder
                           ↓
                    Claude triage (reminder-aware prompt)
                           ↓
                  InboxItem created in database
                           ↓
                  Appears in Outland Inbox UI
```

The `sourceHint=reminder` flag tells Claude to treat the text as terse voice input and infer camping intent liberally — so "look at that stove thing" gets classified as a gear item, not "unknown".

---

## Troubleshooting

**Shortcut can't reach the Mac mini**
- Make sure your iPhone has Tailscale connected
- Confirm the Mac mini is running: `ssh lisa 'pm2 status'`
- Test the endpoint from Tailscale: open Safari on iPhone → `http://100.x.x.x:3000`

**Reminders aren't being picked up**
- Check the list is named exactly **Outland Inbox** (case-sensitive in Shortcuts)
- Make sure the Reminder is not already marked complete

**Items appear in Inbox but with wrong type**
- The Claude triage is probabilistic — check the Inbox and accept/discard as needed
- "low confidence" items appear with a yellow badge so you can review them first

---

## Manual Trigger

To run the Shortcut without waiting for the 9 PM automation:

- Open Shortcuts → tap **Outland: Process Inbox**
- Or say: "Hey Siri, run Outland Process Inbox"

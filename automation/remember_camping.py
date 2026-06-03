#!/usr/bin/env python3
"""Emit Outland OS post-trip debriefs into LisaBrain memory.

This is the camping subsystem's single bridge into Lisa — the analog of
find-will-a-job's ``automation/remember_fwaj.py``. The difference: FWAJ is
headless jobs that already produce text, so its bridge just reads stdout.
Outland is an interactive Next.js app, so the *emission surface* is what
matters. The richest signal Outland already captures is the post-trip
debrief: the ``TripFeedback`` table (summary, voice transcript, and a
structured ``insights`` JSON blob of what-worked / what-didn't / gear
feedback / campsite rating).

This script reads new ``TripFeedback`` rows from Outland's SQLite database,
formats each into a readable debrief, and stores it in LisaBrain's
``memories`` table as ``source='camping'``. From there it flows into the
nightly ``me.episodes`` facet distillation, the morning brief, recall, and
Hermes — exactly like FWAJ activity does.

Idempotency: a small JSON ledger of already-emitted feedback ids lives at
``~/.lisabrain/camping_state.json`` (override with ``CAMPING_REMEMBER_STATE``).
We track our own cursor rather than coupling to Outland's ``status``
('pending'/'applied') column, which has its own in-app meaning.

Run on the Mac mini (where Outland's real DB and the lisabrain venv both
live). Intended to be invoked by a launchd job — that wiring is a separate,
later step.
"""
from __future__ import annotations

import datetime as _dt
import json
import os
import sqlite3
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path.home() / ".env.lisaos")

from lisabrain.write import remember  # noqa: E402  (after env load, like remember_fwaj)

# Outland's production SQLite DB on the Mini; override for dev/testing.
DEFAULT_OUTLAND_DB = Path.home() / "outland-data" / "db.sqlite"
# Ledger of TripFeedback ids we've already emitted (idempotency cursor).
DEFAULT_STATE_PATH = Path.home() / ".lisabrain" / "camping_state.json"

MIN_CHARS = 50      # below this the debrief is too thin to be worth a memory
MAX_CHARS = 6000    # lisabrain.write truncates at 8000; cut earlier for sanity


def _db_path() -> Path:
    return Path(os.environ.get("OUTLAND_DB", str(DEFAULT_OUTLAND_DB))).expanduser()


def _state_path() -> Path:
    return Path(
        os.environ.get("CAMPING_REMEMBER_STATE", str(DEFAULT_STATE_PATH))
    ).expanduser()


def load_emitted_ids(state_path: Path) -> set[str]:
    """Return the set of TripFeedback ids already emitted to Lisa."""
    try:
        raw = json.loads(state_path.read_text())
    except (OSError, json.JSONDecodeError):
        return set()
    ids = raw.get("emitted_ids", []) if isinstance(raw, dict) else []
    return {str(i) for i in ids}


def save_emitted_ids(state_path: Path, emitted: set[str]) -> None:
    """Persist the emitted-ids ledger (sorted for stable diffs)."""
    state_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "emitted_ids": sorted(emitted),
        "updated_at": _dt.datetime.now().isoformat(),
    }
    state_path.write_text(json.dumps(payload, indent=2))


def fetch_feedback(db_path: Path) -> list[dict]:
    """Read all TripFeedback rows joined to their trip name, newest first."""
    if not db_path.exists():
        raise FileNotFoundError(f"Outland DB not found at {db_path}")
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT f.id        AS id,
                   f.tripId    AS trip_id,
                   f.summary   AS summary,
                   f.voiceTranscript AS voice_transcript,
                   f.insights  AS insights,
                   f.createdAt AS created_at,
                   t.name      AS trip_name
            FROM TripFeedback f
            LEFT JOIN Trip t ON t.id = f.tripId
            ORDER BY f.createdAt ASC
            """
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def _format_insights(insights_raw: str | None) -> str:
    """Render the structured ``insights`` JSON blob into readable lines."""
    if not insights_raw:
        return ""
    try:
        data = json.loads(insights_raw)
    except (TypeError, json.JSONDecodeError):
        return ""
    if not isinstance(data, dict):
        return ""

    lines: list[str] = []

    def _texts(items: object) -> list[str]:
        out: list[str] = []
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict) and item.get("text"):
                    text = str(item["text"]).strip()
                    gear = item.get("gearName")
                    out.append(f"{text} ({gear})" if gear else text)
                elif isinstance(item, str) and item.strip():
                    out.append(item.strip())
        return out

    worked = _texts(data.get("whatWorked"))
    didnt = _texts(data.get("whatDidnt"))
    gear = _texts(data.get("gearFeedback"))
    if worked:
        lines.append("What worked: " + "; ".join(worked))
    if didnt:
        lines.append("What didn't: " + "; ".join(didnt))
    if gear:
        lines.append("Gear feedback: " + "; ".join(gear))

    rating = data.get("spotRating")
    if isinstance(rating, dict) and rating.get("rating") is not None:
        spot = rating.get("locationName") or "campsite"
        lines.append(f"Campsite rating: {spot} — {rating['rating']}/5")

    return "\n".join(lines)


def build_content(row: dict) -> str:
    """Compose the human-readable debrief stored in the memory."""
    trip_name = row.get("trip_name") or "an unnamed trip"
    parts: list[str] = [f"Post-trip debrief — {trip_name}."]

    summary = (row.get("summary") or "").strip()
    if summary:
        parts.append(summary)

    insight_text = _format_insights(row.get("insights"))
    if insight_text:
        parts.append(insight_text)

    if not summary and not insight_text:
        transcript = (row.get("voice_transcript") or "").strip()
        if transcript:
            parts.append(f"Voice debrief: {transcript}")

    content = "\n\n".join(parts)
    if len(content) > MAX_CHARS:
        content = content[:MAX_CHARS] + f"\n[truncated — {len(content)} total chars]"
    return content


def main() -> None:
    db_path = _db_path()
    state_path = _state_path()

    try:
        feedback = fetch_feedback(db_path)
    except (FileNotFoundError, sqlite3.Error) as exc:
        print(f"[remember_camping] cannot read Outland DB: {exc}", file=sys.stderr)
        sys.exit(1)

    emitted = load_emitted_ids(state_path)
    run_at = _dt.datetime.now().isoformat()
    new_count = 0

    for row in feedback:
        fid = str(row["id"])
        if fid in emitted:
            continue

        content = build_content(row)
        if len(content) < MIN_CHARS:
            print(f"[remember_camping] feedback {fid} too thin — marking seen")
            emitted.add(fid)
            continue

        row_id = remember(
            content=content,
            source="camping",
            metadata={
                "feedbackId": fid,
                "tripId": row.get("trip_id"),
                "tripName": row.get("trip_name"),
                "tripCreatedAt": str(row.get("created_at")),
                "run_at": run_at,
            },
        )
        emitted.add(fid)
        new_count += 1
        print(
            f"[remember_camping] stored id={row_id} feedback={fid} "
            f"trip={row.get('trip_name')!r} chars={len(content)}"
        )

    save_emitted_ids(state_path, emitted)
    print(f"[remember_camping] done — {new_count} new debrief(s) emitted")


if __name__ == "__main__":
    main()

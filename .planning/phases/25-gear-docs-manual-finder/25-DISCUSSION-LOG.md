# Phase 25: Gear Docs & Manual Finder - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-03
**Areas discussed:** manualUrl migration

---

## Area: manualUrl Migration

**Q: Which areas do you want to discuss?**
Options: manualUrl migration, Claude search strategy, PDF viewing on mobile, Document scope
Selected: manualUrl migration

**Q: How should we handle the existing manualUrl field on GearItem?**
Options: Migrate + remove (Recommended), Keep both, Sunset manualUrl silently
Selected: Migrate + remove (Recommended)

**Q: When migrating existing manualUrl values, what document type should they become in GearDocument?**
Options: support_link (Recommended), manual_pdf, product_page
Selected: support_link (Recommended)

**Q: Should the GearDocument model include a 'title' that Claude generates, or just type + url?**
Options: type + url + title (Recommended), type + url only
Selected: type + url + title (Recommended)

---

*Areas not discussed (left to planner's discretion):*
- Claude search strategy
- PDF viewing on mobile
- Document scope (warranty upload vs. auto-search)

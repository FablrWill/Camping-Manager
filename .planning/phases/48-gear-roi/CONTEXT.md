# S21: Gear ROI Tracker — Context

**Session:** S21
**Date:** 2026-04-04
**Status:** Done

## Background

Will wanted to know which gear items are "earning their keep." A $400 tent used on 40 trips has better ROI than a $200 camp chair used twice. Simple computation: purchasePrice / number of trips used.

## What This Addressed

- Gear items had purchase price but no measure of utilization
- No way to identify underused expensive items vs. workhorses
- Surfaces in gear detail modal as a new ROI tab

## Computation

- **Trip count** = number of PackingItem records for this gear item (each appearance = used on that trip)
- **Cost per trip** = purchasePrice / tripCount (null if no purchase price or 0 trips)
- **ROI grade**: A (< $5/trip), B ($5-15), C ($15-30), D (> $30)

## Key Decisions

- Trip count derived from PackingItem appearances — not a separate stored field (pure computation)
- Pure computation endpoint — no caching, runs on demand
- Only shows meaningful data when purchasePrice is set
- GearROITab is a new tab in the gear detail modal alongside the existing Detail/Research/Deals tabs

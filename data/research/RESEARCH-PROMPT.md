# Gemini Deep Research Prompt — NC Camping Knowledge Base

Copy the prompt below into Gemini Deep Research. Run it **once per topic section** (not all at once — you'll get better depth per topic).

---

## Output Instructions (include this at the top of every prompt)

```
FORMAT YOUR RESPONSE AS A MARKDOWN FILE I CAN SAVE DIRECTLY.

At the very top, include YAML frontmatter in this exact format:

---
topic: "[Topic Name]"
region: "[western-nc | piedmont | coastal-plain | statewide]"
category: "[regulations | campgrounds | roads | safety | seasonal | signals | water]"
researched: "2026-03-29"
source: "gemini-deep-research"
confidence: "[high | medium | low]"
---

Then write the content using:
- H2 (##) for major sections
- H3 (###) for subsections
- Bullet lists for facts and rules
- Tables for comparative data (campground features, road ratings, etc.)
- Bold for key terms, regulations, and warnings
- Include the source URL or document name inline when citing a specific fact
- Flag anything that changes seasonally or annually with: ⚠️ VERIFY CURRENT STATUS

Keep it factual and dense. No conversational filler. Write like a reference guide, not a blog post.

Save the output as a .md file named: [topic-slug].md
Example: pisgah-dispersed-camping.md
```

---

## Topic 1: Dispersed Camping Regulations by National Forest

```
[Paste the output instructions above, then add:]

Research dispersed camping (also called primitive camping or backcountry camping) rules and regulations for every National Forest in North Carolina:

- Pisgah National Forest (all ranger districts: Appalachian, Grandfather, Pisgah, French Broad)
- Nantahala National Forest (all ranger districts: Cheoah, Tusquitee, Nantahala, Highlands)
- Uwharrie National Forest
- Croatan National Forest

For each forest, cover:
- Is dispersed camping allowed? Where exactly?
- Distance requirements from roads, trails, water sources
- Maximum stay limits
- Fire regulations (campfire rings, stoves, seasonal fire bans)
- Bear canister requirements
- Group size limits
- Vehicle camping rules (can you car camp off forest roads?)
- Permit requirements (if any)
- Prohibited areas or seasonal closures
- Relevant forest orders currently in effect

Also cover state-level rules:
- NC state parks camping rules (vs. national forest)
- Blue Ridge Parkway camping regulations
- Great Smoky Mountains National Park backcountry rules
- Game lands camping rules during hunting season
```

## Topic 2: Best Campgrounds by Region

```
[Paste the output instructions above, then add:]

Create a comprehensive guide to the best campgrounds in North Carolina, organized by region. Include both developed campgrounds and well-known dispersed camping areas.

Regions to cover:
- Western NC Mountains (Pisgah, Blue Ridge, Smokies area)
- Foothills & Uwharrie
- Piedmont
- Coastal Plain & Outer Banks

For each campground or area, include a table or structured entry with:
- Name and exact location (nearest town, forest/park)
- Type: developed, primitive, dispersed, backcountry
- Reservable? (and through which system — recreation.gov, etc.)
- Number of sites (approximate)
- Elevation
- Water access (potable? river/lake nearby?)
- Key features (why go here — views, solitude, fishing, trails)
- Best season to visit
- Vehicle requirements (2WD OK? high clearance? 4WD?)
- Cell signal likelihood
- Price range
- Nearby trails or attractions

Focus on campgrounds that are good for car camping and overlanding, not just backpacking.
```

## Topic 3: Forest Road Conditions & Vehicle Access

```
[Paste the output instructions above, then add:]

Research forest road access in North Carolina's national forests, focused on car camping and overlanding access.

Cover:
- Major forest roads in Pisgah NF (especially FR-5000 series, FR-477, FR-1206, etc.)
- Major forest roads in Nantahala NF
- Uwharrie OHV trails and forest roads
- Roads that access popular dispersed camping areas

For each road or road system, include:
- Road number and name
- Surface type (paved, gravel, dirt, rocky)
- Minimum recommended clearance (inches)
- 2WD / AWD / 4WD recommendation
- Seasonal closures or conditions
- Known trouble spots (water crossings, washouts, steep grades)
- What's at the end (camping areas, trailheads, views)
- Length and approximate drive time

Also cover:
- How to check current forest road status (which websites, phone numbers)
- Common seasonal closure patterns (winter gates, hunting season)
- Recovery resources if you get stuck
```

## Topic 4: Seasonal Planning Guide

```
[Paste the output instructions above, then add:]

Create a month-by-month seasonal planning guide for camping in North Carolina.

For each month (January through December), cover:
- Average temperatures by region (mountains vs. piedmont vs. coast)
- Rainfall patterns
- Crowd levels (scale: empty / light / moderate / busy / packed)
- Hunting seasons active that month (deer, bear, turkey, etc.) and safety implications
- Burn ban likelihood
- Bug pressure (mosquitoes, ticks, no-see-ums — by region)
- Wildflower/fall color peak timing
- Road/trail conditions
- Best regions to camp that month
- What to avoid that month
- Key events or holidays that affect campground availability

Also include:
- NC hunting season calendar (current year) with overlap to camping areas
- Historical burn ban patterns
- Hurricane/tropical storm season considerations for coastal camping
- Spring flooding patterns in mountain valleys
- Winter camping considerations (water freezing, road closures, shorter days)
```

## Topic 5: Water Sources & Cell/Starlink Coverage

```
[Paste the output instructions above, then add:]

Research water sources and connectivity for camping in NC's national forests and popular camping areas.

Water sources:
- Major rivers and creeks near dispersed camping areas in Pisgah, Nantahala, Uwharrie
- Known reliable springs (year-round vs. seasonal)
- Water treatment recommendations for NC backcountry water
- Developed campgrounds with potable water and their seasonal availability
- Lakes and reservoirs with camping access

Cell coverage:
- General cell coverage patterns in NC mountains (which carrier is best for coverage?)
- Known dead zones in popular camping areas
- Ridgeline vs. valley coverage differences
- Any known cell towers near popular forest areas

Starlink:
- Tree canopy considerations in NC forests
- Southern sky visibility requirements and how NC latitude affects this
- Known good/bad spots for satellite internet in forested areas
- Tips for finding sky openings in dense forest

Include a rough coverage assessment for the most popular camping areas:
- Rate each as: none / weak / moderate / strong for cell
- Note which carriers work best where (if data exists)
```

## Topic 6: Bear Safety & Leave No Trace in NC

```
[Paste the output instructions above, then add:]

Research bear safety and Leave No Trace practices specific to North Carolina camping.

Bear safety:
- Black bear population and distribution in NC
- Bear-active areas and seasons
- Bear canister requirements (where mandatory, where recommended)
- Proper food storage methods for car camping vs. backpacking
- Bear encounter protocols
- Recent bear incident areas or problem bear zones
- Bear-proof container loaner programs

Leave No Trace for NC:
- The 7 LNT principles applied to NC's specific ecosystems
- Campfire regulations by forest (where fires are allowed, ring requirements)
- Human waste disposal rules (burial depth, distance from water)
- Specific fragile ecosystems in NC to protect (balds, bogs, old growth)
- Pack-out requirements
- Campsite selection rules in dispersed areas

Fire regulations:
- Current fire regulation framework in NC national forests
- How burn bans are issued and where to check
- Stove vs. campfire rules
- Firewood transportation rules (emerald ash borer restrictions)
```

---

## How to Save the Output

After each Gemini session:

1. Copy the full response
2. Save as `.md` file in: `data/research/[topic-slug].md`
3. Keep the YAML frontmatter exactly as formatted
4. File naming examples:
   - `dispersed-camping-regulations.md`
   - `campgrounds-by-region.md`
   - `forest-road-conditions.md`
   - `seasonal-planning-guide.md`
   - `water-and-connectivity.md`
   - `bear-safety-lnt.md`

These files will be ingested directly into the knowledge base RAG system. The frontmatter helps with categorization and staleness tracking.

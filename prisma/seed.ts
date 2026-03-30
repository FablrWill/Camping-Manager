import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ──────────────────────────────────────────────
  // Vehicle
  // ──────────────────────────────────────────────
  const santaFe = await prisma.vehicle.upsert({
    where: { id: "santa-fe" },
    update: {},
    create: {
      id: "santa-fe",
      name: "2022 Santa Fe Hybrid",
      year: 2022,
      make: "Hyundai",
      model: "Santa Fe Hybrid",
      drivetrain: "AWD (HTRAC)",
      fuelEconomy: "~33 city / 30 hwy",
      groundClearance: 8.0,
      towingCapacity: 2000,
      cargoVolume: 41.7,
      cargoLength: 72,
      cargoWidth: 45,
      notes:
        "1.6L Turbo GDI + Electric Motor (226 hp combined). 6-speed auto. 17.7 gal tank. ~4,200 lbs curb weight. Hybrid system provides 12V access and Ready Mode for climate/charging without full engine run. Sleep potential: ~72in with seats folded.",
    },
  });

  // Vehicle mods
  await prisma.vehicleMod.upsert({
    where: { id: "mod-yakima-rack" },
    update: {},
    create: {
      id: "mod-yakima-rack",
      vehicleId: santaFe.id,
      name: "Yakima BaseLine + LoadWarrior Cargo Basket",
      description:
        "Yakima BaseLine roof rack towers with factory crossbar fit kit. 43in LoadWarrior cargo basket mounted on top. Carries camp table, chairs, and overflow gear bags.",
      installedAt: new Date("2025-10-15"),
      cost: 620,
      notes: "Fits perfectly within factory roof rail spacing. No noise issues at highway speed.",
    },
  });

  await prisma.vehicleMod.upsert({
    where: { id: "mod-weathertech-mats" },
    update: {},
    create: {
      id: "mod-weathertech-mats",
      vehicleId: santaFe.id,
      name: "WeatherTech All-Weather Floor Liners",
      description:
        "Front, rear, and cargo area liners. Custom-fit laser-measured for 2022 Santa Fe Hybrid. Keeps dirt, mud, and pine needles contained.",
      installedAt: new Date("2022-09-01"),
      cost: 220,
      notes: "Best investment for a car camping vehicle. Clean-up is a hose-down.",
    },
  });

  await prisma.vehicleMod.upsert({
    where: { id: "mod-power-inverter" },
    update: {},
    create: {
      id: "mod-power-inverter",
      vehicleId: santaFe.id,
      name: "BESTEK 300W Power Inverter",
      description:
        "Plugs into 12V outlet. Two AC outlets + 2 USB-A ports. Backup charging when EcoFlow is low and car is running.",
      installedAt: new Date("2025-12-01"),
      cost: 40,
      notes: "Keep in the center console. Use only with engine on to avoid hybrid battery drain.",
    },
  });

  // ──────────────────────────────────────────────
  // Gear
  // ──────────────────────────────────────────────
  await prisma.gearItem.upsert({
    where: { id: "gear-ecoflow-delta2" },
    update: {},
    create: {
      id: "gear-ecoflow-delta2",
      name: "EcoFlow Delta 2",
      brand: "EcoFlow",
      category: "power",
      description:
        "1024Wh LFP portable power station. Powers Starlink, laptop, lighting, and phone charging for 2–3 days. Charges to 80% in ~50 min via AC.",
      condition: "good",
      weight: 12.0,
      price: 999,
      storageLocation: "Rear cargo, left side",
      notes: "Primary power source for the basecamp setup.",
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-ecoflow-solar-220" },
    update: {},
    create: {
      id: "gear-ecoflow-solar-220",
      name: "EcoFlow 220W Bifacial Solar Panel",
      brand: "EcoFlow",
      category: "power",
      description:
        "Foldable 220W bifacial panel. Charges Delta 2 to full in ~5 hours of good sun. Works in partial shade via bifacial cells.",
      condition: "good",
      weight: 9.5,
      price: 499,
      storageLocation: "Rear cargo, rolled against left wall",
      notes: "Set up facing south-southeast. Prop at 45° with included kickstand.",
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-starlink-mini" },
    update: {},
    create: {
      id: "gear-starlink-mini",
      name: "Starlink Mini",
      brand: "SpaceX",
      category: "tools",
      description:
        "Compact travel dish. 11.4\" × 9.8\", 2.4 lbs. ~100–150 Mbps anywhere with sky view. Runs on 20–40W from EcoFlow.",
      condition: "good",
      weight: 2.4,
      price: 599,
      storageLocation: "Rear cargo, top shelf bin",
      notes: "Portability plan required ($50/mo). Pairs with Delta 2 via XT60 cable.",
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-rei-half-dome-2" },
    update: {},
    create: {
      id: "gear-rei-half-dome-2",
      name: "REI Co-op Half Dome 2 Plus Tent",
      brand: "REI Co-op",
      category: "shelter",
      description:
        "3-season 2-person backpacking tent. 40.2 sq ft floor, 44in peak height. Two doors, two vestibules. Easy hub pole system.",
      condition: "good",
      weight: 4.56,
      price: 349,
      storageLocation: "Roof cargo basket, in stuff sack",
      notes: "Stakes included. Always use footprint on rocky ground. Seams sealed.",
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-thermarest-xtherm" },
    update: {},
    create: {
      id: "gear-thermarest-xtherm",
      name: "Therm-a-Rest NeoAir XTherm",
      brand: "Therm-a-Rest",
      category: "sleep",
      description:
        "R-value 7.3. Best warmth-to-weight pad available. WingLock valve for fast inflation. Packs to water-bottle size.",
      condition: "good",
      weight: 1.4,
      price: 250,
      storageLocation: "Rear cargo bin",
      notes: "Loud crinkle sound — use a sleeping bag liner underneath to dampen.",
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-sts-spark-3" },
    update: {},
    create: {
      id: "gear-sts-spark-3",
      name: "Sea to Summit Spark III Sleeping Bag",
      brand: "Sea to Summit",
      category: "sleep",
      description:
        "15°F comfort limit. 850+ fill down. Ultralight at 1.3 lbs. Snag-free zipper, draft collar, and hood cinch.",
      condition: "good",
      weight: 1.3,
      price: 280,
      storageLocation: "Rear cargo bin",
      notes: "Store loose — never compressed long-term. Air out after each trip.",
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-msr-windburner" },
    update: {},
    create: {
      id: "gear-msr-windburner",
      name: "MSR WindBurner Stove System",
      brand: "MSR",
      category: "cook",
      description:
        "Integrated canister stove + 1L pot. Radiant burner nearly windproof. Boils 1L in 4.5 min. Pot nests over burner for compact carry.",
      condition: "good",
      weight: 0.94,
      price: 180,
      storageLocation: "Cook kit bin",
      notes: "Use 110g isobutane canister. Keep a spare in the cook bin.",
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-helinox-chair-one" },
    update: {},
    create: {
      id: "gear-helinox-chair-one",
      name: "Helinox Chair One",
      brand: "Helinox",
      category: "tools",
      description:
        "Ultralight camp chair. 2.1 lbs. 320 lb capacity. Packs to 13\" × 5\". Best chair per pound in existence.",
      condition: "new",
      weight: 2.1,
      price: 180,
      storageLocation: "Roof cargo basket",
      notes: "Ground sheet underneath on soft surfaces to prevent leg sink.",
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-garmin-inreach-mini2" },
    update: {},
    create: {
      id: "gear-garmin-inreach-mini2",
      name: "Garmin inReach Mini 2",
      brand: "Garmin",
      category: "tools",
      description:
        "Satellite communicator. 2-way messaging, SOS, GPS tracking via Iridium network. Works anywhere on earth.",
      condition: "good",
      weight: 0.22,
      price: 350,
      storageLocation: "Glovebox / on person",
      notes: "Freedom plan: $15/mo active, $5/mo suspend. Always bring on backcountry trips.",
    },
  });

  // Wishlist items
  await prisma.gearItem.upsert({
    where: { id: "gear-wish-nemo-roamer" },
    update: {},
    create: {
      id: "gear-wish-nemo-roamer",
      name: "NEMO Roamer Double Sleeping Pad",
      brand: "NEMO",
      category: "sleep",
      description:
        "Double-wide self-inflating pad for car camping. R-value 4. No pump needed. Much more comfortable than air pads for non-backpacking trips.",
      isWishlist: true,
      weight: 7.5,
      price: 260,
      notes: "Would live in the car permanently. Better base camp comfort.",
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-wish-yeti-tundra-45" },
    update: {},
    create: {
      id: "gear-wish-yeti-tundra-45",
      name: "YETI Tundra 45 Cooler",
      brand: "YETI",
      category: "cook",
      description:
        "Hard-sided rotomolded cooler. 37 can capacity. 3–5 days ice retention. Bear-resistant certified.",
      isWishlist: true,
      weight: 23.0,
      price: 325,
      notes: "Replace the cheap soft cooler. Buy before summer.",
    },
  });

  // ──────────────────────────────────────────────
  // Locations
  // ──────────────────────────────────────────────
  const genesisSpot = await prisma.location.upsert({
    where: { id: "genesis-spot" },
    update: {},
    create: {
      id: "genesis-spot",
      name: "South Rim of Linville Gorge",
      latitude: 35.87814,
      longitude: -81.9092862,
      type: "dispersed",
      description:
        "First-ever campsite. South rim overlooking Hawksbill Mountain and the gorge. Accessed via Old NC 105 (Kistler Memorial Highway). Large flat clearing, easy vehicle access, enough space for full working setup.",
      rating: 5,
      roadCondition: "Gravel forest road, well-maintained",
      clearanceNeeded: "Standard clearance fine, AWD recommended",
      cellSignal: "weak",
      starlinkSignal: "strong",
      waterAccess: false,
      visitedAt: new Date("2026-03-29"),
      notes:
        "Genesis spot for Outland OS project. Bluebird day, early spring, bare trees. Laptop on camp table overlooking the gorge. EcoFlow + Starlink setup. Discovery-driven road — best sites are further along and slightly tucked away.",
    },
  });

  const beechGap = await prisma.location.upsert({
    where: { id: "loc-beech-gap" },
    update: {},
    create: {
      id: "loc-beech-gap",
      name: "Beech Gap, Pisgah National Forest",
      latitude: 35.3205,
      longitude: -82.7738,
      type: "dispersed",
      description:
        "High-elevation dispersed site on the ridge between Pisgah and Nantahala NF. Near the BRP. Incredible dark skies. Cooler temps even in summer.",
      rating: 4,
      roadCondition: "Paved to forest road junction, then packed gravel",
      clearanceNeeded: "Standard clearance okay, AWD strongly preferred",
      cellSignal: "none",
      starlinkSignal: "strong",
      waterAccess: false,
      notes: "Great spring wildflower spot. No fire rings — LNT only. Gets cold fast after sunset.",
    },
  });

  const roughRidge = await prisma.location.upsert({
    where: { id: "loc-rough-ridge" },
    update: {},
    create: {
      id: "loc-rough-ridge",
      name: "Rough Ridge Overlook",
      latitude: 36.1327,
      longitude: -81.8467,
      type: "overlook",
      description:
        "Exposed granite overlook off the Blue Ridge Parkway. 360° views. Short hike from roadside pullout. Not a camping spot — staging point for photos and day trips.",
      rating: 5,
      roadCondition: "Paved BRP, accessible year-round",
      clearanceNeeded: "Any vehicle",
      cellSignal: "moderate",
      starlinkSignal: "strong",
      waterAccess: false,
      notes: "Sunrise and sunset both excellent. Bring a jacket — wind is constant. Mile marker ~304.",
    },
  });

  const davidsonRiver = await prisma.location.upsert({
    where: { id: "loc-davidson-river" },
    update: {},
    create: {
      id: "loc-davidson-river",
      name: "Davidson River Campground",
      latitude: 35.2887,
      longitude: -82.7404,
      type: "campground",
      description:
        "USFS campground in Pisgah NF on the Davidson River. 161 sites, flush toilets, water hookups. Base camp for Sliding Rock, Looking Glass Falls, and Pisgah Ranger District trails.",
      rating: 4,
      roadCondition: "Paved access road",
      clearanceNeeded: "Any vehicle",
      cellSignal: "moderate",
      starlinkSignal: "moderate",
      waterAccess: true,
      notes: "Reserve on Recreation.gov well in advance. Sites 1–30 are best for river access.",
    },
  });

  // ──────────────────────────────────────────────
  // Trips
  // ──────────────────────────────────────────────
  await prisma.trip.upsert({
    where: { id: "trip-linville-gorge-march" },
    update: {},
    create: {
      id: "trip-linville-gorge-march",
      name: "Linville Gorge Overnight",
      startDate: new Date("2026-03-28"),
      endDate: new Date("2026-03-29"),
      locationId: genesisSpot.id,
      vehicleId: santaFe.id,
      notes:
        "First real car camping trip with the full setup. EcoFlow + Starlink test. Solo. Cold at night (~32°F) but sunny all day. Worked remotely from the camp table overlooking the gorge. Zero issues with power. Starlink locked on in under 2 minutes.",
      weatherNotes: "Clear skies, high 58°F / low 32°F. Light breeze. No precipitation.",
    },
  });

  await prisma.trip.upsert({
    where: { id: "trip-blue-ridge-april" },
    update: {},
    create: {
      id: "trip-blue-ridge-april",
      name: "Blue Ridge Parkway Run",
      startDate: new Date("2026-04-11"),
      endDate: new Date("2026-04-13"),
      locationId: roughRidge.id,
      vehicleId: santaFe.id,
      notes:
        "2-night drive along the BRP. Plan: drive south from Asheville, camp at a few overlooks and dispersed spots, end at Beech Gap. Focus on photography and testing the new roof basket setup.",
    },
  });

  await prisma.trip.upsert({
    where: { id: "trip-pisgah-june" },
    update: {},
    create: {
      id: "trip-pisgah-june",
      name: "Pisgah NF Weekend — Sliding Rock",
      startDate: new Date("2026-06-06"),
      endDate: new Date("2026-06-08"),
      locationId: davidsonRiver.id,
      vehicleId: santaFe.id,
      notes:
        "First summer trip. Davidson River base camp. Day hikes to Looking Glass Rock and Sliding Rock. Likely warm enough for the river. Possible first dog camping trip.",
    },
  });

  await prisma.trip.upsert({
    where: { id: "trip-beech-gap-may" },
    update: {},
    create: {
      id: "trip-beech-gap-may",
      name: "Beech Gap — Dark Sky Overnight",
      startDate: new Date("2026-05-09"),
      endDate: new Date("2026-05-10"),
      locationId: beechGap.id,
      vehicleId: santaFe.id,
      notes:
        "Solo overnight for astrophotography. New moon weekend. High elevation means cooler temps — pack extra layers. Test the inReach in no-cell territory.",
    },
  });

  console.log("Seeded successfully:", {
    vehicle: santaFe.name,
    mods: 3,
    gearItems: 11,
    locations: 4,
    trips: 4,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

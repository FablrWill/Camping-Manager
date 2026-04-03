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
    update: { hasBattery: false },
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
      hasBattery: false, // classified as the main battery source, not a consumer
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-ecoflow-solar-220" },
    update: { wattage: 220, hasBattery: false },
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
      wattage: 220,
      hasBattery: false,
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-starlink-mini" },
    update: { wattage: 30, hoursPerDay: 12, hasBattery: false },
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
      wattage: 30,       // average of 20–40W range
      hoursPerDay: 12,   // on most of the day
      hasBattery: false,
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
    update: { category: 'furniture' },
    create: {
      id: "gear-helinox-chair-one",
      name: "Helinox Chair One",
      brand: "Helinox",
      category: "furniture",
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
    update: { wattage: 1, hoursPerDay: 24, hasBattery: true, category: 'navigation' },
    create: {
      id: "gear-garmin-inreach-mini2",
      name: "Garmin inReach Mini 2",
      brand: "Garmin",
      category: "navigation",
      description:
        "Satellite communicator. 2-way messaging, SOS, GPS tracking via Iridium network. Works anywhere on earth.",
      condition: "good",
      weight: 0.22,
      price: 350,
      storageLocation: "Glovebox / on person",
      notes: "Freedom plan: $15/mo active, $5/mo suspend. Always bring on backcountry trips.",
      wattage: 1,
      hoursPerDay: 24,
      hasBattery: true,  // internal battery — remind to charge before trips
    },
  });

  // ── SHELTER (from Session 10 gear inventory) ──
  await prisma.gearItem.upsert({
    where: { id: "gear-alvantor-tent" },
    update: {},
    create: {
      id: "gear-alvantor-tent",
      name: "Alvantor SUV Tailgate Tent",
      brand: "Alvantor",
      category: "shelter",
      description: "Instant pop-up tent that attaches to SUV tailgate. Creates enclosed living/sleeping space off the back of the vehicle. UV protection, instant setup in seconds.",
      condition: "new",
      purchaseUrl: "https://www.amazon.com/dp/B0F6N493PL",
      notes: "Setup guide: https://www.alvantor.com/pages/alvantor-pop-up-bed-tent-set-up-and-take-down-instructions",
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-luno-mattress" },
    update: {},
    create: {
      id: "gear-luno-mattress",
      name: "Luno AIR Pro Vehicle Mattress",
      brand: "Luno",
      category: "shelter",
      description: "Inflatable SUV cargo-area mattress. Sleeps 2 up to 6'2\". Solo zipper for solo mode, head support bridge attachments, puncture-proof fabric, included 12V pump.",
      condition: "new",
      price: 349.99,
      purchaseUrl: "https://lunolife.com/products/air-pro-vehicle-mattress",
      notes: "User manual: https://lunolife.gorgias.help/en-US/articles/product-user-manuals-48804 — First use: inflate fully and leave inflated 48 hours before first trip.",
    },
  });

  // ── SLEEP (from Session 10) ──
  await prisma.gearItem.upsert({
    where: { id: "gear-heated-blanket" },
    update: {},
    create: {
      id: "gear-heated-blanket",
      name: "12V Heated Car Blanket",
      brand: "Unknown",
      category: "sleep",
      description: "12V flannel electric blanket for in-vehicle use. 59\"×39\", 9 heat settings, 3 timer settings. Plugs into car 12V outlet.",
      condition: "new",
      purchaseUrl: "https://www.amazon.com/dp/B0FHDQG7LS",
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-kingcamp-blanket" },
    update: {},
    create: {
      id: "gear-kingcamp-blanket",
      name: "KingCamp Ultralight Camping Blanket",
      brand: "KingCamp",
      category: "sleep",
      description: "Packable down-alternative puffy blanket. 69\"×53\", snap buttons to wear as a poncho or use as a quilt. Weatherproof, charcoal color.",
      condition: "new",
      purchaseUrl: "https://www.amazon.com/dp/B0DRVTJS7L",
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-hikenture-pillow" },
    update: {},
    create: {
      id: "gear-hikenture-pillow",
      name: "Hikenture Ultralight Inflatable Pillow",
      brand: "Hikenture",
      category: "sleep",
      description: "Lightweight inflatable camp pillow with removable washable cover. Provides neck and lumbar support. Grey.",
      condition: "new",
      purchaseUrl: "https://www.amazon.com/dp/B0896WCB5D",
    },
  });

  // ── POWER (from Session 10) ──
  await prisma.gearItem.upsert({
    where: { id: "gear-jackery-240" },
    update: {},
    create: {
      id: "gear-jackery-240",
      name: "Jackery Explorer 240 v2",
      brand: "Jackery",
      category: "power",
      description: "256Wh LiFePO4 portable power station. 300W AC output, 100W USB-C, 1-hour fast charge. Compact backup / secondary power unit.",
      condition: "new",
      purchaseUrl: "https://www.amazon.com/dp/B0D2L1B7PK",
      notes: "User manual: https://r.jackery.net/productGuide/Jackery%20Explorer%20240%20v2%20Portable%20Power%20Station%20User%20Manual.pdf",
      wattage: 300,
      hasBattery: false,
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-anker-powercore" },
    update: {},
    create: {
      id: "gear-anker-powercore",
      name: "Anker PowerCore Reserve 192Wh",
      brand: "Anker",
      category: "power",
      description: "60,000mAh / 192Wh power bank. 87W output, USB-C×2 + USB-A×2 + XT60. Built-in retractable light with SOS mode, smart digital display.",
      condition: "good",
      price: 99.98,
      purchaseUrl: "https://www.amazon.com/dp/B0BV23LTXZ",
      notes: "User guide: https://support.anker.com/s/article/Anker-548-Power-Bank-PowerCore-Reserve-192Wh-User-Guide-A1294",
      hasBattery: false,
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-dokio-solar-150" },
    update: {},
    create: {
      id: "gear-dokio-solar-150",
      name: "DOKIO 150W Foldable Solar Panel Kit",
      brand: "DOKIO",
      category: "power",
      description: "150W monocrystalline foldable solar panel. 21\"×20\" folded, 7.3 lbs. Includes standalone controller and USB port.",
      condition: "new",
      weight: 7.3,
      purchaseUrl: "https://www.amazon.com/dp/B07Y8CT1W9",
      notes: "User manual: https://manuals.plus/asin/B07CG8KV33",
      wattage: 150,
      hasBattery: false,
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-fehuatenda-solar-100" },
    update: {},
    create: {
      id: "gear-fehuatenda-solar-100",
      name: "Fehuatenda 100W Solar Panel",
      brand: "Fehuatenda",
      category: "power",
      description: "100W foldable solar panel. IP67 waterproof, single-crystal silicon, QC3.0. 25\"L×4\"W×26\"H, 2.5 lbs.",
      condition: "new",
      weight: 2.5,
      purchaseUrl: "https://www.amazon.com/dp/B0DZWTR6W5",
      notes: "Currently unavailable on Amazon as of March 2026.",
      wattage: 100,
      hasBattery: false,
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-starlink-power-cable" },
    update: {},
    create: {
      id: "gear-starlink-power-cable",
      name: "Starlink Mini USB-C to DC Power Cable",
      brand: "slimall",
      category: "power",
      description: "10ft/3M USB-C to DC barrel cable for powering Starlink Mini from a USB-C power bank. Waterproof gasket connector, 20V PD compatible.",
      condition: "new",
      price: 8.98,
      purchaseUrl: "https://www.amazon.com/dp/B0DZXS47XP",
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-usb-fans" },
    update: {},
    create: {
      id: "gear-usb-fans",
      name: "Wathai 40mm USB Mini Fans (2-pack)",
      brand: "Wathai",
      category: "power",
      description: "2× 40mm×10mm USB 5V mini fans with speed control. Used for ventilation/cooling inside the vehicle.",
      condition: "new",
      purchaseUrl: "https://www.amazon.com/dp/B088TGQVJZ",
      wattage: 2,
      hasBattery: false,
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-fan-controller" },
    update: {},
    create: {
      id: "gear-fan-controller",
      name: "bestmoument USB Fan Speed Controller",
      brand: "bestmoument",
      category: "power",
      description: "6.6ft USB extension cable with inline speed controller. 3-speed adjustment, wireless remote with 19.7ft range, 2H/4H/8H auto shutoff timer.",
      condition: "new",
      price: 9.79,
      purchaseUrl: "https://www.amazon.com/dp/B0F2DPG71R",
    },
  });

  // ── TOOLS (from Session 10) ──
  await prisma.gearItem.upsert({
    where: { id: "gear-folding-saw" },
    update: {},
    create: {
      id: "gear-folding-saw",
      name: "REXBETI Folding Saw",
      brand: "REXBETI",
      category: "tools",
      description: "11\" SK-5 steel extra-long folding hand saw. Heavy-duty for dry wood and pruning.",
      condition: "new",
      purchaseUrl: "https://www.amazon.com/dp/B07BLQBN8X",
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-fire-extinguisher" },
    update: { category: 'safety' },
    create: {
      id: "gear-fire-extinguisher",
      name: "AmzBoom Fire Extinguisher Spray (2-pack)",
      brand: "AmzBoom",
      category: "safety",
      description: "2× compact fire extinguisher spray. A/B/C/K rated, eco-friendly formula, prevents reignition. Each includes mounting bracket.",
      condition: "new",
      purchaseUrl: "https://www.amazon.com/dp/B0DH5CM2CC",
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-water-pump" },
    update: { category: 'hydration' },
    create: {
      id: "gear-water-pump",
      name: "USB Rechargeable Water Jug Pump",
      brand: "Unknown",
      category: "hydration",
      description: "USB-rechargeable electric pump for 2–5 gallon water jugs. Automatic pump with 2-switch control.",
      condition: "new",
      purchaseUrl: "https://www.amazon.com/dp/B086WK8JNJ",
      hasBattery: true,
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-first-aid" },
    update: { category: 'safety' },
    create: {
      id: "gear-first-aid",
      name: "Travel First Aid Kit (300-piece)",
      brand: "1st Aid",
      category: "safety",
      description: "300-piece compact first aid kit in red hard case. Includes bandages, burn dressing, scissors, and more.",
      condition: "new",
      price: 17.99,
      purchaseUrl: "https://www.amazon.com/dp/B0C5J8MVDD",
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-tire-inflator" },
    update: {},
    create: {
      id: "gear-tire-inflator",
      name: "AstroAI Tire Inflator L7S",
      brand: "AstroAI",
      category: "tools",
      description: "Cordless portable air compressor. 150 PSI, dual digital display, 12V battery powered, LED lights.",
      condition: "new",
      price: 23.99,
      purchaseUrl: "https://www.amazon.com/dp/B0DKJK869T",
      notes: "User manual: https://www.astroai.com/user-manual/up/1000499198",
      hasBattery: true,
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-camp-table" },
    update: { category: 'furniture' },
    create: {
      id: "gear-camp-table",
      name: "VILLEY Folding Camp Table",
      brand: "VILLEY",
      category: "furniture",
      description: "Ultralight aluminum folding camp table with carry bag. 2.05 lbs, 66 lb capacity, 16\"×13\"×12\" (medium). Green.",
      condition: "new",
      weight: 2.05,
      purchaseUrl: "https://www.amazon.com/dp/B09STL29DQ",
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-fairy-lights" },
    update: { category: 'lighting' },
    create: {
      id: "gear-fairy-lights",
      name: "Minetom Twinkle Fairy Lights",
      brand: "Minetom",
      category: "lighting",
      description: "33ft / 100 LED USB string lights with remote and timer. 8 lighting modes, waterproof. For tent/campsite ambiance.",
      condition: "new",
      purchaseUrl: "https://www.amazon.com/dp/B0CN2DMCKF",
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-wall-sconces" },
    update: { category: 'lighting' },
    create: {
      id: "gear-wall-sconces",
      name: "Adetu LED Wall Sconces (2-pack)",
      brand: "Adetu",
      category: "lighting",
      description: "2× rechargeable cordless LED wall lights. RGB + 3 color temperatures, dimmable, magnetic 360° rotation, USB rechargeable.",
      condition: "new",
      price: 19.99,
      purchaseUrl: "https://www.amazon.com/dp/B0CPLJQVDH",
      hasBattery: true,
    },
  });

  await prisma.gearItem.upsert({
    where: { id: "gear-flood-lights" },
    update: { category: 'lighting' },
    create: {
      id: "gear-flood-lights",
      name: "RGBW Bluetooth Flood Lights (2-pack)",
      brand: "Unknown",
      category: "lighting",
      description: "2× 30W outdoor RGBW smart flood lights. 3000 lumens, Bluetooth controlled, 2700K warm white + 16M colors, IP66 waterproof, music sync.",
      condition: "new",
      purchaseUrl: "https://www.amazon.com/dp/B07W6SHBV5",
    },
  });

  // ── VEHICLE (from Session 10) ──
  await prisma.gearItem.upsert({
    where: { id: "gear-dog-seat-cover" },
    update: {},
    create: {
      id: "gear-dog-seat-cover",
      name: "Yuntec Dog Car Seat Cover",
      brand: "Yuntec",
      category: "vehicle",
      description: "Waterproof non-slip back seat cover for dogs/pets. Fits most cars, trucks, and SUVs. Works with middle armrest. Black.",
      condition: "new",
      purchaseUrl: "https://www.amazon.com/dp/B07YHQNFVL",
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
    gearItems: 33,
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

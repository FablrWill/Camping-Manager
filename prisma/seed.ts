import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Genesis spot — Linville Gorge, 2026-03-29
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
      notes:
        "Genesis spot for Outland OS project. Bluebird day, early spring, bare trees. Laptop on camp table overlooking the gorge. EcoFlow + Starlink setup. Discovery-driven road — best sites are further along and slightly tucked away.",
    },
  });

  // Will's Santa Fe
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

  console.log("Seeded:", { genesisSpot, santaFe });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

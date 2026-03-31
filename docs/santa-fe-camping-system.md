# 🚙 Santa Fe Stealth Camping System (v6 – Full System + Visual Architecture + Templates)

## Overview

This version adds:
- System architecture diagrams (product-level view)
- CAD-style panel layouts
- Vent cut templates
- Fully integrated with prior system (panels + airflow + sensors + HVAC)

---

# 🧠 SYSTEM ARCHITECTURE (PRODUCT VIEW)

                    ┌──────────────────────┐
                    │   USER INTERFACE     │
                    │ (phone / automation) │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │   CONTROL LAYER      │
                    │ (rules + triggers)   │
                    └──────────┬───────────┘
                               ↓
        ┌───────────────┬───────────────┬───────────────┐
        ↓               ↓               ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   SENSORS    │ │     FANS     │ │    HVAC      │
│ (temp/humid) │ │ (airflow)    │ │ (vehicle AC) │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       ↓                ↓                ↓
       └────────────┬───┴───────┬────────┘
                    ↓           ↓
           ┌───────────────────────────┐
           │   VEHICLE ENVIRONMENT     │
           │ (air, heat, humidity)     │
           └───────────────────────────┘

---

# 🌬️ AIRFLOW SCHEMATIC

        [ MOONROOF EXHAUST ]
                 ↑
        ↑ warm humid air ↑
                 ↑
   ┌───────────────────────────┐
   │        CABIN SPACE        │
   │     (sleeping zone)       │
   └───────────────────────────┘
                 ↑
        ↑ airflow path ↑
                 ↑
   [ INTAKE WINDOW + SCREEN ]

---

# 🧩 PANEL + VENT TEMPLATE (EXAMPLE)

+----------------------+
|                      |
|      ########        |
|      ########        |
|      ########        |
|                      |
+----------------------+

(# = vent cut zone)

---

# 🌙 MOONROOF SYSTEM

TOP VIEW

┌─────────────────────┐
│     ROOF OPENING    │
│   ┌─────────────┐   │
│   │   MESH      │   │
│   │   + FAN     │   │
│   └─────────────┘   │
└─────────────────────┘

---

# 📡 SENSOR SYSTEM

            [ Sensor A ]
           (outside air)
                 ↓
     ┌──────────────────────┐
     │  Sensor C (upper)    │
     │         ↓            │
     │  Sensor B (lower)    │
     └──────────────────────┘

---

# 🔋 POWER SYSTEM

         ┌────────────────────┐
         │   POWER BANK       │
         └────────┬───────────┘
                  ↓
         ┌────────────────────┐
         │ FAN CONTROLLER     │
         └───────┬────────────┘
                 ↓
      ┌──────────┴──────────┐
      │                     │
 [INTAKE FAN]         [EXHAUST FAN]

---

# 🏁 SUMMARY

This is a modular, sensor-driven, hybrid-assisted environmental control system for stealth car camping.


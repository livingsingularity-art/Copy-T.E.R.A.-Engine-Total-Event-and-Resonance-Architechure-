# T.E.R.A. — Total Event & Resonance Architecture
### A living world simulation engine for AI Dungeon scenarios

T.E.R.A. replaces AI Dungeon's passive story card matching with an active world simulation. While the AI writes prose, the engine is tracking faction reputations, NPC moods and goals, narrative threads, prophecy chains, player behaviour patterns, countdown clocks, world pressure, and region history — and feeding all of it back into context so the AI responds to a world that actually moves.

---

## What It Does

**Every turn, the engine:**
- Rolls an event tier based on regional activity level
- Selects from eligible cards using weighted scoring (faction state, NPC moods, player arc, active threads, resonance, fate arc, world pressure, fingerprint)
- Updates faction reputations and inter-faction relationships
- Decays and shifts NPC moods, stress, and trust
- Advances clocks and triggers stage notifications
- Scans AI output for sentiment, region cues, NPC mentions, and time-of-day language
- Feeds the resulting world state back into context as structured hints

**What you get as a creator:**
- A world that keeps moving when players aren't looking
- NPCs with real agendas that advance independently
- Event chains that build, foreshadow, and pay off
- A character creator that auto-wires player choices into engine state with zero manual setup

---

## Quick Install

T.E.R.A. uses all four AI Dungeon script tabs. In your scenario's **Scripting** panel:

| Tab | File |
|-----|------|
| **Library** | `tabs/TERA_Engine_v18.js` |
| **Input** | `tabs/TERA_Input_v18.js` |
| **Output** | `tabs/TERA_Output_v18.js` |
| **Context** | `tabs/TERA_Context_v18.js` |

> **Paste Library first.** The other tabs call engine functions — if Library isn't loaded they will error on startup.

**Verify installation:** Start an adventure and type `/tera status`. A world state block should appear. If you see an error, check the Console Log panel in the Scripting view.

---

## Minimum Setup

After pasting the tabs, create two story cards:

### 1. Config Card
```
Keys:   TERA|_CONFIG|your-scenario-id
Entry:  CONTEXT_BUDGET: 2200
        MAX_CONTEXT_CARDS: 12
        SCENARIO_MODE: standard
```

### 2. Setup Card
```
Keys:   TERA|_SETUP|your-scenario-id
Entry:  region: vnr
        origin: your-origin-type
        calendar: 1 | 1 | 1 | spring | dawn
        unlock_continent: your-continent
        anchor: world_fact | 8 | The most important thing the AI must never forget.
```

The setup card runs exactly once on turn 1, bootstrapping the world state from its directive manifest. Players never see it. Run `/tera setup` after turn 1 to confirm all directives applied.

---

## Story Card Format

```
TERA|ID|tier|region|w:N|c:N|deps
```

| Segment | Values | Notes |
|---------|--------|-------|
| `TERA` | literal | Required — engine ignores all other cards |
| `ID` | e.g. `VNR-MIN-001` | Unique identifier |
| `tier` | `minor` `moderate` `major` `character` | Event tier or character card |
| `region` | `vnr` `vmf` `vel` `vis` `vap` `xw` `syl`... | `xw` fires in any region |
| `w:N` | integer | Selection weight (default 1) |
| `c:N` | integer | Cooldown in turns after firing (default 0) |
| `deps` | `none` or `CARD-ID,CARD-ID` | Prerequisite cards that must have fired first |

**Entry field:** Narrative text, then optionally:
```
[FX]
addActivity: vnr+3
factionRep: grey_ledger +5
[/FX]
```

**Description field:** Gate conditions and behaviour tags — one per line, never shown to the AI:
```
p:7
tags:mystery,betrayal
factions:grey_ledger>=30
origin:otherworlder
thread:investigation
arc:curiosity
```

---

## Key Systems

### Factions
Register factions in the _SETUP card with starting rep values (-100 to +100). Gate cards on rep thresholds (`factions:name>=30`). Track faction-to-faction relationships with `faction_rel`. The engine decays rep toward neutral over time and can trigger Faction AI events automatically when thresholds are crossed.

### NPC Moods
Every NPC has tracked mood, intensity (0–3), stress (0–100), and trust (0–100). Set initial states in the _SETUP card. The engine runs sentiment analysis on AI output each turn and shifts NPC states automatically. Gate cards on NPC state: `npcstress:corso>=70`, `npctrust:sellen>=60`, `npcmood:kael=wary`.

### Narrative Threads
When an important card fires, it opens a named thread that pulls related cards to the surface for several turns. Cards declare `thread:tag` to open, `thread_match:tag` to gain weight boost while active, `requires_thread:tag` to fire only during the thread, and `thread_break:1` to close it.

### Clocks
Countdown timers that tick each turn, trigger stage notifications, set flags, and fire cards on expiry. Add via FX: `addClock:id|Label|12|CARD-TO-FIRE|8=warning,4=critical`. Gate cards on stages: `clock_stage:id=warning`.

### Oracle & Prophecy
Cards plant prophecy anchors (`prophecy: text` in Description) that surface in context as foreshadowing. Later cards fulfill them (`fulfills:CARD-ID`), removing the prophecy from the anchor list. The world foreshadows itself.

### Player Behavioural Arc
The engine scans inputs for six behavioural categories (mercy, aggression, diplomacy, sacrifice, protection, curiosity) and accumulates scores over time. Cards declare arc alignment (`arc:curiosity`) and receive weight boosts when the player's pattern matches. Gate on arc scores: `player_arc:curiosity>=3`.

### World Pressure
Regions the player ignores accumulate pressure each turn. Return after a long absence and the engine shifts tier probability toward heavier events — something has been building while you were away.

### Character Creator Auto-Parser
Embed `[TERA: key=value]` markers in character creator Entry fields. The Context tab reads these on turn 1 and wires the player's choices directly into engine state — class, location, faction contact, race, and ability all set automatically. Players experience seamless setup with no manual configuration.

---

## Commands

Type `/tera [command]` in AI Dungeon. Key commands:

| Command | Output / Effect |
|---------|----------------|
| `/tera status` | Full world state — turn, region, factions, party, arcs, clocks |
| `/tera trace` | Scoring breakdown for the last fired card |
| `/tera simulate` | Preview eligible event cards in current region |
| `/tera audit` | Validate all cards — errors, warnings, missing deps |
| `/tera coverage` | Per-region: ready / cooldown / gated card counts |
| `/tera validate [id]` | Deep validation of a single card |
| `/tera context` | Which character cards score highest and would inject |
| `/tera config` | View all current config values |
| `/tera config [key] [val]` | Change a config value at runtime |
| `/tera npc [id]` | View NPC mood, stress, trust, and goal state |
| `/tera help` | Full command reference |

---

## Scenario Modes

Set `SCENARIO_MODE` in the _CONFIG card:

| Mode | Card Pool | Ring | Cooldown Scale | Best For |
|------|-----------|------|----------------|----------|
| `standard` | Unlimited | 8 | 1.0 | Large open-world scenarios |
| `solo` | 6–20 cards | 4 | 0.6 | Single-region focused adventures |
| `oneshot` | 2–8 cards | 2 | 0.25 | Short sessions, demo scenarios |

---

## InnerSelf Compatibility

T.E.R.A. is compatible with InnerSelf v1.0.2+. Each tab calls `InnerSelf("context/input/output")` at the top. If you are not using InnerSelf, remove those three lines.

---

## Files

```
tabs/
  TERA_Engine_v18.js      ← Library tab (paste first)
  TERA_Input_v18.js       ← Input tab
  TERA_Output_v18.js      ← Output tab
  TERA_Context_v18.js     ← Context tab

docs/
  TERA_Creators_Guide_v18.docx   ← Full creator reference (24 sections)
```

---

## Full Documentation

The **Creator's Guide** (`docs/TERA_Creators_Guide_v18.docx`) covers every system in full:
- All Description field gates and their syntax
- All FX commands
- All _SETUP card directives
- Character card types (CHR-, LOC-, ART-, ITM-, UNQ-, RACE-, SOUL-)
- Full faction, NPC, thread, clock, oracle, arc, and world pressure documentation
- Character creator integration guide
- Race card authoring
- Context budget and overflow protection
- Complete /tera command reference
- Author diagnostic tools
- Tips and best practices

---

## Example — T.E.R.A.: The Unvowed

The reference implementation of T.E.R.A. in a published scenario:

**[T.E.R.A.: The Unvowed](https://play.aidungeon.com/scenario/xhKNMKBMAquf/or-tera-the-unvowed?share=true&published=true)**

500+ story cards across 5 regions of Valdris. 8 factions. 12 InnerSelf NPC brain cards. 22 unique player abilities. 9 playable ancestries with distinct Mana Vessel architectures. A dying god. A Before-People continental activation system that's been dormant for thousands of years and just crossed threshold at the exact moment you arrived.

---

## Version

**v18** — Current stable release.

Patches applied over base v18:
- `instanceof Set` serialization fix — `_resonanceTopSet` and `_isBridgeWordSet` now survive AI Dungeon's JSON round-trip between turns
- Turn-1 guard — `teraTurn()` returns null on turn 1 so the AI has one clean response before TERA begins injecting event beats
- `_pendingEvent` pipeline — event card narratives are stored and injected as scene directives on the following turn rather than appended as raw text
- Three-tier context budget guard — prevents backend timeouts from context window overflow
- Character creator auto-parser — `[TERA: ...]` markers in CC Entry fields applied automatically on turn 1
- Race system support — `race=` directive and `race_xxx` tag handling added to the CC parser

---

*T.E.R.A. is open source. Build something.*

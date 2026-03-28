// ==================================================================
// T.E.R.A. v18 — Core Engine (Library)
// PATCHED: Set serialization fix (v18-fix) — _resonanceTopSet and
//   _isBridgeWordSet now use instanceof Set guards so they survive
//   AI Dungeon's JSON round-trip between turns.
// PATCHED: Turn-1 guard (v18-fix) — teraTurn() returns null on turn 1
//   so the AI has one clean response before TERA injects event beats.
// v11–v17: see prior version headers.
// v18: Three new automation layers.
//   LAYER 7A — Player Behavioral Arc (_playerArc):
//     Scans player input for 6 behavioral categories (mercy,
//     aggression, diplomacy, sacrifice, protection, curiosity).
//     Cards declare arc: field; engine boosts matching cards.
//     Gate: player_arc:category>=N.
//   LAYER 7B — Multi-Stage Clocks:
//     Clocks carry stages[] — threshold/tag pairs that fire at
//     specific remaining-turn values, set flags, optionally trigger
//     cards. Gate: clock_stage:id=tag.
//   LAYER 7C — Region Narrative Memory (_regionMemory):
//     Records the last REGION_MEMORY_DEPTH significant events per
//     region. Injected as a compact context hint. Gate: region_event:
// ==================================================================

// ─── Configuration (defaults) ──────────────────────────────────────
const CFG = {
  CONTEXT_BUDGET: 2200,
  REGION_SCOPED: true,
  ECHO_ENABLED: true,
  ORACLE_ENABLED: true,
  RESONANCE_ENABLED: true,
  FATE_ARC_ENABLED: true,
  FINGERPRINT_ENABLED: true,
  MOOD_ENABLED: true,
  MOOD_DECAY_ENABLED: true,
  IS_BRIDGE_ENABLED: true,
  CLOCK_NOTIFICATIONS: true,
  WEIGHT_DECAY_ENABLED: true,
  NPC_GATES_ENABLED: true,
  STRESS_DECAY_ENABLED: true,
  ECHO_CHANCE: 0.30,
  ECHO_BUFFER_SIZE: 12,
  ECHO_MAJOR_ONLY: true,
  RESONANCE_TOP_N: 10,
  RESONANCE_BOOST: 2,
  IS_BRIDGE_MAX_BOOST: 15,
  IS_BRIDGE_PER_TURN: 3,
  MOOD_DEFAULT_INTENSITY: 1,
  ORACLE_MIN_TIER: "moderate",
  FINGERPRINT_TURNS: 15,
  FATE_ARC_THRESHOLD: 3,
  FATE_ARC_MAX_BOOST: 4,
  FATE_ARC_CEILING: 20,
  STRESS_DECAY_RATE: 3,
  STRESS_HIGH_THRESHOLD: 70,
  STRESS_CRISIS_THRESHOLD: 90,
  TRUST_DEFAULT: 50,
  // NEW v10: how many turns between weight-mod decay ticks
  WEIGHT_DECAY_INTERVAL: 20,
  // NEW v10: how many turns between mood-intensity decay ticks
  MOOD_DECAY_INTERVAL: 15,
  // NEW v10: max story cards TERA will inject into context
  MAX_CONTEXT_CARDS: 12,
  // v12: Thread / Scene system
  THREAD_ENABLED: true,
  THREAD_WEIGHT_BOOST: 8,
  THREAD_SCORE_BOOST: 4,
  THREAD_DEFAULT_DURATION: 6,
  // v12: Faction Dynamics
  FACTION_REL_ENABLED: true,
  FACTION_REL_DECAY_ENABLED: true,
  FACTION_REL_DECAY_INTERVAL: 20,
  FACTION_REL_DECAY_RATE: 2,
  // v13: Party System
  PARTY_ENABLED: true,
  MAX_PARTY_SIZE: 4,
  PARTY_SCORE_BOOST: 6,
  PARTY_CONTEXT_LABEL: "Companion",
  // v13: NPC Region Detachment
  NPC_DETACH_ENABLED: true,
  NPC_RETURN_HOME_TURNS: 0,       // 0 = never; >0 = return after N turns idle
  // v13: Narrative NPC Scan
  NPC_SCAN_ENABLED: true,
  NPC_SCAN_AUTO_MET: true,
  NPC_SCAN_AUTO_ANCHOR: true,
  // v13: Sentiment Analysis
  SENTIMENT_ENABLED: true,
  SENTIMENT_INTENSITY: 1.0,
  SENTIMENT_COOLDOWN: 2,
  // v13: Companion Events
  COMPANION_EVENT_ENABLED: true,
  COMPANION_EVENT_CHANCE: 0.15,
  // v13: Travel Automation
  TRAVEL_AUTO_ENABLED: true,
  TRAVEL_AUTO_CALENDAR: true,
  TRAVEL_AUTO_THREAD: true,
  TRAVEL_THREAD_DURATION: 4,
  // v13: Context Intelligence
  SCENE_DETECT_ENABLED: true,
  SCENE_ACTIVE_NPC_BOOST: 5,
  // v13: InnerSelf Integration
  IS_INTEGRATION_ENABLED: true,
  // v14 LAYER 4: Consequence Graph
  CONSEQUENCE_GRAPH_ENABLED: true,
  // v14 LAYER 4: World Pressure
  WORLD_PRESSURE_ENABLED: true,
  WORLD_PRESSURE_MAX: 30,
  WORLD_PRESSURE_THRESHOLD: 20,
  // v14 LAYER 4: Faction AI
  FACTION_AI_ENABLED: true,
  FACTION_HOSTILE_THRESHOLD: -60,
  FACTION_ALLY_THRESHOLD: 70,
  // v14 LAYER 4: Tone Valve
  TONE_VALVE_ENABLED: true,
  TONE_VALVE_TURNS: 15,
  TONE_VALVE_BOOST: 3,
  // v14 LAYER 5: NPC Goals
  NPC_GOAL_ENABLED: true,
  NPC_GOAL_PROGRESS_THRESHOLD: 2,
  // v14 LAYER 5: NPC-NPC Relations
  NPC_NPC_REL_ENABLED: true,
  NPC_NPC_REL_DECAY_INTERVAL: 25,
  NPC_NPC_REL_DECAY_RATE: 1,
  // v14 LAYER 5: NPC Stub Generation
  NPC_STUB_ENABLED: true,
  NPC_STUB_THRESHOLD: 3,
  // v14 LAYER 5: ToD Auto-Advance
  TOD_AUTO_ENABLED: true,
  // v15 LAYER 6: Memory Compression
  MEMORY_COMPRESS_ENABLED: true,
  MEMORY_COMPRESS_THRESHOLD: 20,
  MEMORY_COMPRESS_INTERVAL: 30,
  MEMORY_COMPRESS_MAX_ANCHORS: 3,
  MEMORY_COMPRESS_KEEP_RECENT: 10,
  // v15 LAYER 6: Intent Detection
  INTENT_DETECT_ENABLED: true,
  INTENT_WEIGHT_BOOST: 3,
  INTENT_BOOST_DURATION: 2,
  // v15 LAYER 6: Location Stub Generation
  LOC_STUB_ENABLED: true,
  LOC_STUB_THRESHOLD: 3,
  // v15 LAYER 6: Auto-Bootstrap
  AUTO_BOOTSTRAP_ENABLED: true,
  // v16: Activity-based decay — intervals in activity points not turns.
  // Activity points: minor fire = +1, moderate = +3, major = +6.
  // Avg ~2 pts/turn in a typical session; adjust to taste.
  MOOD_DECAY_ACTIVITY: 12,       // replaces MOOD_DECAY_INTERVAL (was 15 turns)
  WEIGHT_DECAY_ACTIVITY: 18,     // replaces WEIGHT_DECAY_INTERVAL (was 20 turns)
  FACTION_REL_DECAY_ACTIVITY: 20,// replaces FACTION_REL_DECAY_INTERVAL (was 20 turns)
  NPC_NPC_REL_DECAY_ACTIVITY: 24,// replaces NPC_NPC_REL_DECAY_INTERVAL (was 25 turns)
  // v17: Small-scenario support
  // ─────────────────────────────────────────────────────────────────
  // SCENARIO_MODE presets — applies sensible defaults for scenario size.
  //   "standard" — no change (default, full world-sim settings)
  //   "solo"     — single-region adventure, moderate card pool (6–20 cards)
  //   "oneshot"  — very small pool (2–8 cards), short session
  // Individual keys below override the preset when explicitly set.
  SCENARIO_MODE: "standard",
  // Ring buffer size — how many recently-fired card IDs are excluded.
  // In v17 this is also applied dynamically: if the eligible pool is
  // smaller than RING_SIZE the ring is trimmed to pool_size - 1.
  // Set to 0 to disable the ring entirely.
  RING_SIZE: 8,
  // Cooldown multiplier — all card cooldowns are multiplied by this value
  // at fire-time. Set < 1.0 to shrink cooldowns for small pools.
  // preset "solo" applies 0.6, "oneshot" applies 0.25.
  COOLDOWN_SCALE: 1.0,
  // Tier cascade — when the rolled tier has no valid cards, try other
  // tiers and cross-world cards before silently skipping the turn.
  TIER_CASCADE_ENABLED: true,
  // Include cross-world (xw) event cards in every region selection pass.
  // In v16 xw cards required an exact tier match. In v17 they are always
  // included as a tier-compatible pool extension.
  XW_EVENTS_IN_REGION: true,
  // v18 LAYER 7A: Player Behavioral Arc
  PLAYER_ARC_ENABLED: true,
  PLAYER_ARC_BOOST: 3,          // weight + context score added to matching arc cards
  PLAYER_ARC_TURNS: 20,         // input window — inputs older than N turns age out
  PLAYER_ARC_THRESHOLD: 3,      // minimum score before arc influences selection
  // v18 LAYER 7B: Multi-Stage Clocks
  CLOCK_STAGES_ENABLED: true,
  // v18 LAYER 7C: Region Narrative Memory
  REGION_MEMORY_ENABLED: true,
  REGION_MEMORY_DEPTH: 3,       // max events stored per region
  REGION_MEMORY_MIN_TIER: "moderate", // minimum tier to record (moderate or major)
};

// ─── Load config from story card (TERA|_CONFIG|...) ─────────────────
function _loadConfig() {
  const configCard = storyCards.find(c => {
    const k = typeof c.keys === "string" ? c.keys : "";
    return k.startsWith("TERA|_CONFIG|");
  });
  if (!configCard || !(configCard.entry || configCard.value)) return;
  for (const line of (configCard.entry || configCard.value || "").split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1 || line.startsWith("//") || line.startsWith("#")) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (!(key in CFG)) continue;
    if (val === "true") CFG[key] = true;
    else if (val === "false") CFG[key] = false;
    else if (!isNaN(Number(val))) CFG[key] = Number(val);
    else CFG[key] = val;
  }
  // v17: Apply SCENARIO_MODE preset — sets sensible defaults for pool size.
  // Explicit keys in the config card override the preset after it runs.
  _applyScenarioMode(configCard.entry || configCard.value || "");
}

// v17: SCENARIO_MODE preset application
// Keys already explicitly set in config are NOT overridden by the preset.
function _applyScenarioMode(configEntry) {
  const mode = CFG.SCENARIO_MODE;
  if (!mode || mode === "standard") return;
  // Which keys were explicitly set by the creator (should not be overridden)
  const explicit = new Set();
  for (const line of configEntry.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1 || line.startsWith("//") || line.startsWith("#")) continue;
    explicit.add(line.slice(0, idx).trim());
  }
  const set = (key, val) => { if (!explicit.has(key)) CFG[key] = val; };

  if (mode === "solo") {
    // Single-region adventure with a moderate card pool (6–20 cards).
    // Turn count: 15–50. Focus: NPC relationships, tight narrative.
    set("RING_SIZE",                   4);
    set("COOLDOWN_SCALE",              0.6);
    set("FINGERPRINT_TURNS",           8);
    set("WORLD_PRESSURE_THRESHOLD",    999);  // effectively disabled
    set("WORLD_PRESSURE_ENABLED",      false);
    set("MEMORY_COMPRESS_THRESHOLD",   10);
    set("MEMORY_COMPRESS_INTERVAL",    15);
    set("TONE_VALVE_TURNS",            8);    // narrative balance kicks in faster
    set("FATE_ARC_THRESHOLD",          2);    // arc effects start sooner
    set("RESONANCE_TOP_N",             6);    // smaller vocab — tighter resonance
    set("SENTIMENT_COOLDOWN",          1);    // faster NPC sentiment response
    set("NPC_STUB_THRESHOLD",          2);    // auto-stub new NPCs sooner
    set("LOC_STUB_THRESHOLD",          2);
    set("TIER_CASCADE_ENABLED",        true);
    set("XW_EVENTS_IN_REGION",         true);
  } else if (mode === "oneshot") {
    // Very small pool (2–8 cards). Single session, 5–15 turns.
    // Focus: immediate story, minimal overhead.
    set("RING_SIZE",                   2);
    set("COOLDOWN_SCALE",              0.25);
    set("FINGERPRINT_TURNS",           4);
    set("WORLD_PRESSURE_ENABLED",      false);
    set("NPC_NPC_REL_ENABLED",         false);
    set("FACTION_REL_ENABLED",         false);
    set("MEMORY_COMPRESS_ENABLED",     false);
    set("TONE_VALVE_TURNS",            5);
    set("FATE_ARC_THRESHOLD",          1);
    set("RESONANCE_TOP_N",             4);
    set("SENTIMENT_COOLDOWN",          0);
    set("NPC_STUB_THRESHOLD",          1);    // stub on first repeated mention
    set("LOC_STUB_THRESHOLD",          1);
    set("COMPANION_EVENT_CHANCE",      0.30); // more companion moments in short session
    set("TIER_CASCADE_ENABLED",        true);
    set("XW_EVENTS_IN_REGION",         true);
    set("ECHO_CHANCE",                 0.50); // more echo phrases surface
  }
}

// ─── State bootstrap ────────────────────────────────────────────────
if (!state.tera) {
  state.tera = {
    turn: 0,
    region: "vnr",
    lastCardId: null,
    artifactPressure: 0,
    tragedyCooldown: {},
    factions: {},
    activity: {},        // per-region activity map (keyed by region code)
    tags: {},
    locations: [],
    cardMeta: {},        // cardId → last fired turn
    recentCards: [],     // ring buffer of recently fired cardIds
    anchors: [],
    calendar: { day: 1, month: 1, year: 847, season: "spring", tod: "day" },
    continents: {
      valdris: true,
      sylvenmoor: false,
      dravoss: false,
      verdant_expanse: false,
      keth_ara: false,
      auren_shelf: false,
      sunken_reach: false,
      the_hollow: false,
    },
    origin: null,
    currentLocation: null,
    inventory: [],
    regionControl: {},
    relationships: {},
    clocks: [],
    flags: {},
    weightMods: {},      // cardId → extra weight delta
    _echo: [],           // echo phrase buffer
    _resonance: {},      // word → score (used in context scoring)
    _fateArc: { tragedy: 0, triumph: 0, mystery: 0, comedy: 0 },
    _fpRaw: { turns: 0, doC: 0, sayC: 0, storyC: 0, len: 0, npcRefs: 0, vocabSet: [] },
    _fp: null,           // locked fingerprint object
    _oracle: [],         // active prophecy objects
    moods: {},           // npcId → { mood, intensity, stress, trust, ... }
    _activity: 0,        // global monotonic activity counter (for NPC decay snapshots)
    _di: {},             // delta registry cache (cardId → { h, meta })
    _setupDone: false,
    // v10 decay tracking — _lastWeightDecay/_lastMoodDecay removed in v16
    // (replaced by activity-based _last*Act fields below)
    _lastStressDecay: 0, // stress stays turn-based (physiological recovery)
    _lastTrace: null,     // v11: last fired card scoring breakdown
    _cardMetaTurn: 0,     // v11: last turn cardMeta was pruned
    _thread: null,         // v12: active thread { tag, turnsLeft, openedTurn, openedBy }
    _factionRels: {},      // v12: inter-faction relationships { "factA__factB": rep }
    // _lastFacRelDecay removed in v16 — replaced by _lastFacRelDecayAct below
    // v13: Party system
    party: [],              // card IDs in party (e.g. ["CHR-Sellen"])
    // v13: NPC region detachment
    npcLocation: {},        // cardId → regionCode override
    npcHomeRegion: {},      // cardId → original card region
    _npcLastInteract: {},   // cardId → last interaction turn
    // v13: Sentiment tracking
    _sentimentCooldown: {}, // npcId → last sentiment turn
    // v13: Scene detection
    _sceneType: "exploration",
    _sceneNpcs: [],         // NPC IDs detected in current output
    // v13: Travel detection
    _lastRegionChange: 0,
    _prevRegion: null,
    // v14 LAYER 4: World Pressure
    _worldPressure: {},          // regionCode → int (0..WORLD_PRESSURE_MAX)
    // v14 LAYER 4: Tone Valve
    _toneValveLastBoostTurn: 0,
    // v14 LAYER 4: Faction AI
    _factionAIState: {},         // factId → { hostile: bool, ally: bool }
    // v14 LAYER 5: NPC-NPC Relations
    _npcRels: {},                // "CHR-A__CHR-B" → int -100..100
    // _lastNpcRelDecay removed in v16 — replaced by _lastNpcRelDecayAct below
    // v14 LAYER 5: NPC Stub Generation
    _npcStubCandidates: {},      // lowerName → { count, lastTurn }
    _npcStubCreated: {},         // lowerName → true
    // v15 LAYER 6: Memory Compression
    _memCompressCount: 0,
    _lastMemCompress: 0,
    // v15 LAYER 6: Intent Detection
    _intentBoosts: {},
    // v15 LAYER 6: Location Stub Generation
    _locStubCandidates: {},
    _locStubCreated: {},
    // v16: Activity-based decay snapshots
    _lastMoodDecayAct: 0,        // _activity value when mood last decayed
    _lastWeightDecayAct: 0,      // _activity value when weight mods last decayed
    _lastFacRelDecayAct: 0,      // _activity value when faction rels last decayed
    _lastNpcRelDecayAct: 0,      // _activity value when NPC-NPC rels last decayed
    // v16: Efficiency caches (rebuilt when source changes, never persisted)
    _resonanceTopSet: null,      // Set of top-N resonance words (dirty-flagged)
    _resonanceDirty: true,       // true when _resonance has changed since last cache
    _fateArcDom: null,           // { arc, score } — cached dominant arc
    _isBridgeWordSet: null,      // Set of IS-bridge words from recent echoes
    // v18 LAYER 7A: Player Behavioral Arc
    _playerArc: {},              // category → { score, lastTurn }
    _playerArcDom: null,         // cached { category, score } dominant
    // v18 LAYER 7C: Region Narrative Memory
    _regionMemory: {},           // regionCode → [{cardId,tier,turn,label}]
  };
}

// v13: Ensure new state fields exist on upgrade from v12
(function() {
  const t = state.tera;
  if (!Array.isArray(t.party)) t.party = [];
  if (!t.npcLocation) t.npcLocation = {};
  if (!t.npcHomeRegion) t.npcHomeRegion = {};
  if (!t._npcLastInteract) t._npcLastInteract = {};
  if (!t._sentimentCooldown) t._sentimentCooldown = {};
  if (!t._sceneNpcs) t._sceneNpcs = [];
  if (t._sceneType === undefined) t._sceneType = "exploration";
  if (t._lastRegionChange === undefined) t._lastRegionChange = 0;
  if (t._prevRegion === undefined) t._prevRegion = null;
  // v14 upgrade guards
  if (!t._worldPressure) t._worldPressure = {};
  if (t._toneValveLastBoostTurn === undefined) t._toneValveLastBoostTurn = 0;
  if (!t._factionAIState) t._factionAIState = {};
  if (!t._npcRels) t._npcRels = {};
  // _lastNpcRelDecay no longer used (v16: replaced by _lastNpcRelDecayAct)
  if (!t._npcStubCandidates) t._npcStubCandidates = {};
  if (!t._npcStubCreated) t._npcStubCreated = {};
  // v15 upgrade guards
  if (t._memCompressCount === undefined) t._memCompressCount = 0;
  if (t._lastMemCompress === undefined) t._lastMemCompress = 0;
  if (!t._intentBoosts) t._intentBoosts = {};
  if (!t._locStubCandidates) t._locStubCandidates = {};
  if (!t._locStubCreated) t._locStubCreated = {};
  // v16 upgrade guards
  if (t._lastMoodDecayAct   === undefined) t._lastMoodDecayAct   = t._activity || 0;
  if (t._lastWeightDecayAct === undefined) t._lastWeightDecayAct = t._activity || 0;
  if (t._lastFacRelDecayAct === undefined) t._lastFacRelDecayAct = t._activity || 0;
  if (t._lastNpcRelDecayAct === undefined) t._lastNpcRelDecayAct = t._activity || 0;
  if (t._resonanceDirty === undefined) t._resonanceDirty = true;
  if (!(t._resonanceTopSet instanceof Set)) { t._resonanceTopSet = null; t._resonanceDirty = true; }
  if (t._fateArcDom === undefined) t._fateArcDom = null;
  if (t._isBridgeWordSet !== null && !(t._isBridgeWordSet instanceof Set)) t._isBridgeWordSet = null;
  // v17 upgrade guards
  // (SCENARIO_MODE preset is applied at _loadConfig time via _applyScenarioMode)
  // v18 upgrade guards
  if (!t._playerArc)    t._playerArc   = {};
  if (t._playerArcDom === undefined) t._playerArcDom = null;
  if (!t._regionMemory) t._regionMemory = {};
})();

_loadConfig();

// ─── Region code conversion ─────────────────────────────────────────
const REGION_EXPAND = {
  vnr: "valdris_northern_roads",
  vmf: "valdris_mystical_forests",
  vel: "valdris_eldranth",
  vis: "valdris_ironspine",
  vap: "valdris_accord_plains",
  syl: "sylvenmoor",
  drv: "dravoss",
  vrd: "verdant_expanse",
  kth: "keth_ara",
  aur: "auren_shelf",
  snk: "sunken_reach",
  hlw: "the_hollow",
};
const REGION_COMPRESS = Object.fromEntries(
  Object.entries(REGION_EXPAND).map(([k, v]) => [v, k])
);
function toCode(region) { return REGION_COMPRESS[region] || region; }
function toFull(code) { return REGION_EXPAND[code] || code; }

// ─── Delta Registry & Card Cache ────────────────────────────────────
const CARD_REGISTRY = {};
let REGISTRY_BUILT = false;
const _seeded = new Set();

function _hash(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = ((31 * n) + s.charCodeAt(i)) | 0;
  return n;
}

function _splitEntry(e) {
  const m = e.match(/\[FX\]([\s\S]*?)\[\/FX\]/);
  return {
    narrative: m ? e.replace(/\[FX\][\s\S]*?\[\/FX\]/, "").trim() : e.trim(),
    effectsText: m ? m[1].trim() : ""
  };
}

function _parseCardKey(keyStr, entryStr, descStr) {
  const parts = keyStr.split("|");
  if (parts.length < 7 || parts[0] !== "TERA") return null;
  const [, id, tier, regionCode, wPart, cPart, ...depParts] = parts;
  const weight = parseInt((wPart || "w:1").split(":")[1]) || 1;
  const cooldown = parseInt((cPart || "c:0").split(":")[1]) || 0;
  const deps = depParts.join("|").trim() || "none";
  let factions = "none", tags = "", origin = "", time = "",
      continent = "", location = "", item = "", control = "none", requires = "",
      npc = "", flag = "", priority = 5, pin = false,
      thread = "", threadDuration = 0, threadMatch = "", threadBreak = false,
      factionRel = "", requiresThread = "",
      partyReq = "", partyNot = "", partySize = "", companionTier = false,
      firesBoost = "", npcGoal = "", npcGoalKeywords = "", npcRivals = "", npcAllies = "",
      // v18
      cardArc = "", clockStages = "", regionEvent = "";
  for (const line of (descStr || "").split("\n")) {
    const l = line.trim();
    if (l.startsWith("p:")) priority = Math.max(0, Math.min(9, parseInt(l.slice(2))));
    else if (l === "pin:1") pin = true;
    else if (l.startsWith("factions:")) factions = l.slice(9).trim();
    else if (l.startsWith("tags:")) tags = l.slice(5).trim();
    else if (l.startsWith("origin:")) origin = l.slice(7).trim();
    else if (l.startsWith("time:")) time = l.slice(5).trim();
    else if (l.startsWith("continent:")) continent = l.slice(10).trim();
    else if (l.startsWith("location:")) location = l.slice(9).trim();
    else if (l.startsWith("item:")) item = l.slice(5).trim();
    else if (l.startsWith("control:")) control = l.slice(8).trim();
    else if (l.startsWith("requires:")) requires = l.slice(9).trim();
    else if (l.startsWith("npc:")) npc = l.slice(4).trim();
    else if (l.startsWith("flag:")) flag = l.slice(5).trim();
    else if (l.startsWith("thread:") && !l.startsWith("thread_")) thread = l.slice(7).trim();
    else if (l.startsWith("thread_duration:")) threadDuration = parseInt(l.slice(16).trim()) || 0;
    else if (l.startsWith("thread_match:")) threadMatch = l.slice(13).trim();
    else if (l.startsWith("thread_break:")) threadBreak = l.slice(13).trim() === "1" || l.slice(13).trim() === "true";
    else if (l.startsWith("faction_rel:")) factionRel = l.slice(12).trim();
    else if (l.startsWith("requires_thread:")) requiresThread = l.slice(16).trim();
    // v13: party gates
    else if (l.startsWith("party:") && !l.startsWith("party_")) partyReq = l.slice(6).trim();
    else if (l.startsWith("party_not:")) partyNot = l.slice(10).trim();
    else if (l.startsWith("party_size:")) partySize = l.slice(11).trim();
    else if (l === "companion:1" || l === "companion:true") companionTier = true;
    // v14: consequence graph
    else if (l.startsWith("fires_boost:")) firesBoost = l.slice(12).trim();
    // v14: NPC goals (character cards)
    else if (l.startsWith("goal:")) npcGoal = l.slice(5).trim();
    else if (l.startsWith("goal_keywords:")) npcGoalKeywords = l.slice(14).trim();
    // v14: NPC-NPC relationship seeds
    else if (l.startsWith("npc_rivals:")) npcRivals = l.slice(11).trim();
    else if (l.startsWith("npc_allies:")) npcAllies = l.slice(11).trim();
    // v18: Player arc, clock stages, region event gate
    else if (l.startsWith("arc:")) cardArc = l.slice(4).trim().toLowerCase();
    else if (l.startsWith("clock_stages:")) clockStages = l.slice(13).trim();
    else if (l.startsWith("region_event:")) regionEvent = l.slice(13).trim();
  }
  const { narrative, effectsText } = _splitEntry(entryStr || "");
  return { id, tier, region: regionCode, weight, cooldown, deps,
           factions, tags, origin, time, continent, location, item,
           control, requires, npc, flag, priority, pin,
           thread, threadDuration, threadMatch, threadBreak,
           factionRel, requiresThread,
           partyReq, partyNot, partySize, companionTier,
           firesBoost, npcGoal, npcGoalKeywords, npcRivals, npcAllies,
           // v18
           cardArc, clockStages, regionEvent,
           // v16: pre-split tag list
           _tagList: tags ? tags.split(",").map(s => s.trim()).filter(Boolean) : [],
           // v16: fast-path flag — true if _passesGates needs to run anything
           _hasGates: !!(factions && factions !== "none" || npc || flag || requires ||
                         location || item || time || continent || origin || control ||
                         partyReq || partyNot || partySize || regionEvent),
           narrative, effectsText };
}

function _teraEnsureRegistry() {
  // Guard: storyCards may not be defined in all AI Dungeon hook contexts
  if (typeof storyCards === "undefined" || !Array.isArray(storyCards)) return;
  const di = state.tera._di || (state.tera._di = {});
  const seen = new Set();
  for (const card of storyCards) {
    const k = typeof card.keys === "string" ? card.keys : "";
    if (!k.startsWith("TERA|")) continue;
    const cardId = k.split("|")[1];
    if (!cardId || cardId.startsWith("_")) continue;
    seen.add(cardId);
    const hash = _hash(k + "\0" + (card.entry || card.value || ""));
    const cached = di[cardId];
    if (cached && cached.h === hash) {
      const { narrative, effectsText } = _splitEntry(card.entry || card.value || "");
      CARD_REGISTRY[cardId] = Object.assign({}, cached.meta, { narrative, effectsText });
    } else {
      const parsed = _parseCardKey(k, card.entry || card.value || "", card.description || "");
      if (parsed) {
        const gates = [];
        for (const line of (card.description || "").split("\n")) {
          const t = line.trim();
          if (t.startsWith("npcstress:")) {
            const m = t.slice(10).trim().match(/^(\w+)\s*(>=|<=|>|<|=)\s*(\d+)$/);
            if (m) gates.push({ type: "stress", npc: m[1].toLowerCase(), op: m[2], value: parseInt(m[3]) });
          } else if (t.startsWith("npctrust:")) {
            const m = t.slice(8).trim().match(/^(\w+)\s*(>=|<=|>|<|=)\s*(\d+)$/);
            if (m) gates.push({ type: "trust", npc: m[1].toLowerCase(), op: m[2], value: parseInt(m[3]) });
          } else if (t.startsWith("npcmood:")) {
            const m = t.slice(7).trim().match(/^(\w+)\s*=\s*(\w+)$/);
            if (m) gates.push({ type: "mood", npc: m[1].toLowerCase(), op: "=", value: m[2] });
          } else if (t.startsWith("prophecy:")) {
            parsed._prophecy = t.slice(9).trim();
          } else if (t.startsWith("fulfills:")) {
            parsed._fulfills = t.slice(9).trim();
          } else if (t.startsWith("faction_rel:")) {
            // faction_rel: factA,factB>=N  or  factA,factB<=-N etc.
            const frRaw = t.slice(12).trim();
            const frm = frRaw.match(/^(\w+),(\w+)\s*(>=|<=|>|<|=|!=)\s*(-?\d+)$/);
            if (frm) {
              if (!parsed._factionRelGates) parsed._factionRelGates = [];
              parsed._factionRelGates.push({ factA: frm[1], factB: frm[2], op: frm[3], value: parseInt(frm[4]) });
            }
          } else if (t.startsWith("moodTarget:")) {
            const pts = t.slice(11).trim().split("|");
            if (pts.length >= 2) {
              parsed._moodTarget = { npc: pts[0].trim().toLowerCase(), mood: pts[1].trim(), intensity: parseInt(pts[2]) || 1 };
            }
          // v18: player_arc gate  player_arc:mercy>=3
          } else if (t.startsWith("player_arc:")) {
            const pam = t.slice(11).trim().match(/^(\w+)\s*(>=|<=|>|<|=)\s*(\d+)$/);
            if (pam) {
              if (!parsed._playerArcGates) parsed._playerArcGates = [];
              parsed._playerArcGates.push({ category: pam[1].toLowerCase(), op: pam[2], value: parseInt(pam[3]) });
            }
          // v18: clock_stage gate  clock_stage:patrol=warning
          } else if (t.startsWith("clock_stage:")) {
            const csm = t.slice(12).trim().match(/^([\w_-]+)\s*=\s*(\w+)$/);
            if (csm) {
              if (!parsed._clockStageGates) parsed._clockStageGates = [];
              parsed._clockStageGates.push({ clockId: csm[1], stage: csm[2] });
            }
          }
        }
        if (gates.length) parsed._npcGates = gates;
        CARD_REGISTRY[cardId] = parsed;
        const { narrative: _n, effectsText: _e, ...meta } = parsed;
        di[cardId] = { h: hash, meta };
      }
    }
  }
  // Clean up stale cache entries
  for (const id of Object.keys(di)) if (!seen.has(id)) delete di[id];
  for (const id of Object.keys(CARD_REGISTRY)) if (!seen.has(id)) delete CARD_REGISTRY[id];
  REGISTRY_BUILT = true;
}

// ─── Helper: get/set NPC state ─────────────────────────────────────
function _ensureNpc(npcId) {
  const act = state.tera._activity || 0;
  if (!state.tera.moods[npcId]) {
    state.tera.moods[npcId] = {
      mood: "neutral",
      intensity: 0,
      stress: 50,
      trust: CFG.TRUST_DEFAULT,
      _mActSnap: act,
      _sActSnap: act,
      source: "auto"
    };
  }
  const s = state.tera.moods[npcId];
  s.stress    ??= 50;
  s.trust     ??= CFG.TRUST_DEFAULT;
  s._mActSnap ??= act;
  s._sActSnap ??= act;
  return s;
}

// ─── Decay subsystems (v16: mood/weight → activity-based) ──────────
// Mood and weight decay now use _activity (accumulated event points) as
// the clock, not turn count. This means decay happens proportional to
// how much has actually happened, not just time passing.
// Stress remains turn-based — physiological recovery is time-dependent.

function _decayMoods() {
  if (!CFG.MOOD_DECAY_ENABLED) return;
  const t = state.tera;
  const act = t._activity || 0;
  const interval = CFG.MOOD_DECAY_ACTIVITY || 12;
  if (act - (t._lastMoodDecayAct || 0) < interval) return;
  t._lastMoodDecayAct = act;
  // Allocation-free: for...in with direct property access
  const moods = t.moods;
  for (const id in moods) {
    const s = moods[id];
    if (s.intensity > 0) {
      s.intensity -= 1;
      if (s.intensity === 0) s.mood = "neutral";
    }
  }
}

function _decayStress() {
  if (!CFG.STRESS_DECAY_ENABLED) return;
  const t = state.tera;
  if (t.turn - (t._lastStressDecay || 0) < 1) return;
  t._lastStressDecay = t.turn;
  const rate = CFG.STRESS_DECAY_RATE || 3;
  const halfRate = Math.ceil(rate / 2);
  const moods = t.moods;
  for (const id in moods) {
    const s = moods[id];
    if (s.stress > 50) s.stress = Math.max(50, s.stress - rate);
    else if (s.stress < 50) s.stress = Math.min(50, s.stress + halfRate);
  }
}

function _decayWeightMods() {
  if (!CFG.WEIGHT_DECAY_ENABLED) return;
  const t = state.tera;
  const act = t._activity || 0;
  const interval = CFG.WEIGHT_DECAY_ACTIVITY || 18;
  if (act - (t._lastWeightDecayAct || 0) < interval) return;
  t._lastWeightDecayAct = act;
  const wm = t.weightMods;
  for (const id in wm) {
    if (wm[id] > 0) { wm[id] -= 1; if (wm[id] === 0) delete wm[id]; }
    else if (wm[id] < 0) { wm[id] += 1; if (wm[id] === 0) delete wm[id]; }
  }
}

// ─── Resonance subsystem (v10: implemented) ─────────────────────────
// BUG FIX: v9 stored _resonance but never built or used it. Resonance
// now accumulates from player input words and boosts matching cards.

const RESONANCE_STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","is","was",
  "it","he","she","they","we","you","i","my","his","her","their","our","your",
  "that","this","with","from","by","as","not","do","did","be","been","are",
  "have","had","will","would","could","should","may","might","can","then",
  "than","so","if","when","there","what","which","who","how","all","just","also"
]);

function _resonanceIngest(text) {
  if (!CFG.RESONANCE_ENABLED || !text) return;
  const t = state.tera;
  if (!t._resonance) t._resonance = {};
  const rs = t._resonance;
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (RESONANCE_STOP_WORDS.has(w)) continue;
    rs[w] = (rs[w] || 0) + 1;
  }
  // Prune only when over limit; mark cache dirty
  const keys = Object.keys(rs);
  if (keys.length > 150) {
    keys.sort((a, b) => rs[a] - rs[b]);
    for (let i = 0; i < keys.length - 100; i++) delete rs[keys[i]];
  }
  t._resonanceDirty = true;
}

function _resonanceScore(card) {
  if (!CFG.RESONANCE_ENABLED) return 0;
  const t = state.tera;
  const rs = t._resonance;
  if (!rs || !card.narrative) return 0;
  // Rebuild top-N Set only when source has changed
  if (t._resonanceDirty || !t._resonanceTopSet) {
    const topN = CFG.RESONANCE_TOP_N || 10;
    const entries = Object.keys(rs);
    if (entries.length <= topN) {
      t._resonanceTopSet = new Set(entries);
    } else {
      entries.sort((a, b) => rs[b] - rs[a]);
      t._resonanceTopSet = new Set(entries.slice(0, topN));
    }
    t._resonanceDirty = false;
  }
  const topSet = t._resonanceTopSet;
  const words = card.narrative.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  let hits = 0;
  for (let i = 0; i < words.length; i++) if (topSet.has(words[i])) hits++;
  return Math.min(hits * (CFG.RESONANCE_BOOST || 2), 8);
}

const TIER_ARC_MAP = {
  tragedy: "tragedy", triumph: "triumph", victory: "triumph", rescue: "triumph",
  mystery: "mystery", betrayal: "tragedy", loss: "tragedy",
  discovery: "mystery", social: "comedy", comedy: "comedy",
};
const ARC_COUNTER = {
  tragedy: ["triumph","comedy"], triumph: ["mystery","tragedy"],
  mystery: ["triumph","comedy"], comedy:  ["tragedy","mystery"],
};

function _fateArcUpdate(card) {
  if (!CFG.FATE_ARC_ENABLED) return;
  const t = state.tera;
  if (!t._fateArc) t._fateArc = { tragedy: 0, triumph: 0, mystery: 0, comedy: 0 };
  const tags = card._tagList || (card.tags || "").split(",");
  const fa = t._fateArc;
  let changed = false;
  for (let i = 0; i < tags.length; i++) {
    const arc = TIER_ARC_MAP[tags[i].trim()];
    if (arc && fa[arc] !== undefined) {
      fa[arc] = Math.min(CFG.FATE_ARC_CEILING, (fa[arc] || 0) + 1);
      changed = true;
    }
  }
  // Invalidate cached dominant arc when arc scores change
  if (changed) t._fateArcDom = null;
}

function _fateArcBoost(card) {
  if (!CFG.FATE_ARC_ENABLED) return 0;
  const t = state.tera;
  if (!t._fateArc) return 0;
  // Rebuild dominant arc cache if invalidated
  if (!t._fateArcDom) {
    const fa = t._fateArc;
    let domArc = null, domScore = 0;
    for (const arc in fa) { if (fa[arc] > domScore) { domArc = arc; domScore = fa[arc]; } }
    t._fateArcDom = (domArc && domScore >= (CFG.FATE_ARC_THRESHOLD || 3))
      ? { arc: domArc, score: domScore }
      : { arc: null, score: 0 };
  }
  if (!t._fateArcDom.arc) return 0;
  const counterArcs = ARC_COUNTER[t._fateArcDom.arc];
  if (!counterArcs) return 0;
  const tags = card._tagList || (card.tags || "").split(",");
  for (let i = 0; i < tags.length; i++) {
    const cardArc = TIER_ARC_MAP[tags[i].trim()];
    if (cardArc && counterArcs.includes(cardArc)) {
      return Math.min(Math.floor(t._fateArcDom.score / 4), CFG.FATE_ARC_MAX_BOOST || 4);
    }
  }
  return 0;
}

// ─── Oracle subsystem (v10: implemented) ────────────────────────────
// BUG FIX: Oracle entries were imported via legacy but never seeded from
// live cards. Prophecy cards now plant oracles, and fulfillment is tracked.

function _oraclePlant(card) {
  if (!CFG.ORACLE_ENABLED) return;
  if (!card._prophecy) return;
  const t = state.tera;
  if (!Array.isArray(t._oracle)) t._oracle = [];
  const anchorId = `oracle_${card.id}`;
  if (t._oracle.some(o => o.anchorId === anchorId)) return;
  const tier = card.tier;
  const minTiers = ["minor","moderate","major"];
  const minIdx = minTiers.indexOf(CFG.ORACLE_MIN_TIER);
  const cardIdx = minTiers.indexOf(tier);
  if (cardIdx < minIdx) return;
  t._oracle.push({
    anchorId,
    sourceCardId: card.id,
    fulfillsCardId: card._fulfills || null,
    prophecyText: card._prophecy,
    plantedTurn: t.turn,
    isLegacy: false,
  });
  teraAddAnchor(anchorId, card._prophecy, 6, null);
}

function _oracleFulfill(card) {
  if (!CFG.ORACLE_ENABLED) return;
  const t = state.tera;
  if (!Array.isArray(t._oracle)) return;
  const matching = t._oracle.filter(o => o.fulfillsCardId === card.id || (card._fulfills && o.sourceCardId === card._fulfills));
  for (const o of matching) {
    teraRemoveAnchor(o.anchorId);
  }
  t._oracle = t._oracle.filter(o => !matching.includes(o));
}

// ─── Fingerprint subsystem (v10: implemented) ────────────────────────
// BUG FIX: _fpRaw was collected from Input tab but _fp was NEVER built.
// The fingerprint is now locked after FINGERPRINT_TURNS turns.

function _fingerprintBuild() {
  if (!CFG.FINGERPRINT_ENABLED) return;
  const t = state.tera;
  if (t._fp || !t._fpRaw) return;
  if (t._fpRaw.turns < Math.max(3, Math.floor(CFG.FINGERPRINT_TURNS * 0.5))) return;
  const raw = t._fpRaw;
  const total = raw.turns || 1;
  const doRatio  = raw.doC  / total;
  const sayRatio = raw.sayC / total;
  const storyRatio = raw.storyC / total;
  const avgLen = raw.len / total;
  const vocabSize = (raw.vocabSet || []).length;
  // Derive style label
  let style;
  if (storyRatio > 0.5) style = "narrator";
  else if (sayRatio > doRatio) style = "conversationalist";
  else if (doRatio > 0.6) style = "action-driver";
  else style = "balanced";
  // Derive engagement label
  let engagement;
  if (avgLen > 200 || vocabSize > 120) engagement = "deep";
  else if (avgLen > 80 || vocabSize > 60) engagement = "moderate";
  else engagement = "brief";
  // NPC affinity
  const npcAffinity = raw.npcRefs > (total * 0.3);
  t._fp = { style, engagement, npcAffinity, lockedTurn: t.turn };
}

function _fingerprintBoost(card) {
  if (!CFG.FINGERPRINT_ENABLED) return 0;
  const fp = state.tera._fp;
  if (!fp) return 0;
  let bonus = 0;
  if (fp.style === "conversationalist" && card.id.startsWith("CHR-")) bonus += 1;
  if (fp.style === "narrator" && (card.tier === "major" || card.tier === "moderate")) bonus += 1;
  if (fp.style === "action-driver" && card.tier === "minor") bonus -= 1;
  if (fp.engagement === "deep" && card.narrative && card.narrative.length > 200) bonus += 1;
  if (fp.npcAffinity && card.id.startsWith("CHR-")) bonus += 1;
  return bonus;
}

// ─── IS-Bridge subsystem (v16: cached word set) ──────────────────────
// Word set is rebuilt from echo buffer once per turn (in teraTurn before
// card selection), then shared across all card score calls.
function _isBridgeRebuild() {
  const t = state.tera;
  if (!CFG.IS_BRIDGE_ENABLED) { t._isBridgeWordSet = null; return; }
  const echo = t._echo || [];
  if (!echo.length) { t._isBridgeWordSet = null; return; }
  t._isBridgeWordSet = new Set(
    echo.slice(-4).flatMap(e => (e.text || "").toLowerCase().match(/\b[a-z]{4,}\b/g) || [])
  );
}

function _isBridgeScore(card) {
  if (!CFG.IS_BRIDGE_ENABLED) return 0;
  const wordSet = state.tera._isBridgeWordSet;
  if (!wordSet || !wordSet.size || !card.narrative) return 0;
  const narWords = card.narrative.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  let hits = 0;
  for (let i = 0; i < narWords.length; i++) if (wordSet.has(narWords[i])) hits++;
  return Math.min(hits, Math.floor((CFG.IS_BRIDGE_MAX_BOOST || 15) / (CFG.IS_BRIDGE_PER_TURN || 3)));
}

// ─── Echo subsystem ────────────────────────────────────────────────
// (Echo capture lives in Input tab; injection is done via _buildAnchorLine
//  using the echo buffer. Added helper to retrieve a random echo phrase.)
function _echoGet() {
  if (!CFG.ECHO_ENABLED) return null;
  const t = state.tera;
  const eb = t._echo || [];
  if (!eb.length) return null;
  if (CFG.ECHO_MAJOR_ONLY) {
    const lastCard = t.lastCardId ? CARD_REGISTRY[t.lastCardId] : null;
    if (lastCard && lastCard.tier === "minor") return null;
  }
  if (Math.random() > CFG.ECHO_CHANCE) return null;
  const entry = eb[Math.floor(Math.random() * eb.length)];
  return entry ? entry.text : null;
}

// ==================================================================
// v18 LAYER 7A — Player Behavioral Arc
// ==================================================================
const ARC_KEYWORDS = {
  mercy:       new Set(["spare","forgive","mercy","pardon","release","free","refuse","won't kill","let them go","don't kill","step back","lower","sheathe","let go"]),
  aggression:  new Set(["attack","kill","destroy","strike","fight","charge","stab","slash","shoot","fire","crush","smash","break","tear","cut","punch","hit","assault","obliterate","eliminate"]),
  diplomacy:   new Set(["negotiate","convince","persuade","talk","speak","ask","offer","propose","reason","explain","appeal","bargain","discuss","argue","agree","compromise","treaty","deal","alliance"]),
  sacrifice:   new Set(["sacrifice","give up","trade","cost","pay","surrender","yield","give","lose","risk","take my place","offer myself","shield","take the blow"]),
  protection:  new Set(["protect","defend","guard","shield","save","pull","grab","stand in","step in","cover","keep safe","watch over","hold","shelter","block"]),
  curiosity:   new Set(["look","search","examine","investigate","study","read","touch","open","find","explore","check","inspect","discover","learn","understand"]),
};
const ARC_CATEGORIES = Object.keys(ARC_KEYWORDS);

function _playerArcIngest(inputText) {
  if (!CFG.PLAYER_ARC_ENABLED || !inputText) return;
  const t = state.tera;
  if (!t._playerArc) t._playerArc = {};
  const lower = inputText.toLowerCase();
  const words = lower.match(/\b[a-z']+\b/g) || [];
  let detected = false;
  for (const cat of ARC_CATEGORIES) {
    const kws = ARC_KEYWORDS[cat];
    let hits = 0;
    for (let i = 0; i < words.length; i++) if (kws.has(words[i])) hits++;
    // Multi-word phrase scan
    for (const kw of kws) { if (kw.includes(" ") && lower.includes(kw)) hits++; }
    if (!hits) continue;
    detected = true;
    if (!t._playerArc[cat]) t._playerArc[cat] = { score: 0, lastTurn: t.turn };
    t._playerArc[cat].score += hits;
    t._playerArc[cat].lastTurn = t.turn;
  }
  if (detected) t._playerArcDom = null;
}

function _playerArcDecay() {
  if (!CFG.PLAYER_ARC_ENABLED) return;
  const t = state.tera;
  if (!t._playerArc) return;
  const window = CFG.PLAYER_ARC_TURNS || 20;
  let changed = false;
  for (const cat in t._playerArc) {
    const entry = t._playerArc[cat];
    const age = t.turn - (entry.lastTurn || 0);
    if (age > window) {
      entry.score = Math.max(0, entry.score - Math.ceil((age - window) / 3));
      if (entry.score === 0) { delete t._playerArc[cat]; changed = true; }
    }
  }
  if (changed) t._playerArcDom = null;
}

function _playerArcGetDominant() {
  const t = state.tera;
  if (!t._playerArc) return null;
  if (t._playerArcDom !== null && t._playerArcDom !== undefined) return t._playerArcDom;
  const threshold = CFG.PLAYER_ARC_THRESHOLD || 3;
  let domCat = null, domScore = 0;
  for (const cat in t._playerArc) {
    if (t._playerArc[cat].score > domScore) { domScore = t._playerArc[cat].score; domCat = cat; }
  }
  t._playerArcDom = (domCat && domScore >= threshold) ? { category: domCat, score: domScore } : null;
  return t._playerArcDom;
}

function _playerArcScore(card) {
  if (!CFG.PLAYER_ARC_ENABLED || !card.cardArc) return 0;
  const dom = _playerArcGetDominant();
  if (!dom) return 0;
  if (card.cardArc === dom.category) return CFG.PLAYER_ARC_BOOST || 3;
  const ADJACENT = {
    mercy:["protection","diplomacy"], aggression:["sacrifice"],
    diplomacy:["mercy","curiosity"], sacrifice:["protection","aggression"],
    protection:["mercy","sacrifice"], curiosity:["diplomacy"],
  };
  if ((ADJACENT[dom.category] || []).includes(card.cardArc)) return 1;
  return 0;
}

// ─── Faction helpers ───────────────────────────────────────────────
function registerFaction(id, startRep) {
  if (state.tera.factions[id] === undefined) state.tera.factions[id] = startRep || 0;
}
function adjustFactionRep(faction, amount) {
  if (state.tera.factions[faction] === undefined) return;
  state.tera.factions[faction] = Math.max(-100, Math.min(100, state.tera.factions[faction] + amount));
}
function getFactionRep(faction) { return state.tera.factions[faction] ?? 0; }
function getFactionStatus(rep) {
  return rep >= 75 ? "allied" : rep >= 30 ? "friendly" : rep <= -75 ? "enemy" : rep <= -30 ? "unfriendly" : "neutral";
}

// ─── Relationship helpers ──────────────────────────────────────────
function adjustRelationship(npcId, amount) {
  const t = state.tera;
  if (!t.relationships) t.relationships = {};
  const cur = t.relationships[npcId] ?? 0;
  t.relationships[npcId] = Math.max(-100, Math.min(100, cur + amount));
}
function getRelationship(npcId) { return (state.tera.relationships || {})[npcId] ?? 0; }

// ─── Flag helpers ──────────────────────────────────────────────────
function teraSetFlag(id, value) {
  if (!state.tera.flags) state.tera.flags = {};
  state.tera.flags[id] = (value === undefined || value === true || value === "true") ? true
                       : (value === false || value === "false") ? false : value;
}
function teraGetFlag(id) { return (state.tera.flags || {})[id]; }

// ─── Clock helpers ─────────────────────────────────────────────────
// v18: Multi-stage clock support.
// Stages syntax: "8=warning,4=critical"  → at 8 turns remaining set stage "warning",
//                                          at 4 remaining set stage "critical".
// Each stage: sets flag clock_id_warning=true, sets clock.currentStage,
//             optionally triggers a card if stageCards[stageTag] is set.
function _parseClockStages(stagesStr) {
  if (!stagesStr) return [];
  const stages = [];
  for (const part of stagesStr.split(",")) {
    const m = part.trim().match(/^(\d+)\s*=\s*(\w+)$/);
    if (m) stages.push({ remaining: parseInt(m[1]), tag: m[2] });
  }
  // Sort descending by remaining so we check highest threshold first
  stages.sort((a, b) => b.remaining - a.remaining);
  return stages;
}

function teraAddClock(id, label, turns, cardId, stagesStr) {
  if (!state.tera.clocks) state.tera.clocks = [];
  state.tera.clocks = state.tera.clocks.filter(c => c.id !== id);
  const totalTurns = parseInt(turns) || 10;
  state.tera.clocks.push({
    id,
    label:       label || id,
    firesAtTurn: state.tera.turn + totalTurns,
    totalTurns,
    cardId:      cardId || null,
    fired:       false,
    // v18: multi-stage
    stages:       _parseClockStages(stagesStr || ""),
    currentStage: null,
    _firedStages: {},  // stageTag → true (prevent re-firing)
  });
}
function teraRemoveClock(id) {
  state.tera.clocks = (state.tera.clocks || []).filter(c => c.id !== id);
}
function _tickClocks() {
  const t = state.tera;
  if (!Array.isArray(t.clocks)) return [];
  const messages = [];

  for (const clock of t.clocks) {
    const remaining = Math.max(0, clock.firesAtTurn - t.turn);

    // v18: check stage transitions before final fire
    if (CFG.CLOCK_STAGES_ENABLED && clock.stages && clock.stages.length) {
      for (const stage of clock.stages) {
        if (remaining <= stage.remaining && !clock._firedStages[stage.tag]) {
          clock._firedStages[stage.tag] = true;
          clock.currentStage = stage.tag;
          // Set flag: clock_id_warning = true
          teraSetFlag(`clock_${clock.id}_${stage.tag}`, true);
          // Trigger associated card if one is registered for this stage
          const stageCardId = (clock.stageCards || {})[stage.tag];
          if (stageCardId && CARD_REGISTRY[stageCardId]) triggerCard(CARD_REGISTRY[stageCardId]);
          if (CFG.CLOCK_NOTIFICATIONS) {
            messages.push(`[Clock] "${clock.label || clock.id}" — stage reached: ${stage.tag} (${remaining} turns remaining)`);
          }
        }
      }
    }

    // Final fire
    if (!clock.fired && t.turn >= clock.firesAtTurn) {
      clock.fired = true;
      clock.currentStage = "fired";
      if (clock.cardId && CARD_REGISTRY[clock.cardId]) triggerCard(CARD_REGISTRY[clock.cardId]);
      if (CFG.CLOCK_NOTIFICATIONS) messages.push(`[Clock] "${clock.label || clock.id}" has fired.`);
    }
  }
  t.clocks = t.clocks.filter(c => !c.fired);
  return messages;
}
function teraListClocks() {
  const t = state.tera;
  if (!Array.isArray(t.clocks) || !t.clocks.length) return "[Clocks] No active clocks.";
  return "[Clocks]\n" + t.clocks.map(c => {
    const remaining = Math.max(0, c.firesAtTurn - t.turn);
    const stageStr  = c.currentStage ? ` | stage: ${c.currentStage}` : "";
    const nextStage = (c.stages || []).find(s => remaining > 0 && !c._firedStages[s.tag]);
    const nextStr   = nextStage ? ` | next: ${nextStage.tag} @ ${nextStage.remaining}t` : "";
    return `  ${c.id} | "${c.label}" | ${remaining} turns left (fires t${c.firesAtTurn})${stageStr}${nextStr}`;
  }).join("\n");
}

// ─── Weight mod helpers ────────────────────────────────────────────
function teraAddWeightMod(cardId, delta) {
  if (!state.tera.weightMods) state.tera.weightMods = {};
  const cur = state.tera.weightMods[cardId] || 0;
  state.tera.weightMods[cardId] = cur + (parseInt(delta) || 0);
}

// ─── Activity helpers ──────────────────────────────────────────────
// FIX: v9 had two separate activity systems (_activity global int and
// activity{} per-region map) that were never kept in sync. v10 always
// increments BOTH on card fire and exposes both via helpers.
function addActivity(regionOrCode, points) {
  const code = toCode(regionOrCode);
  if (!state.tera.activity[code]) state.tera.activity[code] = 0;
  state.tera.activity[code] = Math.min(300, state.tera.activity[code] + (points || 0));
  state.tera._activity = (state.tera._activity || 0) + (points || 0);
}
function getActivity(regionOrCode) { return state.tera.activity[toCode(regionOrCode)] || 0; }
function getGlobalActivity() { return state.tera._activity || 0; }

// ─── Tag helpers ───────────────────────────────────────────────────
function addTag(keyOrCode, tag) {
  const code = toCode(keyOrCode);
  const csv = state.tera.tags[code] || "";
  const arr = csv ? csv.split(",") : [];
  if (!arr.includes(tag)) { arr.push(tag); state.tera.tags[code] = arr.join(","); }
}
function hasTag(keyOrCode, tag) {
  const csv = state.tera.tags[toCode(keyOrCode)] || "";
  return csv.split(",").includes(tag);
}

// ─── Calendar helpers ──────────────────────────────────────────────
const SEASONS = ["spring","summer","autumn","winter"];
const TODS = ["dawn","day","dusk","night"];
const MONTH_SEASON = [
  "spring","spring","spring","summer","summer","summer",
  "autumn","autumn","autumn","winter","winter","winter"
];
function advanceCalendar(days) {
  const c = state.tera.calendar;
  c.day += (days || 1);
  while (c.day > 30) { c.day -= 30; c.month++; }
  while (c.month > 12) { c.month -= 12; c.year++; }
  c.season = MONTH_SEASON[c.month - 1];
}
function advanceTod() {
  const c = state.tera.calendar;
  const i = TODS.indexOf(c.tod);
  c.tod = TODS[(i + 1) % TODS.length];
  if (c.tod === "dawn") advanceCalendar(1);
}
function setTod(tod) { if (TODS.includes(tod)) state.tera.calendar.tod = tod; }

// ─── Memory Anchor helpers ─────────────────────────────────────────
const ANCHOR_CAP = 8;
const ABILITY_ANCHOR_TEXTS = {
  absoluterecall: "You have perfect recall of every sensory experience.",
  voidstep: "You can teleport instantly to any location you have visited.",
  unwritten: "You are invisible to all magical detection.",
  livingformulae: "You can inscribe perfect Runic Formulae by touch.",
  threadpull: "You perceive the dominant want or fear of anyone you focus on.",
  anchor: "You carry The Anchor — you can set temporal anchor points and return once.",
  secondsight: "You carry The Second Sight — you perceive the next committed action.",
  erasure: "You carry Erasure — you can permanently remove memories.",
  undying: "You carry Undying — you cannot be permanently killed short of complete destruction.",
  groundtouch: "You carry Groundtouch — you read history through touch.",
  truthweight: "You feel the physical weight of deception.",
  thornward: "Your body reflexively shields against harm.",
  vowreader: "You perceive active Binding Vows on people near you.",
  trueword: "Your voice carries Before‑People resonance.",
  remnant: "Handling an object reveals who last held it with strong intent.",
  waymark: "You always know true north, exact distance, and your path.",
  ironwill: "You carry Ironwill — immune to mind‑affecting Formulae.",
  bloomwright: "You carry Bloomwright — you can accelerate healing.",
  sealbreaker: "You carry Sealbreaker — you can unmake Binding Vows.",
  stillwater: "You carry Stillwater — you remain calm in any crisis.",
  deepread: "You carry DeepRead — you can read Mana history.",
  tidecall: "You carry TideCall — you can communicate through water.",
};

function _autoAnchorMet(metTag) {
  const t = state.tera;
  if (!Array.isArray(t.anchors)) t.anchors = [];
  const anchorId = `chr_${metTag.slice(4)}`;
  if (t.anchors.some(a => a.id === anchorId)) return;
  _teraEnsureRegistry();
  for (const id in CARD_REGISTRY) {
    const c = CARD_REGISTRY[id];
    if (c.tier !== "character" || !id.startsWith("CHR-")) continue;
    if (!c.tags) continue;
    const cardTags = c.tags.split(",").map(tg => tg.trim());
    if (!cardTags.includes(metTag)) continue;
    let snippet = (c.narrative || "").trim();
    const endIdx = snippet.search(/[.!?]/);
    snippet = (endIdx !== -1 && endIdx < 130)
      ? snippet.slice(0, endIdx + 1)
      : snippet.slice(0, 100).replace(/\s\S*$/, "") + "...";
    if (snippet) t.anchors.push({ id: anchorId, text: snippet.trim(), priority: 6, turn: t.turn, expires: null });
    break;
  }
}

function _autoAnchorItem(itemId) {
  const t = state.tera;
  if (!Array.isArray(t.anchors)) t.anchors = [];
  const anchorId = `item_${itemId.toLowerCase().replace(/[^a-z0-9]/g,"_")}`;
  if (t.anchors.some(a => a.id === anchorId)) return;
  _teraEnsureRegistry();
  const card = CARD_REGISTRY[itemId];
  let text = `You hold ${itemId}.`;
  if (card && card.narrative) {
    const snippet = card.narrative.trim();
    const endIdx = snippet.search(/[.!?]/);
    const first = (endIdx !== -1 && endIdx < 100) ? snippet.slice(0, endIdx + 1) : snippet.slice(0, 80).replace(/\s\S*$/, "") + "...";
    if (first) text = `You carry: ${first}`;
  }
  t.anchors.push({ id: anchorId, text: text.trim(), priority: 7, turn: t.turn, expires: null });
}

function _autoAnchorAbility(tag) {
  const t = state.tera;
  if (!Array.isArray(t.anchors)) t.anchors = [];
  const name = tag.slice(8);
  const anchorId = `ability_${name}`;
  if (t.anchors.some(a => a.id === anchorId)) return;
  const text = ABILITY_ANCHOR_TEXTS[name];
  if (text) t.anchors.push({ id: anchorId, text, priority: 9, turn: t.turn, expires: null });
}

function teraAddAnchor(id, text, priority, expires) {
  const t = state.tera;
  if (!Array.isArray(t.anchors)) t.anchors = [];
  t.anchors = t.anchors.filter(a => a.id !== id);
  t.anchors.push({
    id,
    text: (text || "").trim(),
    priority: Math.max(0, Math.min(9, priority === undefined ? 5 : priority)),
    turn: t.turn,
    expires: (expires == null) ? null : t.turn + expires
  });
}

function teraRemoveAnchor(id) {
  const t = state.tera;
  if (!Array.isArray(t.anchors)) return false;
  const before = t.anchors.length;
  t.anchors = t.anchors.filter(a => a.id !== id);
  return t.anchors.length < before;
}

function teraExpireAnchor(id, turns) {
  const anchor = (state.tera.anchors || []).find(a => a.id === id);
  if (!anchor) return `[Anchor] ${id} not found`;
  anchor.expires = state.tera.turn + (turns || 5);
  return `[Anchor] ${id} → expires in ${turns} turns (turn ${anchor.expires})`;
}

function teraListAnchors() {
  const t = state.tera;
  if (!Array.isArray(t.anchors) || !t.anchors.length) return "[Anchors] No anchors.";
  return "[Anchors]\n" + t.anchors.map(a => {
    const age = t.turn - a.turn;
    const exp = (a.expires == null) ? "permanent" : `expires t${a.expires} (${Math.max(0, a.expires - t.turn)} turns)`;
    const preview = (a.text || "").slice(0, 55) + (a.text && a.text.length > 55 ? "..." : "");
    return `  ${a.id} | p:${a.priority} | age:${age} | ${exp}\n    "${preview}"`;
  }).join("\n");
}

function _buildAnchorLine() {
  const t = state.tera;
  if (!Array.isArray(t.anchors) || !t.anchors.length) return "";
  // Expire anchors
  t.anchors = t.anchors.filter(a => a.expires === null || a.expires === undefined || t.turn < a.expires);
  if (!t.anchors.length) return "";
  const sorted = [...t.anchors].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.turn - a.turn;
  });
  const high = sorted.filter(a => a.priority >= 7);
  const low  = sorted.filter(a => a.priority < 7);
  const selected = [...high, ...low].slice(0, ANCHOR_CAP);
  if (!selected.length) return "";
  // Optionally append an echo phrase
  const echo = _echoGet();
  const parts = selected.map(a => a.text);
  if (echo) parts.push(`"${echo}"`);
  return "[Memory] " + parts.join(" | ");
}


// ==================================================================
// v13 PHASE 1: Party System
// ==================================================================

function _isInParty(cardId) {
  return (state.tera.party || []).includes(cardId);
}

function teraJoinParty(cardId) {
  const t = state.tera;
  if (!Array.isArray(t.party)) t.party = [];
  if (t.party.includes(cardId)) return "[Party] " + cardId + " is already in the party.";
  if (t.party.length >= (CFG.MAX_PARTY_SIZE || 4)) return "[Party] Party is full (max " + CFG.MAX_PARTY_SIZE + ").";
  t.party.push(cardId);
  const npcName = cardId.startsWith("CHR-") ? cardId.slice(4).toLowerCase() : cardId.toLowerCase();
  const metTag = "met_" + npcName;
  addTag(t.region, metTag);
  _autoAnchorMet(metTag);
  const label = npcName.charAt(0).toUpperCase() + npcName.slice(1);
  teraAddAnchor("companion_" + npcName, label + " is traveling with you.", 8, null);
  if (CFG.NPC_DETACH_ENABLED) {
    _teraEnsureRegistry();
    const card = CARD_REGISTRY[cardId];
    if (card && !t.npcHomeRegion[cardId]) t.npcHomeRegion[cardId] = card.region;
    t.npcLocation[cardId] = t.region;
  }
  _ensureNpc(npcName);
  return "[Party] " + label + " has joined the party.";
}

function teraLeaveParty(cardId) {
  const t = state.tera;
  if (!Array.isArray(t.party)) t.party = [];
  if (!t.party.includes(cardId)) return "[Party] " + cardId + " is not in the party.";
  t.party = t.party.filter(function(id) { return id !== cardId; });
  const npcName = cardId.startsWith("CHR-") ? cardId.slice(4).toLowerCase() : cardId.toLowerCase();
  teraRemoveAnchor("companion_" + npcName);
  if (CFG.NPC_DETACH_ENABLED) {
    t.npcLocation[cardId] = t.region;
    t._npcLastInteract[cardId] = t.turn;
  }
  return "[Party] " + (npcName.charAt(0).toUpperCase() + npcName.slice(1)) + " has left the party.";
}

function teraListParty() {
  const t = state.tera;
  if (!Array.isArray(t.party) || !t.party.length) return "[Party] No companions.";
  _teraEnsureRegistry();
  const lines = ["[Party — " + t.party.length + "/" + CFG.MAX_PARTY_SIZE + " companions]"];
  for (var i = 0; i < t.party.length; i++) {
    var cardId = t.party[i];
    var npcName = cardId.startsWith("CHR-") ? cardId.slice(4).toLowerCase() : cardId.toLowerCase();
    var m = (t.moods || {})[npcName];
    var mood = m ? (m.mood + " (int " + m.intensity + ") stress:" + (m.stress||50) + " trust:" + (m.trust||50)) : "no state";
    var home = t.npcHomeRegion[cardId] || (CARD_REGISTRY[cardId] ? CARD_REGISTRY[cardId].region : "?");
    lines.push("  " + cardId + " [home:" + home + "] — " + mood);
  }
  return lines.join("\n");
}

function _partyFollowRegion(newRegion) {
  var t = state.tera;
  if (!CFG.NPC_DETACH_ENABLED || !Array.isArray(t.party)) return;
  for (var i = 0; i < t.party.length; i++) {
    t.npcLocation[t.party[i]] = newRegion;
    t._npcLastInteract[t.party[i]] = t.turn;
  }
}


// ==================================================================
// v13 PHASE 2: NPC Region Detachment
// ==================================================================

function _getEffectiveRegion(cardId, card) {
  if (CFG.NPC_DETACH_ENABLED) {
    var override = state.tera.npcLocation[cardId];
    if (override) return override;
  }
  return card.region;
}

function _npcReturnHomeCheck() {
  if (!CFG.NPC_DETACH_ENABLED || !CFG.NPC_RETURN_HOME_TURNS) return;
  var t = state.tera;
  var threshold = CFG.NPC_RETURN_HOME_TURNS;
  for (var cardId in t._npcLastInteract) {
    if (t.party.includes(cardId)) continue;
    if (t.turn - t._npcLastInteract[cardId] >= threshold && t.npcHomeRegion[cardId]) {
      t.npcLocation[cardId] = t.npcHomeRegion[cardId];
      delete t._npcLastInteract[cardId];
    }
  }
}

// Region distance map for travel calendar advancement
var REGION_DISTANCES = {
  "vnr__vmf": 1, "vnr__vis": 2, "vnr__vel": 2, "vnr__vap": 2,
  "vmf__vel": 1, "vmf__vap": 2, "vmf__vis": 2,
  "vel__vap": 1, "vel__vis": 2, "vis__vap": 1,
};
function _regionDistance(codeA, codeB) {
  if (codeA === codeB) return 0;
  var key = [codeA, codeB].sort().join("__");
  return REGION_DISTANCES[key] || 5;
}


// ==================================================================
// v13 PHASE 3: Narrative NPC Scan (v16: regex union for single pass)
// ==================================================================

var _npcNameMap  = null; // name → cardId
var _npcScanRegex = null; // compiled union regex, rebuilt with name map

function _buildNpcNameMap() {
  if (_npcNameMap) return _npcNameMap;
  _npcNameMap = {};
  _teraEnsureRegistry();
  for (var id in CARD_REGISTRY) {
    if (!id.startsWith("CHR-")) continue;
    _npcNameMap[id.slice(4).toLowerCase()] = id;
  }
  // Build a single regex matching all NPC names as whole words
  const names = Object.keys(_npcNameMap);
  _npcScanRegex = names.length
    ? new RegExp("\\b(" + names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|") + ")\\b", "gi")
    : null;
  return _npcNameMap;
}

function _narrativeNpcScan(text) {
  if (!CFG.NPC_SCAN_ENABLED || !text) return [];
  const map = _buildNpcNameMap();
  if (!_npcScanRegex) return [];
  const t = state.tera;
  const detected = [];
  const seen = new Set(); // dedup within a single turn
  let m;
  _npcScanRegex.lastIndex = 0;
  while ((m = _npcScanRegex.exec(text)) !== null) {
    const name = m[1].toLowerCase();
    if (seen.has(name)) continue;
    seen.add(name);
    const cardId = map[name];
    if (!cardId) continue;
    detected.push(cardId);
    if (CFG.NPC_SCAN_AUTO_MET) {
      const metTag = "met_" + name;
      const regionTags = (t.tags[t.region] || "").split(",");
      if (!regionTags.includes(metTag)) {
        addTag(t.region, metTag);
        if (CFG.NPC_SCAN_AUTO_ANCHOR) _autoAnchorMet(metTag);
        // v14: seed NPC-NPC rels on first meeting
        const scCard = CARD_REGISTRY[cardId];
        if (scCard) _seedNpcRels(scCard);
      }
    }
    if (CFG.NPC_DETACH_ENABLED) t._npcLastInteract[cardId] = t.turn;
  }
  t._sceneNpcs = detected;
  return detected;
}


// ==================================================================
// v13 PHASE 4: Sentiment Analysis (v16: Sets for O(1) word lookup)
// ==================================================================

const SENTIMENT_CONFLICT = new Set(["argue","argued","threaten","threatened","attack","attacked",
  "insult","insulted","demand","demanded","betray","betrayed","accuse","accused",
  "refuse","refused","scream","screamed","shout","shouted","punch","punched",
  "slap","slapped","stab","stabbed","mock","mocked","confront","confronted",
  "taunt","taunted","snarl","snarled","curse","cursed"]);
const SENTIMENT_AFFECTION = new Set(["thank","thanked","thanks","help","helped","protect","protected",
  "trust","trusted","comfort","comforted","confide","confided","save","saved",
  "gift","gifted","embrace","embraced","praise","praised","reassure","reassured",
  "encourage","encouraged","heal","healed","support","supported","forgive","forgave",
  "smile","smiled","laugh","laughed","share","shared"]);
const SENTIMENT_DANGER = new Set(["fight","fought","ambush","ambushed","flee","fled","wound","wounded",
  "trap","trapped","explosion","collapse","collapsed","arrow","arrows","sword","blade",
  "blood","bleeding","charge","charged","dodge","dodged","slash","slashed","burn","burned"]);
const SENTIMENT_LOSS = new Set(["die","died","dies","dead","death","kill","killed","destroy","destroyed",
  "lose","lost","gone","perish","perished","fallen","grave","mourn","mourned",
  "funeral","sacrifice","sacrificed"]);

function _sentimentAnalysis(text, activeNpcs) {
  if (!CFG.SENTIMENT_ENABLED || !text || !activeNpcs || !activeNpcs.length) return;
  const t = state.tera;
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  const intensity = CFG.SENTIMENT_INTENSITY || 1.0;
  let cS = 0, aS = 0, dS = 0, lS = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (SENTIMENT_CONFLICT.has(w)) cS++;
    if (SENTIMENT_AFFECTION.has(w)) aS++;
    if (SENTIMENT_DANGER.has(w)) dS++;
    if (SENTIMENT_LOSS.has(w)) lS++;
  }
  if (cS + aS + dS + lS < 2) return;
  const cooldown = CFG.SENTIMENT_COOLDOWN || 2;
  const turn = t.turn;
  for (let j = 0; j < activeNpcs.length; j++) {
    const cardId = activeNpcs[j];
    const npcName = cardId.startsWith("CHR-") ? cardId.slice(4).toLowerCase() : cardId.toLowerCase();
    if (turn - (t._sentimentCooldown[npcName] || 0) < cooldown) continue;
    const s = _ensureNpc(npcName);
    const act = t._activity || 0;
    if (cS >= 2) {
      const d = Math.round(Math.min(cS, 4) * intensity);
      s.stress = Math.min(100, s.stress + d);
      s.trust = Math.max(0, s.trust - Math.round(d * 0.6));
      if (cS >= 4 && s.mood !== "angry") { s.mood = "angry"; s.intensity = Math.min(3, Math.round(cS / 3)); s._mActSnap = act; s.source = "sentiment"; }
    }
    if (aS >= 2) {
      const d2 = Math.round(Math.min(aS, 4) * intensity);
      s.trust = Math.min(100, s.trust + d2);
      s.stress = Math.max(0, s.stress - Math.round(d2 * 0.5));
      if (aS >= 3 && s.mood === "neutral") { s.mood = "content"; s.intensity = 1; s._mActSnap = act; s.source = "sentiment"; }
    }
    if (dS >= 3) {
      const d3 = Math.round(Math.min(dS, 6) * intensity);
      s.stress = Math.min(100, s.stress + d3);
      if (dS >= 5 && (s.mood === "neutral" || s.mood === "content")) { s.mood = "anxious"; s.intensity = Math.min(3, Math.round(dS / 3)); s._mActSnap = act; s.source = "sentiment"; }
    }
    if (lS >= 2) {
      const d4 = Math.round(Math.min(lS, 5) * intensity * 1.5);
      s.stress = Math.min(100, s.stress + d4);
      if (lS >= 3) { s.mood = "grieving"; s.intensity = Math.min(3, Math.round(lS / 2)); s._mActSnap = act; s.source = "sentiment"; }
    }
    t._sentimentCooldown[npcName] = turn;
  }
}


// ==================================================================
// v13 PHASE 5: Companion Events
// ==================================================================

function findCompanionCards() {
  _teraEnsureRegistry();
  var t = state.tera;
  if (!Array.isArray(t.party) || !t.party.length) return [];
  var meta = t.cardMeta || {};
  var result = [];
  // Build companion pool first (ring applied dynamically below)
  var preRing = [];
  for (var id in CARD_REGISTRY) {
    var c = CARD_REGISTRY[id];
    if (!c.companionTier) continue;
    var lastFired = meta[id];
    if (lastFired != null && (t.turn - lastFired) < _effectiveCooldown(c)) continue;
    if (c.partyReq) {
      var required = c.partyReq.split(",").map(function(s){return s.trim();});
      if (!required.every(function(req){return t.party.includes(req);})) continue;
    }
    if (c.partyNot) {
      var excluded = c.partyNot.split(",").map(function(s){return s.trim();});
      if (excluded.some(function(ex){return t.party.includes(ex);})) continue;
    }
    if (c.partySize) {
      var m = c.partySize.match(/^(>=|<=|>|<|=)(\d+)$/);
      if (m) {
        var val = parseInt(m[2]), sz = t.party.length;
        if (m[1] === ">=" && sz < val) continue;
        if (m[1] === "<=" && sz > val) continue;
        if (m[1] === ">" && sz <= val) continue;
        if (m[1] === "<" && sz >= val) continue;
        if (m[1] === "=" && sz !== val) continue;
      }
    }
    if (!_passesGates(c)) continue;
    preRing.push(c);
  }
  // Apply dynamic ring to companion pool
  var effRing = _ringEffectiveSize(preRing.length);
  var ringSet = effRing > 0 ? new Set(t.recentCards.slice(-effRing)) : new Set();
  return preRing.filter(function(c){ return !ringSet.has(c.id); });
}


// ==================================================================
// v13 PHASE 6: Travel Automation
// ==================================================================

var TRAVEL_KEYWORDS = [
  "travel to","head toward","head towards","journey to","set out for",
  "ride toward","ride towards","walk toward","walk towards","march toward",
  "sail to","sail toward","fly to","make our way to","depart for",
  "leave for","head for","heading to","we travel","we head","we journey",
  "traveling to","travelling to","on the road to","bound for"
];

function _detectTravelIntent(text) {
  if (!CFG.TRAVEL_AUTO_ENABLED || !text) return null;
  var lower = text.toLowerCase();
  for (var i = 0; i < TRAVEL_KEYWORDS.length; i++) {
    var idx = lower.indexOf(TRAVEL_KEYWORDS[i]);
    if (idx === -1) continue;
    var rest = lower.slice(idx + TRAVEL_KEYWORDS[i].length).trim();
    var detected = detectRegion(rest);
    if (detected) return detected;
  }
  return null;
}

function _handleRegionChange(newRegion, source) {
  var t = state.tera;
  var oldRegion = t.region;
  if (newRegion === oldRegion) return;
  t._prevRegion = oldRegion;
  t._lastRegionChange = t.turn;
  t.region = newRegion;
  t.currentLocation = null;
  _partyFollowRegion(newRegion);
  if (CFG.TRAVEL_AUTO_CALENDAR) {
    var days = _regionDistance(oldRegion, newRegion);
    if (days > 0) advanceCalendar(days);
  }
  if (CFG.TRAVEL_AUTO_THREAD && CFG.THREAD_ENABLED && !t._thread) {
    t._thread = { tag: "travel", turnsLeft: CFG.TRAVEL_THREAD_DURATION || 4, openedTurn: t.turn, openedBy: "auto_travel" };
  }
  var continentMap = {
    vnr:"valdris",vmf:"valdris",vel:"valdris",vis:"valdris",vap:"valdris",
    syl:"sylvenmoor",drv:"dravoss",vrd:"verdant_expanse",
    kth:"keth_ara",aur:"auren_shelf",snk:"sunken_reach",hlw:"the_hollow"
  };
  var continent = continentMap[newRegion];
  if (continent && t.continents[continent] === false) t.continents[continent] = true;
}


// ==================================================================
// v13 PHASE 7: Context Intelligence (v16: Sets for O(1) lookup)
// ==================================================================

const SCENE_KEYWORDS = {
  conversation: new Set(["said","asked","replied","spoke","told","whispered","answered","explained","murmured","discussed","conversation","talking","says","tells","speaks","asks"]),
  combat:       new Set(["sword","blade","shield","arrow","dodge","parry","strike","struck","slash","stab","blood","wound","fight","fought","charge","attack","attacked","battle","ambush","weapon","spell","cast","defend","block","kill","killed"]),
  exploration:  new Set(["path","road","trail","forest","mountain","cave","ruin","ruins","discover","found","explore","venture","travel","walk","climb","cross","bridge","river","camp","terrain","landscape","horizon"]),
  rest:         new Set(["sleep","slept","rest","rested","camp","campfire","tent","inn","tavern","eat","ate","drink","drank","meal","dawn","morning","awoke","woke","dream","bed","room"]),
  political:    new Set(["negotiate","treaty","alliance","council","senate","vote","law","decree","petition","hearing","faction","guild","authority","ambassador","diplomat","agreement","terms","contract","charter","sovereign"]),
};

function _detectSceneType(text) {
  if (!CFG.SCENE_DETECT_ENABLED || !text) return "exploration";
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  let bestType = null, bestScore = 0;
  for (const type in SCENE_KEYWORDS) {
    const kws = SCENE_KEYWORDS[type];
    let score = 0;
    for (let i = 0; i < words.length; i++) if (kws.has(words[i])) score++;
    if (score > bestScore) { bestScore = score; bestType = type; }
  }
  return (bestType && bestScore >= 2) ? bestType : "exploration";
}


// ==================================================================
// v13 PHASE 8 / v14: InnerSelf Integration Hints
// ==================================================================

function _buildISIntegrationHint() {
  if (!CFG.IS_INTEGRATION_ENABLED) return "";
  var t = state.tera;
  var hints = [];
  if (t.party.length) {
    var names = t.party.map(function(id){return id.startsWith("CHR-") ? id.slice(4) : id;});
    hints.push("Traveling companions: " + names.join(", "));
  }
  for (var i = 0; i < (t.party || []).length; i++) {
    var cardId = t.party[i];
    var npcName = cardId.startsWith("CHR-") ? cardId.slice(4).toLowerCase() : cardId.toLowerCase();
    var m = t.moods[npcName];
    if (m && (m.mood !== "neutral" || m.stress > 60 || m.trust < 30)) {
      var parts = [npcName + ": " + m.mood];
      if (m.stress > 70) parts.push("high stress");
      if (m.trust < 30) parts.push("low trust");
      if (m.trust > 70) parts.push("high trust");
      // v14: active goal
      if (m.goal) parts.push("pursuing " + m.goal.replace(/_/g, " "));
      hints.push(parts.join(", "));
    }
  }
  if (t._sceneType && t._sceneType !== "exploration") hints.push("Scene: " + t._sceneType);
  // v14: surface NPC-NPC tensions visible in scene
  var sceneNpcs = t._sceneNpcs || [];
  if (CFG.NPC_NPC_REL_ENABLED && sceneNpcs.length >= 2) {
    for (var si = 0; si < sceneNpcs.length; si++) {
      for (var sj = si + 1; sj < sceneNpcs.length; sj++) {
        var rel = getNpcRel(sceneNpcs[si], sceneNpcs[sj]);
        if (rel <= -30) hints.push(sceneNpcs[si].slice(4) + " and " + sceneNpcs[sj].slice(4) + " are rivals");
        else if (rel >= 50) hints.push(sceneNpcs[si].slice(4) + " and " + sceneNpcs[sj].slice(4) + " are bonded");
      }
    }
  }
  // v14: region pressure
  var curPressure = (t._worldPressure || {})[t.region] || 0;
  if (curPressure >= (CFG.WORLD_PRESSURE_THRESHOLD || 20)) hints.push("Region under pressure");
  // v15: surface active player intent tags to AI
  if (CFG.INTENT_DETECT_ENABLED) {
    var ib = t._intentBoosts || {};
    var activeIntentTags = Object.entries(ib)
      .filter(function(e){ return t.turn <= e[1].expiresAt; })
      .map(function(e){ return e[0]; });
    if (activeIntentTags.length) hints.push("Player intent: " + activeIntentTags.join(", "));
  }
  if (!hints.length) return "";
  return "[TERA State] " + hints.join(" | ");
}


// ─── Gate checker (v13/v14: party gates + NPC region detachment) ───
// ─── Gate checker (v13/v14 + v16: _hasGates fast-path) ─────────────
function _passesGates(c) {
  // v16: skip all evaluation for cards with no gate conditions
  if (!c._hasGates && !c._npcGates && !c._factionRelGates && !c.requiresThread) {
    // Character cards still need tag checks regardless
    if (c.tier !== "character") return true;
  }
  const t = state.tera;
  const cal = t.calendar;
  // faction
  if (c.factions && c.factions !== "none") {
    for (const fcheck of c.factions.split(",")) {
      const m = fcheck.trim().match(/(\w+)\s*([<>=!]+)\s*(-?\d+)/);
      if (!m) continue;
      const rep = getFactionRep(m[1]);
      const val = parseInt(m[3]);
      if (m[2] === ">=" && rep < val) return false;
      if (m[2] === "<=" && rep > val) return false;
      if (m[2] === ">" && rep <= val) return false;
      if (m[2] === "<" && rep >= val) return false;
      if (m[2] === "=" && rep !== val) return false;
      if (m[2] === "!=" && rep === val) return false;
    }
  }
  // NPC gates
  if (c._npcGates && CFG.NPC_GATES_ENABLED) {
    for (const g of c._npcGates) {
      const ns = t.moods[g.npc] || {};
      let pass = true;
      if (g.type === "stress") {
        const v = ns.stress ?? 50;
        if (g.op === ">=" && !(v >= g.value)) pass = false;
        else if (g.op === "<=" && !(v <= g.value)) pass = false;
        else if (g.op === ">" && !(v > g.value)) pass = false;
        else if (g.op === "<" && !(v < g.value)) pass = false;
        else if (g.op === "=" && !(v === g.value)) pass = false;
      } else if (g.type === "trust") {
        const v = ns.trust ?? 50;
        if (g.op === ">=" && !(v >= g.value)) pass = false;
        else if (g.op === "<=" && !(v <= g.value)) pass = false;
        else if (g.op === ">" && !(v > g.value)) pass = false;
        else if (g.op === "<" && !(v < g.value)) pass = false;
        else if (g.op === "=" && !(v === g.value)) pass = false;
      } else if (g.type === "mood") {
        if ((ns.mood || "neutral") !== g.value) pass = false;
      }
      if (!pass) return false;
    }
  }
  // requires
  if (c.requires) {
    for (const req of c.requires.split(",")) {
      if (!t.cardMeta[req.trim()]) return false;
    }
  }
  // tags (character cards: hard gate on region tags)
  // v13: party members bypass region tag gates; detached NPCs use effective region
  if (c.tags && c.tier === "character") {
    if (!_isInParty(c.id)) {
      const effRegion = _getEffectiveRegion(c.id, c);
      const regionTags = (t.tags[effRegion] || "").split(",");
      for (const tag of c.tags.split(",")) {
        const trimmed = tag.trim();
        if (!trimmed || trimmed.startsWith("met_") || trimmed.startsWith("ability_")) continue;
        if (!regionTags.includes(trimmed)) return false;
      }
    }
  }
  // origin
  if (c.origin) {
    const allowed = c.origin.split(",").map(s => s.trim());
    if (t.origin && !allowed.includes(t.origin)) return false;
  }
  // continent
  if (c.continent) {
    if (!t.continents[c.continent.trim()]) return false;
  }
  // location (v13: party members bypass location requirement)
  if (c.location) {
    if (!_isInParty(c.id) && t.currentLocation !== c.location.trim()) return false;
  }
  // item
  if (c.item) {
    if (!t.inventory.some(e => e.id === c.item.trim())) return false;
  }
  // time
  if (c.time) {
    for (const cond of c.time.split(",")) {
      const [key, val] = cond.trim().split("=");
      if (key === "season" && cal.season !== val) return false;
      if (key === "tod" && cal.tod !== val) return false;
      if (key === "month" && cal.month !== parseInt(val)) return false;
    }
  }
  // control
  if (c.control && c.control !== "none") {
    const controller = t.regionControl[c.region] || "neutral";
    if (controller !== c.control) return false;
  }
  // flag
  if (c.flag) {
    for (const check of c.flag.split(",")) {
      const trimmed = check.trim();
      if (trimmed.includes("=")) {
        const eq = trimmed.indexOf("=");
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        if (String(teraGetFlag(key)) !== val) return false;
      } else if (trimmed.startsWith("!")) {
        // Support negation: !flagName means flag must be falsy
        if (teraGetFlag(trimmed.slice(1))) return false;
      } else {
        if (!teraGetFlag(trimmed)) return false;
      }
    }
  }
  // requires_thread (v12)
  if (c.requiresThread) {
    const th = t._thread;
    if (!th || th.tag !== c.requiresThread) return false;
  }
  // faction_rel gates (v12)
  if (c._factionRelGates && CFG.FACTION_REL_ENABLED) {
    for (const g of c._factionRelGates) {
      const rep = getFactionRel(g.factA, g.factB);
      if (g.op === ">=" && rep < g.value)  return false;
      if (g.op === "<=" && rep > g.value)  return false;
      if (g.op === ">"  && rep <= g.value) return false;
      if (g.op === "<"  && rep >= g.value) return false;
      if (g.op === "="  && rep !== g.value) return false;
      if (g.op === "!=" && rep === g.value) return false;
    }
  }
  // v13: party gates (for companion event cards)
  if (c.partyReq) {
    var required = c.partyReq.split(",").map(function(s){return s.trim();});
    if (!required.every(function(req){return (t.party||[]).includes(req);})) return false;
  }
  if (c.partyNot) {
    var excluded = c.partyNot.split(",").map(function(s){return s.trim();});
    if (excluded.some(function(ex){return (t.party||[]).includes(ex);})) return false;
  }
  if (c.partySize) {
    var psm = c.partySize.match(/^(>=|<=|>|<|=)(\d+)$/);
    if (psm) {
      var psval = parseInt(psm[2]), pssz = (t.party||[]).length;
      if (psm[1] === ">=" && pssz < psval) return false;
      if (psm[1] === "<=" && pssz > psval) return false;
      if (psm[1] === ">" && pssz <= psval) return false;
      if (psm[1] === "<" && pssz >= psval) return false;
      if (psm[1] === "=" && pssz !== psval) return false;
    }
  }
  // v18: region_event gate — fires only if a specific card has fired in the current region
  if (c.regionEvent) {
    const t2 = state.tera;
    const mem = (t2._regionMemory || {})[t2.region] || [];
    if (!mem.some(e => e.cardId === c.regionEvent)) return false;
  }
  // v18: player_arc gate — player behavior must match threshold
  if (c._playerArcGates && c._playerArcGates.length) {
    const pa = state.tera._playerArc || {};
    for (const g of c._playerArcGates) {
      const score = (pa[g.category] || {}).score || 0;
      if (g.op === ">=" && !(score >= g.value)) return false;
      if (g.op === "<=" && !(score <= g.value)) return false;
      if (g.op === ">"  && !(score >  g.value)) return false;
      if (g.op === "<"  && !(score <  g.value)) return false;
      if (g.op === "="  && !(score === g.value)) return false;
    }
  }
  // v18: clock_stage gate — clock must be in specified stage
  if (c._clockStageGates && c._clockStageGates.length) {
    const clocks = state.tera.clocks || [];
    for (const g of c._clockStageGates) {
      const clock = clocks.find(ck => ck.id === g.clockId);
      if (!clock || clock.currentStage !== g.stage) return false;
    }
  }
  return true;
}
const _DEFAULT_RING_SIZE = 8;

function _effectiveCooldown(card) {
  const scale = CFG.COOLDOWN_SCALE || 1.0;
  if (scale === 1.0) return card.cooldown;
  return Math.max(1, Math.round(card.cooldown * scale));
}

function _ringEffectiveSize(poolSize) {
  // Dynamic ring: never block more cards than exist in the pool - 1.
  // This prevents the ring from silencing a small scenario entirely.
  const cfg = CFG.RING_SIZE !== undefined ? CFG.RING_SIZE : _DEFAULT_RING_SIZE;
  if (cfg === 0) return 0;
  return Math.min(cfg, Math.max(0, poolSize - 1));
}

function findValidCards(tier, regionCode) {
  _teraEnsureRegistry();
  const meta  = state.tera.cardMeta;
  const turn  = state.tera.turn;
  const recentCards = state.tera.recentCards;
  const result = [];
  const xwEnabled = CFG.XW_EVENTS_IN_REGION;

  for (const id in CARD_REGISTRY) {
    const c = CARD_REGISTRY[id];
    if (c.tier === "character") continue;
    if (c.companionTier) continue;
    // Region filter: accept exact region match OR cross-world when enabled
    if (c.tier !== tier) continue;
    if (c.region !== regionCode && !(xwEnabled && c.region === "xw")) continue;
    // Ring: check after we know pool size isn't zero (dynamic sizing applied below)
    const lastFired = meta[id];
    if (lastFired != null && (turn - lastFired) < _effectiveCooldown(c)) continue;
    if (c.deps && c.deps !== "none") {
      if (!c.deps.split(",").every(dep => meta[dep.trim()] != null)) continue;
    }
    if (!_passesGates(c)) continue;
    result.push(c);
  }

  // Dynamic ring: remove ring-blocked cards only after we know the full eligible pool
  if (result.length > 0) {
    const effRingSize = _ringEffectiveSize(result.length);
    if (effRingSize > 0) {
      const ringSet = new Set(recentCards.slice(-effRingSize));
      return result.filter(c => !ringSet.has(c.id));
    }
  }
  return result;
}

// v17: Tier cascade — when the selected tier has no valid cards, try
// adjacent tiers and xw cards before silently skipping the turn.
function findValidCardsWithCascade(tier, regionCode) {
  // First attempt: exact tier
  let cards = findValidCards(tier, regionCode);
  if (cards.length || !CFG.TIER_CASCADE_ENABLED) return cards;

  // Second attempt: adjacent tiers (minor → moderate, major → moderate, etc.)
  const TIERS = ["minor", "moderate", "major"];
  const tierIdx = TIERS.indexOf(tier);
  const fallbackOrder = tierIdx === 0 ? ["moderate","major"]
                      : tierIdx === 2 ? ["moderate","minor"]
                      : ["minor","major"]; // moderate falls back to both

  for (const fallbackTier of fallbackOrder) {
    cards = findValidCards(fallbackTier, regionCode);
    if (cards.length) return cards;
  }

  return []; // pool exhausted — nothing to fire this turn
}

function findCharacterCards(regionScoped) {
  _teraEnsureRegistry();
  const regionCode = state.tera.region;
  const result = [];
  for (const id in CARD_REGISTRY) {
    const c = CARD_REGISTRY[id];
    if (c.tier !== "character") continue;
    // v13: Party members always included regardless of region
    if (_isInParty(id)) {
      if (_passesGates(c)) result.push(c);
      continue;
    }
    // v13: Use effective region (detached location) for non-party NPCs
    if (regionScoped) {
      const effectiveRegion = _getEffectiveRegion(id, c);
      if (effectiveRegion !== regionCode && effectiveRegion !== "xw" && c.region !== "xw") continue;
    }
    if (!_passesGates(c)) continue;
    result.push(c);
  }
  return result;
}

// ─── Card scoring (v10: all subsystems wired in) ───────────────────
function _scoreCard(c) {
  if (c.pin) return 99;
  let score = c.priority || 5;
  const t = state.tera;
  const lastFired = t.cardMeta[c.id];
  if (lastFired != null) {
    const age = t.turn - lastFired;
    if      (age <= 5)  score += 3;
    else if (age <= 10) score += 2;
    else if (age <= 20) score += 1;
  }
  if (c.region === t.region) score += 2;
  if (c.id.startsWith("LOC-") && t.currentLocation === c.id) score += 4;
  if (c.id.startsWith("ART-") || c.id.startsWith("ITM-") || c.id.startsWith("SOUL-")) {
    const inv = t.inventory.find(e => e.id === c.id);
    if (inv) {
      score += 4;
      if (t.turn - inv.acquiredTurn <= 10) score += 1;
    }
  }
  // v16: use pre-split _tagList; split regionTags once
  if (c._tagList && c._tagList.length) {
    const regionTagStr = t.tags[t.region] || "";
    const regionTagSet = new Set(regionTagStr.split(","));
    let overlap = 0;
    for (let i = 0; i < c._tagList.length; i++) {
      if (c._tagList[i] && regionTagSet.has(c._tagList[i])) overlap++;
    }
    score += Math.min(overlap, 2);
  }
  if (c.id.startsWith("CHR-")) {
    const rep = getRelationship(c.id.slice(4).toLowerCase());
    if (rep >= 50) score += 2;
    else if (rep >= 20) score += 1;
  }
  score += _resonanceScore(c);
  score += _fateArcBoost(c);
  score += _fingerprintBoost(c);
  score += _isBridgeScore(c);
  score += _playerArcScore(c);  // v18: player behavioral arc boost
  if (CFG.THREAD_ENABLED && t._thread && c.threadMatch && c.threadMatch === t._thread.tag) {
    score += CFG.THREAD_SCORE_BOOST;
  }
  if (CFG.PARTY_ENABLED && _isInParty(c.id)) score += CFG.PARTY_SCORE_BOOST;
  if (CFG.SCENE_DETECT_ENABLED && c.id.startsWith("CHR-")) {
    if ((t._sceneNpcs || []).includes(c.id)) score += CFG.SCENE_ACTIVE_NPC_BOOST;
    if (t._sceneType === "conversation") score += 2;
  }
  if (CFG.SCENE_DETECT_ENABLED && c.id.startsWith("LOC-") && t._sceneType) {
    if (t._sceneType === "combat")       score += 1;
    if (t._sceneType === "exploration")  score += 2;
  }
  if (CFG.SCENE_DETECT_ENABLED && t._sceneType === "political" && c._tagList) {
    if (c._tagList.includes("faction")) score += 2;
  }
  return score;
}

function pickWeightedCard(cards) {
  if (!cards.length) return null;
  const tera = state.tera;
  const wm   = tera.weightMods || {};
  const th   = tera._thread;
  const ib   = tera._intentBoosts || {};
  const curTurn = tera.turn;
  let total = 0;
  const weights = new Array(cards.length);
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    let w = c.weight + (wm[c.id] || 0);
    // Tag weight: use pre-split _tagList and split regionTags once per card
    if (c._tagList && c._tagList.length) {
      const rt = tera.tags[c.region] || "";
      if (rt) {
        const rtSet = new Set(rt.split(","));
        for (let j = 0; j < c._tagList.length; j++) {
          if (rtSet.has(c._tagList[j])) w++;
        }
      }
    }
    w += Math.floor(getActivity(c.region) / 20);
    if (CFG.THREAD_ENABLED && th && c.threadMatch && c.threadMatch === th.tag) {
      w += CFG.THREAD_WEIGHT_BOOST;
    }
    // v18: player arc weight boost
    if (CFG.PLAYER_ARC_ENABLED && c.cardArc) w += _playerArcScore(c);
    // Intent boost via _tagList
    if (CFG.INTENT_DETECT_ENABLED && c._tagList && c._tagList.length) {
      for (let j = 0; j < c._tagList.length; j++) {
        const entry = ib[c._tagList[j]];
        if (entry && curTurn <= entry.expiresAt) { w += (entry.boost || 0); break; }
      }
    }
    const eff = Math.max(1, w);
    weights[i] = eff;
    total += eff;
  }
  let r = Math.random() * total;
  for (let i = 0; i < cards.length; i++) {
    r -= weights[i];
    if (r <= 0) return cards[i];
  }
  return cards[cards.length - 1];
}

function selectTier(regionCode) {
  const a = getActivity(regionCode);
  // v14: world pressure also shifts tier toward heavier events
  const pressure = (state.tera._worldPressure || {})[regionCode] || 0;
  let mn = 0.70, md = 0.25, mj = 0.05;
  if (a > 40)  { mn -= 0.20; md += 0.15; mj += 0.05; }
  if (a > 100) { mn -= 0.20; md += 0.10; mj += 0.10; }
  if (a > 160) { mn -= 0.15; md += 0.05; mj += 0.10; }
  // v14: pressure shifts toward heavier tiers when region has been neglected
  if (CFG.WORLD_PRESSURE_ENABLED && pressure >= CFG.WORLD_PRESSURE_THRESHOLD) {
    const pLevel = Math.min((pressure - CFG.WORLD_PRESSURE_THRESHOLD) / CFG.WORLD_PRESSURE_MAX, 1.0);
    mn -= 0.15 * pLevel;
    md += 0.08 * pLevel;
    mj += 0.07 * pLevel;
  }
  mn = Math.max(0, mn); md = Math.max(0, md); mj = Math.max(0, mj);
  const total = mn + md + mj;
  const r = Math.random() * total;
  if (r < mn) return "minor";
  if (r < mn + md) return "moderate";
  return "major";
}

// ─── Apply FX effects ──────────────────────────────────────────────
function applyEffects(card) {
  if (!card.effectsText) return;
  const t = state.tera;
  for (let line of card.effectsText.split("\n")) {
    line = line.trim();
    if (!line || line.startsWith("//")) continue;
    const parts = line.split(":");
    const cmd = parts[0].trim().toLowerCase();
    const arg = parts.slice(1).join(":").trim();
    if (cmd === "addactivity") {
      const m = arg.match(/(\w+)\s*\+\s*(\d+)/);
      if (m) addActivity(m[1], parseInt(m[2]));
    } else if (cmd === "artifactpressure") {
      t.artifactPressure += parseInt(arg) || 0;
    } else if (cmd === "unlocktag") {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        const code = toCode(arg.slice(0, eq).trim());
        arg.slice(eq + 1).split(",").map(tg => tg.trim()).filter(Boolean).forEach(tg => {
          addTag(code, tg);
          if (tg.startsWith("met_")) _autoAnchorMet(tg);
          if (tg.startsWith("ability_") && !tg.endsWith("_dormant") && !tg.endsWith("_mid") && !tg.endsWith("_late")) _autoAnchorAbility(tg);
        });
      }
    } else if (cmd === "unlocklocation") {
      const p = arg.split("|");
      const name = p[0]?.trim();
      const rcode = toCode(p[1]?.trim() || t.region);
      if (name && !t.locations.some(l => l.n === name))
        t.locations.push({ n: name, r: rcode, d: t.turn });
    } else if (cmd === "factionrep") {
      const lastSpace = arg.lastIndexOf(" ");
      if (lastSpace !== -1) {
        const fname = arg.slice(0, lastSpace).trim();
        const amount = parseInt(arg.slice(lastSpace + 1));
        if (fname && !isNaN(amount)) adjustFactionRep(fname, amount);
      }
    } else if (cmd === "tragedycooldown") {
      const delta = parseInt(arg) || 175;
      t.tragedyCooldown[t.region] = getActivity(t.region) + delta;
    } else if (cmd === "advancecalendar") {
      advanceCalendar(parseInt(arg) || 1);
    } else if (cmd === "advancetod") {
      advanceTod();
    } else if (cmd === "settod") {
      setTod(arg.trim());
    } else if (cmd === "setorigin") {
      t.origin = arg.trim() || null;
    } else if (cmd === "unlockcontinent") {
      const cont = arg.trim();
      if (cont && t.continents[cont] !== undefined) t.continents[cont] = true;
    } else if (cmd === "setlocation") {
      t.currentLocation = arg.trim() || null;
    } else if (cmd === "leavelocation") {
      t.currentLocation = null;
    } else if (cmd === "giveitem") {
      const iid = arg.trim();
      if (iid && !t.inventory.some(e => e.id === iid)) {
        t.inventory.push({ id: iid, acquiredTurn: t.turn });
        _autoAnchorItem(iid);
      }
    } else if (cmd === "takeitem") {
      const iid = arg.trim();
      if (iid) {
        t.inventory = t.inventory.filter(e => e.id !== iid);
        const ancId = `item_${iid.toLowerCase().replace(/[^a-z0-9]/g,"_")}`;
        t.anchors = (t.anchors || []).filter(a => a.id !== ancId);
      }
    } else if (cmd === "createitem") {
      const fp = arg.indexOf("|");
      const sp = fp !== -1 ? arg.indexOf("|", fp + 1) : -1;
      if (fp !== -1 && sp !== -1) {
        const cid = arg.slice(0, fp).trim();
        const creg = arg.slice(fp + 1, sp).trim() || "xw";
        const cnar = arg.slice(sp + 1).trim();
        if (cid && cnar) {
          const key = `TERA|${cid}|character|${creg}|w:0|c:0|none`;
          addStoryCard(cid, cnar, "text", key, "");
          _teraEnsureRegistry();
          if (!t.inventory.some(e => e.id === cid)) {
            t.inventory.push({ id: cid, acquiredTurn: t.turn });
            _autoAnchorItem(cid);
          }
        }
      }
    } else if (cmd === "addanchor") {
      const p = arg.split("|");
      if (p.length >= 3) {
        const aid = p[0].trim();
        const pri = Math.max(0, Math.min(9, parseInt(p[1])));
        const atx = p.slice(2).join("|").trim();
        if (aid && atx) teraAddAnchor(aid, atx, pri, null);
      }
    } else if (cmd === "removeanchor") {
      teraRemoveAnchor(arg.trim());
    } else if (cmd === "expireanchor") {
      const p = arg.split("|");
      if (p.length >= 2) teraExpireAnchor(p[0].trim(), parseInt(p[1]));
    } else if (cmd === "setcontrol") {
      const eq = arg.indexOf("=");
      if (eq !== -1) t.regionControl[arg.slice(0, eq).trim()] = arg.slice(eq + 1).trim();
    } else if (cmd === "addrelationship") {
      const lastSpace = arg.lastIndexOf(" ");
      if (lastSpace !== -1) {
        const npcId = arg.slice(0, lastSpace).trim();
        const amount = parseInt(arg.slice(lastSpace + 1));
        if (npcId && !isNaN(amount)) adjustRelationship(npcId, amount);
      }
    } else if (cmd === "setflag") {
      const eq = arg.indexOf("=");
      if (eq !== -1) teraSetFlag(arg.slice(0, eq).trim(), arg.slice(eq + 1).trim());
      else teraSetFlag(arg.trim(), true);
    } else if (cmd === "clearflag") {
      teraSetFlag(arg.trim(), false);
    } else if (cmd === "addweight") {
      const eq = arg.indexOf("=");
      if (eq !== -1) teraAddWeightMod(arg.slice(0, eq).trim(), parseInt(arg.slice(eq + 1)) || 0);
    // v12: thread FX
    } else if (cmd === "openthread") {
      if (CFG.THREAD_ENABLED) {
        const p = arg.split("|");
        const tag = p[0].trim();
        const dur = parseInt(p[1]) || CFG.THREAD_DEFAULT_DURATION;
        if (tag) t._thread = { tag, turnsLeft: dur, openedTurn: t.turn, openedBy: "fx" };
      }
    } else if (cmd === "closethread") {
      t._thread = null;
    // v12: faction rel FX
    } else if (cmd === "adjustfactionrel") {
      if (CFG.FACTION_REL_ENABLED) {
        const pts = arg.trim().split(/\s+/);
        if (pts.length >= 3) {
          const amount = parseInt(pts[2]);
          if (!isNaN(amount)) adjustFactionRel(pts[0], pts[1], amount);
        }
      }
    } else if (cmd === "addclock") {
      // v18 syntax: addClock:id|label|turns|optional-cardId|optional-stages
      // stages example: 8=warning,4=critical
      const p = arg.split("|");
      if (p.length >= 3) teraAddClock(p[0].trim(), p[1].trim(), parseInt(p[2]), p[3]?.trim(), p[4]?.trim());
    } else if (cmd === "removeclock") {
      teraRemoveClock(arg.trim());
    } else if (cmd === "adjuststress") {
      const m = arg.match(/^(\w+)\s*([+-])\s*(\d+)$/);
      if (m) {
        const s = _ensureNpc(m[1].toLowerCase());
        const delta = parseInt(m[2] + m[3]);
        s.stress = Math.max(0, Math.min(100, (s.stress || 50) + delta));
      }
    } else if (cmd === "setstress") {
      const m = arg.match(/^(\w+)\s*[|]\s*(\d+)$/);
      if (m) {
        const s = _ensureNpc(m[1].toLowerCase());
        s.stress = Math.max(0, Math.min(100, parseInt(m[2])));
        s._sActSnap = t._activity || 0;
      }
    } else if (cmd === "adjusttrust") {
      const m = arg.match(/^(\w+)\s*([+-])\s*(\d+)$/);
      if (m) {
        const s = _ensureNpc(m[1].toLowerCase());
        const delta = parseInt(m[2] + m[3]);
        s.trust = Math.max(0, Math.min(100, (s.trust || 50) + delta));
      }
    } else if (cmd === "settrust") {
      const m = arg.match(/^(\w+)\s*[|]\s*(\d+)$/);
      if (m) {
        const s = _ensureNpc(m[1].toLowerCase());
        s.trust = Math.max(0, Math.min(100, parseInt(m[2])));
      }
    } else if (cmd === "setmood") {
      const pts = arg.split("|").map(p => p.trim());
      if (pts.length >= 2) {
        const s = _ensureNpc(pts[0].toLowerCase());
        s.mood = pts[1];
        s.intensity = Math.max(0, Math.min(3, parseInt(pts[2]) || 1));
        s._mActSnap = t._activity || 0;
        s.source = "fx";
      }
    // v13: Party FX
    } else if (cmd === "joinparty") {
      if (CFG.PARTY_ENABLED) teraJoinParty(arg.trim());
    } else if (cmd === "leaveparty") {
      if (CFG.PARTY_ENABLED) teraLeaveParty(arg.trim());
    // v13: NPC relocation FX
    } else if (cmd === "relocatenpc") {
      if (CFG.NPC_DETACH_ENABLED) {
        const p = arg.split("|").map(s => s.trim());
        if (p.length >= 2) {
          const npcId = p[0];
          const newReg = toCode(p[1]);
          if (!t.npcHomeRegion[npcId]) {
            const card = CARD_REGISTRY[npcId];
            if (card) t.npcHomeRegion[npcId] = card.region;
          }
          t.npcLocation[npcId] = newReg;
        }
      }
    // v13: Set region FX (triggers full travel automation)
    } else if (cmd === "setregion") {
      const newReg = toCode(arg.trim());
      if (REGION_EXPAND[newReg]) _handleRegionChange(newReg, "fx");
    // v14: NPC-NPC relationship FX
    } else if (cmd === "adjustnpcrel") {
      if (CFG.NPC_NPC_REL_ENABLED) {
        const pts = arg.trim().split(/\s+/);
        if (pts.length >= 3) {
          const amount = parseInt(pts[2]);
          if (!isNaN(amount)) adjustNpcRel(pts[0], pts[1], amount);
        }
      }
    // v14: Manually set NPC goal via FX
    } else if (cmd === "setnpcgoal") {
      // setnpcgoal: npcName | goal_label | optional_keywords
      const gp = arg.split("|").map(s => s.trim());
      if (gp.length >= 2) {
        const npcName = gp[0].toLowerCase();
        const goalLabel = gp[1];
        const s = _ensureNpc(npcName);
        s.goal = goalLabel;
        s.goalProgress = 0;
        if (gp[2]) {
          s.goalKeywords = gp[2].split(",").map(k => k.trim().toLowerCase()).filter(Boolean);
        } else {
          s.goalKeywords = goalLabel.replace(/_/g, " ").split(/[\s_]+/).filter(k => k.length > 2);
        }
      }
    // v14: Advance goal progress manually
    } else if (cmd === "setnpcgoalprogress") {
      const gpa = arg.match(/^(\w+)\s*\|\s*(\d+)$/);
      if (gpa) {
        const s = _ensureNpc(gpa[1].toLowerCase());
        s.goalProgress = Math.max(0, parseInt(gpa[2]) || 0);
      }
    }
  }
}

// ─── triggerCard ───────────────────────────────────────────────────
function triggerCard(card) {
  state.tera.cardMeta[card.id] = state.tera.turn;
  state.tera.lastCardId = card.id;
  // v17: ring push — respect CFG.RING_SIZE (was hardcoded 8)
  const maxRing = CFG.RING_SIZE !== undefined ? CFG.RING_SIZE : _DEFAULT_RING_SIZE;
  state.tera.recentCards.push(card.id);
  if (maxRing > 0 && state.tera.recentCards.length > maxRing) state.tera.recentCards.shift();
  applyEffects(card);
  _fateArcUpdate(card);     // v10: update arc from card tags
  _oraclePlant(card);       // v10: plant prophecy if card has one
  _oracleFulfill(card);     // v10: fulfill pending prophecies
  // v12: thread management
  if (CFG.THREAD_ENABLED) {
    if (card.thread) {
      const dur = (card.threadDuration > 0 ? card.threadDuration : null) || CFG.THREAD_DEFAULT_DURATION;
      state.tera._thread = { tag: card.thread, turnsLeft: dur, openedTurn: state.tera.turn, openedBy: card.id };
    }
    if (card.threadBreak && state.tera._thread) {
      state.tera._thread = null;
    }
  }
  if (card.tags?.includes("tragedy")) {
    const rcode = state.tera.region;
    if (!state.tera.tragedyCooldown[rcode]) {
      state.tera.tragedyCooldown[rcode] = getActivity(rcode) + 175;
    }
  }
  // v14: consequence graph — apply weight boosts declared on this card
  _applyConsequenceBoosts(card);
  return card.narrative;
}

// ==================================================================
// v14 LAYER 4: World Simulation
// ==================================================================

// ─── Consequence Graph ─────────────────────────────────────────────
// fires_boost: EVT-BorderWar+4, EVT-Refugees+3
// When a card fires, its fires_boost list applies weight mods to
// other cards — allowing scenario creators to declare causal chains
// between events once at authoring time.
function _applyConsequenceBoosts(card) {
  if (!CFG.CONSEQUENCE_GRAPH_ENABLED || !card.firesBoost) return;
  for (const entry of card.firesBoost.split(",")) {
    const m = entry.trim().match(/^([A-Za-z0-9_\-]+)([+-]\d+)$/);
    if (m) teraAddWeightMod(m[1], parseInt(m[2]));
  }
}

// ─── World Pressure ────────────────────────────────────────────────
// Each turn, pressure accumulates on regions the player isn't in.
// When pressure exceeds WORLD_PRESSURE_THRESHOLD, selectTier shifts
// toward heavier events the next time that region is visited.
// Pressure resets to 0 when the player arrives in a region.
function _worldPressureCheck() {
  if (!CFG.WORLD_PRESSURE_ENABLED) return;
  const t = state.tera;
  if (!t._worldPressure) t._worldPressure = {};
  for (const code of Object.keys(REGION_EXPAND)) {
    if (code === t.region) {
      // Arriving/staying — bleed off pressure quickly
      if (t._worldPressure[code] > 0) {
        t._worldPressure[code] = Math.max(0, t._worldPressure[code] - 3);
      }
    } else {
      // Away — pressure builds slowly
      const cur = t._worldPressure[code] || 0;
      t._worldPressure[code] = Math.min(CFG.WORLD_PRESSURE_MAX, cur + 1);
    }
  }
}

// ─── Tone Valve ────────────────────────────────────────────────────
// If one fate arc dominates for TONE_VALVE_TURNS turns with no
// counter-arc relief, boost opposing-tone card weights so the
// narrative pendulum swings back. Applies once per valve opening.
function _toneValveCheck() {
  if (!CFG.TONE_VALVE_ENABLED) return;
  const t = state.tera;
  const fa = t._fateArc;
  if (!fa) return;
  const interval = CFG.TONE_VALVE_TURNS || 15;
  if (t.turn - (t._toneValveLastBoostTurn || 0) < interval) return;
  const COUNTER = {
    tragedy: ["triumph", "comedy"],
    triumph: ["mystery", "tragedy"],
    mystery: ["triumph", "comedy"],
    comedy:  ["tragedy", "mystery"]
  };
  const entries = Object.entries(fa).sort(([,a],[,b]) => b - a);
  if (!entries.length) return;
  const [domArc, domScore] = entries[0];
  if (domScore < 8) return;  // not strong enough to trigger valve
  const counterArcs = COUNTER[domArc] || [];
  const counterScore = counterArcs.reduce((sum, arc) => sum + (fa[arc] || 0), 0);
  if (counterScore > domScore * 0.4) return; // already reasonably balanced
  let boosted = 0;
  for (const [id, card] of Object.entries(CARD_REGISTRY)) {
    if (card.tier === "character") continue;
    const cardTags = (card.tags || "").split(",").map(s => s.trim());
    let cardArc = null;
    for (const tag of cardTags) if (TIER_ARC_MAP[tag]) { cardArc = TIER_ARC_MAP[tag]; break; }
    if (cardArc && counterArcs.includes(cardArc)) {
      teraAddWeightMod(id, CFG.TONE_VALVE_BOOST || 3);
      boosted++;
    }
  }
  if (boosted > 0) t._toneValveLastBoostTurn = t.turn;
}

// ─── Faction AI ────────────────────────────────────────────────────
// Monitors faction rep thresholds. When a faction crosses the hostile
// or ally threshold for the first time, fires the best matching
// faction-tagged event card immediately as a parallel narrative beat.
function _factionAICheck() {
  if (!CFG.FACTION_AI_ENABLED) return null;
  const t = state.tera;
  if (!t._factionAIState) t._factionAIState = {};
  let firedNarrative = null;
  for (const [factId, repRaw] of Object.entries(t.factions)) {
    const rep = typeof repRaw === "number" ? repRaw : Number(repRaw) || 0;
    const fs = t._factionAIState[factId] || { hostile: false, ally: false };
    t._factionAIState[factId] = fs;
    const nowHostile = rep <= (CFG.FACTION_HOSTILE_THRESHOLD ?? -60);
    const nowAlly    = rep >= (CFG.FACTION_ALLY_THRESHOLD   ??  70);
    if (nowHostile && !fs.hostile) {
      fs.hostile = true;
      const narr = _fireFactionAIEvent(factId, "hostile");
      if (narr && !firedNarrative) firedNarrative = narr;
    } else if (!nowHostile) {
      fs.hostile = false;
    }
    if (nowAlly && !fs.ally) {
      fs.ally = true;
      const narr = _fireFactionAIEvent(factId, "ally");
      if (narr && !firedNarrative) firedNarrative = narr;
    } else if (!nowAlly) {
      fs.ally = false;
    }
  }
  return firedNarrative;
}

function _fireFactionAIEvent(factId, type) {
  const t = state.tera;
  const candidates = [];
  for (const [id, card] of Object.entries(CARD_REGISTRY)) {
    if (card.tier === "character") continue;
    if (!card.factions || card.factions === "none") continue;
    if (!card.factions.includes(factId)) continue;
    // Skip recently fired (respects cooldown)
    const lastFired = t.cardMeta[id];
    if (lastFired != null && (t.turn - lastFired) < (card.cooldown || 0)) continue;
    // Skip cards gated by other requirements we can't satisfy
    if (!_passesGates(card)) continue;
    candidates.push(card);
  }
  if (!candidates.length) return null;
  const chosen = candidates.sort((a, b) => (b.weight || 1) - (a.weight || 1))[0];
  if (!chosen) return null;
  _buildTrace(chosen);
  const narr = triggerCard(chosen);
  addActivity(t.region, chosen.tier === "major" ? 6 : chosen.tier === "moderate" ? 3 : 1);
  return narr;
}


// ==================================================================
// v14 LAYER 5: NPC Agency
// ==================================================================

// ─── NPC-NPC Relationship helpers ──────────────────────────────────
function _npcRelKey(idA, idB) {
  return [idA, idB].sort().join("__");
}
function getNpcRel(idA, idB) {
  return (state.tera._npcRels || {})[_npcRelKey(idA, idB)] ?? 0;
}
function adjustNpcRel(idA, idB, amount) {
  if (!CFG.NPC_NPC_REL_ENABLED) return;
  if (!state.tera._npcRels) state.tera._npcRels = {};
  const key = _npcRelKey(idA, idB);
  const cur = state.tera._npcRels[key] ?? 0;
  state.tera._npcRels[key] = Math.max(-100, Math.min(100, cur + (parseInt(amount) || 0)));
}
function getNpcRelStatus(rep) {
  return rep >= 70 ? "bonded" : rep >= 30 ? "friendly" : rep <= -70 ? "enemies" : rep <= -30 ? "rivals" : "neutral";
}

// ─── NPC-NPC Relationship decay (v16: activity-based) ─────────────
function _decayNpcRels() {
  if (!CFG.NPC_NPC_REL_ENABLED) return;
  const t = state.tera;
  const act = t._activity || 0;
  const interval = CFG.NPC_NPC_REL_DECAY_ACTIVITY || 24;
  if (act - (t._lastNpcRelDecayAct || 0) < interval) return;
  t._lastNpcRelDecayAct = act;
  const rels = t._npcRels || {};
  const rate = CFG.NPC_NPC_REL_DECAY_RATE || 1;
  for (const key in rels) {
    if (rels[key] > 0) { rels[key] -= rate; if (rels[key] <= 0) delete rels[key]; }
    else if (rels[key] < 0) { rels[key] += rate; if (rels[key] >= 0) delete rels[key]; }
  }
}

// ─── Seed NPC-NPC rels from card definitions ───────────────────────
// Called when an NPC card is first encountered to seed initial
// rivalry/alliance relationships declared in npc_rivals: / npc_allies:
function _seedNpcRels(card) {
  if (!CFG.NPC_NPC_REL_ENABLED) return;
  if (!card || card.tier !== "character") return;
  if (card.npcRivals) {
    for (const rival of card.npcRivals.split(",")) {
      const rivalId = rival.trim();
      if (!rivalId) continue;
      const key = _npcRelKey(card.id, rivalId);
      if (!(state.tera._npcRels || {})[key]) adjustNpcRel(card.id, rivalId, -35);
    }
  }
  if (card.npcAllies) {
    for (const ally of card.npcAllies.split(",")) {
      const allyId = ally.trim();
      if (!allyId) continue;
      const key = _npcRelKey(card.id, allyId);
      if (!(state.tera._npcRels || {})[key]) adjustNpcRel(card.id, allyId, 35);
    }
  }
}

// ─── NPC-NPC scene relationship drift ──────────────────────────────
// When 2+ NPCs appear together in a scene, their relationship drifts
// based on scene sentiment — conflict strains it, affection eases it.
function _npcNpcRelUpdate(sceneNpcs, text) {
  if (!CFG.NPC_NPC_REL_ENABLED || !text || sceneNpcs.length < 2) return;
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  let cS = 0, aS = 0;
  for (const w of words) {
    if (SENTIMENT_CONFLICT.indexOf(w) !== -1) cS++;
    if (SENTIMENT_AFFECTION.indexOf(w) !== -1) aS++;
  }
  if (cS + aS < 2) return;
  for (let i = 0; i < sceneNpcs.length; i++) {
    for (let j = i + 1; j < sceneNpcs.length; j++) {
      const idA = sceneNpcs[i];
      const idB = sceneNpcs[j];
      if (cS >= 2) adjustNpcRel(idA, idB, -Math.min(cS, 4));
      if (aS >= 2) adjustNpcRel(idA, idB,  Math.min(aS, 3));
    }
  }
}

// ─── NPC Goal tracking ─────────────────────────────────────────────
// goal:        reclaim_throne
// goal_keywords: throne,crown,palace,king,sovereign   (optional override)
// If goal_keywords is absent, keywords are auto-derived from the goal label.
// Each time goal keywords appear in AI output near an active NPC, their
// goalProgress increments. At NPC_GOAL_PROGRESS_THRESHOLD, a trust boost
// fires. Goal-blocking sentiment raises stress instead.
function _npcGoalCheck(text, detectedNpcs) {
  if (!CFG.NPC_GOAL_ENABLED || !text || !detectedNpcs.length) return;
  const t = state.tera;
  const lower = text.toLowerCase();
  const words = lower.match(/\b[a-z]+\b/g) || [];
  for (const cardId of detectedNpcs) {
    const card = CARD_REGISTRY[cardId];
    if (!card || !card.npcGoal) continue;
    const npcName = cardId.startsWith("CHR-") ? cardId.slice(4).toLowerCase() : cardId.toLowerCase();
    const s = _ensureNpc(npcName);
    // Initialise goal state on NPC if not present
    if (!s.goal) {
      s.goal = card.npcGoal;
      s.goalProgress = 0;
      // Build keyword list: explicit > auto-derived from goal label
      if (card.npcGoalKeywords) {
        s.goalKeywords = card.npcGoalKeywords.split(",").map(k => k.trim().toLowerCase()).filter(Boolean);
      } else {
        s.goalKeywords = card.npcGoal.replace(/_/g, " ").split(/[\s_]+/).filter(k => k.length > 2);
      }
    }
    const kws = s.goalKeywords || [];
    if (!kws.length) continue;
    // Count keyword hits in this turn's output
    const hits = kws.filter(kw => words.includes(kw)).length;
    if (hits >= 1) {
      s.goalProgress = (s.goalProgress || 0) + hits;
      // Threshold: trust boost when progress milestone reached
      if (s.goalProgress >= (CFG.NPC_GOAL_PROGRESS_THRESHOLD || 2)) {
        s.trust = Math.min(100, (s.trust || 50) + 3);
        s.stress = Math.max(0, (s.stress || 50) - 2);
        s.goalProgress = 0; // reset for next milestone
      }
    }
  }
}

// ─── NPC Stub Generation ───────────────────────────────────────────
// Tracks unrecognised proper-noun names across turns. After
// NPC_STUB_THRESHOLD appearances, auto-creates a minimal CHR card.
var NPC_STUB_IGNORE = new Set([
  "the","a","an","he","she","it","they","we","you","i","my","his","her",
  "their","our","your","that","this","there","here","when","then","now",
  "yes","no","not","but","and","or","if","so","as","at","by","for","in",
  "of","on","to","up","was","are","is","be","been","have","had","did",
  "do","get","got","has","let","may","can","was","were","will","would",
  "could","should","its","him","her","them","who","what","which","how"
]);

function _scanForNewNpcs(text) {
  if (!CFG.NPC_STUB_ENABLED || !text) return;
  if (typeof addStoryCard !== "function") return;
  const t = state.tera;
  if (!t._npcStubCandidates) t._npcStubCandidates = {};
  if (!t._npcStubCreated) t._npcStubCreated = {};
  // Rebuild name map reference
  const knownNames = new Set(Object.keys(_buildNpcNameMap() || {}));
  // Find capitalised words in original text (not at sentence starts)
  const matches = text.match(/(?<=[a-z,;:!?.]\s+)[A-Z][a-z]{2,14}\b/g) || [];
  const threshold = CFG.NPC_STUB_THRESHOLD || 3;
  for (const word of matches) {
    const lower = word.toLowerCase();
    if (knownNames.has(lower)) continue;
    if (NPC_STUB_IGNORE.has(lower)) continue;
    if (t._npcStubCreated[lower]) continue;
    const cand = t._npcStubCandidates[lower] || { count: 0, lastTurn: -99 };
    // Only count appearances close together (within 5 turns)
    if (t.turn - cand.lastTurn <= 5) {
      cand.count++;
    } else {
      cand.count = 1;
    }
    cand.lastTurn = t.turn;
    t._npcStubCandidates[lower] = cand;
    if (cand.count >= threshold) {
      const stubId = "CHR-" + word;
      const stubKey = "TERA|" + stubId + "|character|" + t.region + "|w:0|c:0|none";
      const stubEntry = word + " is a character encountered in the story. [Auto-stub: fill in details.]";
      addStoryCard("TERA | " + stubId + " (auto-stub)", stubEntry, "text", stubKey, "");
      t._npcStubCreated[lower] = true;
      _npcNameMap  = null; // invalidate name map so next scan picks up new NPC
      _npcScanRegex = null; // v16: also invalidate compiled regex union
    }
  }
}

// ─── Time-of-Day Auto-Advance ──────────────────────────────────────
// Detects time-of-day cues in AI output and updates calendar.tod
// automatically. Only advances forward (or holds) — never steps back
// more than one ToD slot per turn to avoid temporal whiplash.
const TOD_KEYWORDS = {
  dawn:  ["sunrise","first light","dawn","daybreak","morning light","awakened","awoke","woke at"],
  day:   ["midday","afternoon","noon","high sun","broad daylight","mid-morning","bright morning"],
  dusk:  ["sunset","dusk","twilight","early evening","sundown","last light","fading light"],
  night: ["nightfall","deep night","midnight","star-filled","moonlit","torchlight","lamplight",
          "candle-lit","after dark","darkness settled","night had fallen"],
};
const TOD_ORDER = ["dawn","day","dusk","night"];

function _detectTodFromText(text) {
  if (!CFG.TOD_AUTO_ENABLED || !text) return null;
  const lower = text.toLowerCase();
  const scores = {};
  for (const [tod, kws] of Object.entries(TOD_KEYWORDS)) {
    scores[tod] = 0;
    for (const kw of kws) if (lower.includes(kw)) scores[tod]++;
  }
  let best = null, bestScore = 0;
  for (const [tod, score] of Object.entries(scores)) {
    if (score > bestScore) { best = tod; bestScore = score; }
  }
  return (best && bestScore >= 1) ? best : null;
}

// ─── NPC-NPC Relationship display ──────────────────────────────────
function teraNpcRels() {
  const t = state.tera;
  const rels = t._npcRels || {};
  const lines = ["[NPC Relations — Turn " + t.turn + "]", ""];
  if (!Object.keys(rels).length) {
    lines.push("  No NPC-NPC relationships established yet.");
    lines.push("  Add npc_rivals: / npc_allies: to CHR cards to seed relationships.");
    lines.push("  Relationships drift automatically when NPCs share scenes.");
    return lines.join("\n");
  }
  const sorted = Object.entries(rels).sort(([,a],[,b]) => Math.abs(b) - Math.abs(a));
  for (const [key, rep] of sorted) {
    const [idA, idB] = key.split("__");
    const sign = rep >= 0 ? "+" : "";
    const barChar = rep >= 0 ? "█" : "▒";
    const barLen = Math.min(10, Math.round(Math.abs(rep) / 10));
    const bar = barChar.repeat(barLen) + "░".repeat(10 - barLen);
    const status = getNpcRelStatus(rep);
    lines.push(
      "  " + idA.padEnd(20) + " ↔  " + idB.padEnd(20) +
      "  " + sign + String(rep).padStart(4) + "  " + bar + "  [" + status + "]"
    );
  }
  return lines.join("\n");
}

// ─── World Pressure display ─────────────────────────────────────────
function teraWorldPressure() {
  const t = state.tera;
  const pressure = t._worldPressure || {};
  const lines = ["[World Pressure — Turn " + t.turn + "  Current: " + t.region + "]", ""];
  const maxP = CFG.WORLD_PRESSURE_MAX || 30;
  const threshold = CFG.WORLD_PRESSURE_THRESHOLD || 20;
  let any = false;
  for (const [code, p] of Object.entries(pressure).sort(([,a],[,b]) => b - a)) {
    if (p === 0) continue;
    any = true;
    const isCurrent = code === t.region;
    const marker = isCurrent ? "►" : " ";
    const barLen = Math.min(10, Math.round(p / maxP * 10));
    const bar = "█".repeat(barLen) + "░".repeat(10 - barLen);
    const warning = p >= threshold ? "  ⚠ THRESHOLD — events escalating" : "";
    const rName = (REGION_EXPAND[code] || code).replace(/_/g," ");
    lines.push(" " + marker + " " + code + "  " + String(p).padStart(3) + "/" + maxP + "  " + bar + "  " + rName + warning);
  }
  if (!any) lines.push("  No pressure accumulated yet. Travel away from regions to build it.");
  return lines.join("\n");
}

// ─── NPC Goal display ──────────────────────────────────────────────
function teraGoals() {
  const t = state.tera;
  const entries = Object.entries(t.moods || {}).filter(([,s]) => s.goal);
  if (!entries.length) return "[NPC Goals]  No NPC goals set. Add goal: to CHR card descriptions.";
  const lines = ["[NPC Goals — Turn " + t.turn + "]", ""];
  for (const [npcName, s] of entries) {
    const prog = s.goalProgress || 0;
    const threshold = CFG.NPC_GOAL_PROGRESS_THRESHOLD || 2;
    const bar = "█".repeat(Math.min(prog, threshold)) + "░".repeat(Math.max(0, threshold - prog));
    lines.push("  " + npcName + "  goal: " + s.goal);
    lines.push("    progress: [" + bar + "] " + prog + "/" + threshold + "  keywords: " + (s.goalKeywords || []).join(", "));
  }
  return lines.join("\n");
}

// ─── Region detection from text ────────────────────────────────────
const REGION_KEYWORDS = {
  vnr: ["northern road","southern road","ironclad","varenhold","caldern","ostenveil","threnwick","mirethon",
        "northern roads","freight route","waypost","imperial road","warden post","trade road","grey ledger office",
        "varic academy","senate hall","imperial palace","harborfront","fog quarter","caldern exchange","lower terrace"],
  vmf: ["sealed grove","circle of the veil","mirethon forest","fog quarter",
        "mystical forest","mystical forests","old-growth","sellen's camp","veil camp",
        "sellen drath","circle camp","forest shrine","old growth"],
  vel: ["eldranth","ashfeld plains","corso vane","ruins","basin",
        "counting chamber","ash guild camp","eldranth basin","unbound camp",
        "dalla","activation chamber","before-people installation","corso's expedition"],
  vis: ["ironspine","stormspire","dunholt","vethmark","cressfall",
        "relay station","mountain pass","ironspine mountains","mining valley",
        "architect's node","relay hum","ironspine relay"],
  vap: ["accord plains","anomaly","groundline","heart of the continent",
        "ash plain","battle site","groundshaper","accord",
        "wren","groundshaper colony","plains writing","battlefield"],
  syl: ["sylvenmoor","deepwood","elven court","delta port",
        "verdant basin","shimmer archipelago","mirewood","greyveil","canopy city",
        "high court","archive keepers","floating island","elven territory"],
  drv: ["dravoss","canyon","veth","the vanishing",
        "volcanic rim","scorched passes","verdant interior","canyon city",
        "dravosi","theocracy","warlord state","volcanic"],
  vrd: ["verdant expanse","the heart","groundshaper colony",
        "megafauna","expanse","mana-sensitive","continental assessment"],
  kth: ["keth'ara","keth ara","dwarven","sunken waste",
        "burning coast","red expanse","canyon network","merchant confederacy","southern highlands",
        "clan durnvast","delver's brotherhood","water guild","desert dragon"],
  aur: ["auren shelf","auric empire","compact of tides",
        "drowned isles","tidecaller","pirate sovereignty","outer chain",
        "tidal magic","navigator","coastal empire","sea route"],
  snk: ["sunken reach","the witness",
        "deep pulse","reached","bioluminescent","the depths",
        "interface layer","deep ocean","pressure dome"],
  hlw: ["the hollow","sealed canyon","mid-dark",
        "deepborn","threshold layer","exile communities","first dark",
        "subterranean","underground","cavern network","layer one","layer two"],
};
function detectRegion(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [code, kws] of Object.entries(REGION_KEYWORDS))
    if (kws.some(k => lower.includes(k))) return code;
  return null;
}

// ─── Location detection ────────────────────────────────────────────
const LOCATION_KEYWORDS = {
  "LOC-Varenhold": ["varenhold","varenhill","imperial palace","senate","varic academy","senate hall"],
  "LOC-Caldern":   ["caldern","harborfront","fog quarter","caldern exchange","lower terrace","caldern harbor"],
  "LOC-Ostenveil": ["ostenveil","ostenveil crossing"],
  "LOC-Threnwick": ["threnwick","threnwick gate"],
  "LOC-Dunholt":   ["dunholt","dunholt pass","dunholt mine"],
  "LOC-Stormspire": ["stormspire","storm spire"],
};
function detectLocation(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [locId, kws] of Object.entries(LOCATION_KEYWORDS)) {
    if (!kws.some(k => lower.includes(k))) continue;
    const card = CARD_REGISTRY[locId];
    if (card && card.region !== state.tera.region && card.region !== "xw") continue;
    return locId;
  }
  return null;
}

// ==================================================================
// v15 LAYER 6: Deep Automation
// ==================================================================

// ─── Memory Compression ────────────────────────────────────────────
// Compresses old fired-card history into compact anchor lines so the
// AI never loses context even across very long sessions.
// Triggers when: cardMeta entries > MEMORY_COMPRESS_THRESHOLD,
//                OR every MEMORY_COMPRESS_INTERVAL turns.
// Never compresses cards fired within MEMORY_COMPRESS_KEEP_RECENT turns,
// cards still in the recentCards ring, or companion-tier cards.
function _memoryCompress() {
  if (!CFG.MEMORY_COMPRESS_ENABLED) return;
  const t = state.tera;
  const metaCount = Object.keys(t.cardMeta || {}).length;
  const intervalDue = t.turn - (t._lastMemCompress || 0) >= (CFG.MEMORY_COMPRESS_INTERVAL || 30);
  const thresholdDue = metaCount >= (CFG.MEMORY_COMPRESS_THRESHOLD || 20);
  if (!intervalDue && !thresholdDue) return;

  const keepRecent = CFG.MEMORY_COMPRESS_KEEP_RECENT || 10;
  const recentSet = new Set(t.recentCards || []);
  const maxAnchors = CFG.MEMORY_COMPRESS_MAX_ANCHORS || 3;

  // Collect compressible entries (not recent, not character tier, not companion)
  const compressible = Object.entries(t.cardMeta || {})
    .filter(([id, turn]) => {
      if ((t.turn - turn) < keepRecent) return false;
      if (recentSet.has(id)) return false;
      const card = CARD_REGISTRY[id];
      if (!card) return false;
      if (card.tier === "character" || card.companionTier) return false;
      return true;
    })
    .sort(([, a], [, b]) => a - b); // oldest first

  if (compressible.length < 4) return; // not enough to bother compressing

  // Take oldest batch (up to 8 per compression pass)
  const batch = compressible.slice(0, 8);

  // Build compact summary line
  const summaryParts = batch.map(([id, turn]) => {
    const card = CARD_REGISTRY[id] || {};
    const tier = card.tier ? card.tier[0].toUpperCase() : "?"; // M/m/maj first letter
    const tierLabel = card.tier === "major" ? "maj" : card.tier === "moderate" ? "mod" : "min";
    const tagHint = card.tags ? card.tags.split(",")[0].trim().slice(0, 8) : "";
    return `t${turn}:${id}(${tierLabel}${tagHint ? "·" + tagHint : ""})`;
  });
  const summaryText = summaryParts.join(" | ");

  // Write to a rotating anchor slot
  const slot = (t._memCompressCount || 0) % maxAnchors;
  const anchorId = `_mem_compress_${slot}`;
  teraAddAnchor(anchorId, summaryText, 4, null);

  t._memCompressCount = (t._memCompressCount || 0) + 1;
  t._lastMemCompress = t.turn;
}

// ─── Memory display ────────────────────────────────────────────────
function teraMemoryLog() {
  const t = state.tera;
  const maxAnchors = CFG.MEMORY_COMPRESS_MAX_ANCHORS || 3;
  const slots = [];
  for (let i = 0; i < maxAnchors; i++) {
    const a = (t.anchors || []).find(x => x.id === `_mem_compress_${i}`);
    if (a) slots.push({ slot: i, text: a.text, turn: a.turn });
  }
  if (!slots.length) {
    return "[Memory Log]  No compressed history yet.\n" +
           `  Fires until compression: ${Math.max(0, (CFG.MEMORY_COMPRESS_THRESHOLD || 20) - Object.keys(t.cardMeta || {}).length)} more cards, ` +
           `or ${Math.max(0, (CFG.MEMORY_COMPRESS_INTERVAL || 30) - (t.turn - (t._lastMemCompress || 0)))} more turns.`;
  }
  const lines = ["[Memory Log — " + slots.length + " compressed anchor(s)]", ""];
  for (const s of slots) {
    lines.push(`  Slot ${s.slot}  (compressed t${s.turn})`);
    const parts = s.text.split(" | ");
    parts.forEach(p => lines.push("    " + p));
    lines.push("");
  }
  lines.push(`  Total compressions: ${t._memCompressCount || 0}`);
  return lines.join("\n");
}

// ─── Intent Apply ──────────────────────────────────────────────────
// Expires stale intent boosts each turn. Intent boosts are WRITTEN
// by the Input tab's _intentDetect() and READ here + in pickWeightedCard.
function _intentApply() {
  if (!CFG.INTENT_DETECT_ENABLED) return;
  const t = state.tera;
  if (!t._intentBoosts) return;
  // Expire boosts whose duration has passed
  for (const tag of Object.keys(t._intentBoosts)) {
    if (t.turn > t._intentBoosts[tag].expiresAt) delete t._intentBoosts[tag];
  }
}

// ─── Intent display ────────────────────────────────────────────────
function teraIntent() {
  const t = state.tera;
  const ib = t._intentBoosts || {};
  const active = Object.entries(ib).filter(([, e]) => t.turn <= e.expiresAt);
  if (!active.length) return "[Intent]  No active intent boosts. Play a turn to detect intent from your input.";
  const lines = ["[Intent Boosts — Turn " + t.turn + "]", ""];
  for (const [tag, entry] of active) {
    const rem = entry.expiresAt - t.turn;
    lines.push(`  ${tag.padEnd(16)}  +${entry.boost} weight  (expires in ${rem} turn${rem !== 1 ? "s" : ""})`);
    // Show which cards are currently boosted by this intent
    const boosted = Object.values(CARD_REGISTRY).filter(c =>
      c.tier !== "character" && c.tags && c.tags.split(",").map(tg => tg.trim()).includes(tag)
    ).map(c => c.id);
    if (boosted.length) lines.push(`    → boosts: ${boosted.slice(0, 5).join(", ")}${boosted.length > 5 ? " (+" + (boosted.length - 5) + " more)" : ""}`);
  }
  return lines.join("\n");
}

// ─── Location Stub Generation ──────────────────────────────────────
// Detects recurring named locations in AI output that don't correspond
// to any existing LOC card. After LOC_STUB_THRESHOLD appearances,
// creates a minimal stub LOC card for the scenario creator to fill in.
const LOC_STUB_PREPOSITIONS = [
  "at the ", "in the ", "inside the ", "outside the ", "near the ",
  "beyond the ", "through the ", "beneath the ", "above the ",
  "toward the ", "towards the ", "across the ", "within the ",
  "entered the ", "left the ", "reached the ", "arrived at the ",
  "found the ", "returned to the "
];
const LOC_STUB_IGNORE = new Set([
  "road","path","trail","forest","woods","mountain","hills","river","lake",
  "sea","ocean","sky","dark","light","air","ground","wall","gate","door",
  "inn","tavern","camp","ruins","cave","tower","castle","city","town",
  "village","harbor","port","bridge","valley","plain","coast","shore",
  "party","group","way","place","area","region","world","land","realm",
  "throne","crown","guard","court","market","street","square","hall"
]);

function _normalizeLocName(phrase) {
  return phrase.replace(/\s+/g, "").replace(/[^A-Za-z]/g, "");
}

function _scanForNewLocations(text) {
  if (!CFG.LOC_STUB_ENABLED || !text) return;
  if (typeof addStoryCard !== "function") return;
  const t = state.tera;
  if (!t._locStubCandidates) t._locStubCandidates = {};
  if (!t._locStubCreated) t._locStubCreated = {};

  // Build set of already-known location names (from LOCATION_KEYWORDS and registry)
  const knownLoc = new Set();
  for (const kws of Object.values(LOCATION_KEYWORDS || {})) {
    for (const kw of kws) knownLoc.add(kw.toLowerCase());
  }
  for (const id of Object.keys(CARD_REGISTRY)) {
    if (id.startsWith("LOC-")) knownLoc.add(id.slice(4).toLowerCase());
  }

  const threshold = CFG.LOC_STUB_THRESHOLD || 3;
  const lower = text.toLowerCase();

  for (const prep of LOC_STUB_PREPOSITIONS) {
    let searchFrom = 0;
    while (true) {
      const idx = lower.indexOf(prep, searchFrom);
      if (idx === -1) break;
      searchFrom = idx + prep.length;

      // Extract following capitalised phrase (1-3 words, all Title Case)
      const rest = text.slice(idx + prep.length);
      const phraseMatch = rest.match(/^([A-Z][a-z]{2,15}(?:\s+[A-Z][a-z]{2,15}){0,2})/);
      if (!phraseMatch) continue;

      const phrase = phraseMatch[1];
      const normalized = _normalizeLocName(phrase);
      if (normalized.length < 4) continue;

      const lowerNorm = normalized.toLowerCase();
      if (LOC_STUB_IGNORE.has(lowerNorm)) continue;
      if (knownLoc.has(lowerNorm)) continue;
      if (t._locStubCreated[lowerNorm]) continue;

      const cand = t._locStubCandidates[lowerNorm] || { count: 0, lastTurn: -99, phrase };
      if (t.turn - cand.lastTurn <= 5) {
        cand.count++;
      } else {
        cand.count = 1;
        cand.phrase = phrase;
      }
      cand.lastTurn = t.turn;
      t._locStubCandidates[lowerNorm] = cand;

      if (cand.count >= threshold) {
        const stubId = "LOC-" + normalized;
        const stubKey = "TERA|" + stubId + "|character|" + t.region + "|w:0|c:0|none";
        const stubEntry = phrase + " — a location encountered in the story. [Auto-stub: fill in details.]";
        addStoryCard("TERA | " + stubId + " (auto-stub)", stubEntry, "text", stubKey, "");
        t._locStubCreated[lowerNorm] = true;
        _teraEnsureRegistry(); // rebuild so this LOC card is immediately available
      }
    }
  }
}

// ─── Auto-Bootstrap ────────────────────────────────────────────────
// Reads TERA|_SETUP|[scenario-id] card on turn 1 (once only).
// Executes a structured manifest that self-configures the world state
// so scenario creators need zero manual setup commands.
//
// Supported manifest directives (one per line):
//   region: vnr
//   faction: grey_ledger | 10
//   unlock_continent: valdris
//   anchor: id | priority | text here
//   flag: name = value
//   npc_mood: npcname | mood | intensity | stress | trust
//   npc_goal: npcname | goal_label | keyword1,keyword2
//   clock: id | turns | label
//   tag: regioncode | tagname
//   calendar: day | month | year | season | tod
//   weight: CARD-ID | delta
//   origin: value
//   npc_rel: CHR-A | CHR-B | value
//   faction_rel: factA | factB | value
function _runBootstrap() {
  if (!CFG.AUTO_BOOTSTRAP_ENABLED) return;
  const t = state.tera;
  if (t._setupDone) return;

  // Find setup card
  if (typeof storyCards === "undefined" || !Array.isArray(storyCards)) return;
  const setupCard = storyCards.find(c => {
    const k = typeof c.keys === "string" ? c.keys : "";
    return k.startsWith("TERA|_SETUP|");
  });

  // Mark done even if no card found — prevents re-running on every turn
  t._setupDone = true;
  if (!setupCard || !(setupCard.entry || setupCard.value)) return;

  const log = [];
  for (const rawLine of (setupCard.entry || setupCard.value || "").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const directive = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (directive === "region") {
      const code = toCode(value);
      if (REGION_EXPAND[code]) { t.region = code; log.push("region → " + code); }

    } else if (directive === "faction") {
      const parts = value.split("|").map(s => s.trim());
      if (parts.length >= 2) {
        const rep = parseInt(parts[1]);
        if (!isNaN(rep)) {
          registerFaction(parts[0], rep);
          t.factions[parts[0]] = rep;
          log.push("faction " + parts[0] + " → " + rep);
        }
      }

    } else if (directive === "unlock_continent") {
      const cont = value.trim();
      if (t.continents[cont] !== undefined) {
        t.continents[cont] = true;
        log.push("continent " + cont + " unlocked");
      }

    } else if (directive === "anchor") {
      const parts = value.split("|").map(s => s.trim());
      if (parts.length >= 3) {
        const pri = Math.max(0, Math.min(9, parseInt(parts[1]) || 5));
        const text = parts.slice(2).join("|").trim();
        if (parts[0] && text) { teraAddAnchor(parts[0], text, pri, null); log.push("anchor " + parts[0]); }
      }

    } else if (directive === "flag") {
      const eqIdx = value.indexOf("=");
      if (eqIdx !== -1) {
        const key = value.slice(0, eqIdx).trim();
        const val = value.slice(eqIdx + 1).trim();
        teraSetFlag(key, val);
        log.push("flag " + key + " = " + val);
      } else {
        teraSetFlag(value.trim(), true);
        log.push("flag " + value.trim());
      }

    } else if (directive === "npc_mood") {
      const parts = value.split("|").map(s => s.trim());
      if (parts.length >= 2) {
        const s = _ensureNpc(parts[0].toLowerCase());
        if (parts[1]) { s.mood = parts[1]; s.source = "bootstrap"; }
        if (parts[2] !== undefined) s.intensity = Math.max(0, Math.min(3, parseInt(parts[2]) || 0));
        if (parts[3] !== undefined) s.stress = Math.max(0, Math.min(100, parseInt(parts[3]) || 50));
        if (parts[4] !== undefined) s.trust = Math.max(0, Math.min(100, parseInt(parts[4]) || 50));
        log.push("npc_mood " + parts[0]);
      }

    } else if (directive === "npc_goal") {
      const parts = value.split("|").map(s => s.trim());
      if (parts.length >= 2) {
        const s = _ensureNpc(parts[0].toLowerCase());
        s.goal = parts[1];
        s.goalProgress = 0;
        s.goalKeywords = parts[2]
          ? parts[2].split(",").map(k => k.trim().toLowerCase()).filter(Boolean)
          : parts[1].replace(/_/g, " ").split(/[\s_]+/).filter(k => k.length > 2);
        log.push("npc_goal " + parts[0] + " → " + parts[1]);
      }

    } else if (directive === "clock") {
      const parts = value.split("|").map(s => s.trim());
      if (parts.length >= 2) {
        const turns = parseInt(parts[1]);
        if (!isNaN(turns)) {
          teraAddClock(parts[0], parts[2] || parts[0], turns, null);
          log.push("clock " + parts[0] + " (" + turns + " turns)");
        }
      }

    } else if (directive === "tag") {
      const parts = value.split("|").map(s => s.trim());
      if (parts.length >= 2) { addTag(parts[0], parts[1]); log.push("tag " + parts[0] + ":" + parts[1]); }

    } else if (directive === "calendar") {
      const parts = value.split("|").map(s => s.trim());
      const c = t.calendar;
      if (parts[0] !== undefined && !isNaN(parseInt(parts[0]))) c.day   = parseInt(parts[0]);
      if (parts[1] !== undefined && !isNaN(parseInt(parts[1]))) c.month = parseInt(parts[1]);
      if (parts[2] !== undefined && !isNaN(parseInt(parts[2]))) c.year  = parseInt(parts[2]);
      if (parts[3]) c.season = parts[3];
      if (parts[4] && TODS.includes(parts[4])) c.tod = parts[4];
      log.push("calendar set");

    } else if (directive === "weight") {
      const parts = value.split("|").map(s => s.trim());
      if (parts.length >= 2 && !isNaN(parseInt(parts[1]))) {
        teraAddWeightMod(parts[0], parseInt(parts[1]));
        log.push("weight " + parts[0] + " +" + parts[1]);
      }

    } else if (directive === "origin") {
      t.origin = value.trim() || null;
      log.push("origin → " + t.origin);

    } else if (directive === "npc_rel") {
      const parts = value.split("|").map(s => s.trim());
      if (parts.length >= 3 && !isNaN(parseInt(parts[2]))) {
        adjustNpcRel(parts[0], parts[1], parseInt(parts[2]));
        log.push("npc_rel " + parts[0] + " ↔ " + parts[1]);
      }

    } else if (directive === "faction_rel") {
      const parts = value.split("|").map(s => s.trim());
      if (parts.length >= 3 && !isNaN(parseInt(parts[2]))) {
        adjustFactionRel(parts[0], parts[1], parseInt(parts[2]));
        log.push("faction_rel " + parts[0] + " ↔ " + parts[1]);
      }
    }
  }

  // Store bootstrap log for diagnostics
  t._bootstrapLog = log;
}

// ─── Bootstrap display ────────────────────────────────────────────
function teraBootstrapStatus() {
  const t = state.tera;
  if (!t._setupDone) return "[Bootstrap]  Not yet run. Will execute on turn 1 from TERA|_SETUP|... card.";
  const log = t._bootstrapLog || [];
  if (!log.length) {
    return "[Bootstrap]  Ran on turn 1. No TERA|_SETUP|... card found, or card was empty.";
  }
  return "[Bootstrap]  Completed (" + log.length + " directive(s) applied)\n" +
    log.map(l => "  ✓  " + l).join("\n");
}

// ─── Main teraTurn (v15: Layer 6 deep automation) ──────────────────
function teraTurn(outputText) {
  _teraEnsureRegistry();
  const t = state.tera;
  t.turn++;
  // Turn-1 guard: skip event selection on the opening turn so the
  // AI has one clean response before TERA starts injecting narrative beats.
  if (t.turn === 1) {
    if (!t._setupDone) _runBootstrap();
    return null;
  }

  // v15 L6: Auto-Bootstrap — runs exactly once on turn 1
  if (!t._setupDone) _runBootstrap();

  // Tick all decay subsystems
  _decayMoods();
  _decayStress();
  _decayWeightMods();
  // v12: tick thread countdown
  if (CFG.THREAD_ENABLED && t._thread) {
    t._thread.turnsLeft--;
    if (t._thread.turnsLeft <= 0) t._thread = null;
  }
  // v12: faction rel decay
  _decayFactionRels();
  // v14: NPC-NPC rel decay
  _decayNpcRels();

  // Build fingerprint if ready
  _fingerprintBuild();

  // v13: NPC return-home check
  _npcReturnHomeCheck();

  // v14 L4: World pressure accumulate (before card selection)
  _worldPressureCheck();

  // v14 L4: Tone valve — boost counter-arc cards if arc is lopsided
  _toneValveCheck();

  // v16: Rebuild per-turn caches before card selection
  _isBridgeRebuild();
  // v18: decay player arc scores
  _playerArcDecay();

  // v15 L6: Memory compression — archive old event history into anchors
  _memoryCompress();

  // v15 L6: Intent apply — expire stale intent boosts (written by Input tab)
  _intentApply();

  // Tick clocks → returns notification strings
  const clockMessages = _tickClocks();

  // v13: Scene detection from AI output
  if (CFG.SCENE_DETECT_ENABLED && outputText) {
    t._sceneType = _detectSceneType(outputText);
  }

  // v13: Narrative NPC scan — auto-detect NPCs mentioned in AI output
  var detectedNpcs = _narrativeNpcScan(outputText);

  // v13: Sentiment analysis on party + detected NPCs
  if (CFG.SENTIMENT_ENABLED && outputText) {
    var activeNpcsSet = {};
    (t.party || []).forEach(function(id){ activeNpcsSet[id] = true; });
    detectedNpcs.forEach(function(id){ activeNpcsSet[id] = true; });
    var activeNpcs = Object.keys(activeNpcsSet);
    _sentimentAnalysis(outputText, activeNpcs);
  }

  // v14 L5: NPC-NPC relationship drift based on shared scene sentiment
  if (outputText) _npcNpcRelUpdate(detectedNpcs, outputText);

  // v14 L5: NPC goal progress tracking
  if (outputText) _npcGoalCheck(outputText, detectedNpcs);

  // v14 L5: Auto-stub generation for persistent unrecognised NPC names
  if (outputText) _scanForNewNpcs(outputText);

  // v15 L6: Location stub generation for persistent new place names
  if (outputText) _scanForNewLocations(outputText);

  // v14 L5: ToD auto-advance from scene language
  if (outputText) {
    var detectedTod = _detectTodFromText(outputText);
    if (detectedTod && detectedTod !== t.calendar.tod) setTod(detectedTod);
  }

  // Detect region / location from AI output
  const detected = detectRegion(outputText);
  if (detected && detected !== t.region) {
    _handleRegionChange(detected, "detect");
  }

  // v13: Also check for travel intent phrases
  if (!detected && CFG.TRAVEL_AUTO_ENABLED) {
    var travelDest = _detectTravelIntent(outputText);
    if (travelDest && travelDest !== t.region) {
      _handleRegionChange(travelDest, "travel_intent");
    }
  }

  const detectedLoc = detectLocation(outputText);
  if (detectedLoc === "~clear~") {
    t.currentLocation = null;
  } else if (detectedLoc) {
    t.currentLocation = detectedLoc;
  }

  // Tragedy cooldown check
  const tragedyTarget = t.tragedyCooldown[t.region];
  if (tragedyTarget !== undefined && getActivity(t.region) < tragedyTarget) {
    return clockMessages.length ? clockMessages.join("\n") : null;
  }
  if (tragedyTarget !== undefined && getActivity(t.region) >= tragedyTarget) {
    delete t.tragedyCooldown[t.region];
  }

  // Standard event card selection
  const tier = selectTier(t.region);
  const validCards = findValidCardsWithCascade(tier, t.region);
  var eventNarrative = null;

  if (validCards.length) {
    const chosen = pickWeightedCard(validCards);
    _buildTrace(chosen);
    _cardMetaPrune();
    eventNarrative = triggerCard(chosen);
    const actDelta = chosen.tier === "major" ? 6 : chosen.tier === "moderate" ? 3 : 1;
    addActivity(t.region, actDelta);
    _regionMemoryRecord(chosen);  // v18: record in region narrative memory
  }

  // v13: Companion event (parallel pool, separate roll)
  var companionNarrative = null;
  if (CFG.COMPANION_EVENT_ENABLED && (t.party||[]).length > 0 && Math.random() < (CFG.COMPANION_EVENT_CHANCE || 0.15)) {
    var companionCards = findCompanionCards();
    if (companionCards.length) {
      var compChosen = pickWeightedCard(companionCards);
      companionNarrative = triggerCard(compChosen);
    }
  }

  // v14 L4: Faction AI — fires if a faction just crossed a threshold this turn
  var factionAINarrative = _factionAICheck();

  // Compose output
  const parts = [];
  if (clockMessages.length) parts.push(clockMessages.join("\n"));
  if (eventNarrative) parts.push(eventNarrative);
  if (companionNarrative) parts.push(companionNarrative);
  if (factionAINarrative) parts.push(factionAINarrative);
  return parts.length ? parts.join("\n\n") : null;
}

// ─── teraContext (v14: party-aware + IS integration, v18: region memory) ──
function _regionMemoryRecord(card) {
  if (!CFG.REGION_MEMORY_ENABLED) return;
  const tier = card.tier;
  const minTier = CFG.REGION_MEMORY_MIN_TIER || "moderate";
  const TIERS = ["minor","moderate","major"];
  if (TIERS.indexOf(tier) < TIERS.indexOf(minTier)) return;
  const t = state.tera;
  const region = t.region;
  if (!t._regionMemory) t._regionMemory = {};
  if (!t._regionMemory[region]) t._regionMemory[region] = [];
  // Get a short label from narrative first line or card ID
  const label = (card.narrative || "").split("\n")[0].slice(0, 60).trim() || card.id;
  t._regionMemory[region].push({ cardId: card.id, tier, turn: t.turn, label });
  const depth = CFG.REGION_MEMORY_DEPTH || 3;
  if (t._regionMemory[region].length > depth) t._regionMemory[region].shift();
}

function _regionMemoryHint() {
  if (!CFG.REGION_MEMORY_ENABLED) return "";
  const t = state.tera;
  const mem = (t._regionMemory || {})[t.region];
  if (!mem || !mem.length) return "";
  const entries = mem.map(e => `t${e.turn} [${e.tier}] ${e.label}`).join(" · ");
  return `[Region memory — ${t.region}: ${entries}]`;
}

function teraContext(contextText, budgetChars, regionScoped) {
  _teraEnsureRegistry();
  const memLine = _buildAnchorLine();
  const allCards = findCharacterCards(regionScoped);
  allCards.sort((a, b) => _scoreCard(b) - _scoreCard(a));
  const pinned = allCards.filter(c => c.pin);
  const normal = allCards.filter(c => !c.pin);
  const maxCards = CFG.MAX_CONTEXT_CARDS || 12;
  const capped = [...pinned, ...normal.slice(0, Math.max(0, maxCards - pinned.length))];
  let injected = "";
  let spent = 0;
  for (const c of capped) {
    const label = c.id.replace(/^(CHR-|LOC-|ART-|ITM-|SOUL-|UNQ-|RACE-|ORIG-)/, "").replace(/-/g, " ");
    const isCompanion = _isInParty(c.id);
    const tag = isCompanion ? (CFG.PARTY_CONTEXT_LABEL || "Companion") : "Character";
    const block = `[${tag}: ${label}]\n${c.narrative}\n[/${tag}]\n`;
    if (spent + block.length > budgetChars) break;
    injected += block;
    spent += block.length;
  }
  const memBlock    = memLine  ? memLine  + "\n\n" : "";
  const cardBlock   = injected ? injected + "\n"   : "";
  const isHint      = _buildISIntegrationHint();
  const isBlock     = isHint   ? isHint   + "\n\n" : "";
  // v18: region narrative memory hint
  const regMemHint  = _regionMemoryHint();
  const regMemBlock = regMemHint ? regMemHint + "\n\n" : "";
  return memBlock + isBlock + regMemBlock + cardBlock + contextText;
}

// ─── teraStatus (v15: L6 deep automation) ─────────────────────────
function teraStatus() {
  _teraEnsureRegistry();
  const t = state.tera;
  const cal = t.calendar;
  const allCards = Object.values(CARD_REGISTRY);
  const eventCards = allCards.filter(c => c.tier !== "character" && !c.companionTier);
  const charCards  = allCards.filter(c => c.tier === "character");
  const compCards  = allCards.filter(c => c.companionTier);
  const fired = Object.keys(t.cardMeta).length;
  const factionLines = Object.entries(t.factions).map(([id, rep]) => `${id}: ${rep} (${getFactionStatus(rep)})`).join(", ");
  const contLines = Object.entries(t.continents).filter(([,v]) => v).map(([k]) => k).join(", ");
  const fa = t._fateArc || {};
  const fp = t._fp;
  const oracleCount = (t._oracle || []).length;
  const clockCount  = (t.clocks  || []).length;
  const partyNames = (t.party || []).map(id => id.startsWith("CHR-") ? id.slice(4) : id).join(", ");
  // v14 additions
  const pressuredRegions = Object.entries(t._worldPressure || {}).filter(([,p]) => p >= (CFG.WORLD_PRESSURE_THRESHOLD || 20)).map(([c]) => c);
  const npcRelCount = Object.keys(t._npcRels || {}).length;
  const npcGoalCount = Object.values(t.moods || {}).filter(s => s.goal).length;
  const stubsCreated = Object.keys(t._npcStubCreated || {}).length;
  // v15 additions
  const compressAnchors = (t.anchors || []).filter(a => a.id.startsWith("_mem_compress_")).length;
  const activeIntents = Object.entries(t._intentBoosts || {}).filter(([,e]) => t.turn <= e.expiresAt).length;
  const locStubsCreated = Object.keys(t._locStubCreated || {}).length;
  return (
    `[TERA v18 | turn:${t.turn} | region:${toFull(t.region)} | location:${t.currentLocation || "traveling"}]\n` +
    `[event:${eventCards.length} / character:${charCards.length} / companion:${compCards.length} | ${fired} fired]\n` +
    `[calendar: ${cal.tod} day:${cal.day} month:${cal.month} year:${cal.year} season:${cal.season}]\n` +
    `[origin:${t.origin || "none"} | continents: ${contLines || "none"}]\n` +
    `[party: ${partyNames || "none"} (${(t.party||[]).length}/${CFG.MAX_PARTY_SIZE})]\n` +
    `[scene: ${t._sceneType || "exploration"} | detected NPCs: ${(t._sceneNpcs||[]).length}]\n` +
    `[factions: ${factionLines || "none"}]\n` +
    `[fate arc — tragedy:${fa.tragedy||0} triumph:${fa.triumph||0} mystery:${fa.mystery||0} comedy:${fa.comedy||0}]\n` +
    `[oracle:${oracleCount} | clocks:${clockCount} | echoes:${(t._echo||[]).length}]\n` +
    `[fingerprint: ${fp ? fp.style + "/" + fp.engagement + (fp.npcAffinity ? "/npc-affinity" : "") : "profiling (t" + t.turn + "/" + CFG.FINGERPRINT_TURNS + ")"}]` +
    (t._thread ? `\n[thread: ${t._thread.tag} | ${t._thread.turnsLeft} turns left | opened by ${t._thread.openedBy}]` : "") +
    (() => { const rk = Object.keys(t._factionRels||{}); return rk.length ? `\n[faction relations: ${rk.length} pair(s) tracked]` : ""; })() +
    (() => { const nk = Object.keys(t.npcLocation||{}); return nk.length ? `\n[detached NPCs: ${nk.length}]` : ""; })() +
    (pressuredRegions.length ? `\n[world pressure ⚠ threshold reached: ${pressuredRegions.join(", ")}]` : "") +
    (npcRelCount ? `\n[npc-npc relations: ${npcRelCount} pair(s) tracked]` : "") +
    (npcGoalCount ? `\n[npc goals active: ${npcGoalCount}]` : "") +
    (stubsCreated ? `\n[npc auto-stubs: ${stubsCreated}]` : "") +
    // v15 deep automation lines
    (t._setupDone ? `\n[bootstrap: done (${(t._bootstrapLog||[]).length} directives)]` : `\n[bootstrap: pending — will run turn 1]`) +
    (compressAnchors ? `\n[memory: ${compressAnchors} compressed anchor(s) | pass ${t._memCompressCount||0}]` : "") +
    (activeIntents ? `\n[intent: ${activeIntents} active boost(s)]` : "") +
    (locStubsCreated ? `\n[loc auto-stubs: ${locStubsCreated}]` : "") +
    // v17 scenario mode line
    (CFG.SCENARIO_MODE && CFG.SCENARIO_MODE !== "standard"
      ? `\n[scenario mode: ${CFG.SCENARIO_MODE} | ring:${CFG.RING_SIZE} cooldown-scale:${CFG.COOLDOWN_SCALE} cascade:${CFG.TIER_CASCADE_ENABLED}]`
      : "") +
    // v18 lines
    (() => {
      const dom = _playerArcGetDominant();
      return dom ? `\n[player arc: ${dom.category} (score:${dom.score})]` : "";
    })() +
    (() => {
      const rm = t._regionMemory || {};
      const total = Object.values(rm).reduce((s,a) => s + a.length, 0);
      return total ? `\n[region memory: ${total} event(s) across ${Object.keys(rm).length} region(s)]` : "";
    })() +
    (() => {
      const staged = (t.clocks||[]).filter(c => c.stages && c.stages.length).length;
      return staged ? `\n[staged clocks: ${staged} clock(s) with stage transitions]` : "";
    })()
  );
}

// ─── v18 command functions ─────────────────────────────────────────
function _teraPlayerArc() {
  const t = state.tera;
  const pa = t._playerArc || {};
  const dom = _playerArcGetDominant();
  const lines = ["[Player Behavioral Arc — Turn " + t.turn + "]", ""];
  if (!Object.keys(pa).length) {
    lines.push("  No behavioral signal detected yet.");
    lines.push("  Arc is read from player input — fight, spare, negotiate, protect, explore, sacrifice.");
    return lines.join("\n");
  }
  lines.push("ACCUMULATED SCORES:");
  const sorted = Object.entries(pa).sort(([,a],[,b]) => b.score - a.score);
  for (const [cat, entry] of sorted) {
    const bar = "█".repeat(Math.min(entry.score, 10)) + "░".repeat(Math.max(0, 10 - entry.score));
    const domMark = dom && dom.category === cat ? " ◄ dominant" : "";
    lines.push(`  ${cat.padEnd(12)} ${bar} ${entry.score} (last: t${entry.lastTurn})${domMark}`);
  }
  lines.push("");
  if (dom) {
    lines.push(`DOMINANT: ${dom.category.toUpperCase()} (score ${dom.score})`);
    lines.push(`Cards with arc:${dom.category} get +${CFG.PLAYER_ARC_BOOST||3} weight and context score.`);
  } else {
    lines.push(`No dominant arc yet (threshold: ${CFG.PLAYER_ARC_THRESHOLD||3} score to activate).`);
  }
  lines.push(`Arc window: ${CFG.PLAYER_ARC_TURNS||20} turns · Gate syntax: player_arc:mercy>=3`);
  return lines.join("\n");
}

function _teraRegionMemory(regionArg) {
  const t = state.tera;
  const rm = t._regionMemory || {};
  const targetRegion = regionArg ? toCode(regionArg) : null;
  const lines = ["[Region Narrative Memory]", ""];
  const regions = targetRegion ? [targetRegion] : Object.keys(rm);
  if (!regions.length || regions.every(r => !(rm[r]||[]).length)) {
    lines.push("  No region memory yet.");
    lines.push("  Moderate and major events are recorded as they fire.");
    return lines.join("\n");
  }
  for (const region of regions) {
    const mem = rm[region] || [];
    if (!mem.length) continue;
    const isCurrent = region === t.region;
    lines.push(`${region.toUpperCase()}${isCurrent ? " (current)" : ""} — ${mem.length} event(s):`);
    for (const e of mem) {
      lines.push(`  t${e.turn} [${e.tier}] ${e.cardId}: ${e.label}`);
    }
    lines.push("");
  }
  lines.push(`Depth: ${CFG.REGION_MEMORY_DEPTH||3} per region · Min tier: ${CFG.REGION_MEMORY_MIN_TIER||"moderate"}`);
  lines.push("Gate syntax: region_event:CARD-ID");
  return lines.join("\n");
}

// ==================================================================
// Legacy System
// ==================================================================

function _legacyResidue(tags) {
  const R = {
    tragedy:   ["There are people in this region who do not speak of certain things.",
                "Something ended here. The place remembers even if the people have moved on.",
                "The weight of what happened has not fully lifted."],
    triumph:   ["There is a story told here about something that went differently than expected.",
                "People in this region have reason to believe that one person can change things.",
                "Something was accomplished here that others quietly measure themselves against."],
    betrayal:  ["Trust became a careful thing here. It was not always so.",
                "There is a wariness in this region toward certain kinds of loyalty.",
                "A name surfaces here sometimes, spoken with a particular kind of quiet."],
    mystery:   ["There are questions here that were raised and never answered.",
                "Something happened that people still debate when they think no one is listening."],
    loss:      ["There is an absence in this region that has not been filled.",
                "People here know what it costs to lose something that cannot be replaced."],
    discovery: ["Something was found here that changed what people thought was possible.",
                "There is knowledge in this region that did not exist before a certain point."],
    victory:   ["There is a confidence in this region that has a specific source.",
                "People here remember when something was won that seemed impossible."],
    rescue:    ["There is a debt of care in this region that hasn't been repaid and cannot be.",
                "Someone was brought back from something here. The region knows."],
    social:    ["The relationships formed here have outlasted the events that created them."],
  };
  const tl = (tags || "").split(",").map(t => t.trim()).filter(Boolean);
  for (const tag of tl) {
    if (R[tag]) {
      const arr = R[tag];
      return arr[Math.floor(Math.random() * arr.length)];
    }
  }
  return "Something significant happened here. Its shape is not fully legible yet.";
}

function teraExportLegacy() {
  const t = state.tera;
  const di = t._di || {};
  const meta = t.cardMeta || {};
  const rels = t.relationships || {};
  const facs = t.factions || {};
  const fa   = t._fateArc  || {};
  const oracle = t._oracle || [];

  const ec = [];
  for (const [cardId] of Object.entries(meta)) {
    if (ec.length >= 5) break;
    const cd = di[cardId];
    if (!cd) continue;
    const tier = cd.meta.tier;
    if (tier !== "major" && tier !== "moderate") continue;
    ec.push({
      id:  cardId,
      r:   cd.meta.region || "xw",
      tg:  (cd.meta.tags || "").split(",")[0]?.trim() || "legacy",
      tx:  _legacyResidue(cd.meta.tags || ""),
    });
  }

  const fm = [];
  for (const [id, fd] of Object.entries(facs)) {
    const rep = typeof fd === "object" ? (fd.rep ?? fd.reputation ?? 0) : (Number(fd) || 0);
    if (rep >= 60)  fm.push({ id, d:  1 });
    else if (rep <= -40) fm.push({ id, d: -1 });
  }

  const pr = oracle.filter(o => !o.isLegacy).map(o => ({ id: o.anchorId, tx: o.prophecyText }));

  const ts = [];
  if ((fa.tragedy || 0) > 8) {
    ts.push({
      r: t.region || "xw",
      s: (fa.tragedy || 0) > 20 ? 3 : (fa.tragedy || 0) > 13 ? 2 : 1,
    });
  }

  const topRel = Object.entries(rels).sort(([,a],[,b]) => b - a)[0];
  const lg = (topRel && topRel[1] >= 40) ? { id: topRel[0], score: topRel[1] } : null;

  const faDom = Object.entries(fa).sort(([,a],[,b]) => b - a)[0];
  const faSu  = (faDom && faDom[1] > 5) ? { d: faDom[0], s: Math.floor(faDom[1] * 0.25) } : null;

  const doc = { v: 1, t: t.turn, yr: (t.calendar || {}).year, ec, fm, pr, ts, lg, fa: faSu };

  let code;
  try {
    code = btoa(unescape(encodeURIComponent(JSON.stringify(doc))));
  } catch (e) {
    code = "[encoding error: " + e.message + "]";
  }

  t._legacyExported = { turn: t.turn, doc };

  const isEmpty = !ec.length && !fm.length && !pr.length && !ts.length && !lg && !faSu;
  const lines = [
    "[Legacy Export — Year " + (doc.yr || "?") + " Turn " + doc.t + "]",
    "",
    "What carries forward to your next character:",
    "",
  ];
  if (ec.length)  { lines.push("  Echo Cards (" + ec.length + "):"); ec.forEach(e => lines.push("    · " + e.id + " [" + e.r + "]")); }
  if (fm.length)  { lines.push("  Faction Memory (" + fm.length + "):"); fm.forEach(f => lines.push("    · " + f.id + ": " + (f.d > 0 ? "remembered warmly" : "remembered coldly"))); }
  if (pr.length)  { lines.push("  Unfulfilled Prophecies (" + pr.length + "):"); pr.forEach(p => lines.push("    · \"" + p.tx + "\"")); }
  if (ts.length)  { lines.push("  Tragedy Scars:"); ts.forEach(s => lines.push("    · " + s.r + " (severity " + s.s + ")")); }
  if (lg)          lines.push("  Legend: " + lg.id + " (rel score " + lg.score + ")");
  if (faSu)        lines.push("  World Tone: " + faSu.d + " lean (" + faSu.s + " arc pts carry forward)");
  if (isEmpty) { lines.push("  Nothing significant yet. Play more before exporting."); return lines.join("\n"); }
  lines.push("", "Copy and paste in your new game:", "  /tera import legacy " + code);
  return lines.join("\n");
}

function teraApplyLegacy(code) {
  let doc;
  try {
    doc = JSON.parse(decodeURIComponent(escape(atob(code))));
  } catch (e) {
    return "[Legacy Import]  Invalid code — could not decode.";
  }
  if (!doc || doc.v !== 1) return "[Legacy Import]  Unrecognised format (expected v1).";

  const t = state.tera;
  const created = [];
  const applied = [];
  const existingIds = new Set(
    (typeof storyCards !== "undefined" ? storyCards : [])
      .map(c => typeof c.keys === "string" ? c.keys.split("|")[1] : "")
  );

  function addCard(id, title, keys, entry, desc) {
    if (existingIds.has(id)) return false;
    if (typeof addStoryCard === "function") addStoryCard(title, entry, "text", keys, desc || "");
    existingIds.add(id);
    created.push(id);
    return true;
  }

  for (const ec of (doc.ec || [])) {
    const id = "ECHO-" + ec.id;
    if (addCard(id, "TERA | Echo — " + ec.id,
                "TERA|" + id + "|minor|" + ec.r + "|w:1|c:999|none",
                ec.tx,
                "// Legacy echo card.\ntags:" + (ec.tg || "legacy"))) {
      applied.push("Echo: " + ec.id);
    }
  }

  for (const pr of (doc.pr || [])) {
    const aid = "legacy_" + pr.id;
    teraAddAnchor(aid, pr.tx, 6, null);
    if (!Array.isArray(t._oracle)) t._oracle = [];
    if (!t._oracle.some(o => o.anchorId === aid)) {
      t._oracle.push({ anchorId: aid, sourceCardId: null, fulfillsCardId: null,
                       prophecyText: pr.tx, plantedTurn: t.turn, isLegacy: true });
      applied.push("Prophecy planted");
    }
  }

  if (!t.weightMods) t.weightMods = {};
  for (const fm of (doc.fm || [])) {
    let count = 0;
    for (const id in CARD_REGISTRY) {
      const c = CARD_REGISTRY[id];
      const tags = (c.tags || "").split(",").map(s => s.trim());
      if (tags.includes("social") || (c.factions || "").includes(fm.id)) {
        t.weightMods[id] = (t.weightMods[id] || 0) + (fm.d * 2);
        count++;
      }
    }
    applied.push("Faction " + fm.id + (fm.d > 0 ? " warm" : " cold") + ": " + count + " cards");
  }

  for (const ts of (doc.ts || [])) {
    addActivity(ts.r, ts.s * 15);
    applied.push("Scar: " + ts.r + " +" + (ts.s * 15) + " activity");
  }

  if (doc.lg) {
    const id = "CHR-Legend";
    const score = doc.lg.score;
    const intensity = score >= 80 ? "name that people do not forget"
                     : score >= 60 ? "name still moving through conversations"
                     : "name that surfaces in certain circles";
    if (addCard(id, "TERA | Legend",
                "TERA|" + id + "|character|xw|w:0|c:0|none",
                "There is a " + intensity + " in this part of the world. People who were present speak of it carefully.",
                "// Legacy character: " + doc.lg.id + " (rel score " + score + ")\n// Their name was: " + doc.lg.id)) {
      applied.push("Legend: " + doc.lg.id);
    }
  }

  if (doc.fa && doc.fa.s > 0) {
    if (!t._fateArc) t._fateArc = { tragedy: 0, triumph: 0, mystery: 0, comedy: 0 };
    t._fateArc[doc.fa.d] = (t._fateArc[doc.fa.d] || 0) + doc.fa.s;
    applied.push("Arc lean: +" + doc.fa.s + " " + doc.fa.d);
  }

  t._legacyApplied = { turn: t.turn, doc, created, applied };
  return ["[Legacy Applied]",
          "  Cards created: " + (created.join(", ") || "none"),
          applied.map(a => "  · " + a).join("\n")].join("\n");
}

function teraLegacyStatus() {
  const t = state.tera;
  const exp = t._legacyExported;
  const app = t._legacyApplied;
  if (!exp && !app) {
    return "[Legacy]  No legacy this game.\n  Export: /tera export legacy\n  Import: /tera import legacy [code]";
  }
  const lines = ["[Legacy Status]", ""];
  if (exp) {
    lines.push("Exported at turn " + exp.turn + ":",
               "  Echo Cards:     " + (exp.doc.ec || []).length,
               "  Prophecies:     " + (exp.doc.pr || []).length,
               "  Faction Memory: " + (exp.doc.fm || []).length,
               "  Legend:         " + (exp.doc.lg ? exp.doc.lg.id : "none"),
               "  Re-export: /tera export legacy");
  }
  if (app) {
    lines.push("",
               "Legacy applied at turn " + app.turn + ":",
               "  Cards created: " + (app.created.join(", ") || "none"),
               "  Conditions:    " + app.applied.length);
  }
  return lines.join("\n");
}

// ==================================================================
// Author Tooling: Validate & Simulate
// ==================================================================

const VALID_MOODS = new Set([
  "neutral","content","elated","hopeful","uneasy","anxious",
  "afraid","angry","grieving","suspicious","conflicted","cold"
]);

function _teraValidate(cardId) {
  _teraEnsureRegistry();
  if (typeof storyCards === "undefined") return "[Validate]  storyCards unavailable in this context.";
  const sc = storyCards.find(c => {
    const k = typeof c.keys === "string" ? c.keys : "";
    return k.startsWith("TERA|") && k.split("|")[1] === cardId;
  });
  if (!sc) return "[Validate]  Card not found: " + cardId;

  const key = sc.keys;
  const parts = key.split("|");
  const errors = [], warnings = [], ok = [];

  if (parts.length < 7) errors.push("Key has fewer than 7 pipe-separated fields (expected 7+)");

  const VALID_TIERS = new Set(["minor","moderate","major","character","config"]);
  const tier = parts[2] || "";
  if (!VALID_TIERS.has(tier)) errors.push("Unknown tier: \"" + tier + "\"");
  else ok.push("Tier: " + tier);

  const VALID_REGIONS = new Set(["vnr","vmf","vel","vis","vap","syl","drv","vrd","kth","aur","snk","hlw","xw"]);
  const region = parts[3] || "";
  if (!VALID_REGIONS.has(region)) warnings.push("Unknown region: \"" + region + "\" (may be custom)");
  else ok.push("Region: " + region);

  const wf = parts[4] || "";
  if (!/^w:\d+$/.test(wf)) errors.push("Weight field malformed: \"" + wf + "\" — expected w:N");
  else ok.push("Weight: " + wf.slice(2));

  const cf = parts[5] || "";
  if (!/^c:\d+$/.test(cf)) errors.push("Cooldown field malformed: \"" + cf + "\" — expected c:N");
  else ok.push("Cooldown: " + cf.slice(2));

  const KNOWN_GATES = new Set([
    "p","pin","tags","factions","npc","flag","requires","location",
    "item","time","continent","origin","control","prophecy","fulfills",
    "moodtarget","npcstress","npctrust","npcmood",
    "thread","thread_duration","thread_match","thread_break",
    "faction_rel","requires_thread",
    "party","party_not","party_size","companion"
  ]);

  for (const line of (sc.description || "").split("\n")) {
    const tl = line.trim();
    if (!tl || tl.startsWith("//") || tl.startsWith("#")) continue;
    const colon = tl.indexOf(":");
    if (colon === -1) continue;
    const gk = tl.slice(0, colon).trim().toLowerCase();
    const gv = tl.slice(colon + 1).trim();
    if (!KNOWN_GATES.has(gk)) { warnings.push("Unrecognised gate: \"" + tl.slice(0, colon).trim() + "\""); continue; }
    if (gk === "requires") {
      for (const rid of gv.split(",").map(r => r.trim())) {
        if (!CARD_REGISTRY[rid]) warnings.push("requires: unknown card \"" + rid + "\"");
        else ok.push("requires: " + rid + " ✓");
      }
    }
    if (gk === "fulfills") {
      if (!CARD_REGISTRY[gv]) warnings.push("fulfills: unknown card \"" + gv + "\"");
      else ok.push("fulfills: " + gv + " ✓");
    }
    if (gk === "npcstress" || gk === "npctrust") {
      if (!/^\w+\s*(>=|<=|>|<|=)\s*\d+$/.test(gv))
        errors.push(gk + ": bad format. Expected npcId>=number (e.g. sellen>=70)");
      else ok.push(gk + ": " + gv + " ✓");
    }
    if (gk === "npcmood") {
      const mp = gv.match(/^(\w+)\s*=\s*(\w+)$/);
      if (!mp) errors.push("npcmood: bad format. Expected npcId=moodName");
      else if (!VALID_MOODS.has(mp[2])) warnings.push("npcmood: unknown mood \"" + mp[2] + "\"");
      else ok.push("npcmood: " + gv + " ✓");
    }
  }

  const KNOWN_FX = new Set([
    "addactivity","factionrep","unlocktag","unlocklocation",
    "advancecalendar","advancetod","settod","setorigin","giveitem","takeitem","createitem",
    "addanchor","removeanchor","expireanchor","setcontrol","addrelationship",
    "setflag","clearflag","addweight","addclock","removeclock",
    "setlocation","leavelocation","tragedycooldown",
    "adjuststress","setstress","adjusttrust","settrust","setmood","artifactpressure",
    "openthread","closethread","adjustfactionrel",
    "joinparty","leaveparty","relocatenpc","setregion"
  ]);

  const fxMatch = (sc.entry || sc.value || "").match(/\[FX\]([\s\S]*?)\[\/FX\]/);
  if (fxMatch) {
    for (const fxLine of fxMatch[1].split("\n")) {
      const ft = fxLine.trim();
      if (!ft || ft.startsWith("//")) continue;
      const fc = ft.indexOf(":");
      if (fc === -1) continue;
      const fk = ft.slice(0, fc).trim().toLowerCase();
      if (!KNOWN_FX.has(fk)) warnings.push("Unknown FX: \"" + ft.slice(0, fc).trim() + "\"");
      else ok.push("FX " + ft.slice(0, fc).trim() + " ✓");
    }
  } else if (!["character","config"].includes(tier)) {
    warnings.push("No [FX]...[/FX] block found (may be intentional)");
  }

  const lines = ["[Validate: " + cardId + "]", ""];
  if (errors.length)   { lines.push("ERRORS (" + errors.length + "):"); errors.forEach(e => lines.push("  ✗  " + e)); lines.push(""); }
  if (warnings.length) { lines.push("WARNINGS (" + warnings.length + "):"); warnings.forEach(w => lines.push("  ⚠  " + w)); lines.push(""); }
  if (ok.length)       { lines.push("PASSED (" + ok.length + "):"); ok.forEach(o => lines.push("  ✓  " + o)); }
  if (!errors.length && !warnings.length) lines.push("  All checks passed. Card looks good.");
  return lines.join("\n");
}

function _teraSimulate() {
  _teraEnsureRegistry();
  const t = state.tera;
  const turn = t.turn;
  const region = t.region || "xw";
  const meta = t.cardMeta || {};
  const wm = t.weightMods || {};
  const passed = [], blocked = [];

  for (const [id, card] of Object.entries(CARD_REGISTRY)) {
    if (card.tier === "character") continue;
    if (card.region !== "xw" && card.region !== region) {
      blocked.push({ id, reason: "region (card:" + card.region + " ≠ current:" + region + ")" });
      continue;
    }
    const last = meta[id];
    if (last != null && (turn - last) < (card.cooldown || 0)) {
      blocked.push({ id, reason: "cooldown (" + ((card.cooldown||0) - (turn - last)) + " turns left)" });
      continue;
    }
    let npcFail = null;
    if (card._npcGates && card._npcGates.length) {
      for (const g of card._npcGates) {
        const ns = t.moods[g.npc] || {};
        let pass = true;
        if (g.type === "stress") {
          const v = ns.stress ?? 50;
          if (g.op === ">=" && !(v >= g.value)) pass = false;
          if (g.op === "<=" && !(v <= g.value)) pass = false;
          if (g.op === ">"  && !(v >  g.value)) pass = false;
          if (g.op === "<"  && !(v <  g.value)) pass = false;
          if (g.op === "="  && !(v === g.value)) pass = false;
          if (!pass) npcFail = "npcstress:" + g.npc + " (" + v + g.op + g.value + " FAIL)";
        } else if (g.type === "trust") {
          const v = ns.trust ?? 50;
          if (g.op === ">=" && !(v >= g.value)) pass = false;
          if (g.op === "<=" && !(v <= g.value)) pass = false;
          if (g.op === ">"  && !(v >  g.value)) pass = false;
          if (g.op === "<"  && !(v <  g.value)) pass = false;
          if (g.op === "="  && !(v === g.value)) pass = false;
          if (!pass) npcFail = "npctrust:" + g.npc + " (" + v + g.op + g.value + " FAIL)";
        } else if (g.type === "mood") {
          const v = ns.mood || "neutral";
          if (v !== g.value) { pass = false; npcFail = "npcmood:" + g.npc + " (" + v + "≠" + g.value + " FAIL)"; }
        }
        if (!pass) break;
      }
    }
    if (npcFail) { blocked.push({ id, reason: npcFail }); continue; }

    const effWeight = Math.max(0, (card.weight || 1) + (wm[id] || 0));
    if (effWeight <= 0) {
      blocked.push({ id, reason: "effective weight " + effWeight });
      continue;
    }

    const hasGates = !!(card.factions || card.npc || card.flag || card.requires ||
                        card.location || card.item || card.time || card.continent || card.origin || card.tags);
    // Include subsystem bonuses in simulation display
    const arcBonus = _fateArcBoost(card);
    const resBonus = _resonanceScore(card);
    const fpBonus  = _fingerprintBoost(card);
    const isbonus  = _isBridgeScore(card);
    const thBonus = (CFG.THREAD_ENABLED && t._thread && card.threadMatch === t._thread.tag) ? CFG.THREAD_WEIGHT_BOOST : 0;
    passed.push({ id, tier: card.tier, w: card.weight || 1, mod: wm[id] || 0, eff: effWeight,
                  std: hasGates, arcBonus, resBonus, fpBonus, isbonus, thBonus });
  }

  const byTier = {};
  for (const p of passed) {
    if (!byTier[p.tier]) byTier[p.tier] = { cards: [], total: 0 };
    byTier[p.tier].cards.push(p);
    byTier[p.tier].total += p.eff;
  }

  const lines = ["[Simulate — Turn " + turn + "  Region: " + region + "]", ""];
  if (passed.length === 0) {
    lines.push("  No event cards are currently eligible.");
  } else {
    for (const [tier, data] of Object.entries(byTier)) {
      lines.push(tier.toUpperCase() + "  (" + data.cards.length + " cards, Σw=" + data.total + ")");
      for (const c of data.cards.sort((a,b) => b.eff - a.eff)) {
        const pct = ((c.eff / data.total) * 100).toFixed(1);
        const modStr = c.mod !== 0 ? " (base " + c.w + " " + (c.mod > 0 ? "+" : "") + c.mod + ")" : "";
        const bonuses = [];
        if (c.arcBonus) bonuses.push("arc+" + c.arcBonus);
        if (c.resBonus) bonuses.push("res+" + c.resBonus);
        if (c.fpBonus)  bonuses.push("fp+" + c.fpBonus);
        if (c.isbonus)  bonuses.push("is+" + c.isbonus);
        if (c.thBonus)  bonuses.push("thread+" + c.thBonus);
        const bonStr = bonuses.length ? "  [" + bonuses.join(" ") + "]" : "";
        const gateStr = c.std ? "  [+gates]" : "";
        lines.push("  " + pct + "%  " + c.id + "  w:" + c.eff + modStr + bonStr + gateStr);
      }
      lines.push("");
    }
  }
  if (blocked.length) {
    lines.push("BLOCKED  (" + blocked.length + ")");
    blocked.slice(0, 15).forEach(b => lines.push("  ✗  " + b.id + ":  " + b.reason));
    if (blocked.length > 15) lines.push("  … and " + (blocked.length - 15) + " more");
  }
  return lines.join("\n");
}


// ==================================================================
// v11 Author & Player Tooling
// ==================================================================

// ─── _buildTrace: capture card scoring breakdown before fire ──────
// Called in teraTurn BEFORE triggerCard so cardMeta still holds
// the previous fire turn for accurate age-bonus calculation.
function _buildTrace(card) {
  const t = state.tera;
  const base = card.priority || 5;

  // Age bonus — uses cardMeta before triggerCard overwrites it
  const lastFired = t.cardMeta[card.id];
  let scoreAge = 0;
  let ageLabel = 'never fired before';
  if (lastFired != null) {
    const age = t.turn - lastFired;
    ageLabel = 'last t' + lastFired + ' (age ' + age + ')';
    if      (age <= 5)  scoreAge = 3;
    else if (age <= 10) scoreAge = 2;
    else if (age <= 20) scoreAge = 1;
  }

  const scoreRegion = (card.region === t.region) ? 2 : 0;
  let scoreLoc = 0;
  if (card.id.startsWith('LOC-') && t.currentLocation === card.id) scoreLoc = 4;

  let scoreInv = 0;
  if (card.id.startsWith('ART-') || card.id.startsWith('ITM-') || card.id.startsWith('SOUL-')) {
    const inv = (t.inventory || []).find(e => e.id === card.id);
    if (inv) { scoreInv = 4; if (t.turn - inv.acquiredTurn <= 10) scoreInv = 5; }
  }

  let scoreTags = 0;
  if (card.tags) {
    const rt = (t.tags[t.region] || '').split(',');
    scoreTags = Math.min(card.tags.split(',').filter(tg => tg.trim() && rt.includes(tg.trim())).length, 2);
  }

  let scoreRel = 0;
  if (card.id.startsWith('CHR-')) {
    const rep = getRelationship(card.id.slice(4).toLowerCase());
    if (rep >= 50) scoreRel = 2;
    else if (rep >= 20) scoreRel = 1;
  }

  const scoreRes = _resonanceScore(card);
  const scoreArc = _fateArcBoost(card);
  const scoreFp  = _fingerprintBoost(card);
  const scoreIs  = _isBridgeScore(card);
  const scoreTh  = (CFG.THREAD_ENABLED && t._thread && card.threadMatch && card.threadMatch === t._thread.tag) ? CFG.THREAD_SCORE_BOOST : 0;
  // v13: party and scene bonuses
  const scoreParty = (CFG.PARTY_ENABLED && _isInParty(card.id)) ? CFG.PARTY_SCORE_BOOST : 0;
  const scoreScene = (CFG.SCENE_DETECT_ENABLED && card.id.startsWith("CHR-") && (t._sceneNpcs || []).includes(card.id)) ? CFG.SCENE_ACTIVE_NPC_BOOST : 0;
  const totalScore = base + scoreAge + scoreRegion + scoreLoc + scoreInv + scoreTags + scoreRel + scoreRes + scoreArc + scoreFp + scoreIs + scoreTh + scoreParty + scoreScene;

  // Weight breakdown (mirrors pickWeightedCard logic)
  const baseW = card.weight || 1;
  const modW  = (t.weightMods || {})[card.id] || 0;
  let tagW = 0;
  if (card.tags) {
    const rt = t.tags[card.region] || '';
    card.tags.split(',').forEach(tg => { if (rt.split(',').includes(tg.trim())) tagW++; });
  }
  const actW = Math.floor(getActivity(card.region) / 20);
  const thW  = (CFG.THREAD_ENABLED && t._thread && card.threadMatch && card.threadMatch === t._thread.tag) ? CFG.THREAD_WEIGHT_BOOST : 0;
  const effW = Math.max(1, baseW + modW + tagW + actW + thW);

  t._lastTrace = { cardId: card.id, turn: t.turn, tier: card.tier, region: card.region,
    ageLabel, base, scoreAge, scoreRegion, scoreLoc, scoreInv, scoreTags,
    scoreRel, scoreRes, scoreArc, scoreFp, scoreIs, scoreTh, scoreParty, scoreScene, totalScore,
    baseW, modW, tagW, actW, thW, effW };
}

// ─── _cardMetaPrune: trim stale cardMeta entries ──────────────────
// Removes entries for cards no longer in the registry (renamed/deleted).
// Safe: never removes cards that are still defined.
function _cardMetaPrune() {
  const t = state.tera;
  if (t.turn - (t._cardMetaTurn || 0) < 50) return;
  t._cardMetaTurn = t.turn;
  const meta = t.cardMeta;
  for (const id of Object.keys(meta)) {
    if (!CARD_REGISTRY[id]) delete meta[id];
  }
}

// ─── _teraAudit: validate all TERA cards at once ──────────────────
function _teraAudit() {
  if (typeof storyCards === 'undefined') return '[Audit]  storyCards unavailable in this context.';
  _teraEnsureRegistry();
  const teraCards = storyCards.filter(sc => {
    const k = typeof sc.keys === 'string' ? sc.keys : '';
    return k.startsWith('TERA|') && !k.startsWith('TERA|_CONFIG|');
  });
  if (!teraCards.length) return '[Audit]  No TERA cards found.';

  let totalErrors = 0, totalWarnings = 0;
  const problems = [], clean = [];

  for (const sc of teraCards) {
    const cardId = sc.keys.split('|')[1];
    if (!cardId) continue;
    const result = _teraValidate(cardId);
    const em = result.match(/ERRORS \((\d+)\)/);
    const wm = result.match(/WARNINGS \((\d+)\)/);
    const errs  = em ? parseInt(em[1]) : 0;
    const warns = wm ? parseInt(wm[1]) : 0;
    totalErrors   += errs;
    totalWarnings += warns;
    if (errs || warns) problems.push({ id: cardId, errs, warns });
    else               clean.push(cardId);
  }

  const lines = [
    '[Audit — ' + teraCards.length + ' cards checked]',
    '  Errors:   ' + totalErrors,
    '  Warnings: ' + totalWarnings,
    '  Clean:    ' + clean.length + '/' + teraCards.length,
    ''
  ];
  if (problems.length) {
    lines.push('ISSUES:');
    for (const p of problems) {
      lines.push('  ' + p.id +
        (p.errs  ? '  ' + p.errs  + ' error(s)'   : '') +
        (p.warns ? '  ' + p.warns + ' warning(s)' : ''));
    }
    lines.push('', 'Run /tera validate [id] for details.');
  } else {
    lines.push('All cards passed validation. ✓');
  }
  return lines.join('\n');
}

// ─── _teraCoverage: per-region card availability breakdown ────────
function _teraCoverage() {
  _teraEnsureRegistry();
  const t = state.tera;
  const meta = t.cardMeta || {};
  const turn = t.turn;

  // Group event cards by region and tier
  const regions = {};
  for (const [id, card] of Object.entries(CARD_REGISTRY)) {
    if (card.tier === 'character') continue;
    if (!regions[card.region]) regions[card.region] = {};
    if (!regions[card.region][card.tier]) regions[card.region][card.tier] = [];
    regions[card.region][card.tier].push({ id, card });
  }

  const lines = ['[Coverage — Turn ' + turn + '  Region: ' + toFull(t.region) + ' (' + t.region + ')]', ''];
  const TIERS = ['minor','moderate','major'];

  for (const [code, tiers] of Object.entries(regions)) {
    const rName = (REGION_EXPAND[code] || (code === 'xw' ? 'Cross-World' : code)).replace(/_/g,' ');
    const isCurrent = code === t.region;
    lines.push((isCurrent ? '► ' : '  ') + rName.toUpperCase() + ' [' + code + ']');

    for (const tier of TIERS) {
      const cards = tiers[tier] || [];
      if (!cards.length) continue;
      let nReady = 0, nCool = 0, nGate = 0, nFired = 0;
      for (const {id, card: cc} of cards) {
        if (meta[id] != null) nFired++;
        const onCool = meta[id] != null && (turn - meta[id]) < (cc.cooldown || 0);
        const gated  = !_passesGates(cc);
        if      (onCool) nCool++;
        else if (gated)  nGate++;
        else             nReady++;
      }
      const parts = [cards.length + ' total', nFired + ' fired', nReady + ' ready'];
      if (nCool) parts.push(nCool + ' cooldown');
      if (nGate) parts.push(nGate + ' gated');
      lines.push('    ' + tier.padEnd(8) + '  ' + parts.join('  ·  '));
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ─── _teraJournal: player-facing event history ────────────────────
function _teraJournal() {
  _teraEnsureRegistry();
  const t = state.tera;
  const meta = t.cardMeta || {};

  // Major and moderate events only, sorted by fire turn ascending
  const fired = Object.entries(meta)
    .filter(([id]) => {
      const cc = CARD_REGISTRY[id];
      return cc && (cc.tier === 'major' || cc.tier === 'moderate');
    })
    .sort(([,a],[,b]) => a - b);

  if (!fired.length) return '[Journal]  No significant events recorded yet.';

  const lines = ['[Journal — ' + fired.length + ' events]', ''];
  let lastRegion = null;

  for (const [id, turn] of fired) {
    const cc = CARD_REGISTRY[id];
    const rName = (REGION_EXPAND[cc.region] || cc.region).replace(/_/g,' ');
    if (rName !== lastRegion) {
      if (lastRegion) lines.push('');
      lines.push('── ' + rName.toUpperCase() + ' ──');
      lastRegion = rName;
    }
    // First sentence of narrative, capped at 90 chars
    const narr = (cc.narrative || '(no narrative)');
    const sentence = narr.split(/[.!?]/)[0].trim();
    const preview = sentence.length > 90 ? sentence.slice(0, 90) + '…' : sentence;
    lines.push('  t' + String(turn).padStart(3) + '  [' + cc.tier + ']  ' + preview);
  }
  return lines.join('\n');
}

// ─── _teraThreat: situation report — activity + clocks ────────────
function _teraThreat() {
  _teraEnsureRegistry();
  const t = state.tera;
  const lines = ['[Threat Report — Turn ' + t.turn + ']', ''];

  lines.push('ACTIVITY:');
  const allCodes = [...Object.keys(REGION_EXPAND), 'xw'];
  let anyActivity = false;
  for (const code of allCodes) {
    const act = getActivity(code);
    if (act === 0) continue;
    anyActivity = true;
    const isCurrent = code === t.region;
    const tier = act > 160 ? 'MAJOR' : act > 100 ? 'MOD+' : act > 40 ? 'MID ' : 'LOW ';
    const barLen = Math.min(12, Math.floor(act / 15));
    const bar = '█'.repeat(barLen) + '░'.repeat(12 - barLen);
    const tragic = t.tragedyCooldown[code]
      ? '  [tragedy cooldown: ' + Math.max(0, t.tragedyCooldown[code] - act) + ' act remaining]' : '';
    const marker = isCurrent ? '►' : ' ';
    lines.push(' ' + marker + ' ' + code + '  ' + String(act).padStart(4) + '  ' + tier + '  ' + bar + tragic);
  }
  if (!anyActivity) lines.push('  No activity recorded yet.');

  const clocks = (t.clocks || []);
  lines.push('', 'CLOCKS (' + clocks.length + '):');
  if (clocks.length) {
    const sorted = [...clocks].sort((a,b) => a.firesAtTurn - b.firesAtTurn);
    for (const cl of sorted) {
      const rem = cl.firesAtTurn - t.turn;
      const urgency = rem <= 2 ? '  ⚠ IMMINENT' : rem <= 5 ? '  !' : '';
      lines.push('  [' + cl.id + ']  "' + cl.label + '"  fires in ' + rem + ' turn' + (rem !== 1 ? 's' : '') + urgency);
    }
  } else {
    lines.push('  None active.');
  }

  return lines.join('\n');
}

// ─── _teraWhere: rich location context (v13/v14: party + scene) ──
function _teraWhere() {
  _teraEnsureRegistry();
  const t = state.tera;
  const rName = (REGION_EXPAND[t.region] || t.region).replace(/_/g,' ');
  const lines = ['[Where]  ' + rName + ' (' + t.region + ')  ·  ' + t.calendar.tod];
  if (t.currentLocation) {
    lines.push('  Location: ' + t.currentLocation);
    const locCard = CARD_REGISTRY[t.currentLocation];
    if (locCard && locCard.narrative) {
      const snippet = locCard.narrative.slice(0, 130);
      lines.push('  "' + snippet + (locCard.narrative.length > 130 ? '…' : '') + '"');
    }
  } else {
    lines.push('  Location: traveling (no fixed location)');
  }
  lines.push('  ' + t.calendar.season + '  ·  Day ' + t.calendar.day + ', Month ' + t.calendar.month + ', Year ' + t.calendar.year);
  // v13: show party
  if (t.party && t.party.length) {
    const names = t.party.map(function(id){ return id.startsWith("CHR-") ? id.slice(4) : id; });
    lines.push('  Companions: ' + names.join(', '));
  }
  // v13: show scene type
  if (t._sceneType && t._sceneType !== "exploration") {
    lines.push('  Scene: ' + t._sceneType);
  }
  const tc = t.tragedyCooldown[t.region];
  if (tc !== undefined) {
    const rem = Math.max(0, tc - getActivity(t.region));
    if (rem > 0) lines.push('  [Tragedy cooldown: ' + rem + ' activity remaining]');
  }
  return lines.join('\n');
}

// ─── _teraHistory: last N fired cards from cardMeta ──────────────
function _teraHistory(n) {
  _teraEnsureRegistry();
  const t = state.tera;
  const limit = Math.max(1, Math.min(n || 10, 50));
  const sorted = Object.entries(t.cardMeta || {})
    .filter(([id]) => CARD_REGISTRY[id] && CARD_REGISTRY[id].tier !== 'character')
    .sort(([,a],[,b]) => b - a)
    .slice(0, limit);
  if (!sorted.length) return '[History]  No events fired yet.';
  const lines = ['[History — last ' + sorted.length + ' events]'];
  for (const [id, turn] of sorted) {
    const cc = CARD_REGISTRY[id];
    const narr = (cc.narrative || '').split(/[.!?]/)[0].trim().slice(0, 60);
    lines.push('  t' + String(turn).padStart(3) + '  [' + cc.tier + '|' + cc.region + ']  ' + id);
    if (narr) lines.push('           ' + narr + (cc.narrative && cc.narrative.length > 60 ? '…' : ''));
  }
  return lines.join('\n');
}

// ─── _teraLore: read card narrative without firing ────────────────
function _teraLore(cardId) {
  _teraEnsureRegistry();
  if (!cardId) return '[Lore]  Usage: /tera lore [cardId]';
  const cc = CARD_REGISTRY[cardId];
  if (!cc) return '[Lore]  Card not found: ' + cardId + '\n  Run /tera cards for the full list.';
  const firedTurn = state.tera.cardMeta[cardId];
  const statusStr = firedTurn != null ? 'last fired t' + firedTurn : 'never fired';
  const lines = [
    '[Lore: ' + cardId + ']  [' + cc.tier + ' | ' + (REGION_EXPAND[cc.region] || cc.region).replace(/_/g,' ') + ' | ' + statusStr + ']',
    ''
  ];
  if (cc.narrative) lines.push(cc.narrative);
  else lines.push('(no narrative text)');
  return lines.join('\n');
}

// ─── _teraCoverageContext: context card scoring rankings ──────────
// Shows which character cards are currently scoring highest and why.
function _teraCoverageContext() {
  _teraEnsureRegistry();
  const t = state.tera;
  const allCards = findCharacterCards(CFG.REGION_SCOPED);

  if (!allCards.length) return '[Context Cards]  No character cards eligible in current region.';

  const scored = allCards
    .map(cc => ({ id: cc.id, score: _scoreCard(cc), pinned: !!cc.pin }))
    .sort((a,b) => b.score - a.score);

  const cap    = CFG.MAX_CONTEXT_CARDS || 12;
  const pinned = scored.filter(c => c.pinned);
  const normal = scored.filter(c => !c.pinned);
  const injected = normal.slice(0, Math.max(0, cap - pinned.length));

  const lines = ['[Context Cards — ' + toFull(t.region) + ' | budget cap: ' + cap + ']', ''];

  if (pinned.length) {
    lines.push('PINNED (always injected):');
    for (const c of pinned) lines.push('  [PIN]  ' + c.id);
    lines.push('');
  }

  lines.push('RANKED (score → injection order):');
  for (let i = 0; i < normal.length; i++) {
    const c = normal[i];
    const injectMark = i < injected.length ? '  ✓ ' : '  – ';
    const sep        = i === injected.length - 1 && normal.length > injected.length ? '\n      ── context budget limit ──' : '';
    lines.push(injectMark + c.id.padEnd(30) + '  score: ' + c.score + sep);
  }

  if (!normal.length) lines.push('  (none)');

  const totalCards = Object.values(CARD_REGISTRY).filter(cc => cc.tier === 'character').length;
  const gated = totalCards - allCards.length;
  if (gated > 0) lines.push('\n  ' + gated + ' character card(s) gate-blocked (wrong region, flag, etc.)');

  return lines.join('\n');
}

// ─── _teraGraph: dependency tree for a card ──────────────────────
function _teraGraph(cardId) {
  _teraEnsureRegistry();
  if (!cardId) return '[Graph]  Usage: /tera graph [cardId]';
  const cc = CARD_REGISTRY[cardId];
  if (!cc) return '[Graph]  Card not found: ' + cardId;

  const t = state.tera;
  const fired = t.cardMeta[cardId] != null;
  const lines = [
    '[Graph: ' + cardId + ']  [' + cc.tier + ' | ' + (cc.region === 'xw' ? 'cross-world' : cc.region) + ' | ' + (fired ? 'fired t' + t.cardMeta[cardId] : 'never fired') + ']',
    ''
  ];

  // What this card requires
  const deps = (cc.deps && cc.deps !== 'none') ? cc.deps.split(',').map(s => s.trim()) : [];
  if (deps.length) {
    lines.push('REQUIRES (must have fired first):');
    for (const dep of deps) {
      const dc = CARD_REGISTRY[dep];
      const depFired = t.cardMeta[dep] != null;
      lines.push('  ' + (depFired ? '✓' : '✗') + '  ' + dep +
        (dc  ? '  [' + dc.tier + ' | ' + dc.region + ']'  : '  ⚠ not in registry') +
        (depFired ? '  (t' + t.cardMeta[dep] + ')' : '  (not yet fired)'));
    }
  } else {
    lines.push('REQUIRES: none — fires freely');
  }
  lines.push('');

  // Cards that depend on this one
  const dependents = Object.entries(CARD_REGISTRY)
    .filter(([,dc]) => dc.deps && dc.deps !== 'none' && dc.deps.split(',').map(s => s.trim()).includes(cardId))
    .map(([id,dc]) => ({ id, tier: dc.tier, region: dc.region, fired: t.cardMeta[id] != null }));

  if (dependents.length) {
    lines.push('UNLOCKS (cards that require this one):');
    for (const d of dependents) {
      lines.push('  ' + (d.fired ? '✓' : '○') + '  ' + d.id + '  [' + d.tier + ' | ' + d.region + ']' + (d.fired ? '  (fired)' : ''));
    }
  } else {
    lines.push('UNLOCKS: nothing depends on this card');
  }

  // Prophecy links
  if (cc._prophecy) lines.push('\nPLANTS PROPHECY: "' + cc._prophecy + '"');
  if (cc._fulfills)  lines.push('FULFILLS: ' + cc._fulfills);

  return lines.join('\n');
}

// ─── _teraExportState: raw state JSON dump ────────────────────────
function _teraExportState() {
  try {
    return '[State Export — Turn ' + state.tera.turn + ']\n' + JSON.stringify(state.tera, null, 2);
  } catch(e) {
    return '[State Export]  Error: ' + e.message;
  }
}


// ==================================================================
// v12: Faction Dynamics & Thread Display
// ==================================================================

// ─── Faction relationship helpers ─────────────────────────────────
function _factionRelKey(factA, factB) {
  return [factA, factB].sort().join("__");
}
function getFactionRel(factA, factB) {
  const key = _factionRelKey(factA, factB);
  return (state.tera._factionRels || {})[key] ?? 0;
}
function adjustFactionRel(factA, factB, amount) {
  if (!CFG.FACTION_REL_ENABLED) return;
  if (!state.tera._factionRels) state.tera._factionRels = {};
  const key = _factionRelKey(factA, factB);
  const cur = state.tera._factionRels[key] ?? 0;
  state.tera._factionRels[key] = Math.max(-100, Math.min(100, cur + (parseInt(amount) || 0)));
}
function getFactionRelStatus(rep) {
  return rep >= 75  ? "allied"
       : rep >= 30  ? "cooperative"
       : rep <= -75 ? "war"
       : rep <= -30 ? "rival"
       : "neutral";
}

// ─── _decayFactionRels (v16: activity-based) ──────────────────────
function _decayFactionRels() {
  if (!CFG.FACTION_REL_DECAY_ENABLED) return;
  const t = state.tera;
  const act = t._activity || 0;
  const interval = CFG.FACTION_REL_DECAY_ACTIVITY || 20;
  if (act - (t._lastFacRelDecayAct || 0) < interval) return;
  t._lastFacRelDecayAct = act;
  const rels = t._factionRels || {};
  const rate = CFG.FACTION_REL_DECAY_RATE || 2;
  for (const key in rels) {
    if (rels[key] > 0) { rels[key] -= rate; if (rels[key] <= 0) delete rels[key]; }
    else if (rels[key] < 0) { rels[key] += rate; if (rels[key] >= 0) delete rels[key]; }
  }
}

// ─── _teraFactionMatrix: inter-faction relationship display ────────
function _teraFactionMatrix() {
  _teraEnsureRegistry();
  const t = state.tera;
  const rels = t._factionRels || {};
  const lines = ["[Faction Relations — Turn " + t.turn + "]", ""];
  if (!Object.keys(rels).length) {
    lines.push("  No inter-faction relationships established yet.");
    lines.push("  Use /tera factrel [factA] [factB] [±n] to set manually,");
    lines.push("  or add adjustFactionRel FX to event cards.");
    return lines.join("\n");
  }
  const sorted = Object.entries(rels).sort(([,a],[,b]) => b - a);
  for (const [key, rep] of sorted) {
    const [fa, fb] = key.split("__");
    const sign = rep >= 0 ? "+" : "";
    const barChar = rep >= 0 ? "█" : "▒";
    const barLen = Math.min(10, Math.round(Math.abs(rep) / 10));
    const bar = barChar.repeat(barLen) + "░".repeat(10 - barLen);
    const status = getFactionRelStatus(rep);
    lines.push(
      "  " + fa.replace(/_/g," ").padEnd(22) +
      " ↔  " + fb.replace(/_/g," ").padEnd(22) +
      "  " + sign + String(rep).padStart(4) +
      "  " + bar + "  [" + status + "]"
    );
  }
  return lines.join("\n");
}

// ─── _teraThread: active thread display ───────────────────────────
function _teraThread() {
  _teraEnsureRegistry();
  const t = state.tera;
  if (!CFG.THREAD_ENABLED) return "[Thread]  Disabled (THREAD_ENABLED: false)";
  if (!t._thread) {
    // Show how many thread-capable cards are loaded
    const openers  = Object.values(CARD_REGISTRY).filter(c => c.thread);
    const matchers = Object.values(CARD_REGISTRY).filter(c => c.threadMatch);
    const breakers = Object.values(CARD_REGISTRY).filter(c => c.threadBreak);
    return "[Thread]  No active thread.\n" +
           "  Thread-capable cards: " + openers.length + " openers, " +
           matchers.length + " boosted, " + breakers.length + " closers";
  }
  const th = t._thread;
  const lines = [
    "[Thread]  " + th.tag + "  ·  " + th.turnsLeft + " turn" + (th.turnsLeft !== 1 ? "s" : "") + " remaining",
    "  Opened: t" + th.openedTurn + "  ·  by: " + th.openedBy,
  ];
  const boosted = Object.values(CARD_REGISTRY).filter(c => c.threadMatch === th.tag);
  if (boosted.length) {
    lines.push("  Boosted (" + boosted.length + " cards): " + boosted.map(c => c.id).join(", "));
  }
  const breakers = Object.values(CARD_REGISTRY).filter(c => c.threadBreak);
  if (breakers.length) {
    lines.push("  Closers (" + breakers.length + "): " + breakers.map(c => c.id).join(", "));
  }
  return lines.join("\n");
}

// ─── Register default factions ─────────────────────────────────────
registerFaction("grey_ledger",        0);
registerFaction("mana_covenant",     10);
registerFaction("ironclad_guild",     0);
registerFaction("circle_of_the_veil",0);
registerFaction("the_unbound",      -10);
registerFaction("bandit_clans",     -20);
registerFaction("ash_guild",          0);
registerFaction("sovereign_houses",   0);
registerFaction("warden_corps",       0);
registerFaction("navigators_compact", 0);
registerFaction("apothecary_society", 5);

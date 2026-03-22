// CONTEXT TAB – T.E.R.A. v13 / v18-fix / v18-cc
// v13: teraContext injects [Companion] labels, IS integration hints,
//      scene-aware context scoring.
// v18-fix:  _pendingEvent pipeline — card narratives injected as
//           [Scene directive] so AI weaves them in rather than appends.
// v18-fix2: Three-tier context budget guard prevents context overflow.
// v18-cc:   Character creator auto-parser.
//           On turn 1, scans the full context string for [TERA: ...]
//           markers embedded in character creator Entry fields, and
//           applies the corresponding engine state automatically.
//           Players never need to edit the _SETUP card manually.
// v18-cc2:  Added race= directive. Sets flag:race and activates the
//           corresponding RACE- story card tag automatically.

InnerSelf("context");

// ── Budget constants ──────────────────────────────────────────────────
const TOTAL_CONTEXT_CAP   = 3500;  // max chars TERA prepends (excl. story history)
const EVENT_NARRATIVE_CAP = 480;   // max chars taken from a card narrative

// ── Character Creator Auto-Parser ────────────────────────────────────
// Runs exactly once on turn 1 (guarded by _ccParsed flag in state).
// Reads every [TERA: ...] marker from the context string and applies:
//   mana_type=xxx        → teraSetFlag('mana_type', 'xxx')
//   region=xxx           → t.region = 'xxx'
//   first_contact=xxx    → teraSetFlag('first_contact', 'xxx')
//   appearance=xxx       → teraSetFlag('appearance', 'xxx')
//   race=xxx             → teraSetFlag('race', 'xxx') + addTag('xw', 'race_xxx')
//   ability_xxx active   → addTag('xw', 'ability_xxx')
//   ability_xxx_dormant  → addTag('xw', 'ability_xxx_dormant')
//
// Marker format (embedded in each Entry field):
//   [TERA: key=value | key2=value2]   — pipe-separated key=value pairs
//   [TERA: ability_xxx active | ...]  — ability tag, detected by prefix
//   [TERA: ability_xxx_dormant | ...] — dormant ability tag

function _parseCharacterCreator(contextText) {
  const t = state.tera;
  if (!t) return;
  if (t._ccParsed) return;   // only ever runs once
  t._ccParsed = true;

  // Find all [TERA: ...] blocks in the context string
  const pattern = /\[TERA:\s*([^\]]+)\]/gi;
  let match;
  const log = [];

  while ((match = pattern.exec(contextText)) !== null) {
    const payload = match[1];

    // Each block may contain multiple directives separated by |
    const directives = payload.split("|").map(s => s.trim()).filter(Boolean);

    for (const directive of directives) {

      // ── ability_xxx_dormant ─────────────────────────────────────
      if (/^ability_\w+_dormant$/i.test(directive)) {
        const tag = directive.toLowerCase();
        addTag("xw", tag);
        log.push("ability tag (dormant): " + tag);
        continue;
      }

      // ── ability_xxx active ──────────────────────────────────────
      // Matches "ability_xxx active" or "ability_xxx" (without _dormant)
      const abilityActive = directive.match(/^(ability_\w+?)(?:\s+active)?$/i);
      if (abilityActive && !directive.toLowerCase().includes("_dormant")) {
        const tag = abilityActive[1].toLowerCase();
        // Guard: skip non-ability strings caught by broad regex
        if (tag.startsWith("ability_")) {
          addTag("xw", tag);
          log.push("ability tag (active): " + tag);
          continue;
        }
      }

      // ── UNQ-xxx references — informational, no state change needed ─
      if (/^UNQ-/i.test(directive)) continue;

      // ── start=xxx — informational region label, no state change ───
      if (/^start=/i.test(directive)) continue;

      // ── key=value directives ────────────────────────────────────
      const kv = directive.match(/^([\w_]+)\s*=\s*(.+)$/);
      if (!kv) continue;
      const key = kv[1].toLowerCase().trim();
      const value = kv[2].trim();

      if (key === "region") {
        // Validate against known region codes before applying
        const VALID_REGIONS = ["vnr","vmf","vel","vis","vap","syl","drv","vrd","kth","aur","snk","hlw"];
        if (VALID_REGIONS.includes(value)) {
          // Only override _SETUP default if the player explicitly chose a region
          // (_ccRegion flag prevents the _SETUP card's region: line from
          // being overridden by a later detectRegion() call on turn 1)
          t.region = value;
          t._ccRegion = true;
          log.push("region → " + value);
        }
      } else if (key === "mana_type") {
        teraSetFlag("mana_type", value);
        log.push("mana_type → " + value);
      } else if (key === "first_contact") {
        teraSetFlag("first_contact", value);
        log.push("first_contact → " + value);
      } else if (key === "appearance") {
        teraSetFlag("appearance", value);
        log.push("appearance → " + value);
      } else if (key === "race") {
        // Set the flag AND activate the RACE- story card tag so it
        // surfaces in context immediately from turn 1.
        const VALID_RACES = ["human","forestelf","halfelf","wolfkin","foxkin",
                             "bearkin","catkin","dragonkin","kethara"];
        if (VALID_RACES.includes(value)) {
          teraSetFlag("race", value);
          addTag("xw", "race_" + value);
          log.push("race → " + value);
        }
      }
    }
  }

  // Store log for diagnostics (/tera status will show it)
  t._ccLog = log;
}

// ─────────────────────────────────────────────────────────────────────

const modifier = (text) => {
  const t = state.tera;
  if (!t) return { text, stop: false };

  // ── Turn 1: parse character creator tags from full context ──────────
  // Must run before teraContext() so tags are live when cards are scored.
  // `text` in the Context tab is the full context AID is about to send —
  // it includes injected story card entries (which hold our [TERA: ...] markers).
  if (!t._ccParsed) {
    _parseCharacterCreator(text);
  }

  // ── Consume pending event from last turn ────────────────────────────
  let eventDirective = "";
  if (t._pendingEvent) {
    const raw = t._pendingEvent;
    delete t._pendingEvent;

    let trimmed = raw;
    if (raw.length > EVENT_NARRATIVE_CAP) {
      const cutoff = raw.lastIndexOf(".", EVENT_NARRATIVE_CAP);
      trimmed = (cutoff > EVENT_NARRATIVE_CAP * 0.5)
        ? raw.slice(0, cutoff + 1)
        : raw.slice(0, EVENT_NARRATIVE_CAP) + "…";
    }

    eventDirective =
      "[Scene directive — weave the following beat into your response " +
      "as something happening in the world right now. Do not quote it " +
      "directly or label it; make it feel like natural story:\n" +
      trimmed + "]\n\n";
  }

  // ── Build world-state hint ──────────────────────────────────────────
  const region   = t.region || "vnr";
  const activity = getActivity(region);
  const tierDesc = activity > 80 ? "major tension"
                 : activity > 50 ? "significant unrest"
                 : activity > 20 ? "building tension"
                 : "relative calm";

  const factionHints = Object.entries(t.factions || {})
    .filter(([, rep]) => Math.abs(rep) >= 30)
    .map(([id, rep]) =>
      `${id.replace(/_/g, " ")}: ${
        rep >= 75  ? "allied"    :
        rep >= 30  ? "friendly"  :
        rep <= -75 ? "enemy"     : "unfriendly"
      }`)
    .join(", ");

  let hint = `[World state — ${toFull(region)}: ${tierDesc}`;
  if (factionHints) hint += ` | ${factionHints}`;

  const scene = t._sceneType || "exploration";
  if (scene !== "exploration") hint += ` | scene: ${scene}`;

  if (t.party && t.party.length) {
    const companions = t.party
      .map(id => id.startsWith("CHR-") ? id.slice(4) : id)
      .join(", ");
    hint += ` | companions: ${companions}`;
  }
  hint += "]\n";

  // ── Tier 1: full injection with event directive ─────────────────────
  const enrichedWithEvent = teraContext(
    eventDirective + hint + text,
    CFG.CONTEXT_BUDGET,
    CFG.REGION_SCOPED
  );

  if (enrichedWithEvent.length - text.length <= TOTAL_CONTEXT_CAP) {
    return { text: enrichedWithEvent, stop: false };
  }

  // ── Tier 2: drop event directive, keep everything else ──────────────
  const enrichedNoEvent = teraContext(
    hint + text,
    CFG.CONTEXT_BUDGET,
    CFG.REGION_SCOPED
  );

  if (enrichedNoEvent.length - text.length <= TOTAL_CONTEXT_CAP) {
    return { text: enrichedNoEvent, stop: false };
  }

  // ── Tier 3: minimal hint only (story history very long) ─────────────
  return { text: hint + text, stop: false };
};

modifier(text);

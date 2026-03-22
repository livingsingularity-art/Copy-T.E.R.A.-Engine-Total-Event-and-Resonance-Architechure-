// INPUT TAB – T.E.R.A. v18
// New v15 commands:
//   DEEP AUTOMATION: memory, intent, bootstrap
//   SYSTEM: reset memory|intent|locstubs|bootstrap
//   Setup card: TERA|_SETUP|[scenario-id] — auto-configures world on turn 1

InnerSelf("input");

const modifier = (text) => {
  const t = state.tera;
  if (!t) return { text };

  // Strip AI Dungeon action prefix ("\n> "), the "You " prefix that
  // Do-mode prepends, and trailing punctuation/whitespace. InnerSelf
  // appends "\n\n" to text so we must .trim() BEFORE stripping punctuation,
  // otherwise the regex sees whitespace at the end and the period survives.
  const stripped = text
    .replace(/^\n>\s*/, "")   // remove \n> prefix
    .replace(/^you\s+/i, "")  // remove Do-mode "You " prefix
    .trim()                    // trim whitespace (incl. InnerSelf's \n\n)
    .replace(/[.!?]+$/, "")   // now remove trailing punctuation
    .trim() || text.trim();
  const isCommand = /^\/(?:tera|t)\b/i.test(stripped);

  // Region detection from player input
  const detected = detectRegion(isCommand ? "" : text);
  if (detected) t.region = detected;

  // Echo capture
  if (CFG.ECHO_ENABLED && !isCommand) {
    const EMOTIONAL_WORDS = new Set([
      "blood","death","die","kill","love","hate","fear","hope","trust",
      "betray","betrayed","betrayal","remember","forget","promise","lost",
      "alone","power","truth","lie","lies","lied","dark","shadow","end",
      "heart","soul","pain","grief","rage","mercy","faith","doubt","war",
      "peace","fire","light","silence","voice","name","secret","never",
      "always","must","cannot","only","last","first","enough"
    ]);
    const clean = text.startsWith("\n> ")
      ? text.replace(/^\n> (?:(?:I (?:say|ask|tell\b).*?[:,]?\s*"?)|(?:You\s+))?/i, "").trim()
      : text.trim();
    if (clean.length > 12) {
      const words = clean.split(/\s+/);
      const chunks = [];
      for (let i = 0; i < words.length; i++) {
        const chunk = words.slice(i, i + 5);
        if (chunk.some(w => EMOTIONAL_WORDS.has(w.toLowerCase().replace(/[^a-z]/g, "")))) {
          const phrase = chunk.join(" ").replace(/["""]+/g, "").trim();
          if (phrase.length > 10 && phrase.length < 60) chunks.push(phrase);
        }
      }
      if (chunks.length) {
        if (!Array.isArray(t._echo)) t._echo = [];
        const existing = new Set(t._echo.map(e => e.text.slice(0, 20)));
        for (const phrase of chunks) {
          if (!existing.has(phrase.slice(0, 20))) {
            t._echo.push({ text: phrase, turn: t.turn });
            existing.add(phrase.slice(0, 20));
          }
        }
        while (t._echo.length > CFG.ECHO_BUFFER_SIZE) t._echo.shift();
      }
    }
  }

  // Resonance ingest
  if (CFG.RESONANCE_ENABLED && !isCommand) {
    _resonanceIngest(text);
  }

  // v15: Intent detection
  if (CFG.INTENT_DETECT_ENABLED && !isCommand) {
    _intentDetect(text);
  }

  // v18: Player behavioral arc detection
  if (CFG.PLAYER_ARC_ENABLED && !isCommand) {
    _playerArcIngest(text);
  }

  // Fingerprint raw data collection
  if (CFG.FINGERPRINT_ENABLED && !t._fp && t.turn <= CFG.FINGERPRINT_TURNS && !isCommand) {
    if (!t._fpRaw) t._fpRaw = { turns: 0, doC: 0, sayC: 0, storyC: 0, len: 0, npcRefs: 0, vocabSet: [] };
    const raw = t._fpRaw;
    raw.turns++;
    if (text.startsWith("\n> ") && !/says?\s*"/i.test(text)) raw.doC++;
    if (text.startsWith("\n> ") && /says?\s*"/i.test(text)) raw.sayC++;
    if (!text.startsWith("\n> ")) raw.storyC++;
    raw.len += text.length;
    const lower = text.toLowerCase();
    for (const id in CARD_REGISTRY) {
      if (id.startsWith("CHR-") && lower.includes(id.slice(4).toLowerCase())) raw.npcRefs++;
    }
    const words = text.match(/\b[a-zA-Z]{6,}\b/g) || [];
    for (const w of words) {
      const lw = w.toLowerCase();
      if (!raw.vocabSet.includes(lw) && raw.vocabSet.length < 200) raw.vocabSet.push(lw);
    }
  }

  // ── Command processing ──────────────────────────────────────────
  // ─── _intentDetect (v15: reads player input, sets intent boosts) ──
  // Intent categories map player goal-language to event card tag names.
  // INTENT_CATEGORIES is defined here (inside modifier) so it has access
  // to CFG at call time. Boosts are written to state.tera._intentBoosts.
  function _intentDetect(inputText) {
    if (!CFG.INTENT_DETECT_ENABLED || !inputText) return;
    const lower = inputText.toLowerCase();
    const words = lower.match(/\b[a-z]+\b/g) || [];
    const wordSet = new Set(words);
    const INTENT_CATEGORIES = [
      { tag: "combat",    triggers: ["fight","attack","kill","defeat","destroy","slay","battle","assault","charge","strike"] },
      { tag: "social",    triggers: ["convince","persuade","negotiate","talk","speak","ask","beg","charm","threaten","reason"] },
      { tag: "mystery",   triggers: ["find","search","discover","investigate","look","seek","explore","uncover","reveal","trace"] },
      { tag: "betrayal",  triggers: ["betray","deceive","trick","lie","manipulate","scheme","plot","double"] },
      { tag: "rescue",    triggers: ["save","rescue","protect","defend","help","free","escape","flee","run"] },
      { tag: "discovery", triggers: ["learn","read","study","research","ask about","find out","know","understand"] },
      { tag: "loss",      triggers: ["mourn","grieve","remember","miss","lost","gone","dead","buried"] },
      { tag: "triumph",   triggers: ["claim","take","win","seize","prove","achieve","succeed","accomplish"] },
    ];
    const boost = CFG.INTENT_WEIGHT_BOOST || 3;
    const dur   = CFG.INTENT_BOOST_DURATION || 2;
    const ib    = state.tera._intentBoosts || (state.tera._intentBoosts = {});
    for (const cat of INTENT_CATEGORIES) {
      if (cat.triggers.some(function(tr){ return wordSet.has(tr) || lower.includes(tr + " "); })) {
        ib[cat.tag] = { boost: boost, expiresAt: state.tera.turn + dur };
      }
    }
  }
  const cmdMatch = stripped.match(/^\/(?:tera|t)\b\s*(\S+)?\s*([\s\S]*)?$/i);
  if (!cmdMatch) return { text };

  const verb = (cmdMatch[1] || "help").toLowerCase().trim();
  const args = (cmdMatch[2] || "").trim().split(/\s+/).filter(Boolean);
  let output = "";

  // ── Player Info ─────────────────────────────────────────────────
  if (verb === "status" || verb === "s") {
    output = teraStatus();

  } else if (verb === "calendar" || verb === "cal") {
    const c = t.calendar;
    output = `[Calendar]\n  Season: ${c.season}\n  Date: Day ${c.day}, Month ${c.month}, Year ${c.year}\n  Time: ${c.tod}`;

  } else if (verb === "region") {
    if (args[0]) {
      const newReg = toCode(args[0]);
      if (REGION_EXPAND[newReg]) {
        t.region = newReg;
        t.currentLocation = null;
        output = `Region set to ${toFull(newReg)} (${newReg})`;
      } else {
        output = `Unknown region code: ${args[0]}\nValid codes: ${Object.keys(REGION_EXPAND).join(", ")}`;
      }
    } else {
      output = `Current region: ${toFull(t.region)} (${t.region})${t.currentLocation ? `, location: ${t.currentLocation}` : ""}`;
    }

  } else if (verb === "flags") {
    const fl = Object.entries(t.flags || {});
    output = fl.length
      ? "[Flags]\n" + fl.map(([k,v]) => `  ${k} = ${v}`).join("\n")
      : "[Flags]  None set.";

  } else if (verb === "relations" || verb === "rels") {
    const rl = Object.entries(t.relationships || {});
    const ns = r => r >= 75 ? "trusted" : r >= 30 ? "friendly" : r <= -75 ? "hostile" : r <= -30 ? "wary" : "neutral";
    output = rl.length
      ? "[NPC Relations]\n" + rl.map(([id,r]) => `  ${id}: ${r} (${ns(r)})`).join("\n")
      : "[NPC Relations]  None.";

  } else if (verb === "clocks") {
    output = teraListClocks();

  } else if (verb === "anchors" || verb === "anc") {
    output = teraListAnchors();

  } else if (verb === "factions" || verb === "facs") {
    const fr = Object.entries(t.factions || {});
    const facLines = fr.length
      ? "[Factions — Player Relations]\n" + fr.map(([id]) => `  ${id}: ${getFactionRep(id)} (${getFactionStatus(getFactionRep(id))})`).join("\n")
      : "[Factions]  None.";
    const relKeys = Object.keys(t._factionRels || {});
    const relLines = relKeys.length
      ? "\n\n[Faction Dynamics]\n" + relKeys.map(k => {
          const [fa,fb] = k.split("__");
          const r = (t._factionRels||{})[k];
          return `  ${fa.replace(/_/g," ")} ↔ ${fb.replace(/_/g," ")}: ${r} (${getFactionRelStatus(r)})`;
        }).join("\n")
      : "\n\n[Faction Dynamics]  No inter-faction relationships established yet.";
    output = facLines + relLines;

  } else if (verb === "inventory" || verb === "inv") {
    const inv = t.inventory || [];
    output = inv.length
      ? "[Inventory]\n" + inv.map(e => `  ${e.id} (acquired t${e.acquiredTurn})`).join("\n")
      : "[Inventory]  Empty.";

  } else if (verb === "cards") {
    _teraEnsureRegistry();
    const ev = Object.values(CARD_REGISTRY).filter(c => c.tier !== "character");
    const cx = Object.values(CARD_REGISTRY).filter(c => c.tier === "character");
    const meta = t.cardMeta || {};
    const turn = t.turn;
    const evL = ev.map(c => {
      const l = meta[c.id];
      return `  ${c.id}  [${c.tier}|${c.region}|w:${c.weight}|c:${c.cooldown}]  ` +
             (l != null ? `last t${l} (+${turn - l} ago)` : "never fired");
    });
    output = `[Cards — ${Object.keys(CARD_REGISTRY).length} total]\n\n` +
             `EVENT CARDS (${ev.length}):\n` + (evL.join("\n") || "  none") +
             `\n\nCONTEXT CARDS (${cx.length}):\n` +
             (cx.map(c => `  ${c.id}  [${c.region}]`).join("\n") || "  none");

  // ── NEW v11: Player Commands ────────────────────────────────────

  } else if (verb === "journal") {
    output = _teraJournal();

  } else if (verb === "threat") {
    output = _teraThreat();

  } else if (verb === "where") {
    output = _teraWhere();

  } else if (verb === "history") {
    const n = parseInt(args[0]) || 10;
    output = _teraHistory(n);

  } else if (verb === "lore") {
    output = _teraLore(args[0] || "");

  } else if (verb === "thread") {
    output = _teraThread();

  // ── Party Commands (v13+) ────────────────────────────────────────
  } else if (verb === "party") {
    output = teraListParty();

  } else if (verb === "recruit" || verb === "join") {
    if (!args[0]) {
      output = "Usage: /tera recruit [cardId]\nExample: /tera recruit CHR-Sellen";
    } else {
      output = teraJoinParty(args[0]);
    }

  } else if (verb === "dismiss" || verb === "leave") {
    if (!args[0]) {
      output = "Usage: /tera dismiss [cardId]\nExample: /tera dismiss CHR-Sellen";
    } else {
      output = teraLeaveParty(args[0]);
    }

  // ── Scene & Detached NPCs (v13+) ───────────────────────────────
  } else if (verb === "scene") {
    output = "[Scene]  Type: " + (t._sceneType || "exploration") +
             "\n  Detected NPCs: " + ((t._sceneNpcs || []).join(", ") || "none") +
             "\n  Party: " + ((t.party || []).map(function(id){ return id.startsWith("CHR-") ? id.slice(4) : id; }).join(", ") || "none");

  } else if (verb === "detached") {
    var nloc = t.npcLocation || {};
    var nkeys = Object.keys(nloc);
    if (!nkeys.length) {
      output = "[Detached NPCs]  None — all NPCs are at their card-defined regions.";
    } else {
      var dlines = ["[Detached NPCs — " + nkeys.length + " relocated]"];
      for (var di = 0; di < nkeys.length; di++) {
        var nid = nkeys[di];
        var home = (t.npcHomeRegion || {})[nid] || "?";
        var cur = nloc[nid];
        var inP = (t.party || []).includes(nid) ? "  [IN PARTY]" : "";
        dlines.push("  " + nid + ":  home=" + home + "  current=" + cur + inP);
      }
      output = dlines.join("\n");
    }

  // ── v14: World Pressure ─────────────────────────────────────────
  } else if (verb === "pressure" || verb === "worldpressure") {
    output = teraWorldPressure();

  // ── v14: NPC-NPC Relations ──────────────────────────────────────
  } else if (verb === "npcrels") {
    output = teraNpcRels();

  } else if (verb === "npcrel" || verb === "nrel") {
    if (args.length >= 3 && !isNaN(parseInt(args[2]))) {
      adjustNpcRel(args[0], args[1], parseInt(args[2]));
      output = "[NPC Rel]  " + args[0] + " ↔ " + args[1] + " → " + getNpcRel(args[0], args[1]) + " (" + getNpcRelStatus(getNpcRel(args[0], args[1])) + ")";
    } else if (args.length === 2) {
      const rep = getNpcRel(args[0], args[1]);
      output = "[NPC Rel]  " + args[0] + " ↔ " + args[1] + ": " + rep + " (" + getNpcRelStatus(rep) + ")";
    } else {
      output = "Usage: /tera npcrel [idA] [idB] [±n]  — adjust or view NPC-NPC relationship\nExample: /tera npcrel CHR-Sellen CHR-Dalla -20";
    }

  // ── v14: NPC Goals ──────────────────────────────────────────────
  } else if (verb === "goals") {
    output = teraGoals();

  // ── v15: Deep Automation Diagnostics ────────────────────────────
  } else if (verb === "memory" || verb === "mem") {
    output = teraMemoryLog();

  } else if (verb === "intent") {
    output = teraIntent();

  } else if (verb === "bootstrap" || verb === "boot") {
    output = teraBootstrapStatus();

  // ── v18 Commands ─────────────────────────────────────────────────
  } else if (verb === "playerarc" || verb === "arc") {
    output = _teraPlayerArc();

  } else if (verb === "regionmemory" || verb === "regmem") {
    output = _teraRegionMemory(args[0]);

  // ── World State Manipulation ────────────────────────────────────
  } else if (verb === "flag" || verb === "setflag") {
    if (!args[0]) {
      output = "Usage: /tera flag [name] [value]";
    } else {
      teraSetFlag(args[0], args[1] !== undefined ? args[1] : true);
      output = `[Flag]  ${args[0]} = ${teraGetFlag(args[0])}`;
    }

  } else if (verb === "unflag" || verb === "clearflag") {
    if (!args[0]) {
      output = "Usage: /tera unflag [name]";
    } else {
      teraSetFlag(args[0], false);
      output = `[Flag]  ${args[0]} cleared`;
    }

  } else if (verb === "relate") {
    if (args.length < 2 || isNaN(parseInt(args[1]))) {
      output = "Usage: /tera relate [npc] [±n]";
    } else {
      adjustRelationship(args[0], parseInt(args[1]));
      output = `[Relation]  ${args[0]}: ${getRelationship(args[0])}`;
    }

  } else if (verb === "faction") {
    if (args.length < 2 || isNaN(parseInt(args[1]))) {
      output = "Usage: /tera faction [id] [±n]\nExample: /tera faction grey_ledger +15";
    } else {
      adjustFactionRep(args[0], parseInt(args[1]));
      output = `[Faction]  ${args[0]}: ${getFactionRep(args[0])} (${getFactionStatus(getFactionRep(args[0]))})`;
    }

  } else if (verb === "factrel" || verb === "frel") {
    if (args.length === 0) {
      output = _teraFactionMatrix();
    } else if (args.length < 3 || isNaN(parseInt(args[2]))) {
      output = "Usage: /tera factrel [factA] [factB] [±n]\nExample: /tera factrel mana_covenant circle_of_the_veil -20\nNo args: show full matrix";
    } else {
      adjustFactionRel(args[0], args[1], parseInt(args[2]));
      const relVal = getFactionRel(args[0], args[1]);
      output = `[Faction Rel]  ${args[0].replace(/_/g," ")} ↔ ${args[1].replace(/_/g," ")}: ${relVal} (${getFactionRelStatus(relVal)})`;
    }

  } else if (verb === "advance") {
    const days = parseInt(args[0]) || 1;
    advanceCalendar(days);
    const c = t.calendar;
    output = `[Calendar]  +${days} days → ${c.season}, Day ${c.day}, Month ${c.month}, Year ${c.year}  · ${c.tod}`;

  } else if (verb === "tod") {
    if (!args[0]) {
      output = `[Calendar]  Current time: ${t.calendar.tod}\n  Valid: dawn, day, dusk, night\n  Usage: /tera tod [time]`;
    } else {
      setTod(args[0].toLowerCase());
      output = `[Calendar]  Time of day → ${t.calendar.tod}`;
    }

  } else if (verb === "clock") {
    if (args.length < 2 || isNaN(parseInt(args[1]))) {
      output = "Usage: /tera clock [id] [turns] [optional label]";
    } else {
      const label = args.slice(2).join(" ") || args[0];
      teraAddClock(args[0], label, parseInt(args[1]), null);
      output = `[Clock]  "${label}" → fires in ${args[1]} turns (turn ${t.turn + parseInt(args[1])})`;
    }

  } else if (verb === "removeclock" || verb === "rmclock") {
    if (!args[0]) {
      output = "Usage: /tera removeclock [id]";
    } else {
      teraRemoveClock(args[0]);
      output = `[Clock]  Removed: ${args[0]}`;
    }

  } else if (verb === "give") {
    if (!args[0]) {
      output = "Usage: /tera give [itemId]";
    } else {
      if (!t.inventory) t.inventory = [];
      if (!t.inventory.some(e => e.id === args[0])) {
        t.inventory.push({ id: args[0], acquiredTurn: t.turn });
        _autoAnchorItem(args[0]);
        output = `[Item]  Acquired: ${args[0]}`;
      } else {
        output = `[Item]  Already held: ${args[0]}`;
      }
    }

  } else if (verb === "take") {
    if (!args[0]) {
      output = "Usage: /tera take [itemId]";
    } else {
      const before = t.inventory ? t.inventory.length : 0;
      t.inventory = (t.inventory || []).filter(e => e.id !== args[0]);
      const ancId = `item_${args[0].toLowerCase().replace(/[^a-z0-9]/g,"_")}`;
      t.anchors = (t.anchors || []).filter(a => a.id !== ancId);
      output = (t.inventory.length < before) ? `[Item]  Removed: ${args[0]}` : `[Item]  Not in inventory: ${args[0]}`;
    }

  } else if (verb === "location" || verb === "loc") {
    t.currentLocation = args[0] || null;
    output = `[Location]  ${t.currentLocation || "traveling (cleared)"}`;

  } else if (verb === "anchor") {
    if (args.length < 3 || isNaN(parseInt(args[1]))) {
      output = "Usage: /tera anchor [id] [0-9] [text...]";
    } else {
      teraAddAnchor(args[0], args.slice(2).join(" "), parseInt(args[1]), null);
      output = `[Anchor]  ${args[0]} added (priority ${args[1]})`;
    }

  } else if (verb === "removeanchor" || verb === "rmanchor") {
    if (!args[0]) {
      output = "Usage: /tera removeanchor [id]";
    } else {
      output = teraRemoveAnchor(args[0])
        ? `[Anchor]  Removed: ${args[0]}`
        : `[Anchor]  Not found: ${args[0]}`;
    }

  } else if (verb === "expireanchor") {
    if (args.length < 2 || isNaN(parseInt(args[1]))) {
      output = "Usage: /tera expireanchor [id] [turns]";
    } else {
      output = teraExpireAnchor(args[0], parseInt(args[1]));
    }

  } else if (verb === "fire") {
    if (!args[0]) {
      output = "Usage: /tera fire [cardId]";
    } else {
      _teraEnsureRegistry();
      const card = CARD_REGISTRY[args[0]];
      if (!card) {
        output = `[TERA]  Card not found: ${args[0]}\n  Run /tera cards to see loaded cards.`;
      } else {
        const narr = triggerCard(card);
        output = `[Event Fired: ${args[0]}]`;
        if (narr) text = narr + "\n\n" + text;
      }
    }

  // ── NPC State Commands ──────────────────────────────────────────
  } else if (verb === "npc") {
    if (!args[0]) {
      const entries = Object.entries(t.moods || {});
      if (!entries.length) {
        output = "[NPCs]  No NPC states recorded. Use /tera npc [id] to view or set an NPC.";
      } else {
        output = "[NPC States]\n" + entries.map(([id, m]) => {
          const crisis = (m.stress ?? 50) >= CFG.STRESS_CRISIS_THRESHOLD ? " [CRISIS]"
                       : (m.stress ?? 50) >= CFG.STRESS_HIGH_THRESHOLD   ? " [HIGH]" : "";
          return `  ${id}: ${m.mood} (int ${m.intensity})  stress:${(m.stress??50).toFixed(0)}${crisis}  trust:${(m.trust??50).toFixed(0)}`;
        }).join("\n");
      }
    } else {
      const sub = (args[1] || "").toLowerCase();
      const s = _ensureNpc(args[0].toLowerCase());
      if (!sub) {
        const mDelta = (t._activity || 0) - (s._mActSnap || 0);
        output = `[NPC: ${args[0]}]\n` +
          `  Mood:   ${s.mood} (intensity ${s.intensity})  [+${mDelta} act since set]\n` +
          `  Stress: ${s.stress}/100` +
          (s.stress >= CFG.STRESS_CRISIS_THRESHOLD ? " [CRISIS]" : s.stress >= CFG.STRESS_HIGH_THRESHOLD ? " [HIGH]" : "") + "\n" +
          `  Trust:  ${s.trust}/100\n` +
          `  Source: ${s.source || "auto"}`;
      } else if (sub === "clear") {
        delete t.moods[args[0].toLowerCase()];
        output = `[NPC]  ${args[0]} state cleared`;
      } else if (sub === "mood") {
        if (!args[2]) {
          output = `Usage: /tera npc [id] mood [${[...VALID_MOODS].join("|")}] [0-3]`;
        } else {
          s.mood = args[2];
          s.intensity = Math.max(0, Math.min(3, parseInt(args[3]) || 1));
          s._mActSnap = t._activity || 0;
          s.source = "manual";
          output = `[NPC]  ${args[0]} mood → ${s.mood} (intensity ${s.intensity})`;
        }
      } else if (sub === "stress") {
        const val = parseInt(args[2]);
        if (isNaN(val)) {
          output = "Usage: /tera npc [id] stress [0-100]";
        } else {
          s.stress = Math.max(0, Math.min(100, val));
          s._sActSnap = t._activity || 0;
          s.source = "manual";
          output = `[NPC]  ${args[0]} stress → ${s.stress}`;
        }
      } else if (sub === "trust") {
        const val = parseInt(args[2]);
        if (isNaN(val)) {
          output = "Usage: /tera npc [id] trust [0-100]";
        } else {
          s.trust = Math.max(0, Math.min(100, val));
          s.source = "manual";
          output = `[NPC]  ${args[0]} trust → ${s.trust}`;
        }
      } else {
        output = `Unknown npc subcommand: "${sub}"\nUse: mood, stress, trust, clear`;
      }
    }

  } else if (verb === "mood") {
    if (args.length < 2) {
      output = "Usage: /tera mood [npc] [mood] [0-3]";
    } else {
      if (args[1] === "clear") {
        delete t.moods[args[0].toLowerCase()];
        output = `[NPC]  ${args[0]} mood cleared`;
      } else {
        const s = _ensureNpc(args[0].toLowerCase());
        s.mood = args[1];
        s.intensity = Math.max(0, Math.min(3, parseInt(args[2]) || 1));
        s._mActSnap = t._activity || 0;
        s.source = "manual";
        output = `[NPC]  ${args[0]} mood → ${s.mood} (${s.intensity})`;
      }
    }

  } else if (verb === "moods" || verb === "npcs") {
    const entries = Object.entries(t.moods || {});
    if (!entries.length) {
      output = "[NPCs]  No NPC states recorded.";
    } else {
      output = "[NPC States]\n" + entries.map(([id, m]) => {
        const stress = (m.stress ?? 50).toFixed(0);
        const trust  = (m.trust ?? 50).toFixed(0);
        const mDelta = (t._activity || 0) - (m._mActSnap || 0);
        const crisis = m.stress >= CFG.STRESS_CRISIS_THRESHOLD ? " ⚠" : m.stress >= CFG.STRESS_HIGH_THRESHOLD ? " !" : "";
        return `  ${id}:  ${m.mood} (int ${m.intensity})  stress:${stress}/100${crisis}  trust:${trust}/100  [+${mDelta}act]`;
      }).join("\n");
    }

  // ── Diagnostics ─────────────────────────────────────────────────
  } else if (verb === "oracle") {
    const oc = t._oracle || [];
    output = oc.length
      ? "[Oracle — Active Prophecies]\n" + oc.map(o =>
          `  ${o.anchorId}${o.isLegacy ? " [legacy]" : ""} → fulfills ${o.fulfillsCardId || "any"}\n  "${o.prophecyText}"`
        ).join("\n")
      : "[Oracle]  No active prophecies.";

  } else if (verb === "resonance") {
    const rs = Object.entries(t._resonance || {}).sort(([,a],[,b]) => b-a).slice(0, 20);
    output = rs.length
      ? "[Resonance — Top 20 words]\n" + rs.map(([w,v]) => `  ${w}: ${v}`).join("\n")
      : "[Resonance]  No tokens yet.";

  } else if (verb === "fatearc" || verb === "arc") {
    const fa = t._fateArc || {};
    const total = Object.values(fa).reduce((a,b) => a + b, 0);
    const dom = Object.entries(fa).sort(([,a],[,b]) => b-a)[0];
    output = `[Fate Arc]\n  tragedy: ${fa.tragedy||0}\n  triumph: ${fa.triumph||0}\n  mystery: ${fa.mystery||0}\n  comedy:  ${fa.comedy||0}\n` +
             `  Total: ${total}  Dominant: ${dom && dom[1] > 0 ? dom[0] : "none"}`;

  } else if (verb === "echo") {
    const eb = t._echo || [];
    output = eb.length
      ? "[Echo Buffer]\n" + eb.map((e,i) => `  ${i+1}. (t${e.turn})  "${e.text}"`).join("\n")
      : "[Echo Buffer]  Empty.";

  } else if (verb === "fingerprint" || verb === "fp") {
    if (!t._fp) {
      const raw = t._fpRaw || {};
      output = `[Fingerprint]  Profiling (t${t.turn}/${CFG.FINGERPRINT_TURNS})\n` +
        `  Do:${raw.doC||0}  Say:${raw.sayC||0}  Story:${raw.storyC||0}\n` +
        `  NPC refs: ${raw.npcRefs||0}  Vocab: ${(raw.vocabSet||[]).length} words`;
    } else {
      output = `[Fingerprint]  Locked in at turn ${t._fp.lockedTurn}\n` +
        `  Style: ${t._fp.style}\n` +
        `  Engagement: ${t._fp.engagement}\n` +
        `  NPC affinity: ${t._fp.npcAffinity}`;
    }

  // ── NEW v11: trace — scoring breakdown for last fired card ──────
  } else if (verb === "trace") {
    const tr = t._lastTrace;
    if (!tr) {
      output = "[Trace]  No card has fired yet this session. Play a few turns first.";
    } else {
      const scoreLines = [];
      scoreLines.push(`  base priority:       ${tr.base}`);
      if (tr.scoreAge)    scoreLines.push(`  age recency:        +${tr.scoreAge}  (${tr.ageLabel})`);
      if (tr.scoreRegion) scoreLines.push(`  region match:       +${tr.scoreRegion}`);
      if (tr.scoreLoc)    scoreLines.push(`  location pin:       +${tr.scoreLoc}`);
      if (tr.scoreInv)    scoreLines.push(`  inventory:          +${tr.scoreInv}`);
      if (tr.scoreTags)   scoreLines.push(`  tag overlap:        +${tr.scoreTags}`);
      if (tr.scoreRel)    scoreLines.push(`  NPC relation:       +${tr.scoreRel}`);
      if (tr.scoreRes)    scoreLines.push(`  resonance (IS):     +${tr.scoreRes}`);
      if (tr.scoreArc)    scoreLines.push(`  fate arc counter:   +${tr.scoreArc}`);
      if (tr.scoreFp)     scoreLines.push(`  fingerprint bias:   +${tr.scoreFp > 0 ? "+" : ""}${tr.scoreFp}`);
      if (tr.scoreIs)     scoreLines.push(`  IS-bridge:          +${tr.scoreIs}`);
      if (tr.scoreTh)     scoreLines.push(`  thread boost:       +${tr.scoreTh}`);
      if (tr.scoreParty)  scoreLines.push(`  party companion:    +${tr.scoreParty}`);
      if (tr.scoreScene)  scoreLines.push(`  scene-active NPC:   +${tr.scoreScene}`);
      const wLines = [];
      wLines.push(`  base weight:         ${tr.baseW}`);
      if (tr.modW)  wLines.push(`  weight mod:         ${tr.modW > 0 ? "+" : ""}${tr.modW}  (from /tera config or FX)`);
      if (tr.tagW)  wLines.push(`  tag bonus:          +${tr.tagW}`);
      if (tr.actW)  wLines.push(`  activity bonus:     +${tr.actW}  (activity ${getActivity(tr.region)})`);
      output =
        `[Trace: ${tr.cardId}  |  t${tr.turn}  |  ${tr.tier}  |  ${tr.region}]\n\n` +
        `CONTEXT SCORE  (determines injection priority among character cards)\n` +
        scoreLines.join("\n") + "\n" +
        `  ${"─".repeat(38)}\n` +
        `  total score:         ${tr.totalScore}\n\n` +
        `SELECTION WEIGHT  (determines probability of being picked as event)\n` +
        wLines.join("\n") + "\n" +
        `  ${"─".repeat(38)}\n` +
        `  effective weight:    ${tr.effW}`;
    }

  // ── NEW v11: context — context card scoring rankings ────────────
  } else if (verb === "context") {
    output = _teraCoverageContext();

  } else if (verb === "debug") {
    _teraEnsureRegistry();
    const ev = Object.values(CARD_REGISTRY).filter(c => c.tier !== "character").length;
    const cx = Object.values(CARD_REGISTRY).filter(c => c.tier === "character").length;
    const activity = Object.entries(t.activity || {}).map(([r,v]) => `${r}:${v}`).join(", ") || "none";
    output = `[TERA v18 Debug Dump]\n` +
      `  Turn: ${t.turn}\n` +
      `  Registry: ${ev} event + ${cx} character cards\n` +
      `  Activity: ${activity}\n` +
      `  Global activity: ${t._activity || 0}\n` +
      `  Party: ${(t.party||[]).join(", ") || "none"} (${(t.party||[]).length}/${CFG.MAX_PARTY_SIZE})\n` +
      `  Detached NPCs: ${Object.keys(t.npcLocation||{}).length}\n` +
      `  Scene: ${t._sceneType || "exploration"} | detected: ${(t._sceneNpcs||[]).length}\n` +
      `  Anchors: ${(t.anchors||[]).length} (cap 8)\n` +
      `  Echo buffer: ${(t._echo||[]).length}/${CFG.ECHO_BUFFER_SIZE}\n` +
      `  Resonance tokens: ${Object.keys(t._resonance||{}).length}\n` +
      `  Fate Arc: T${t._fateArc?.tragedy||0} Tr${t._fateArc?.triumph||0} M${t._fateArc?.mystery||0} C${t._fateArc?.comedy||0}\n` +
      `  Oracle: ${(t._oracle||[]).length} prophecies\n` +
      `  Clocks: ${(t.clocks||[]).length} active\n` +
      `  NPC states: ${Object.keys(t.moods||{}).length}\n` +
      `  Weight mods: ${Object.keys(t.weightMods||{}).length}\n` +
      `  Fingerprint: ${t._fp ? t._fp.style + "/" + t._fp.engagement : "profiling"}\n` +
      `  Flags: ${Object.keys(t.flags||{}).length}\n` +
      `  Inventory: ${(t.inventory||[]).length} items\n` +
      `  Relationships: ${Object.keys(t.relationships||{}).length}\n` +
      `  Factions: ${Object.keys(t.factions||{}).length}\n` +
      `  Faction rels: ${Object.keys(t._factionRels||{}).length}\n` +
      `  cardMeta entries: ${Object.keys(t.cardMeta||{}).length}\n` +
      `  Last trace: ${t._lastTrace ? t._lastTrace.cardId + " (t" + t._lastTrace.turn + ")" : "none"}\n` +
      `  Recent cards ring: ${(t.recentCards||[]).join(", ") || "empty"}\n` +
      `  NPC-NPC rels: ${Object.keys(t._npcRels||{}).length}\n` +
      `  NPC goals active: ${Object.values(t.moods||{}).filter(s=>s.goal).length}\n` +
      `  World pressure: ${JSON.stringify(t._worldPressure||{})}\n` +
      `  Active intents: ${Object.keys(t._intentBoosts||{}).filter(k=>(t._intentBoosts[k].expiresAt||0)>=t.turn).join(", ")||"none"}\n` +
      `  Memory compressions: ${t._memCompressCount||0}\n` +
      `  Bootstrap: ${t._setupDone ? "done (" + (t._bootstrapLog||[]).length + " directives)" : "pending"}\n` +
      `  NPC stubs created: ${Object.keys(t._npcStubCreated||{}).length}\n` +
      `  LOC stubs created: ${Object.keys(t._locStubCreated||{}).length}`;

  // ── Legacy Commands ─────────────────────────────────────────────
  } else if (verb === "export") {
    const sub = (args[0] || "").toLowerCase();
    if (sub === "legacy") {
      output = teraExportLegacy();
    } else if (sub === "state") {
      output = _teraExportState();
    } else {
      output = "Usage: /tera export legacy\n       /tera export state  (full JSON state dump)";
    }

  } else if (verb === "import") {
    if ((args[0] || "").toLowerCase() !== "legacy") {
      output = "Usage: /tera import legacy [code]";
    } else {
      const code = args.slice(1).join("");
      if (!code) {
        output = "Usage: /tera import legacy [code]";
      } else {
        output = teraApplyLegacy(code);
      }
    }

  } else if (verb === "legacy") {
    output = teraLegacyStatus();

  // ── Author Tools ────────────────────────────────────────────────
  } else if (verb === "validate" || verb === "val") {
    if (!args[0]) {
      output = "Usage: /tera validate [cardId]";
    } else {
      output = _teraValidate(args[0]);
    }

  } else if (verb === "simulate" || verb === "sim") {
    output = _teraSimulate();

  // ── NEW v11: audit — validate all cards at once ─────────────────
  } else if (verb === "audit") {
    output = _teraAudit();

  // ── NEW v11: coverage — per-region card availability ───────────
  } else if (verb === "coverage" || verb === "cov") {
    output = _teraCoverage();

  // ── NEW v11: graph — dependency tree for a card ─────────────────
  } else if (verb === "graph") {
    output = _teraGraph(args[0] || "");

  // ── NEW v11: mock — simulate as-if in a different region ────────
  } else if (verb === "mock") {
    if (!args[0]) {
      output = "Usage: /tera mock [regionCode]\nSimulates card eligibility as if the player were in that region.\nDoes NOT change actual game state.";
    } else {
      const code = args[0].toLowerCase();
      if (!REGION_EXPAND[code] && code !== "xw") {
        output = `Unknown region: ${code}\nValid: ${[...Object.keys(REGION_EXPAND), "xw"].join(", ")}`;
      } else {
        const savedRegion = t.region;
        t.region = code;
        output = `[Mock Region: ${toFull(code)}]\n` + _teraSimulate();
        t.region = savedRegion;
      }
    }

  // ── System Commands ─────────────────────────────────────────────
  } else if (verb === "config" || verb === "cfg") {
    if (!args[0]) {
      output = "[Config — Current Values]\n" +
        Object.entries(CFG).map(([k,v]) => `  ${k}: ${v}`).join("\n") +
        "\n\nUse /tera config [key] [value] to change a setting.";
    } else if (args.length < 2) {
      const val = CFG[args[0]];
      output = val !== undefined ? `[Config]  ${args[0]} = ${val}` : `Unknown config key: ${args[0]}`;
    } else {
      const configCard = (typeof storyCards !== "undefined")
        ? storyCards.find(c => typeof c.keys === "string" && c.keys.startsWith("TERA|_CONFIG|"))
        : null;
      if (!configCard) {
        output = "Config card not found. Create a story card with keys starting with TERA|_CONFIG|";
      } else {
        const key = args[0];
        const value = args.slice(1).join(" ");
        if (!(key in CFG)) {
          output = `Unknown config key: ${key}\nValid keys: ${Object.keys(CFG).join(", ")}`;
        } else {
          const lines = (configCard.entry || "").split("\n");
          let found = false;
          const updated = lines.map(l => {
            const idx = l.indexOf(":");
            if (idx !== -1 && l.slice(0, idx).trim() === key) { found = true; return key + ": " + value; }
            return l;
          });
          if (!found) updated.push(key + ": " + value);
          configCard.entry = updated.join("\n");
          if (value === "true") CFG[key] = true;
          else if (value === "false") CFG[key] = false;
          else if (!isNaN(Number(value))) CFG[key] = Number(value);
          else CFG[key] = value;
          output = `[Config]  ${key} = ${value}`;
        }
      }
    }

  } else if (verb === "reset") {
    const sub = (args[0] || "").toLowerCase();
    const resets = {
      echo:        () => { t._echo = [];         return "Echo buffer cleared."; },
      resonance:   () => { t._resonance = {};     return "Resonance map cleared."; },
      fatearc:     () => { t._fateArc = { tragedy:0, triumph:0, mystery:0, comedy:0 }; return "Fate Arc cleared."; },
      oracle:      () => { (t._oracle || []).forEach(o => teraRemoveAnchor(o.anchorId)); t._oracle = []; return "Oracle cleared."; },
      moods:       () => { t.moods = {};          return "All NPC states cleared."; },
      fingerprint: () => { t._fp = null; t._fpRaw = { turns:0, doC:0, sayC:0, storyC:0, len:0, npcRefs:0, vocabSet:[] }; return "Fingerprint cleared."; },
      weightmods:  () => { t.weightMods = {};     return "Weight mods cleared."; },
      registry:    () => { t._di = {}; _teraEnsureRegistry(); return "Delta registry rebuilt (" + Object.keys(CARD_REGISTRY).length + " cards)."; },
      activity:    () => { t.activity = {}; t._activity = 0; return "Activity counters cleared."; },
      clocks:      () => { t.clocks = [];         return "All clocks removed."; },
      trace:       () => { t._lastTrace = null;   return "Trace cleared."; },
      thread:      () => { t._thread = null;       return "Active thread closed."; },
      factionrels: () => { t._factionRels = {};    return "All faction relationships cleared."; },
      party:       () => { (t.party||[]).forEach(function(id){ teraLeaveParty(id); }); t.party = []; return "Party cleared."; },
      detached:    () => { t.npcLocation = {}; t.npcHomeRegion = {}; t._npcLastInteract = {}; return "All NPC relocations cleared."; },
      sentiment:   () => { t._sentimentCooldown = {};  return "Sentiment cooldowns cleared."; },
      // v14 resets
      worldpressure: () => { t._worldPressure = {}; t._toneValveLastBoostTurn = 0; return "World pressure and tone valve cleared."; },
      factionai:   () => { t._factionAIState = {}; return "Faction AI threshold states cleared."; },
      npcrels:     () => { t._npcRels = {}; t._lastNpcRelDecay = 0; return "All NPC-NPC relationships cleared."; },
      npcgoals:    () => { Object.values(t.moods || {}).forEach(function(s){ delete s.goal; delete s.goalProgress; delete s.goalKeywords; }); return "All NPC goals cleared."; },
      npcstubs:    () => { t._npcStubCandidates = {}; t._npcStubCreated = {}; _npcNameMap = null; return "NPC stub candidates and created stubs cleared. Registry will rebuild on next scan."; },
      // v15 resets
      memory:      () => {
        (t.anchors || []).filter(a => a.id.startsWith("_mem_compress_")).forEach(a => teraRemoveAnchor(a.id));
        t._memCompressCount = 0; t._lastMemCompress = 0;
        return "Memory compression anchors cleared.";
      },
      intent:      () => { t._intentBoosts = {}; return "Intent boosts cleared."; },
      locstubs:    () => { t._locStubCandidates = {}; t._locStubCreated = {}; return "Location stub candidates and created stubs cleared."; },
      bootstrap:   () => { t._setupDone = false; t._bootstrapLog = []; return "Bootstrap state reset. Will re-run from TERA|_SETUP|... card on next turn."; },
      all:         () => {
        t._echo = []; t._resonance = {}; t._oracle = []; t._lastTrace = null;
        t._fateArc = { tragedy:0, triumph:0, mystery:0, comedy:0 };
        t.moods = {}; t.weightMods = {}; t._thread = null;
        t._worldPressure = {}; t._toneValveLastBoostTurn = 0;
        t._factionAIState = {}; t._npcRels = {}; t._npcStubCandidates = {}; t._npcStubCreated = {};
        t._intentBoosts = {}; t._locStubCandidates = {}; t._locStubCreated = {};
        t._memCompressCount = 0; t._lastMemCompress = 0;
        (t.anchors || []).filter(a => a.id.startsWith("_mem_compress_")).forEach(a => teraRemoveAnchor(a.id));
        return "All subsystems reset.\n⚠ World state (factions/flags/inventory/relations/factionRels/bootstrap) preserved.";
      }
    };
    if (resets[sub]) {
      output = "[Reset]  " + resets[sub]();
    } else {
      output = "Usage: /tera reset [echo | resonance | fatearc | oracle | moods | fingerprint | weightmods | registry | activity | clocks | trace | thread | factionrels | party | detached | sentiment | worldpressure | factionai | npcrels | npcgoals | npcstubs | memory | intent | locstubs | bootstrap | all]";
    }

  } else if (verb === "setup") {
    output = "[Setup]  TERA v18 initialized. All subsystems active.\n" +
             "  Card registry: " + Object.keys(CARD_REGISTRY).length + " cards loaded.\n" +
             "  Scenario mode: " + (CFG.SCENARIO_MODE || "standard") + "\n" +
             "  Create scenario cards with keys: TERA|[ID]|[tier]|[region]|w:[n]|c:[n]|[deps]\n" +
             "  Config card keys: TERA|_CONFIG|[your-scenario-id]\n" +
             "  v17 Small-scenario support:\n" +
             "    SCENARIO_MODE: standard | solo | oneshot\n" +
             "    RING_SIZE: " + CFG.RING_SIZE + "   (recent-card exclusion window; scales dynamically)\n" +
             "    COOLDOWN_SCALE: " + CFG.COOLDOWN_SCALE + "   (multiplies all cooldowns — solo=0.6, oneshot=0.25)\n" +
             "    TIER_CASCADE_ENABLED: " + CFG.TIER_CASCADE_ENABLED + "   (falls back to adjacent tiers when pool empty)\n" +
             "    XW_EVENTS_IN_REGION: " + CFG.XW_EVENTS_IN_REGION + "    (cross-world cards included in region selection)\n" +
             "  v16 Activity-based decay: MOOD_DECAY_ACTIVITY / WEIGHT_DECAY_ACTIVITY\n" +
             "    FACTION_REL_DECAY_ACTIVITY / NPC_NPC_REL_DECAY_ACTIVITY\n" +
             "    Activity pts: minor=+1, moderate=+3, major=+6\n" +
             "  v15 Auto-Bootstrap: create card TERA|_SETUP|[scenario-id]\n" +
             "  Run /tera audit to check all cards, /tera bootstrap to verify setup.";

  // ── Help ────────────────────────────────────────────────────────
  } else if (verb === "help") {
    output =
      "T.E.R.A. v14 — Command Reference\n" +
      "  Shorthand: /t = /tera\n\n" +
      "PLAYER INFO\n" +
      "  status (s)            Full engine state\n" +
      "  where                 Current region, location, time, companions\n" +
      "  journal               History of significant events (major/moderate)\n" +
      "  threat                Activity levels per region + active clocks\n" +
      "  history [n]           Last n fired events with turn numbers (default 10)\n" +
      "  thread                Active scene thread: tag, turns left, boosted cards\n" +
      "  lore [cardId]         Read a card's narrative without firing it\n" +
      "  calendar (cal)        Current date/season/time\n" +
      "  region [code]         View or set current region\n" +
      "  flags                 All set flags\n" +
      "  relations (rels)      NPC relationship scores\n" +
      "  clocks                Active countdown clocks\n" +
      "  anchors (anc)         Memory anchors\n" +
      "  factions (facs)       Faction reputation + inter-faction matrix\n" +
      "  inventory (inv)       Held items\n" +
      "  cards                 All loaded TERA cards\n\n" +
      "PARTY (v13)\n" +
      "  party                 List current companions with mood/stress/trust\n" +
      "  recruit [cardId]      Add NPC to party (max " + CFG.MAX_PARTY_SIZE + ")\n" +
      "  dismiss [cardId]      Remove NPC from party (stays in current region)\n" +
      "  scene                 Current scene type + detected NPCs\n" +
      "  detached              Show all NPCs that have been relocated\n\n" +
      "WORLD SIMULATION (v14 Layer 4)\n" +
      "  pressure              World pressure per region — see which regions are neglected\n" +
      "  goals                 NPC goal progress for all tracked NPCs\n" +
      "  npcrels               NPC-NPC relationship matrix\n" +
      "  npcrel [A] [B]        View relationship between two NPCs\n" +
      "  npcrel [A] [B] [±n]   Adjust relationship between two NPCs\n\n" +
      "DEEP AUTOMATION (v15 Layer 6)\n" +
      "  memory (mem)          Compressed event history anchors\n" +
      "  intent                Active player intent boosts — which tag cards are boosted\n" +
      "  bootstrap (boot)      Auto-bootstrap status — directives applied from TERA|_SETUP|...\n\n" +
      "WORLD\n" +
      "  flag [name] [val]     Set a flag (val optional, defaults true)\n" +
      "  unflag [name]         Clear a flag\n" +
      "  relate [npc] [±n]     Adjust NPC relationship\n" +
      "  faction [id] [±n]     Adjust faction rep\n" +
      "  factrel (frel)        Show inter-faction relationship matrix\n" +
      "  factrel [fA] [fB] [±n]  Adjust relationship between two factions\n" +
      "  advance [days]        Advance calendar\n" +
      "  tod [dawn|day|dusk|night]  Set time of day\n" +
      "  clock [id] [n] [label]    Add countdown clock\n" +
      "  removeclock [id]      Remove a clock\n" +
      "  give [itemId]         Add item to inventory\n" +
      "  take [itemId]         Remove item from inventory\n" +
      "  location [id]         Set current location (blank to clear)\n" +
      "  anchor [id] [0-9] [text]  Add memory anchor\n" +
      "  removeanchor [id]     Remove anchor\n" +
      "  expireanchor [id] [turns]  Set anchor expiry\n" +
      "  fire [cardId]         Force-fire a TERA event card\n\n" +
      "NPC\n" +
      "  npc                   List all NPC states\n" +
      "  npc [id]              View NPC detail\n" +
      "  npc [id] mood [mood] [0-3]   Set mood + intensity\n" +
      "  npc [id] stress [0-100]      Set stress\n" +
      "  npc [id] trust [0-100]       Set trust\n" +
      "  npc [id] clear        Remove NPC state\n" +
      "  moods / npcs          List all NPCs (shorthand)\n\n" +
      "DIAGNOSTICS\n" +
      "  trace                 Scoring breakdown for the last fired card\n" +
      "  context               Context card rankings — which score highest and inject\n" +
      "  oracle                Active prophecies\n" +
      "  resonance             Top resonance word scores\n" +
      "  fatearc (arc)         Fate arc accumulation\n" +
      "  echo                  Echo phrase buffer\n" +
      "  fingerprint (fp)      Player style profile\n" +
      "  debug                 Full internal state dump\n\n" +
      "LEGACY\n" +
      "  export legacy         Generate legacy carry-forward code\n" +
      "  import legacy [code]  Apply legacy from previous game\n" +
      "  legacy                Legacy status\n\n" +
      "AUTHOR TOOLS\n" +
      "  audit                 Validate ALL cards — summary of errors/warnings\n" +
      "  coverage (cov)        Per-region card availability: ready / cooldown / gated\n" +
      "  graph [cardId]        Dependency tree: what a card requires + what it unlocks\n" +
      "  mock [region]         Simulate card eligibility as-if in a different region\n" +
      "  validate [id]         Full validation of a single card\n" +
      "  simulate (sim)        Preview eligible event cards in current region\n\n" +
      "SYSTEM\n" +
      "  config                View all config values\n" +
      "  config [key] [val]    Change a config value\n" +
      "  export state          Full JSON state dump (for debugging)\n" +
      "  reset [subsystem]     Clear: echo|resonance|fatearc|oracle|moods|fingerprint\n" +
      "                               weightmods|registry|activity|clocks|trace|thread\n" +
      "                               factionrels|party|detached|sentiment\n" +
      "                               worldpressure|factionai|npcrels|npcgoals|npcstubs\n" +
      "                               memory|intent|locstubs|bootstrap|all\n" +
      "  setup                 Re-initialize / show setup info\n\n" +
      "PARTY GATES (v13)\n" +
      "  party:CHR-Sellen      Card fires only if Sellen is in the party\n" +
      "  party_not:CHR-Dalla   Card fires only if Dalla is NOT in the party\n" +
      "  party_size:>=2        Card fires only with 2+ companions\n" +
      "  companion:1           Marks card as a companion event (parallel pool)\n" +
      "  FX: joinParty:CHR-Sellen    Add NPC to party via card effect\n" +
      "  FX: leaveParty:CHR-Sellen   Remove NPC from party via card effect\n" +
      "  FX: relocateNpc:CHR-Sellen|vnr  Move NPC to a region\n" +
      "  FX: setRegion:vmf           Change player region (triggers travel automation)\n\n" +
      "THREAD (v12)\n" +
      "  thread:TAG            Open thread TAG when this card fires\n" +
      "  thread_duration:N     Thread lasts N turns (default: 6)\n" +
      "  thread_match:TAG      Card gets +8 weight when TAG thread active\n" +
      "  thread_break:1        Close active thread when this card fires\n" +
      "  requires_thread:TAG   Card only eligible while TAG thread active\n" +
      "  FX: openthread:TAG|N  Open thread programmatically\n" +
      "  FX: closethread       Close thread programmatically\n\n" +
      "FACTION DYNAMICS (v12)\n" +
      "  faction_rel:fA,fB>=N  Gate on inter-faction relationship value\n" +
      "  Operators: >= <= > < = !=   Range: -100 to +100\n" +
      "  FX: adjustFactionRel:factA factB ±N  Modify faction relationship\n\n" +
      "WORLD SIMULATION CARD FIELDS (v14 Layer 4)\n" +
      "  fires_boost: EVT-X+4, EVT-Y+2   Consequence graph — boosts other cards on fire\n" +
      "  (Any card can have fires_boost; it applies when that card fires)\n\n" +
      "NPC AGENCY CARD FIELDS (v14 Layer 5)\n" +
      "  goal: reclaim_throne             NPC's driving agenda (on CHR cards)\n" +
      "  goal_keywords: throne,crown      Keywords to track in output (optional)\n" +
      "  npc_rivals: CHR-Dalla            Seeds -35 relationship on first meeting\n" +
      "  npc_allies: CHR-Sellen           Seeds +35 relationship on first meeting\n" +
      "  FX: adjustNpcRel:CHR-A CHR-B ±N  Modify NPC-NPC relationship\n" +
      "  FX: setNpcGoal:npcName|goal_label|keywords  Set goal from a card effect\n" +
      "  FX: setNpcGoalProgress:npcName|N            Force goal progress value\n\n" +
      "AUTO-BOOTSTRAP SETUP CARD (v15 Layer 6)\n" +
      "  Create card: TERA|_SETUP|[scenario-id]  (entry = directives, runs turn 1 only)\n" +
      "  region: vnr                 Set starting region\n" +
      "  faction: id | rep           Register faction with rep\n" +
      "  unlock_continent: name      Unlock continent\n" +
      "  anchor: id | priority | text  Add memory anchor\n" +
      "  flag: name = value          Set a flag\n" +
      "  npc_mood: name|mood|int|stress|trust  Set NPC state\n" +
      "  npc_goal: name|label|keywords  Set NPC goal\n" +
      "  clock: id | turns | label   Start a countdown clock\n" +
      "  tag: region | tagname       Add a region tag\n" +
      "  calendar: day|month|year|season|tod  Set calendar\n" +
      "  weight: CARD-ID | delta     Set card weight mod\n" +
      "  origin: value               Set player origin\n" +
      "  npc_rel: CHR-A | CHR-B | n  Set NPC-NPC relationship\n" +
      "  faction_rel: fA | fB | n    Set faction relationship\n\n" +
      "v16 ACTIVITY-BASED DECAY CONFIG KEYS\n" +
      "  MOOD_DECAY_ACTIVITY: 12          Activity pts between mood decay ticks\n" +
      "  WEIGHT_DECAY_ACTIVITY: 18        Activity pts between weight mod decay\n" +
      "  FACTION_REL_DECAY_ACTIVITY: 20   Activity pts between faction rel decay\n" +
      "  NPC_NPC_REL_DECAY_ACTIVITY: 24   Activity pts between NPC-NPC rel decay\n" +
      "  Activity pts accrued: minor=+1, moderate=+3, major=+6 per fired card.\n\n" +
      "v17 SMALL-SCENARIO CONFIG KEYS\n" +
      "  SCENARIO_MODE: standard|solo|oneshot\n" +
      "    standard  — default, full settings for large open-world scenarios\n" +
      "    solo      — single-region, 6–20 cards, ring=4, cooldown×0.6\n" +
      "    oneshot   — tiny pool, 2–8 cards, ring=2, cooldown×0.25, pressure off\n" +
      "  RING_SIZE: N             Recent-card exclusion window (default 8)\n" +
      "                           Scales down automatically when pool is small.\n" +
      "  COOLDOWN_SCALE: 0.0–2.0  Multiplies ALL card cooldowns at fire-time.\n" +
      "  TIER_CASCADE_ENABLED: true  Falls back to adjacent tiers when pool empty.\n" +
      "  XW_EVENTS_IN_REGION: true   Cross-world cards included in region pool.\n\n" +
      "v18 LAYER 7 FEATURES\n" +
      "  PLAYER ARC (7A) — arc:mercy|aggression|diplomacy|sacrifice|protection|curiosity\n" +
      "    Card description field: arc: mercy\n" +
      "    Gate: player_arc:mercy>=3\n" +
      "    Config: PLAYER_ARC_ENABLED / PLAYER_ARC_BOOST / PLAYER_ARC_TURNS / PLAYER_ARC_THRESHOLD\n" +
      "    Command: /tera playerarc (arc)\n" +
      "  MULTI-STAGE CLOCKS (7B)\n" +
      "    FX: addClock:id|label|turns|cardId|8=warning,4=critical\n" +
      "    Gate: clock_stage:patrol=warning\n" +
      "    Flags auto-set: clock_id_stage=true on each transition\n" +
      "    Config: CLOCK_STAGES_ENABLED\n" +
      "  REGION NARRATIVE MEMORY (7C)\n" +
      "    Auto-records moderate/major events per region (last 3).\n" +
      "    Gate: region_event:CARD-ID\n" +
      "    Config: REGION_MEMORY_ENABLED / REGION_MEMORY_DEPTH / REGION_MEMORY_MIN_TIER\n" +
      "    Command: /tera regionmemory [region] (regmem)";

  } else {
    output = `Unknown command: /tera ${verb}\nTry /tera help`;
  }

  if (output) {
    state.tera._cmdOut = output;
  }

  return { text };
};

// AI Dungeon calls modifier(text) automatically — do not call it here.

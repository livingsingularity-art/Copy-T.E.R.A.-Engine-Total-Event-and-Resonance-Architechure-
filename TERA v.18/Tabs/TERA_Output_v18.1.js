// OUTPUT TAB – T.E.R.A. v18
// v16 adds: activity-based decay for moods, weight mods, faction rels,
// NPC-NPC rels. Efficiency pass: sentiment/scene Sets, cached resonance/
// fateArc/IS-bridge, _hasGates fast-path, NPC scan regex union.
//
// v18-fix: Event card narratives are no longer appended directly to output.
// Instead they are stored in state.tera._pendingEvent and injected by the
// Context tab on the NEXT turn as a writing directive — so the AI weaves
// them into its prose rather than having them stapled on as raw paragraphs.
//
// v18-fix3: try/catch around teraTurn() so any internal exception is caught
// gracefully rather than crashing the modifier and swallowing the AI output.
// Errors are logged to Console Log for diagnostics without breaking play.

InnerSelf("output");

const modifier = (text) => {
  const t = state.tera;
  if (!t) return { text };

  // If the Input tab queued a /tera command response, show it to the player
  // and discard whatever the AI generated this turn.
  if (t._cmdOut) {
    const out = t._cmdOut;
    delete t._cmdOut;
    return { text: out };
  }

  // Run the TERA turn engine — updates all state (cardMeta, moods, factions,
  // resonance, arcs, stubs, etc.) and returns a narrative string if a card fired.
  // The try/catch ensures any internal exception is caught gracefully so the
  // modifier always returns the AI's text even if the engine hits an error.
  try {
    const teraResult = teraTurn(text);
    if (teraResult) {
      t._pendingEvent = teraResult;
    }
  } catch (e) {
    console.log("TERA ENGINE ERROR: " + e.message + " | " + (e.stack || "").split("\n")[1]);
  }

  return { text };
};

// AI Dungeon calls modifier(text) automatically — do not call it here.

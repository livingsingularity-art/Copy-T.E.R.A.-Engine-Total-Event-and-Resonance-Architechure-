// OUTPUT TAB – T.E.R.A. v18
// v16 adds: activity-based decay for moods, weight mods, faction rels,
// NPC-NPC rels. Efficiency pass: sentiment/scene Sets, cached resonance/
// fateArc/IS-bridge, _hasGates fast-path, NPC scan regex union.
//
// v18-fix: Event card narratives are no longer appended directly to output.
// Instead they are stored in state.tera._pendingEvent and injected by the
// Context tab on the NEXT turn as a writing directive — so the AI weaves
// them into its prose rather than having them stapled on as raw paragraphs.

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
  const teraResult = teraTurn(text);

  // Store the narrative for the Context tab to inject next turn.
  // Do NOT append it directly — the AI has already finished writing this turn.
  if (teraResult) {
    t._pendingEvent = teraResult;
  }

  // Always return unmodified text.
  return { text };
};

// AI Dungeon calls modifier(text) automatically — do not call it here.

# AID Practical Scripting Guide

Derived from AutoCards v1.1.3, InnerSelf v1.0.2 (both by LewdLeah), Narrative Guidance Overhaul v1.0.2 (NGO). Code from these scripts supersedes official docs where they differ. Patterns are abstractions — adapt, don't copy verbatim.

---

## Testing Workflow

Do this first. Everything below is useless if you can't verify it.

1. Script Test panel (right side): modify input JSON, Submit, inspect text/stop/logs/state/storyCards
2. Console Log panel: real-time logs from creator-owned adventures (15min retention)
3. Inspect button: recent model context + game state (15min retention, creator-owned only)
4. Play button: opens new adventure tab for live testing
5. Use `log()` liberally during dev; remove/guard for production

---

## Architecture

```
Execution order: Library → Input | Library → Context | Library → Output
Scenarios: Simple Start + Character Creator only. MultiChoice children independent.
```

### Params (direct access, no destructuring)

|Param|Type|Input|Context|Output|
|---|---|---|---|---|
|`text`|string|player input|full AI prompt|AI response|
|`history`|Action[]|✓|✓|✓|
|`storyCards`|Card[]|✓|✓|✓|
|`state`|object|✓|✓|✓|
|`info`|object|✓|✓ (+maxChars,memoryLength)|✓|

**Action:** `{text, rawText(deprecated), type}` — types: start, continue, do, say, story, see
**Card (official):** `{id, keys, entry, type}`
**Card (undocumented but functional):** also `title`, `description` — `addStoryCard(keys,entry,type)` sets `.keys` and `.title` to same value. `.description` used by InnerSelf/AutoCards for brain storage. Not guaranteed stable; guard with `|| ""`.

### state special fields
```
state.memory.context     → prepended before history (overrides UI Memory)
state.memory.authorsNote → before last AI response (overrides UI Author's Note)
state.memory.frontMemory → after last player input
state.message            → shown to player (not yet on Phoenix)
```
- Empty/unset `context`|`authorsNote` → UI fallback; cannot clear completely via state
- `state.memory` changes in onOutput → no effect until next action

---

## `stop` Behavior (consolidated reference)

`stop` is **not declared** by the sandbox. It does not exist until created. Any script using it must initialize first:
```js
globalThis.stop ??= false;
```

### Full behavior table

|Hook|text=""|stop:true|text:null + stop:true|
|---|---|---|---|
|Input|ERROR|ERROR shown to player (intentional for command parsers)|Official command parser precedent — sanctioned|
|Context|built as if no script ran|ERROR "AI stumped"|untested|
|Output|ERROR "custom script failed"|output becomes literal "stop" — never do this|untested|

**Summary:**
- **Input:** `stop:true` IS the command mechanism. The user-facing error IS the intended feedback. Use `{text: null, stop: true}` for commands that shouldn't call the AI. `text: null` is only safe paired with `stop: true`.
- **Context:** `stop:true` halts the AI call. Used for event suppression.
- **Output:** Never return `stop:true`. Never return empty string. Return `" "` (space) minimum.
- **`text: "stop"`** is equivalent to `stop: true` in all hooks.

---

## Functions

```js
log(...args)                            // also: console.log; undefined logs as null (GraphQL JSON.stringify)
addStoryCard(keys, entry, type)         // returns new length or false if keys exist
removeStoryCard(index)                  // throws if missing
updateStoryCard(index, keys, entry, type) // throws if missing
```
Logs visible 15min, creator-owned adventures only.

---

## How globalThis.text Works

Library and hook scripts share the same global scope per execution. When Library modifies `text`, that mutation is visible to the hook's `modifier(text)` call:

```js
// Library mutates globalThis.text
function MyScript(hook) {
  text = text.replace(/foo/, "bar"); // mutates globalThis.text
}

// Hook's modifier receives the already-modified text
const modifier = (text) => { // param shadows globalThis.text — local only
  return { text };
};
modifier(text); // passes current globalThis.text
```

**Anti-pattern:** mutating the `text` parameter inside a modifier and expecting cross-hook persistence. Modifier params are local shadows. Mutate `globalThis.text` in Library, or return new text from modifier.

---

## Context Layout (onModelContext `text`)

```
[AI Instructions]      ← NOT in scripting text
[Plot Essentials]
World Lore: {triggered cards}
Story Summary: {story so far}
Memories: {memorized moments}
Recent Story: {history}
[Author's Note: ...]
{last action/response}
[frontMemory]
```

Split: `text.slice(0, info.memoryLength)` = memory, `text.slice(info.memoryLength)` = rest. Truncate to `info.maxChars` or server truncates for you.

---

## Pattern 1: Library-Global Function (AutoCards/InnerSelf)

The dominant pattern. Single entry-point function in Library, thin hook wrappers.

### Library
```js
function MyScript(hook) {
  "use strict";
  if (
    !globalThis.state || typeof state !== "object" || Array.isArray(state)
    || !globalThis.info || typeof info !== "object" || Array.isArray(info)
    || !Array.isArray(globalThis.storyCards)
    || typeof addStoryCard !== "function"
    || !Array.isArray(globalThis.history)
    || typeof text !== "string"
  ) {
    log("unexpected error");
    globalThis.text ||= " ";
    return;
  }

  if (hook === "input") {
    // modify globalThis.text for input
  } else if (hook === "context" || Number.isInteger(info.maxChars)) {
    // info.maxChars only defined during onModelContext
    // Number.isInteger() returns false for undefined/null
    globalThis.stop ??= false;
    // modify globalThis.text for context
  } else if (hook === "output") {
    // modify globalThis.text for output
  }
}
```

### Hook scripts
```js
// Input:
MyScript("input");
const modifier = (text) => { return { text }; };
modifier(text);

// Context:
MyScript("context");
const modifier = (text) => { return { text, stop }; };
modifier(text);

// Output:
MyScript("output");
const modifier = (text) => { return { text }; };
modifier(text);
```

---

## Pattern 2: Callback Integration (AutoCards API style)

AutoCards returns modified text (or `[text, stop]` for context). Your modifier chains on top.

**Important:** If using Pattern 2 WITHOUT Pattern 1 (no Library function initializing `stop`), you must add `globalThis.stop ??= false;` before the context modifier. Otherwise `stop` is undeclared.

```js
// Input:
const modifier = (text) => {
  text = AutoCards("input", text);
  return { text };
};
modifier(text);

// Context — note stop initialization:
globalThis.stop ??= false;
const modifier = (text) => {
  [text, stop] = AutoCards("context", text, stop);
  return { text, stop };
};
modifier(text);

// Output:
const modifier = (text) => {
  text = AutoCards("output", text);
  return { text };
};
modifier(text);
```

### Director pattern (alternative)

Director is a third-party Library add-on that chains modifier functions:

```js
// Library: paste director source, then:
director.library(fnA, fnB)
// Input:  director.input(fn); void 0
// Context: director.context(fn); void 0
// Output: director.output(fn); void 0
```

**Director vs Callback:**
- **Callback** (Pattern 2): fine-grained control inside a single modifier. Use when combining scripts expecting standard `modifier(text)` shape.
- **Director**: declarative chaining, no modifier boilerplate. MUST remove `modifier(text)` lines, end hooks with `void 0`.
- Both work with AutoCards. Director: `director.input(AutoCards, fn)`. Callback: `text = AutoCards("input", text)` inside modifier. **Do not mix both in the same hook.**

---

## Pattern 3: Word Analysis → State Machine → Dynamic Prompt (NGO)

**The abstract pattern:** scan text for sentiment keywords → update numeric state through defined transitions → map state to dynamic author's note. NGO is one implementation; the pattern generalizes to any reactive prompt system.

### Helper (NGO-internal, include if adapting)
```js
function randomint(min, max) {
  return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min)
}
```

### Config reset every turn (intentional)
NGO sets all config values on `state.*` every turn unconditionally:
```js
state.initialHeatValue = 0
state.temperatureIncreaseChance = 15
state.maximumTemperature = 12
```
**Why:** Allows creators to change config in the script and have it take effect next turn without resetting adventure state. Runtime values are guarded separately:
```js
if (state.heat == undefined) {
  state.heat = state.initialHeatValue
  state.cooldownMode = false
  state.overheatMode = false
}
```

### Word sentiment analysis
```js
const conflictWords = ["attack","stab","destroy",/* ~120 words */]
const calmingWords = ["calm","rest","relax",/* ~100 words */]

const lowerText = text.toLowerCase()
const words = lowerText.split(/\s+/)
let conflictCount = 0, calmingCount = 0
words.forEach(word => {
  const fixedWord = word.replace(/^[^\w]+|[^\w]+$/g, '')
  if (conflictWords.includes(fixedWord)) conflictCount++
  if (calmingWords.includes(fixedWord)) calmingCount++
})
```

### State machine
```
Normal → accumulate heat → chance-based temperature increase
         ↓ (temperature >= max)
Overheat → countdown timer (NOTE: countdown begins same turn overheat triggers — no else-if gate)
         ↓ (timer expires)
         → reduce temperature/heat → enter Cooldown
Cooldown → countdown timer → steady temperature decrease
         ↓ (timer expires)
Normal (cycle repeats)
```

### Dynamic author's note from state
```js
if (state.storyTemperature <= 1)
  state.originalAuthorsNote = "Story Phase: Introduction. No conflict."
else if (state.storyTemperature <= 4)
  state.originalAuthorsNote = "Story Phase: Introduction. Minor conflicts."
else if (state.storyTemperature <= 9)
  state.originalAuthorsNote = "Story Phase: Rising Action. Moderate conflicts."
else if (state.storyTemperature <= 12)
  state.originalAuthorsNote = "Story Phase: Climax. Major conflict."
else
  state.originalAuthorsNote = "Story Phase: Climax. Extreme conflict."
```

### Context injection (with null guard)
```js
const modifier = (text) => {
  if (state.originalAuthorsNote) {
    text = text + "\n\n" + state.originalAuthorsNote
  }
  return { text }
}
modifier(text)
```

---

## Pattern 4: Deep State Initialization (InnerSelf)

### deepMerge — safe recursive defaults
```js
const deepMerge = (target = {}, source = {}) => {
  for (const key in source) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== "object") target[key] = {};
      deepMerge(target[key], source[key]);
    } else if (target[key] === undefined) {
      target[key] = source[key];
    }
  }
  return target;
};

// Only fills in missing keys, never overwrites existing state
const IS = state.InnerSelf = deepMerge(state.InnerSelf || {}, {
  encoding: "", agent: "", label: 0, hash: "", ops: 0,
  AC: { enabled: false, forced: false, event: false }
});
```

### State init comparison
```js
// Logical OR — clobbers 0, false, "" (USE WITH CAUTION)
state.x = state.x || defaultVal

// Nullish coalescing — only replaces null/undefined (PREFERRED for falsy-valid values)
state.x = state.x ?? defaultVal

// Explicit undefined check — most defensive
if (state.x === undefined) state.x = defaultVal

// deepMerge — best for nested objects with many keys
state.ns = deepMerge(state.ns || {}, defaults)
```

---

## Pattern 5: MainSettings Config Class (InnerSelf/AutoCards)

Centralized config at the top of Library. ES2022 private fields (`#config`) confirmed functional in AID sandbox — InnerSelf/AutoCards ship with them.

**How `merge()` works:** It iterates over the static class config and writes INTO the `settings` argument. Class values **always overwrite** local defaults. This is intentional: class = creator override, `localSettings` = script defaults. Values set in `localSettings` before `merge()` will be overwritten if the class has a matching key.

```js
globalThis.MainSettings = (class MainSettings {
  static MyScript = {
    SETTING_A: true,
    SETTING_B: 40
  };

  #config;
  constructor(script, alternative) {
    // Object.hasOwn preferred over .hasOwnProperty for ES2022 consistency
    // InnerSelf ships with .hasOwnProperty — both work in AID sandbox
    this.#config = (
      Object.hasOwn(MainSettings, script) ? MainSettings[script]
      : (typeof alternative === "string" && Object.hasOwn(MainSettings, alternative))
        ? MainSettings[alternative] : null
    );
  }
  merge(settings) {
    if (!this.#config || !settings || typeof settings !== "object") return;
    for (const [key, value] of Object.entries(this.#config)) {
      settings[key] = value; // ← one-directional: class overwrites settings
    }
  }
});

// Usage in your script function:
if (typeof globalThis.MainSettings === "function") {
  new MainSettings("MyScript").merge(localSettings);
}
```

---

## Pattern 6: StoryCard-Based Config (InnerSelf)

Stores player-facing config in card entry, NPC brains in `card.description` (undocumented field — guard with `|| ""`).

**Caveat:** Known bug — card changes in earlier hooks not always visible in later hooks. After `addStoryCard`, the subsequent `find()` may return `undefined`. Guard accordingly:

```js
let configCard = storyCards.find(c => c.keys === "Configure MyScript");
if (!configCard) {
  addStoryCard("Configure MyScript", "Setting A: true\nSetting B: 40", "config");
  configCard = storyCards.find(c => c.keys === "Configure MyScript");
}
// Guard against timing bug where card isn't yet visible
if (!configCard) {
  log("Config card not yet visible — will retry next turn");
  return;
}

// Parse config from card entry
const parseConfig = (entry) => {
  const config = {};
  for (const line of entry.split("\n")) {
    const match = line.match(/^(.+?):\s*(.+)$/);
    if (match) config[match[1].trim()] = match[2].trim();
  }
  return config;
};
```

### Brain data in card.description
```js
// JSON mode
const brain = JSON.parse((card.description || "") || "{}");

// Human-readable mode (colon-delimited)
const brain = {};
for (const line of (card.description || "").split("\n")) {
  const [key, ...rest] = line.split(":");
  if (key && rest.length) brain[key.trim()] = rest.join(":").trim();
}
```

---

## Pattern 7: History Hash for Retry Detection

Originally from InnerSelf. **Dependency:** requires a persistent state namespace. If using InnerSelf, that's `IS.hash` (from Pattern 4). Standalone generic form shown here:

```js
// Standalone setup — adapt namespace to your script
state.myScript = state.myScript ?? {};

const historyHash = () => {
  let n = 0;
  const serialized = JSON.stringify(history.slice(-50));
  for (let i = 0; i < serialized.length; i++) {
    n = ((31 * n) + serialized.charCodeAt(i)) | 0;
  }
  return n.toString(16);
};

const currentHash = historyHash();
if (currentHash === state.myScript.hash) {
  // Retry/redo detected — skip expensive operations
} else {
  state.myScript.hash = currentHash;
  // Normal turn processing
}
```

---

## Pattern 8: Context Memory Slicing

```js
const contextMemory = info.memoryLength ? text.slice(0, info.memoryLength) : ''
let context = info.memoryLength ? text.slice(info.memoryLength) : text

// Manipulate context (insert, filter, append)

// Respect maxChars
context = context.slice(-(info.maxChars - info.memoryLength))
return { text: contextMemory + context }
```

### Append vs splice strategies
```js
// Simple append (NGO style)
if (state.originalAuthorsNote) {
  text = text + "\n\n" + state.originalAuthorsNote
}

// Splice insertion — insert N lines from end
const authorsNote = state.originalAuthorsNote || "Default note here"
const lines = context.split("\n")
if (lines.length > 2) lines.splice(-3, 0, `[Author's note: ${authorsNote}]`)
text = contextMemory + lines.join("\n").slice(-(info.maxChars - info.memoryLength))
```

---

## Pattern 9: Hook Detection Without Explicit Argument

```js
if (hook === "context" || Number.isInteger(info.maxChars)) {
  // info.maxChars only defined during onModelContext
}
```

AutoCards uses `null` as Library-phase sentinel:
```js
// In Library: AutoCards(null) — runs during Library execution for context cleanup
// In hooks: AutoCards("input"|"context"|"output", text, stop?)
```

---

## Pattern 10: Cross-Script Integration

InnerSelf integrates with AutoCards by checking for its global function. **Note:** `config` below is InnerSelf's internal validated settings object (built by its `Config.get()` class). When adapting this pattern, replace `config.auto` with your own boolean flag.

```js
const hasAutoCards = () => typeof globalThis.AutoCards === "function";

// Delegate to AC for non-context hooks when integration is enabled
// Replace IS.AC.enabled / config.auto with your own flags
if (IS.AC.enabled && hook !== "context" && hasAutoCards()) {
  try {
    text = AutoCards(hook, text);
  } catch (error) {
    log(error.message);
  }
}

// For context hook, use AC's external API
// config.auto is InnerSelf's internal "is AutoCards enabled" boolean
if (/* your AC-enabled flag */ hasAutoCards()) {
  const api = AutoCards().API;
  api.setBannedTitles(["Inner","Self","Configure Inner Self"]);
}
```

### AutoCards external API (called with no args)
```js
AutoCards().API.postponeEvents(5)
AutoCards().API.generateCard({title: "Dragon"})
AutoCards().API.eraseAllAutoCards()
```

---

## Pattern 11: Command Parser (Input hook)

From the official docs' example. See `stop` behavior section above for full context.
```js
const cmdMatch = text.match(/\n? ?(?:> You |> You say "|):(\w+?)( [\w ]+)?[".]?\n?$/i)
if (cmdMatch) {
  const cmd = cmdMatch[1]
  const args = cmdMatch[2] ? cmdMatch[2].trim().split(' ') : []
  state.message = `cmd:${cmd} args:${JSON.stringify(args)}`
  return { text: null, stop: true }
}
```

---

## Pattern 12: Suppress Opening Message (Output hook)

```js
const modifier = (text) => {
  return { text: info.actionCount ? text : ` ${startMessage || ''}` }
}
// MUST return at least " " (space), never empty string
```

---

## Combining Scripts: Integration Order

**WARNING — double-execution risk:** InnerSelf internally calls `AutoCards(hook, text)` for non-context hooks when `IS.AC.enabled` is true (see Pattern 10). If you ALSO call `AutoCards("input", text)` inside the modifier, AutoCards runs twice per turn. Choose one:
- **Option A:** Let InnerSelf manage AutoCards (enable AC via InnerSelf config). Do NOT call AutoCards in your modifier.
- **Option B:** Disable InnerSelf's AC integration (`IS_AC_ENABLED_BY_DEFAULT: false`). Call AutoCards yourself in the modifier.

### Option A (InnerSelf manages AC):
```js
// Input:
InnerSelf("input"); // ← AC called internally if IS.AC.enabled
const modifier = (text) => {
  // Do NOT call AutoCards here — it already ran
  return { text };
};
modifier(text);

// Context:
InnerSelf("context"); // ← AC handled internally via API
const modifier = (text) => {
  if (state.originalAuthorsNote) {
    text = text + "\n\n" + state.originalAuthorsNote
  }
  return { text, stop };
};
modifier(text);

// Output:
InnerSelf("output"); // ← AC called internally if IS.AC.enabled
const modifier = (text) => {
  return { text };
};
modifier(text);
```

### Option B (manual AC, IS.AC disabled):
```js
// Input:
InnerSelf("input");
const modifier = (text) => {
  text = AutoCards("input", text);
  return { text };
};
modifier(text);

// Context:
InnerSelf("context");
const modifier = (text) => {
  [text, stop] = AutoCards("context", text, stop);
  if (state.originalAuthorsNote) {
    text = text + "\n\n" + state.originalAuthorsNote
  }
  return { text, stop };
};
modifier(text);

// Output:
InnerSelf("output");
const modifier = (text) => {
  text = AutoCards("output", text);
  return { text };
};
modifier(text);
```

### Rules
- Library-global functions (InnerSelf, AutoCards) called BEFORE modifier
- Callback-style scripts (AutoCards return values) called INSIDE modifier
- State-machine scripts (NGO) logic runs INSIDE modifier after other scripts
- All scripts share the same `state` — namespace keys (`state.InnerSelf.*`, `state.heat`, etc.)

---

## Anti-Patterns

|Don't|Do|Why|
|---|---|---|
|Return empty string from Input/Output|Return `" "` (space)|Triggers user-facing errors|
|Assume `stop` exists|`globalThis.stop ??= false`|Not declared by sandbox; ReferenceError|
|Skip globalThis validation in Library|Check state/info/storyCards/history exist|AID sandbox can fail silently|
|Use `state.x = state.x \|\| default` for `0`/`false`/`""`|Use `??` or explicit `undefined` check|`\|\|` clobbers falsy-but-valid values|
|Set state.memory in Output for immediate effect|Changes apply next turn only|Documented AID behavior|
|Overwrite state object (`state = {}`)|deepMerge or property assignment|Destroys other scripts' state|
|Use DOM APIs (window, setTimeout)|Not in sandbox|Editor autocomplete lies|
|Rely on `undefined` in logs|Displays as `null`|GraphQL JSON.stringify|
|Trust storyCard across hooks|Re-read each hook|Known bug: changes not visible|
|Mutate `text` param in modifier for cross-hook persistence|Mutate `globalThis.text` in Library or return new text|Params are local shadows|
|Use undocumented card fields without fallbacks|Guard `card.description`, `card.title` with `\|\| ""`|Not in official API|
|Mix Director and callback in same hook|Choose one per hook|Both manage text/stop; will conflict|
|Call AutoCards in modifier when InnerSelf AC integration is enabled|Let InnerSelf manage AC, or disable its AC integration|Double-execution|
|Return `stop:true` from Output|Never|Output becomes literal "stop"|
|Use `configCard.entry` after `addStoryCard` without null check|Guard: `if (!configCard) return`|Timing bug: card may not be visible yet|

---

## Known Bugs
- StoryCards non-functional when "Memory Bank" OFF
- Card changes in earlier hooks not always visible in later hooks
- Card updates in Context overwritten by Output hook updates

## Type safety (optional)
```js
/// <reference no-default-lib="true"/>
/// <reference lib="es2022"/>
// Removes false DOM types from editor autocomplete
// ES2022 private fields (#) confirmed functional — InnerSelf/AutoCards ship with them
```
- Full types: github.com/magicoflolis/aidungeon.js → types/SharedLibraryTypes.d.ts, ScriptingTypes.d.ts
- `//@ts-check` at top for inline type errors in Scenario editor

## Multi-script merging checklist
- [ ] All shared state/functions in Library
- [ ] No naming collisions across merged scripts
- [ ] Hook scripts are thin wrappers (single `modifier` or Director call, not both)
- [ ] State keys namespaced per feature
- [ ] Test each feature independently before combining
- [ ] Verify storyCard operations don't conflict across hooks
- [ ] Guard all undocumented card fields with fallbacks
- [ ] Verify AutoCards is not double-executed (InnerSelf internal + manual call)

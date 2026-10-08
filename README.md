# Token Tycoon 🤖

> **Moved.** Token Tycoon now lives in [matthlh/claude-mods](https://github.com/matthlh/claude-mods) under `plugins/token-tycoon`, next to Pixel Cat and the Purple Dark theme. Install it from there:
>
> ```
> /plugin marketplace add matthlh/claude-mods
> /plugin install token-tycoon@matthlh
> ```
>
> This repository is archived and no longer updated. If you installed `token-tycoon@matthlh-idle` from here, uninstall it and reinstall from the new marketplace.

A Claude-themed idle game that lives above your [Claude Code](https://claude.com/claude-code) prompt. A little coder in headphones sits beside a big token; every prompt earns tokens, agents earn them for you, the shop multiplies both, and your real Claude Code work counts too. Cookie Clicker, but the cookie is a token.

![The coder and the token: idle, a prompt landing, a crit, a frenzy](docs/preview.svg)

## How it plays

It's Cookie Clicker with Claude's furniture.

- **Prompt ⚡** earns tokens ✦. One per press to start; 5% of presses are crits for ×10.
- **Agents earn tokens every second**, even while you type: Agent (0.1/sec) → Subagent (1) → Robot (8) → Agent swarm (47) → Model fleet (260) → Research lab (1,400). Each one you buy costs 15% more, and owning 10, 25, 50, 100, 200 or 400 of a kind doubles that kind, every time.
- **Upgrades:**
  - **Models** multiply what a prompt earns: Haiku ×1 → Sonnet ×2 → Opus ×5 → Fable ×20 → Mythos ×100.
  - **Infra** multiplies your agents: Laptop → GPU ×2 → Rack ×4 → Data center ×8 → Cluster ×16.
  - **Tools**, one-off: Read (agents +25%), Edit (each prompt also earns 5% of your per-second income), Bash (20% chance a prompt counts twice), Grep (crit chance 5% → 15%), WebSearch (earn while away for 8h instead of 4h).
- **Your real work counts:**
  - every tool call Claude makes is a free prompt
  - every finished turn starts a **🔥 Frenzy**: all your agents earn ×7 for 30 seconds
  - while you're away your agents keep earning at half pace, up to 4 hours (8 with WebSearch), paid out when you come back
- **Train a new model** (prestige): once you've earned 500K ✦ in a run, reset for a permanent point. Every point is +25% to prompts and agents, forever. Points scale with the square root of what you earned, so a 2M run is worth two.
- **The band** above the prompt shows your tokens, income per second and per prompt, a frenzy countdown when one is on, and a hint: what you can buy right now, or what you're saving for. **Prompt ⚡** bottom-left, **Shop 🛒** bottom-right, a faint *hide* in the corner. Once the band has focus (ctrl+x tab in the terminal), `p` prompts.
- **`/idle`** opens the shop pane (and prints where you stand). Each shop button shows its hotkey; they work while the pane has focus.
- **Saved across sessions** every 15 seconds and after each turn, play time included: the shop's Stats card shows how much you've gathered, how long you've played and how many frenzies you've had. Toasts for upgrades, milestones, frenzies and offline earnings; turn them off with the Popups button in the shop.

In the Claude desktop app the scene is an SVG that animates itself. The coder has 14 frames (`docs/sheet.webp`, sliced by `docs/slice.py` and turned into SVG paths by `docs/vec.py`, which writes `hooks/frames.ts`) and reacts to what's going on: she types and thinks while Claude is working, blinks and looks around while idle, cheers at a frenzy or a milestone, catches fire on a crit, flinches on a prompt, slumps over the laptop when a tool call or turn fails, and falls asleep after five quiet minutes. The big token squashes when a press lands, glows orange during a frenzy, and the gain floats up. In the terminal it's a cell grid of colored half blocks with a small chibi. Either way the band only redraws when something changes, at most every few seconds.

## Install

You need a Claude Code version that supports mods (October 2026 or later). The same steps work on macOS, Linux and Windows. At the Claude Code prompt, type:

```
/plugin install token-tycoon --marketplace matthlh/claude-idle-mod
```

Answer `y` to add the marketplace, then press Enter to install it for your user. The game shows up right away, and in every new session after that, desktop app included.

Or from a shell:

```bash
claude plugin marketplace add matthlh/claude-idle-mod
claude plugin install token-tycoon@matthlh-idle
```

Update with `claude plugin update token-tycoon@matthlh-idle`, remove with `claude plugin uninstall token-tycoon@matthlh-idle`.

**Nothing above the prompt?** Mods are still rolling out. Add `"CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1"` to the `env` block of `~/.claude/settings.json` and start a new session.

### From a clone

To change the game, run your own copy instead:

```bash
git clone https://github.com/matthlh/claude-idle-mod ~/.claude/mods/token-tycoon
claude --plugin-dir ~/.claude/mods/token-tycoon
```

To load the clone in every session, including the desktop app, put its full path in the `env` block of `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "/Users/<you>/.claude/mods/token-tycoon",
    "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1"
  }
}
```

| OS | Path | Separator for several folders |
| --- | --- | --- |
| macOS | `/Users/<you>/.claude/mods/token-tycoon` | `:` |
| Linux | `/home/<you>/.claude/mods/token-tycoon` | `:` |
| Windows | `C:\\Users\\<you>\\.claude\\mods\\token-tycoon` (JSON needs the doubled `\\`) | `;` |

Write the full path. Older versions don't expand `~` here, so `~/.claude/mods/token-tycoon` silently loads nothing. Sessions already open when you change settings pick it up only after a restart (quit the desktop app fully, not just the window).

## Tuning

All the numbers live at the top of [`hooks/register.tsx`](hooks/register.tsx): the agents (`GENS`), the model and infra tiers (`MODELS`, `INFRA`), the tools (`TOOLS`), the crit multiplier, the frenzy multiplier and length, the agent milestones (`MILESTONES`) and how many tokens a prestige point costs (`POINT_EVERY`). The sprites are letter grids just below: a 20×18 token and a 16×18 chibi for the terminal. The desktop coder is a sprite sheet: replace `docs/sheet.webp` with your own 7×2 grid of transparent frames and run `python3 docs/slice.py docs/sheet.webp /tmp/frames /tmp/unused.ts` then `SIZE=128 python3 docs/slice.py ... then python3 docs/vec.py /tmp/frames 128 24 hooks/frames.ts /tmp/check.svg` (needs Pillow). Frame order: idle, eyes closed, look up, blink, typing, thinking, sleep 1, sleep 2, oops, cheer 1, cheer 2, overclocked 1, overclocked 2, hit.

Check your changes with:

```bash
claude plugin validate ~/.claude/mods/token-tycoon
claude plugin test ~/.claude/mods/token-tycoon
```

The save lives in the plugin's store, so edits to the code never reset your progress.

## See also

[Claude Cat](https://github.com/matthlh/claude-cat-mod), a pixel cat for the same spot above the prompt. They get along fine side by side.

## License

MIT

#!/usr/bin/env bash
# agency-of-one: drop-in installer (alternative to installing as a plugin).
#   ./install.sh                 install into the current repo (./.claude, ./CLAUDE.md)
#   ./install.sh --global        install into ~/.claude (all projects)
#   ./install.sh --target DIR    install into another repo
#   add --no-hook to skip the lint-on-edit hook, --no-claude-md to skip the CLAUDE.md block
set -euo pipefail
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE=project; TARGET="$PWD"; HOOK=1; CMD=1
while [[ $# -gt 0 ]]; do case "$1" in
  --global) MODE=global; TARGET="$HOME"; shift;;
  --target) TARGET="$(cd "$2" && pwd)"; shift 2;;
  --no-hook) HOOK=0; shift;;
  --no-claude-md) CMD=0; shift;;
  *) echo "unknown option $1"; exit 1;;
esac; done
command -v node >/dev/null || { echo "Node 18+ is required."; exit 1; }

CL="$TARGET/.claude"
mkdir -p "$CL/skills" "$CL/agents" "$CL/commands"
rm -rf "$CL/skills/agency-of-one"
cp -R "$SRC/skills/agency-of-one" "$CL/skills/"
cp "$SRC/agents/design-reviewer.md" "$SRC/agents/direction-critic.md" "$CL/agents/"
cp "$SRC/commands/design-review.md" "$CL/commands/"
chmod +x "$CL/skills/agency-of-one/scripts/"*.mjs
echo "✓ skill, design-reviewer + direction-critic agents and /design-review command → $CL"

if [[ $MODE == global ]]; then HOOKCMD='node "$HOME/.claude/skills/agency-of-one/scripts/hook-lint.mjs"'; MD="$HOME/.claude/CLAUDE.md"
else HOOKCMD='node "$CLAUDE_PROJECT_DIR/.claude/skills/agency-of-one/scripts/hook-lint.mjs"'; MD="$TARGET/CLAUDE.md"; fi

if [[ $HOOK == 1 ]]; then
  SETTINGS="$CL/settings.json"; [[ -f "$SETTINGS" ]] || echo '{}' > "$SETTINGS"
  HOOKCMD="$HOOKCMD" node -e '
    const fs=require("fs"), p=process.argv[1], cmd=process.env.HOOKCMD;
    const s=JSON.parse(fs.readFileSync(p,"utf8")); s.hooks??={}; s.hooks.PostToolUse??=[];
    const exists=s.hooks.PostToolUse.some(h=>(h.hooks||[]).some(x=>(x.command||"").includes("hook-lint.mjs")));
    if(!exists) s.hooks.PostToolUse.push({matcher:"Edit|Write|MultiEdit",hooks:[{type:"command",command:cmd,timeout:30}]});
    fs.writeFileSync(p, JSON.stringify(s,null,2)+"\n"); console.log(exists?"✓ hook already present":"✓ lint-on-edit hook added → "+p);
  ' "$SETTINGS"
fi

if [[ $CMD == 1 ]]; then
  touch "$MD"
  if grep -q "agency-of-one:start" "$MD"; then
    node -e 'const fs=require("fs");const [md,sn]=process.argv.slice(1);let t=fs.readFileSync(md,"utf8");const s=fs.readFileSync(sn,"utf8").trim();t=t.replace(/<!-- agency-of-one:start -->[\s\S]*?<!-- agency-of-one:end -->/,s);fs.writeFileSync(md,t);' "$MD" "$SRC/hooks/rules.md"
    echo "✓ CLAUDE.md block updated → $MD"
  else printf "\n%s\n" "$(cat "$SRC/hooks/rules.md")" >> "$MD"; echo "✓ CLAUDE.md block appended → $MD"; fi
fi

if [[ $MODE == project ]]; then
  GI="$TARGET/.gitignore"; touch "$GI"; grep -qx ".design-review/" "$GI" || echo ".design-review/" >> "$GI"
  echo "✓ .design-review/ added to .gitignore"
  if [[ -f "$TARGET/package.json" ]] && ! node -e 'require.resolve("playwright",{paths:[process.argv[1]]})' "$TARGET" 2>/dev/null; then
    echo "ℹ For screenshots: npm i -D playwright && npx playwright install chromium"
  fi
fi
echo "Done. In Claude Code: ask for UI work as usual. The skill triggers on its own, and /design-review runs the verification loop."

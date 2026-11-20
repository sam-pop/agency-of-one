#!/usr/bin/env bash
# Agency of One: update a drop-in install (plugin users: `claude plugin marketplace update agency-of-one && claude plugin update agency-of-one@agency-of-one`).
#   ./update.sh                 update this clone, then reinstall into the current repo
#   ./update.sh --global        ...into ~/.claude
#   ./update.sh --target DIR    ...into another repo
# Your project files (DESIGN.md, slop-lint.config.json, design log, .design-review/) are never touched.
set -euo pipefail
# Wrapped in main() so bash has read the whole file before git pull can rewrite it.
main() {
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OLD="$(cat "$SRC/skills/agency-of-one/VERSION" 2>/dev/null || echo unknown)"
if [ -d "$SRC/.git" ]; then
  git -C "$SRC" pull --ff-only --quiet || { echo "git pull failed (local changes?). Resolve, then re-run."; exit 1; }
else
  echo "ℹ $SRC is not a git clone; reinstalling the files it already has."
fi
NEW="$(cat "$SRC/skills/agency-of-one/VERSION")"
bash "$SRC/install.sh" "$@"
echo "Agency of One: v$OLD → v$NEW. What changed: $SRC/CHANGELOG.md"
[ "$OLD" != "$NEW" ] && echo "If a project has a DESIGN.md from before v1.1, run /agency-of-one:upgrade-design (drop-in: /upgrade-design) in it." || true
}
main "$@"
exit

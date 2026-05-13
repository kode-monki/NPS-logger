#!/bin/bash
# ─────────────────────────────────────────────────────────────
# push-to-github.sh
# Run this once to create the GitHub repo and push everything.
#
# Prerequisites:
#   1. GitHub CLI installed: https://cli.github.com
#      brew install gh    (macOS)
#   2. Authenticated:  gh auth login
# ─────────────────────────────────────────────────────────────

set -e

REPO_NAME="national-parks-journal"
DESCRIPTION="Personal National Parks journal — Hugo site + Google Apps Script CMS"

echo "🏞  Creating GitHub repo: $REPO_NAME"

# Create repo (private by default — change --private to --public if you want)
gh repo create "$REPO_NAME" \
  --private \
  --description "$DESCRIPTION" \
  --source=. \
  --remote=origin \
  --push

echo ""
echo "✅  Done! Your repo is live at:"
gh repo view --json url -q .url

echo ""
echo "Next steps:"
echo "  1. Copy cms-gas/Code.gs and cms-gas/Index.html into a Google Apps Script project"
echo "  2. Set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO in the CONFIG block of Code.gs"
echo "  3. Run 'hugo server' to preview locally"
echo "  4. Connect the repo to Netlify or Cloudflare Pages for auto-deploy"

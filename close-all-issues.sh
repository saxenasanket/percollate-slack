#!/bin/bash

#############################################################################
# Close All Open Issues
#
# This script closes all open issues in the repository without rebuilding
# or restarting the system.
#
# Usage: ./close-all-issues.sh
#############################################################################

set -e

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_DIR"

echo "════════════════════════════════════════════════════════════════════════"
echo "🗑️  CLOSING ALL OPEN ISSUES"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

# Get configuration from .env
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found"
  exit 1
fi

GITHUB_OWNER=$(grep "^GITHUB_OWNER=" .env | cut -d'=' -f2)
GITHUB_REPO=$(grep "^GITHUB_REPO=" .env | cut -d'=' -f2)

if [ -z "$GITHUB_OWNER" ] || [ -z "$GITHUB_REPO" ]; then
  echo "❌ Error: GITHUB_OWNER and GITHUB_REPO must be set in .env"
  exit 1
fi

echo "📋 Repository: $GITHUB_OWNER/$GITHUB_REPO"
echo ""

# Close all open issues
echo "🔍 Finding open issues..."
if command -v gh &> /dev/null; then
  OPEN_ISSUES=$(gh issue list --repo "$GITHUB_OWNER/$GITHUB_REPO" --state open --json number -q '.[]|.number' 2>/dev/null || echo "")

  if [ ! -z "$OPEN_ISSUES" ]; then
    ISSUE_COUNT=$(echo "$OPEN_ISSUES" | wc -l)
    echo "Found $ISSUE_COUNT open issues"
    echo ""

    echo "$OPEN_ISSUES" | while read -r issue_num; do
      if [ ! -z "$issue_num" ]; then
        echo -n "   Closing #$issue_num... "
        if gh issue close "$issue_num" --repo "$GITHUB_OWNER/$GITHUB_REPO" 2>&1 | grep -q "Closed"; then
          echo "✅"
        else
          echo "⚠️"
        fi
      fi
    done

    echo ""
    echo "════════════════════════════════════════════════════════════════════════"
    echo "✅ ALL ISSUES CLOSED"
    echo "════════════════════════════════════════════════════════════════════════"
  else
    echo "ℹ️  No open issues found"
  fi
else
  echo "❌ GitHub CLI (gh) not found"
  echo "Install it from: https://cli.github.com/"
  exit 1
fi

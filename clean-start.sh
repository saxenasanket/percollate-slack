#!/bin/bash

#############################################################################
# GitHub Issue Triage Agent - Clean Start Script
#
# This script performs a complete reset and starts the system fresh:
# 1. Stops any running processes
# 2. Cleans compiled files and state
# 3. Closes all open issues in the repository
# 4. Rebuilds the project
# 5. Starts the polling agent
#
# Usage: ./clean-start.sh
#############################################################################

set -e

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_DIR"

echo "════════════════════════════════════════════════════════════════════════"
echo "🚀 GITHUB ISSUE TRIAGE AGENT - CLEAN START"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

# Get configuration from .env
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found"
  echo "Please run: cp .env.example .env"
  exit 1
fi

GITHUB_OWNER=$(grep "^GITHUB_OWNER=" .env | cut -d'=' -f2)
GITHUB_REPO=$(grep "^GITHUB_REPO=" .env | cut -d'=' -f2)

if [ -z "$GITHUB_OWNER" ] || [ -z "$GITHUB_REPO" ]; then
  echo "❌ Error: GITHUB_OWNER and GITHUB_REPO must be set in .env"
  exit 1
fi

echo "📋 Configuration:"
echo "   Repository: $GITHUB_OWNER/$GITHUB_REPO"
echo ""

# Step 1: Kill any running processes
echo "🛑 Step 1: Stopping any running processes..."
pkill -f "node dist/index.js" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
sleep 1
echo "   ✅ Done"
echo ""

# Step 2: Clean files
echo "🧹 Step 2: Cleaning compiled files and state..."
rm -rf dist .triage-state.json
echo "   ✅ Removed: dist/"
echo "   ✅ Removed: .triage-state.json"
echo ""

# Step 3: Close all open issues
echo "🗑️  Step 3: Closing all open issues in repository..."
if command -v gh &> /dev/null; then
  OPEN_ISSUES=$(gh issue list --repo "$GITHUB_OWNER/$GITHUB_REPO" --state open -q '.[]|.number' 2>/dev/null || echo "")

  if [ ! -z "$OPEN_ISSUES" ]; then
    ISSUE_COUNT=$(echo "$OPEN_ISSUES" | wc -l)
    echo "   Found $ISSUE_COUNT open issues..."

    echo "$OPEN_ISSUES" | while read -r issue_num; do
      if [ ! -z "$issue_num" ]; then
        echo -n "   Closing #$issue_num... "
        gh issue close "$issue_num" --repo "$GITHUB_OWNER/$GITHUB_REPO" 2>&1 | grep -q "Closed" && echo "✅" || echo "⚠️"
      fi
    done
  else
    echo "   ℹ️  No open issues found"
  fi
else
  echo "   ⚠️  GitHub CLI (gh) not found - skipping issue cleanup"
  echo "   To close issues manually:"
  echo "   for i in {1..100}; do gh issue close \$i --repo $GITHUB_OWNER/$GITHUB_REPO 2>/dev/null; done"
fi
echo ""

# Step 4: Rebuild
echo "🔨 Step 4: Rebuilding project..."
npm run build > /dev/null 2>&1
echo "   ✅ Build successful"
echo ""

# Step 5: Start the system
echo "════════════════════════════════════════════════════════════════════════"
echo "✅ CLEAN STATE READY!"
echo "════════════════════════════════════════════════════════════════════════"
echo ""
echo "📊 System Status:"
echo "   ✅ Compiled files removed"
echo "   ✅ State file cleared"
echo "   ✅ Repository issues closed"
echo "   ✅ Project rebuilt"
echo ""
echo "🎯 Next Steps:"
echo "   1. Create a new test issue in GitHub"
echo "   2. Watch this console for the next poll cycle (~30s)"
echo "   3. Check Slack for the triage digest"
echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "🚀 Starting GitHub Issue Triage Agent..."
echo "════════════════════════════════════════════════════════════════════════"
echo ""

# Start the system
node dist/index.js

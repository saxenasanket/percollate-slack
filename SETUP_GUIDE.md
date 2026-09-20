# GitHub Issue Triage Agent - Complete Setup Guide

**This guide walks you through setting up the system from scratch on your own machine.**

---

## Prerequisites

- **Node.js** 18+ installed (`node --version`)
- **Git** installed (`git --version`)
- **GitHub account**
- **Slack workspace** (where you have admin access)
- **Anthropic API account** (with API key)
- **Terminal/Command line** comfort

---

## Step 1: Create a GitHub Repository

### 1a. Create new repo on GitHub.com

1. Go to https://github.com/new
2. Fill in:
   - **Repository name:** `issue-triage-demo` (or any name)
   - **Description:** "GitHub Issue Triage Agent with AI"
   - **Public/Private:** Private (for demo safety)
   - **Initialize:** Check "Add a README"
3. Click **Create repository**
4. **Copy the clone URL** (e.g., `https://github.com/YOUR-USERNAME/issue-triage-demo.git`)

### 1b. Clone the reference repo

```bash
# Clone this working system
git clone https://github.com/saxenasanket/percollate-slack.git
cd percollate-slack

# Remove the original remote
git remote remove origin

# Add YOUR repo as the new remote
git remote add origin https://github.com/YOUR-USERNAME/issue-triage-demo.git
git branch -M main
git push -u origin main
```

Now you have your own copy with all code ready.

---

## Step 2: Create GitHub Personal Access Token

### 2a. Create the token

1. Go to https://github.com/settings/tokens
2. Click **Generate new token** → **Generate new token (classic)**
3. Fill in:
   - **Token name:** `issue-triage-token`
   - **Expiration:** 90 days (or longer for demo)
   - **Scopes:** Check `repo` (full control)
4. Click **Generate token**
5. **COPY the token** (you won't see it again!)

### 2b. Save it safely

```bash
# You'll use this as GITHUB_TOKEN in .env
# Store it somewhere safe (password manager, etc.)
```

---

## Step 3: Create Slack Bot

### 3a. Create Slack App

1. Go to https://api.slack.com/apps
2. Click **Create New App**
3. Select **From scratch**
4. Fill in:
   - **App name:** `Issue Triage Agent`
   - **Workspace:** Select your workspace
5. Click **Create App**

### 3b. Add Bot Token Scopes

1. In left sidebar, click **OAuth & Permissions**
2. Scroll down to **Scopes** section
3. Click **Add an OAuth Scope** under "Bot Token Scopes"
4. Add these scopes:
   - `chat:write` (send messages)
   - `chat:write.public` (post in public channels)
5. Scroll up and click **Install to Workspace**
6. Click **Allow** on the permission prompt

### 3c. Get Bot Token

1. After installation, you'll see **Bot User OAuth Token** (starts with `xoxb-`)
2. **COPY this token** (you'll use as `SLACK_BOT_TOKEN`)

---

## Step 4: Create Slack Channel

### 4a. Create channel

1. In your Slack workspace, click **+** next to "Channels"
2. Click **Create a channel**
3. Name it: `#issue-triage` (or any name)
4. Make it **Private** (optional, for demo safety)
5. Click **Create**

### 4b. Add bot to channel

1. In the channel, type `/invite @Issue Triage Agent` and press Enter
2. OR right-click channel → View details → Add apps → Find your bot

### 4c. Get Channel ID

1. In Slack, right-click the channel name
2. Click **View channel details**
3. Scroll to bottom, find **Channel ID** (starts with `C`)
4. **COPY this ID** (you'll use as `SLACK_CHANNEL_ID`)

---

## Step 5: Get Anthropic API Key

### 5a. Create account

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Go to **API keys** section
4. Click **Create key**
5. Name it: `issue-triage-demo`
6. **COPY the key** (you won't see it again!)

This is your `ANTHROPIC_API_KEY`.

---

## Step 6: Configure Environment Variables

### 6a. Clone the example file

```bash
cd /path/to/percollate-slack
cp .env.example .env
```

### 6b. Edit .env with your tokens

```bash
nano .env  # or open in your editor
```

Fill in with your actual values:

```bash
# GitHub Configuration
GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE
GITHUB_OWNER=YOUR-GITHUB-USERNAME
GITHUB_REPO=issue-triage-demo

# Slack Configuration
SLACK_BOT_TOKEN=xoxb-YOUR-BOT-TOKEN
SLACK_CHANNEL_ID=C_YOUR-CHANNEL-ID

# Anthropic Configuration
ANTHROPIC_API_KEY=sk-ant-YOUR-API-KEY

# Polling interval in seconds
POLL_INTERVAL_SECONDS=30

# Enhancement: Stale issue threshold in hours (default: 72 = 3 days)
STALE_THRESHOLD_HOURS=72
```

**Save and close** (Ctrl+S, then Ctrl+X in nano)

### 6c. Verify .env

```bash
# Check it looks right (don't commit this!)
cat .env

# Verify tokens are NOT in git
git status  # should NOT show .env
```

---

## Step 7: Install Dependencies

```bash
# Install npm packages
npm install

# Verify installation
npm list @octokit/rest @slack/web-api @anthropic-ai/sdk dotenv
```

---

## Step 8: Build the Project

```bash
# Compile TypeScript to JavaScript
npm run build

# Check for errors
# (should see "tsc" complete with no output = success)
```

---

## Step 9: Run the System

### 9a. Start polling

```bash
# Run the triage agent
npm run dev

# You should see:
# 🚀 GitHub Issue Triage Agent Starting
# Repository: YOUR-USERNAME/issue-triage-demo
# Poll interval: 30s
# [timestamp] Starting poll...
# Fetched 0 updated/new issues
```

**Keep this terminal running** (don't close it).

### 9b. Verify it's working

```bash
# In a new terminal, check if process is running
ps aux | grep "node dist/index.js"

# You should see the process listed
```

---

## Step 10: Test with Demo Issues

### 10a. Create test issues on GitHub

1. Go to your repo: `https://github.com/YOUR-USERNAME/issue-triage-demo`
2. Click **Issues** tab
3. Click **New issue**

**Create Issue 1 (Critical):**
```
Title: CRITICAL: Production Database Offline - All Users Blocked
Body:
Database server is completely down.
All API requests returning 500 errors.
Impact: 100% of users blocked.
```

4. Click **Submit new issue**

### 10b. Watch the magic happen

**In your running terminal**, you should see:
```
[2026-09-20T10:00:30.000Z] Starting poll...
Last checked at: 2026-09-20T10:00:00.000Z
Fetched 1 updated/new issues
Issues to triage: 1 new, 0 updated
Fetched 30 recent issues for duplicate detection
Triaged 1 issues
  ✅ Issue #1 surfaced: priority=Critical, actionable=true, duplicates=0, stale=0d
Surfacing 1 of 1 issues
✅ Notification sent to Slack
```

**In your Slack channel**, you should see:
```
🤖 GitHub Issue Triage Report

🔴 Needs Attention Now (1)

#1: CRITICAL: Production Database Offline - All Users Blocked
Immediate incident response required
🏷️ bug

────────────────────────
📊 Reviewed: 1 | Surfaced: 1 | Filtered: 0
```

✅ **System is working!**

---

## Step 11: Run More Demo Cases

**Keep the system running.** Create more issues to see different behaviors:

### Test Case 2: High Priority

```
Title: HIGH: Dashboard queries degraded 7.5x slower
Body:
Query time increased from 2s to 15s.
This started after recent deploy.
```

### Test Case 3: Medium Priority

```
Title: Add dark mode theme support
Body:
Users requested dark mode.
Design mockups are ready.
Effort estimate: 2 sprints.
```

### Test Case 4: Low + Filtered

```
Title: Fix typo in welcome page
Body: Change "Welcom" to "Welcome" on line 45.
```

**Each issue will appear in Slack immediately** (within 30 seconds).

---

## Step 12: Run Tests

```bash
# In a new terminal (keep the main one running)
npm run test

# You should see:
# ✅ Test 1: Critical Issue
# ✅ Test 2: High Priority Issue
# ... all 6 tests passing
# 📊 Test Results: 6 passed, 0 failed out of 6
```

---

## Troubleshooting

### Issues not appearing in Slack?

```bash
# Check 1: Verify .env values
cat .env

# Check 2: Check GitHub token works
curl -H "Authorization: token YOUR-GITHUB-TOKEN" https://api.github.com/user

# Check 3: Check Slack token works
# Look for error in console output

# Check 4: Verify bot is in channel
# In Slack, go to channel details → members → see bot listed?

# Check 5: Check console for errors
# Look at the terminal where npm run dev is running
```

### "Module not found" errors?

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

### "Cannot find module" in running system?

```bash
# Rebuild and restart
npm run build
# Press Ctrl+C to stop npm run dev
npm run dev
```

### Slack message old/not updating?

```bash
# The system sends NEW messages, doesn't edit old ones
# Create new issues to test, old messages stay as-is
# This is expected behavior
```

---

## Production Considerations

### For Production Deployment

1. **Use environment variables** (don't hardcode tokens)
2. **Use a process manager** (pm2, systemd, Docker)
3. **Set up monitoring** (logs, error alerts)
4. **Use a secrets manager** (AWS Secrets Manager, HashiCorp Vault)
5. **Set up auto-restart** (if process dies, restart automatically)

### Example: Using PM2

```bash
# Install pm2 globally
npm install -g pm2

# Start with pm2
pm2 start npm --name "issue-triage" -- run dev

# Auto-restart on reboot
pm2 startup
pm2 save

# Monitor
pm2 monit
```

### Example: Using Docker

```bash
# Build Docker image
docker build -t issue-triage .

# Run container
docker run -d \
  -e GITHUB_TOKEN=YOUR-TOKEN \
  -e SLACK_BOT_TOKEN=YOUR-TOKEN \
  -e ANTHROPIC_API_KEY=YOUR-KEY \
  -e GITHUB_OWNER=YOUR-USERNAME \
  -e GITHUB_REPO=issue-triage-demo \
  -e SLACK_CHANNEL_ID=C_YOUR-CHANNEL-ID \
  issue-triage
```

---

## Demo Script (5 Minutes)

### Preparation (Before demo)

```bash
# 1. Terminal window 1: Keep system running
npm run dev

# 2. Terminal window 2: Ready to create issues
cd /path/to/percollate-slack

# 3. Browser: Open GitHub issues page
https://github.com/YOUR-USERNAME/issue-triage-demo/issues

# 4. Browser: Open Slack channel
https://app.slack.com/client/YOUR-WORKSPACE-ID/C_YOUR-CHANNEL-ID
```

### During Demo (5 min)

```
1. (1 min) Show GitHub issues page, create Critical issue
   → Point to console: "✅ Issue #1 surfaced"
   → Point to Slack: "🔴 Needs Attention Now"

2. (1 min) Create High priority issue
   → Show console: "2 new issues triaged"
   → Show Slack: Both Critical + High in same section

3. (1 min) Create Medium priority issue
   → Show Slack: Changes to collapsed bullets (🟡)
   → Explain: "Visual hierarchy reduces cognitive load"

4. (1 min) Create Low priority issue
   → Show console: "❌ Issue #4 filtered"
   → Show Slack footer: "Reviewed: 4 | Surfaced: 3 | Filtered: 1"
   → Explain: "Noise prevention + transparency"

5. (1 min) Q&A / Show code
   → "Want to see how it works?"
   → Show src/triage.ts (Claude prompt)
   → Show README.md (detailed docs)
```

---

## Next Steps

1. **Customize the filters** - Edit `src/index.ts` line 65
2. **Change poll interval** - Set `POLL_INTERVAL_SECONDS` in .env
3. **Add custom rules** - Modify Claude prompt in `src/triage.ts`
4. **Deploy to cloud** - Heroku, AWS, DigitalOcean, etc.
5. **Integrate with your workflow** - Use with real GitHub repos

---

## Common Customizations

### Change poll interval to 5 seconds (faster demo)

```bash
# Edit .env
POLL_INTERVAL_SECONDS=5

# Rebuild and restart
npm run build
npm run dev
```

### Change stale threshold to 2 days

```bash
# Edit .env
STALE_THRESHOLD_HOURS=48

# Restart
npm run dev
```

### Modify priority filtering logic

```bash
# Edit src/index.ts around line 65
// Change which issues surface:
const matches =
  (t.actionable && (t.priority === "Critical" || t.priority === "High")) ||
  t.priority === "Medium" ||
  (t.duplicates && t.duplicates.length > 0);
```

### Customize Claude prompt

```bash
# Edit src/triage.ts around line 21
const prompt = `You are a GitHub issue triage system...`
# Modify the instructions here
```

---

## Getting Help

### Check logs

```bash
# Terminal running npm run dev shows live logs
# Look for: ✅ (success), ❌ (filtered), errors
```

### Run tests

```bash
npm run test
# All 6 tests should pass
```

### Read documentation

```bash
# Full architecture explanation
cat README.md | less

# Demo test cases
cat DEMO_TEST_CASES.md

# Key assumptions
grep -A 20 "Key Assumptions" README.md
```

---

## Success Checklist

```
✅ GitHub token works
✅ Slack bot is in channel
✅ Anthropic API key is valid
✅ npm install succeeded
✅ npm run build succeeded
✅ npm run dev is running
✅ Can create GitHub issues
✅ Issues appear in Slack within 30 seconds
✅ Console shows: ✅ Issue #X surfaced
✅ npm run test shows: 6 passed, 0 failed
```

If all ✅, you're ready to demo!

---

## Summary

You now have:
- ✅ Your own GitHub repo with code
- ✅ GitHub token for API access
- ✅ Slack bot with proper permissions
- ✅ Slack channel configured
- ✅ Anthropic API key
- ✅ System running and monitoring issues
- ✅ Test cases ready to demonstrate

**Start creating issues and watch the magic happen!** 🎉


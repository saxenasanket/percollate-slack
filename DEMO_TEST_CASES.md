# GitHub Issue Triage Agent - Demo Test Cases

**Setup:** `./clean-start.sh` (Set `POLL_INTERVAL_SECONDS=5` in .env for faster polling)

---

## Case 1: Critical Issue Detection

**Create:**
```
Title: CRITICAL: Production Database Offline
Body: Database server down. All API requests failing.
```

**Expect Console:**
```
✅ Issue #1 surfaced: priority=Critical, actionable=true
```

**Expect Slack:**
```
🔴 Needs Attention Now (1)
#1: CRITICAL: Production Database Offline
Immediate incident response required
🏷️ bug
```

**Capability:** ✅ Monitors GitHub, detects Critical issues, surfaces instantly

---

## Case 1a: Critical Issue Update - Live Incident Tracking

**Setup:** Use the same issue #1 from Case 1 (already created above)

**Edit on GitHub:**
```
Title: CRITICAL: Production Database Offline - 60% RECOVERED
Body:
Database server partially recovering.
60% of API requests now succeeding.
Still 40% of users affected.
Recovery ETA: 10 minutes
Monitoring database replication status
```

**Wait 15 seconds for next poll...**

**Expect Console:**
```
Fetched 1 updated/new issues
Issues to triage: 0 new, 1 updated  ← DETECTED AS UPDATED
Triaged 1 issues
✅ Issue #1 surfaced: priority=Critical, actionable=true, duplicates=0, stale=0d
Surfacing 1 of 1 issues
✅ Notification sent to Slack
```

**Expect Slack (NEW MESSAGE):**
```
🔴 Needs Attention Now (1)

#1: CRITICAL: Production Database Offline - 60% RECOVERED
Monitor recovery progress and verify all services
🏷️ bug

────────────────────────
📊 Reviewed: 1 | Surfaced: 1 | Filtered: 0
```

**Key Observation:**
- Same issue #1 (not a new issue)
- NEW Slack message appeared (re-triage triggered)
- Updated content shown (60% recovered, not fully down)
- System continuously monitors live incidents

**Capability:** ✅ Detects issue updates, re-triages automatically, provides live incident tracking

---

## Case 1b: Duplicate Detection - Same Incident, Different Reporter

**Scenario:** Same production database incident reported differently by support team

**Note:** Uses same #1 issue from Case 1 as the original

**Create issue #2 (from support team, unaware of #1):**
```
Title: CRITICAL: All API endpoints returning errors
Body:
Customers reporting all API calls failing.
Getting 500 errors across the board.
Database connection issues suspected.
Started around 06:00 UTC.
```

**Wait 15 seconds for poll...**

**Expect Console:**
```
Fetched 1 updated/new issues
Issues to triage: 1 new, 0 updated
Triaged 1 issues
✅ Issue #2 surfaced: priority=Critical, duplicates=1
Surfacing 1 of 1 issues
```

**Expect Slack (UPDATED message):**
```
🔴 Needs Attention Now (2)
#1: CRITICAL: Production Database Offline - 60% RECOVERED
Monitor recovery progress and verify all services
🏷️ bug

#2: CRITICAL: All API endpoints returning errors
Investigate database connectivity and service logs
🏷️ bug

────────────────────────

🔁 Possible Duplicates

#2 → likely duplicate of #1
```

**Key Insights:**
- ✅ New issue #2 surfaces (high priority)
- ✅ System detects it's same as #1 (semantic similarity)
- ✅ Shows in 🔁 section → prevents duplicate effort
- ✅ Team consolidates: "This is same database incident from Case 1"
- ✅ Real-world: same incident, different reporters (backend, support)

**Capability:** ✅ Semantic duplicate detection prevents duplicate work on same incident

---

## Case 2: Priority Filtering - High

**Create:**
```
Title: HIGH: Dashboard queries degraded 7.5x slower
Body: Query time: 2s → 15s after recent deploy
```

**Expect Slack:**
```
🔴 Needs Attention Now (3)
#1: CRITICAL: Production Database...
#2: CRITICAL: All API endpoints...
#3: HIGH: Dashboard queries...
```

**Capability:** ✅ Triage priority correctly, group by urgency

---

## Case 3: Priority Filtering - Medium

**Create:**
```
Title: Update API documentation for v3 endpoints
Body:
API documentation is outdated for new v3 endpoints.
Missing examples for new authentication flow.
Design specs are ready and approved.
Estimate: 4-6 hours of work.
```

**Expect Slack:**
```
🔴 Needs Attention Now (3)
#1: CRITICAL...
#2: CRITICAL...
#3: HIGH...

🟡 Worth a Look (1)
• #4: Update API documentation for v3 endpoints
```

**Capability:** ✅ Visual hierarchy reduces cognitive load (Medium shown as collapsed bullets)

---

## Case 4: Noise Prevention - Low + Actionable

**Create:**
```
Title: Fix typo in welcome page
Body:
Found typo in welcome page.
Location: Welcome.tsx line 45.
Change: "Welcom" → "Welcome"
```

**Expect Console:**
```
❌ Issue #5 filtered: priority=Low, actionable=true, duplicates=0
Surfacing 4 of 5 issues
```

**Expect Slack (No change - issue filtered):**
```
Footer updates to: 📊 Reviewed: 5 | Surfaced: 4 | Filtered: 1
```

**Capability:** ✅ Filters low-priority noise, maintains transparency (footer shows filtered count)

---

## Case 5: Actionability Judgment (Vague Issue)

**Create:**
```
Title: Application performance issue
Body:
The app feels slow sometimes.
Not sure which part or when it happens.
Maybe it's a general issue?
```

**Expect Console:**
```
❌ Issue #6 filtered: priority=Low, actionable=false, duplicates=0
Surfacing 4 of 6 issues
```

**Expect Slack Footer:**
```
📊 Reviewed: 6 | Surfaced: 4 | Filtered: 2
```

**Capability:** ✅ Judges actionability (filters non-actionable), prevents vague work from surfacing

---

## Case 6: Enhancement 1 - Label as Priority Signal

**Create:**
```
Title: UI feels sluggish
Body: UI renders slowly sometimes.
Labels: [critical, performance]
```

**Expect Console:**
```
✅ Issue #7 surfaced: priority=Critical, actionable=false
(Vague title but [critical] label → boosted to Critical)
```

**Expect Slack:**
```
🔴 Needs Attention Now (5)
#1: CRITICAL...
#2: CRITICAL...
#3: HIGH...
#7: UI feels sluggish
Identify performance bottleneck in UI rendering
🏷️ bug
```

**Capability:** ✅ Respects GitHub labels, doesn't ignore team's taxonomy

---

## Case 7: Enhancement 2 - Stale Critical Reminder

**Setup:** Edit `.triage-state.json` to make Issue #1 look 4 days old:
```json
{
  "lastCheckedAt": "2026-09-20T10:00:00Z",
  "issues": {
    "1": "2026-09-16T10:00:00Z"  ← 4 days ago
  }
}
```

**Restart system and wait for poll...**

**Expect Console:**
```
✅ Issue #1 surfaced: priority=Critical, stale=4d (stale reminder)
```

**Expect Slack:**
```
🔴 Needs Attention Now (1)
#1: CRITICAL: Production Database Offline
Immediate incident response required
🏷️ bug
⏰ Last updated 4 days ago
```

**Capability:** ✅ Resurfaces stale Critical issues, prevents forgotten work

---

## Summary: All Capabilities

| # | Capability | Demo Case | Result |
|---|-----------|-----------|--------|
| 1 | Monitor & detect new issues | Case 1 | Critical surfaces instantly |
| 2 | Re-triage on updates (live tracking) | Case 1a | Issue edited → message updated with new content |
| 3 | Duplicate detection (semantic) | Case 1b | Same incident, different reporters → linked |
| 4 | Triage 5 dimensions (priority/type/actionable/action/duplicates) | Cases 1-7 | Correct categorization |
| 5 | Priority-based filtering | Cases 1-3, 4-5 | Critical/High shown, Low filtered |
| 6 | Visual hierarchy | Cases 2-4 | 🔴 → 🟡 → ⚪ |
| 7 | Noise prevention | Cases 4-5 | Vague/Low filtered automatically |
| 8 | Label respect | Case 6 | [critical] label boosted priority |
| 9 | Stale reminders | Case 7 | 3+ day old Critical resurfaces |
| 10 | Transparency | All | Footer: Reviewed \| Surfaced \| Filtered |

**Total: 10 capabilities demonstrated in 7 cases**

---

## Quick Demo Flow (7 min)

1. **Case 1:** Create Critical issue → Shows in Slack 🔴
2. **Case 1a:** Edit issue → **Message updates** (same message, new content)
3. **Case 1b:** Create duplicate → 🔁 Section appears (detects same incident)
4. **Case 2:** Create High issue → Grouped with Critical
5. **Case 3:** Create Medium issue → Collapsed bullets 🟡
6. **Case 4:** Create Low issue → Filtered (show footer transparency)
7. **Case 5:** Create vague issue → Filtered (show actionability judgment)
8. **Case 6:** Create issue + label [critical] → Boosted to Critical
9. **Case 7:** Make issue look 4 days old → Re-surfaces + ⏰ icon

Each step takes ~45 seconds. Console + Slack visible side-by-side.

---

## Expected Slack Evolution

```
Case 1 (Create #1):
🔴 Needs Attention Now (1)
#1: CRITICAL: Production Database Offline
📊 Reviewed: 1 | Surfaced: 1 | Filtered: 0

Case 1a (Edit #1):
🔴 Needs Attention Now (1)
#1: CRITICAL: Production Database Offline - 60% RECOVERED ← UPDATED
📊 Reviewed: 1 | Surfaced: 1 | Filtered: 0

Case 1b (Create #2 duplicate):
🔴 Needs Attention Now (2)
#1: CRITICAL: Production Database Offline - 60% RECOVERED
#2: CRITICAL: All API endpoints returning errors
🔁 Possible Duplicates
#2 → likely duplicate of #1

Case 2 (Create #3 High):
🔴 Needs Attention Now (3)
#1: CRITICAL...
#2: CRITICAL...
#3: HIGH: Dashboard queries degraded...

Case 3 (Create #4 Medium):
🔴 Needs Attention Now (3)
#1: CRITICAL...
#2: CRITICAL...
#3: HIGH...
🟡 Worth a Look (1)
• #4: Update API documentation...

Case 4 (Create #5 Low):
(Same as above, footer: Reviewed: 5 | Filtered: 1)

Case 5 (Create #6 Vague):
(Same as above, footer: Reviewed: 6 | Filtered: 2)

Case 6 (Create #7 with [critical] label):
🔴 Needs Attention Now (5)
#1: CRITICAL...
#2: CRITICAL...
#3: HIGH...
#7: UI feels sluggish ← BOOSTED (label: critical)
...

Case 7 (Make #1 stale):
#1 shows ⏰ Last updated 4 days ago
```

---

## Key Talking Points

- **Monitoring:** Real-time GitHub issue detection
- **Triage:** 5-dimension analysis (priority/type/actionable/action/duplicates)
- **Filtering:** Smart noise prevention (not dumb rules)
- **Hierarchy:** Visual organization reduces cognitive load
- **Labels:** Respects team's existing taxonomy
- **Stale:** Prevents Critical work from being forgotten
- **Transparency:** Footer shows what was filtered/surfaced/reviewed

---

## Console Commands for Demo

```bash
# Before demo
./clean-start.sh
# Edit .env: POLL_INTERVAL_SECONDS=5
npm run build
npm run dev

# During demo: watch console output
# Copy/paste to show: ✅ Issue #X surfaced, ❌ Issue #Y filtered

# After demo
npm run test  # Show: 6/6 tests passing
```


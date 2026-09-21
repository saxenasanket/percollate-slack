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

## Case 2: Priority Filtering - High

**Create:**
```
Title: HIGH: Dashboard queries degraded 7.5x slower
Body: Query time: 2s → 15s after recent deploy
```

**Expect Slack:**
```
🔴 Needs Attention Now (2)
#1: CRITICAL: Production Database...
#2: HIGH: Dashboard queries...
```

**Capability:** ✅ Triage priority correctly, group by urgency

---

## Case 3: Priority Filtering - Medium

**Create:**
```
Title: Dashboard performance degraded - queries now 7.5x slower
Body:
Dashboard query performance regressed significantly.
Query time: 2s → 15s (7.5x slower)
Affects user experience when loading dashboards.
Started after recent API deployment.
```

**Expect Slack:**
```
🔴 Needs Attention Now (2)
#1: CRITICAL...
#2: HIGH...

🟡 Worth a Look (1)
• #3: Dashboard performance degraded...
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
❌ Issue #4 filtered: priority=Low, actionable=true, duplicates=0
Surfacing 2 of 3 issues
```

**Expect Slack (No change - issue filtered):**
```
Footer updates to: 📊 Reviewed: 3 | Surfaced: 2 | Filtered: 1
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
❌ Issue #5 filtered: priority=Low, actionable=false, duplicates=0
Surfacing 2 of 4 issues
```

**Expect Slack Footer:**
```
📊 Reviewed: 4 | Surfaced: 2 | Filtered: 2
```

**Capability:** ✅ Judges actionability (filters non-actionable), prevents vague work from surfacing

---

## Case 6: Duplicate Detection

**Create:**
```
Title: Dashboard performance issue
Body: Dashboard loading slow, performance degraded.
```

**Expect Console:**
```
✅ Issue #6 surfaced: priority=High, duplicates=1
```

**Expect Slack:**
```
🔁 Possible Duplicates
#6 may duplicate: #2 - Both report dashboard performance degradation
```

**Capability:** ✅ Detects semantic duplicates, prevents redundant work

---

## Case 7: Enhancement 1 - Label as Priority Signal

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
#7: UI feels sluggish
Identify performance bottleneck in UI rendering
🏷️ bug
```

**Capability:** ✅ Respects GitHub labels, doesn't ignore team's taxonomy

---

## Case 8: Enhancement 2 - Stale Critical Reminder

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
| 2 | Triage 5 dimensions (priority/type/actionable/action/duplicates) | Cases 1-6 | Correct categorization |
| 3 | Priority-based filtering | Cases 1-5 | Critical/High shown, Low filtered |
| 4 | Visual hierarchy | Cases 2-3 | 🔴 → 🟡 → ⚪ |
| 5 | Noise prevention | Cases 4-5 | Vague/Low filtered automatically |
| 6 | Duplicate detection | Case 6 | Related issues flagged |
| 7 | Label respect | Case 7 | [critical] label boosted priority |
| 8 | Stale reminders | Case 8 | 3+ day old Critical resurfaces |
| 9 | Transparency | All | Footer: Reviewed \| Surfaced \| Filtered |

**Total: 8 capabilities demonstrated in 8 cases**

---

## Quick Demo Flow (5 min)

1. Create Critical issue → Shows in Slack 🔴
2. Create High issue → Grouped with Critical
3. Create Medium issue → Collapsed bullets 🟡
4. Create Low issue → Filtered (show footer)
5. Create duplicate → 🔁 Section appears
6. Create issue + label [critical] → Boosted to Critical (show label respect)
7. Make issue look 4 days old → Re-surfaces + ⏰ icon (show stale reminder)

Each step takes ~1 minute. Console + Slack visible side-by-side.

---

## Expected Slack Evolution

```
Step 1:
🔴 Needs Attention Now (1)
#1: CRITICAL...
📊 Reviewed: 1 | Surfaced: 1 | Filtered: 0

Step 2:
🔴 Needs Attention Now (2)
#1: CRITICAL...
#2: HIGH...
📊 Reviewed: 2 | Surfaced: 2 | Filtered: 0

Step 3:
🔴 Needs Attention Now (2)
#1: CRITICAL...
#2: HIGH...
🟡 Worth a Look (1)
• #3: MEDIUM...
📊 Reviewed: 3 | Surfaced: 3 | Filtered: 0

Step 4:
(Same as Step 3, but footer: Reviewed: 4 | Filtered: 1)

Step 5:
(Adds 🔁 Possible Duplicates section)

Step 6:
#7 appears in Critical section (label boost)

Step 7:
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


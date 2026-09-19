# GitHub Issue Triage Agent - Quick Demo Test Cases

**Ordered to demonstrate all system capabilities sequentially.**

Start: `./clean-start.sh`

---

# Phase 1: New Issue Detection & Triage

## Case 1: Critical Issue (New)

**Create:**
```
Title: CRITICAL: Production Database Offline - All Users Blocked
Body:
Database server is completely down.
All API requests returning 500 errors.
Impact: 100% of users blocked.
```

**Wait 30 sec for next poll...**

**Expect Console:**
```
Fetched 1 updated/new issues
Issues to triage: 1 new, 0 updated
Triaged 1 issues
✅ Issue #1 surfaced: priority=Critical, actionable=true, duplicates=0
Surfacing 1 of 1 issues
✅ Notification sent to Slack
```

**Expect Slack:**
```
🔴 Needs Attention Now (1)

#1: CRITICAL: Production Database Offline - All Users Blocked
Immediate incident response required
🏷️ bug

────────────────────────
📊 Reviewed: 1 | Surfaced: 1 | Filtered: 0
```

**Demo Point:** ✅ New critical issues are detected and surfaced immediately

---

# Phase 2: Update Detection & Re-Triage

## Case 2: Edit Critical Issue (Change Title/Body)

**Wait 2 min, then EDIT issue #1:**

Go to GitHub, change it to:
```
Title: CRITICAL: Production Database Offline - PARTIAL RECOVERY
Body:
Database server is partially recovering.
50% of API requests still failing.
Impact: 50% of users can access.
Status: Recovery in progress - monitoring closely.
```

**Wait 30 sec for next poll...**

**Expect Console:**
```
Fetched 1 updated/new issues
Issues to triage: 0 new, 1 updated  ← DETECTED AS UPDATED!
Triaged 1 issues
✅ Issue #1 surfaced: priority=Critical, actionable=true, duplicates=0
Surfacing 1 of 1 issues
✅ Notification sent to Slack
```

**Expect Slack:**
```
🔴 Needs Attention Now (1)

#1: CRITICAL: Production Database Offline - PARTIAL RECOVERY
Immediate incident response required
🏷️ bug

────────────────────────
📊 Reviewed: 1 | Surfaced: 1 | Filtered: 0
```

**Demo Point:** ✅ System detects updates and re-triages (content changed but still Critical)

---

## Case 3: Edit Critical Issue Again (No Change to Priority)

**Wait 2 min, then EDIT issue #1 again:**

Only change punctuation/formatting, NOT the core content:
```
Title: CRITICAL: Production Database Offline - PARTIAL RECOVERY
Body:
Database server is partially recovering.
- 50% of API requests still failing
- Impact: 50% of users can access
- Status: Recovery in progress - monitoring closely.
```

**Wait 30 sec for next poll...**

**Expect Console:**
```
Fetched 1 updated/new issues
Issues to triage: 0 new, 1 updated
Triaged 1 issues
✅ Issue #1 surfaced: priority=Critical, actionable=true, duplicates=0
Surfacing 1 of 1 issues
✅ Notification sent to Slack
```

**Expect Slack:**
```
(Same as before - critical issue still showing)
```

**Demo Point:** ✅ System re-triages on ANY update (even formatting), always sends notification if priority/actionability changes

---

# Phase 3: Priority Filtering

## Case 4: High Priority Issue (New)

**Wait 2 min, Create:**
```
Title: HIGH: Dashboard queries degraded from 2s to 15s
Body:
Dashboard performance regressed significantly.
Query time: 2s → 15s (7.5x slower)
Started after recent deploy.
```

**Wait 30 sec...**

**Expect Console:**
```
Fetched 1 updated/new issues
Issues to triage: 1 new, 0 updated
✅ Issue #2 surfaced: priority=High, actionable=true, duplicates=0
```

**Expect Slack:**
```
🔴 Needs Attention Now (2)

#1: CRITICAL: Production Database Offline...
#2: HIGH: Dashboard queries degraded from 2s to 15s
Investigate recent changes to dashboard query logic
🏷️ bug

────────────────────────
📊 Reviewed: 2 | Surfaced: 2 | Filtered: 0
```

**Demo Point:** ✅ High priority grouped with Critical in same section

---

## Case 5: Medium Priority Issue (New)

**Wait 2 min, Create:**
```
Title: Add dark mode theme support
Body:
Users requested dark mode.
Design mockups available.
Effort: 2 sprints.
```

**Wait 30 sec...**

**Expect Slack:**
```
🔴 Needs Attention Now (2)
#1: CRITICAL: Production Database...
#2: HIGH: Dashboard queries...

────────────────────────

🟡 Worth a Look (1)

• #3: Add dark mode theme support

────────────────────────
📊 Reviewed: 3 | Surfaced: 3 | Filtered: 0
```

**Demo Point:** ✅ Medium priority shows as bullets (less visual weight)

---

# Phase 4: Noise Prevention (Filtering)

## Case 6: Low + Actionable (Should Filter)

**Wait 2 min, Create:**
```
Title: Fix typo in welcome page
Body:
Location: line 45
Text: "Welcom" should be "Welcome"
```

**Wait 30 sec...**

**Expect Console:**
```
Fetched 1 updated/new issues
Issues to triage: 1 new, 0 updated
Triaged 1 issues
❌ Issue #4 filtered: priority=Low, actionable=true, duplicates=0
Surfacing 2 of 3 issues
```

**Expect Slack:**
```
(Same as before - no new issues shown)
📊 Reviewed: 4 | Surfaced: 3 | Filtered: 1
```

**Demo Point:** ✅ Low priority + actionable still filtered (noise prevention)

---

## Case 7: Low + Non-Actionable (Should Filter)

**Wait 2 min, Create:**
```
Title: App is slow sometimes
Body:
The app feels slow.
Not sure what's slow.
```

**Wait 30 sec...**

**Expect Console:**
```
❌ Issue #5 filtered: priority=Low, actionable=false, duplicates=0
Surfacing 2 of 4 issues
```

**Expect Slack:**
```
(Same as before)
📊 Reviewed: 5 | Surfaced: 3 | Filtered: 2
```

**Demo Point:** ✅ Vague non-actionable issues filtered automatically

---

# Phase 5: Advanced Features

## Case 8: Duplicate Detection

**Wait 2 min, Create:**
```
Title: Performance issue with dashboard loading
Body:
Dashboard takes 20 seconds to load.
Very slow compared to before.
```

**Wait 30 sec...**

**Expect Slack:**
```
🔁 Possible Duplicates

#6 may duplicate: #2 - Both report dashboard performance degradation issues
```

**Demo Point:** ✅ Claude detects semantic similarity across issues

---

## Case 9: Production Incident (Multiple Duplicates)

**Create 3 issues rapidly (1 min apart):**

**Issue A:**
```
Title: CRITICAL: API auth failing - cannot login
Body:
Auth endpoint returning 500 errors.
All users blocked.
```

**Issue B (1 min later):**
```
Title: Users reporting login issues
Body:
Can't login. Getting errors.
```

**Issue C (1 min later):**
```
Title: CRITICAL: Authentication system down
Body:
Nobody can login. Auth is broken.
```

**Wait 30 sec...**

**Expect Slack:**
```
🔴 Needs Attention Now (3)
#1: CRITICAL: Production Database...
#2: HIGH: Dashboard queries...
#7: CRITICAL: API auth failing...

────────────────────────

🟡 Worth a Look (1)
• #3: Add dark mode theme support

────────────────────────

🔁 Possible Duplicates

#8 may duplicate: #7 - Similar login failures
#9 may duplicate: #7 - Same auth system down

────────────────────────
📊 Reviewed: 9 | Surfaced: 6 | Filtered: 3
```

**Demo Point:** ✅ Multiple duplicates consolidated and flagged for merging

---

# Summary: All Capabilities Demonstrated

| Phase | Case | Action | Result | Demo Point |
|-------|------|--------|--------|------------|
| 1 | 1 | Create critical | Surfaces | 🔴 New issues detected |
| 2 | 2 | Edit critical | Re-triaged | 📝 Updates detected |
| 2 | 3 | Edit critical again | Re-triaged | 🔄 Any change triggers re-triage |
| 3 | 4 | Create high | Surfaces | 🔴 Priority grouping |
| 3 | 5 | Create medium | Surfaces | 🟡 Visual hierarchy |
| 4 | 6 | Create low+actionable | Filtered | ⚪ Noise prevention |
| 4 | 7 | Create low+vague | Filtered | ⚪ Actionability filter |
| 5 | 8 | Create duplicate | Flagged | 🔁 Semantic detection |
| 5 | 9 | Create 3 similar | Consolidated | 🔁 Multiple duplicates |

---

## What You'll Demonstrate (In Order)

✅ **New issue detection** (Case 1)  
✅ **Update detection** (Case 2-3)  
✅ **Re-triage on updates** (Cases 2-3)  
✅ **Priority filtering** (Cases 4-5)  
✅ **Visual hierarchy** (🔴→🟡→⚪)  
✅ **Noise prevention** (Cases 6-7)  
✅ **Actionability filtering** (Cases 6-7)  
✅ **Duplicate detection** (Case 8)  
✅ **Consolidation** (Case 9)  
✅ **Transparency** (Footer: Reviewed|Surfaced|Filtered)  

**Total time:** ~25 minutes  
**Total issues:** 9 (1 critical edited twice, 8 new)  
**Slack messages:** 5 (progressive updates)  
**Critical concept demonstrated:** System continuously monitors and re-triages!

👇

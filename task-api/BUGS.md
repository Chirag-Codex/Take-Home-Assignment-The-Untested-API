# Bug Report

A quick note before getting into the bugs: the codebase uses todo, in_progress, and done for status values, whereas the README lists pending, in-progress, and completed. I followed the codebase implementation.

When I wrote unit tests for the service layer first, three tests failed. All of them turned out to be real bugs in taskService.js rather than issues in my test logic. I discovered a fourth potential issue while reviewing how update() handles object mutation.

---

## 1. Pagination skips the first page (Fixed)

Where: src/services/taskService.js in getPaginated()

What I expected: Requesting page=1&limit=2 should return the first two tasks (Task 1 and Task 2), and page=2 should return Task 3 and Task 4.

What happened: When I created 5 tasks and requested getPaginated(1, 2), it returned Task 3 as the first result, skipping page 1 entirely.

How I found it: Two unit tests failed during the initial test run. The assertion error showed Task 3 received when Task 1 was expected, which made the offset calculation immediately suspect.

Why it happens: The offset formula was written as page * limit. For page 1 with limit 2, offset evaluated to 2 instead of 0, assuming zero-indexed pages rather than user-facing 1-indexed pages.

Fix: Changed the offset calculation to (page - 1) * limit. Both pagination tests immediately passed.

Still open: Negative numbers or page=0 produce negative offsets, which causes Array.slice to slice from the end of the array. This should be validated at the route level.

---

## 2. Completing a task resets its priority (Identified, unfixed)

Where: src/services/taskService.js in completeTask()

What I expected: Marking a task as complete should update its status to done and set completedAt, while preserving the task's existing priority.

What happened: A task created with high priority had its priority reset to medium after completion.

How I found it: A unit test asserting that high priority remains unchanged after calling completeTask failed with Expected: high, Received: medium.

Why it happens: Inside completeTask, the code shallow-copies the task but explicitly sets priority: 'medium' on the next line, overriding whatever was previously set.

Fix: Remove the priority: 'medium' property from the updated object.

Status: Kept as it.failing in the test suite as requested by the brief to document the bug while fixing only one issue.

---

## 3. Status filter matches partial strings (Identified, unfixed)

Where: src/services/taskService.js in getByStatus()

What I expected: Filtering by a status should only return tasks that strictly match that status. Searching for an invalid partial status like 'do' should return an empty array.

What happened: Querying getByStatus('do') returned both todo and done tasks.

How I found it: I noticed the use of .includes() during code inspection and wrote a test with a substring query to verify. It returned matching items when none should have matched.

Why it happens: The filter uses t.status.includes(status) instead of strict equality (t.status === status).

Fix: Change the filter callback to t.status === status.

Status: Documented with an it.failing test in the unit test suite.

---

## 4. update() allows overwriting system fields (Identified)

Where: src/services/taskService.js in update()

What I suspect: The update function uses object spread ({ ...tasks[index], ...fields }) directly with whatever fields object is passed in. If a caller sends an id or createdAt in the body, it overwrites the original immutable values.

Fix: Explicitly pick only permitted fields (title, description, status, priority, dueDate) before applying the update.

---

## Route-Level Findings

1. Query Parameter Interaction: In GET /tasks, if a client passes both ?status=todo and ?page=1&limit=5, the route handler returns early from the status branch without applying pagination.
2. Missing Range Checks: Non-numeric strings, zero, or negative numbers passed into ?page or ?limit are not validated with 400 Bad Request responses.
3. Route Ordering: GET /tasks/stats is correctly placed before GET /tasks/:id to avoid Express treating 'stats' as a dynamic ID parameter.

---

## Why I chose to fix the pagination bug

Pagination affects every consumer listing tasks in a UI or mobile app. Skipping page 1 is a breaking defect for daily usability. The fix was clean, self-contained, and turned two failing tests green without altering test assertions.
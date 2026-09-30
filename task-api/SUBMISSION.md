# Submission Note

## 1. Design Decisions for PATCH /tasks/:id/assign

Validation: I ensured that assignee is required and must be a non-empty string. If a request is sent without an assignee, with an empty string, with whitespace only, or with a non-string type (like a number), the API returns a 400 Bad Request.

Reassignment Policy: I decided to allow direct reassignment of tasks that already have an assignee. In daily project management, passing tasks between teammates is common and requiring an explicit unassign step would add friction. To keep things transparent, the service stores previousAssignee on the task object so there is a clear reference of who held it before.

Missing Tasks: If an unknown ID is provided, the endpoint returns a standard 404 Not Found.

---

## 2. What I would test next with more time

Combined Query Parameters: Right now, combining ?status and ?page on GET /tasks does not work because the route returns immediately on the status filter. I would write integration tests for combined filtering and pagination once the route logic is refactored.

Concurrency and Race Conditions: Because the store is in-memory, synchronous operations are straightforward. With a real database, I would test simultaneous updates and assignments to the same task to ensure atomic behavior.

Database Integration: When swapping the in-memory array for PostgreSQL or MongoDB, I would write integration tests around database constraints, transactions, and connection failure handling.

Security and Body Sanitization: I would add tests ensuring that extra unexpected payload fields (like trying to overwrite createdAt or id via PUT) are stripped before updating.

---

## 3. What surprised me in the codebase

Status Discrepancy: The README listed pending, in-progress, and completed, but the code and validators were built around todo, in_progress, and done. Aligning documentation with real code is a good reminder of why tests are essential.

Priority Clobbering in completeTask: I was surprised to find priority: 'medium' hardcoded inside completeTask. It was an interesting bug because it silently corrupted data without throwing any runtime errors.

Loose Substring Filtering: Using String.prototype.includes() for status filtering meant partial queries like 'do' matched both 'todo' and 'done', which would create subtle bugs in client-side filters.

---

## 4. Questions I would ask before shipping to production

1. Database and Persistence: What database and ORM/query builder are we targeting, and what indexes should we place on id, status, and dueDate?
2. User Authentication: Is there an existing auth service or JWT middleware that should validate whether assignee names correspond to real registered users?
3. Pagination Response Format: Should we wrap paginated responses in metadata envelopes (including totalCount, currentPage, totalPages, hasNextPage) rather than returning raw arrays?
4. Ingress Protection: Do we need rate limiting, request timeout middleware, and body size limits configured before exposing these endpoints publicly?
# Administrator activity logs

The activity logs page reads persisted ActivityLog records and their actor account relation. Existing account maintenance, password changes/resets, organizer decisions, event status changes, and booking payment updates already write these records. This feature does not invent historical events or collect every HTTP error. No migration or sample records are required.

Administrator-only endpoints, protected by the existing live session/access gates with Cache-Control: no-store:

- GET /api/v1/admin/activity-logs: page (default 1), pageSize (default 10, maximum 100), search, category, result, from, to. Stable newest-first ordering by createdAt then id.
- GET /api/v1/admin/activity-logs/stats: total, last24Hours, adminActions, failed under the same filters. The administrator count uses the actor account's fixed role. Maintenance records without an actor account display System / maintenance and are not counted as administrator actions.
- GET /api/v1/admin/activity-logs/export: all matching records as CSV with quoting and formula-prefix escaping.
- GET /api/v1/admin/activity-logs/:id: actor name/email, action, entity type/UUID, timestamp, and recorded status changes. Arbitrary metadata is not exposed. IP/device/error text are currently unavailable and returned as null.

Search matches actor name/email, action text, entity type, a complete LOG-UUID display code, or entity UUID. Password change/reset and login/logout actions are authentication; Booking payment actions and Payment entities are payments; remaining User, OrganizerProfile, Event, and Booking entities use their respective categories. Unknown entities use System. Explicit actions ending in _FAILED are failed operations; existing successful audit actions are success. A refunded payment or rejected organization is not itself a failed operation. Current writers primarily record successful committed changes, so zero failed operations does not mean every platform request succeeded.

Date bounds are ISO UTC instants, inclusive. The frontend converts the selected local start/end calendar days to instants before sending them. Invalid bounds, reversed ranges, unknown filters, and malformed UUIDs return 400; missing entries return 404. No editing or deletion endpoints are provided.

The cards are labeled Actions by Administrators and Failed Operations. All card counts follow current filters. Verification uses backend typechecking, isolated database integration tests and real-session authorization tests, frontend TypeScript, and targeted ESLint.

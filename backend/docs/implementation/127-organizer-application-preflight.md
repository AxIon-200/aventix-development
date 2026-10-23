# Organizer application test database inventory — issue #127

This records a read-only inventory of the database configured by
`backend/.env.test` for [issue #127](https://github.com/AxIon-200/aventix-development/issues/127).
The [S03 specification](../specs/s03-organizer-application-and-decision-spec.md)
requires aggregate inspection before schema migration and prohibits inventing
historical application or approval evidence.

## Target and query boundary

Inspected on 2026-10-23 at 15:10 UTC. Private environment values and connection
credentials were not printed or copied into this record.

- `.env.test` has `NODE_ENV=test`. Its configured test project reference is
  `azzbaqgeidgulvejglba`, matching the project identity embedded in its
  Supabase pooler connection. The configured database name is `postgres`.
- `DATABASE_URL` differs from `DEV_DATABASE_URL`. The development project's
  identity could not be derived from its URL, so this check establishes URL
  separation, not a distinct development project reference.
- A live read-only transaction returned `current_database() = postgres` and
  `public.test_environment_marker.environment = aventix-test` for marker ID 1.
  `SHOW transaction_read_only` returned `on`.
- Only aggregate `SELECT` queries and Prisma `migrate status` were run. No
  migration, write, backfill, or account change was executed for this inventory.

The primary inventory ran inside a read-only transaction using this query
shape, after checking the database name and test marker:

```sql
BEGIN READ ONLY;
SHOW transaction_read_only;
SELECT current_database(),
  (SELECT environment FROM public.test_environment_marker WHERE id = 1);
SELECT p."approvalStatus"::text AS status,
  u."emailVerified" AS email_verified,
  COUNT(*)::int AS organizer_count
FROM public."OrganizerProfile" AS p
JOIN public."user" AS u ON u.id = p."userId"
GROUP BY 1, 2
ORDER BY 1, 2;
ROLLBACK;
```

## Existing organizer data

The organization-profile count grouped by approval status and account email
verification was:

| Approval status | Email verified | Profiles |
| --- | --- | ---: |
| `PENDING` | No | 1 |

The query returned no rows for any other status/verification combination, so
the total organization-profile count was **1**. The profile belongs to an
`ORGANIZER` account. It has one linked `OrganizerApplication` snapshot; there
were **0** profiles without a snapshot and **0** profiles linked to an account
with a different role.

There were **13** `ORGANIZER` accounts without an organization profile: **6**
active and email-unverified, and **7** active and email-verified. This aggregate
inspection does not establish why those accounts lack profiles or whether they
are legacy records or test fixtures. No application snapshot, consent, decision,
or verification history is inferred for them.

A second marker-verified, read-only aggregate check at 15:18 UTC compared those
13 accounts with the email patterns defined by the tests. All 13 use reserved
example domains and match known fixture prefixes: **10** match
[`organizer-application-`](../../test/organizer-application.test.ts), **2** match
[`profile-`](../../test/profile.test.ts), and **1** matches
[`sessions-`](../../test/sessions.test.ts). Three have future `createdAt` values,
consistent with tests that use a controlled clock. These indicators strongly
suggest test-generated records, but the aggregate check cannot prove why they
remain or authorize deletion. No records were changed.

## Migration inventory and timing

Prisma `migrate status` found **4** local migrations in the working tree at the
time and reported that the database schema was up to date. The fourth migration
is for the later organizer-decision work and is outside the issue #127 commit.
The database's `_prisma_migrations` history shows:

| Migration | Database history |
| --- | --- |
| `20261012_initial_schema` | Applied |
| `20261019000000_registration` | One rolled-back attempt, followed by an applied attempt |
| `20261023000000_organizer_application` | Applied |
| `20261023010000_organizer_decision` | Applied |

**Pending migrations on this test database: none.** The exact issue #127
migration is [the organizer application migration](../../prisma/migrations/20261023000000_organizer_application/migration.sql).
It creates the `OrganizerApplication` table, unique account/profile links, and
foreign keys. It contains no historical backfill.

The issue #127 migration was recorded as applied at **2026-10-23 12:53:01 UTC**,
before this inventory. This is therefore a **post-migration snapshot**, not
evidence that inspection occurred before that migration on this test database.
That timing requirement cannot be established retroactively from this check.
Repeat identity verification and the aggregate inventory before applying the
migration to any target where it is still pending.

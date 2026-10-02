# Runbook — disaster recovery

## RTO / RPO intent (spec)

| Tier | RTO | RPO |
|---|---|---|
| Middleware API + portal | ≤ 4 hours | ≤ 1 hour |
| Object storage (documents) | ≤ 8 hours | ≤ 24 hours (versioned bucket preferred) |
| Upstream engines | Best-effort rebuild from backups + re-provision | Independent DBs |

## Failure scenarios

### 1. Middleware DB lost

1. Stop writers (`const-middleware`).
2. Restore latest good dump ([database-backup.md](./database-backup.md)).
3. Run Prisma migrations / `db:push` if schema drifted.
4. Smoke: `GET /v1/health`, login, list projects.
5. Resume traffic.

### 2. Redis / queues lost

- Sessions / BullMQ jobs are rebuildable; expect re-login and redrive failed jobs.
- No durable customer documents in Redis.

### 3. MinIO / object storage lost

1. Restore bucket from offsite backup.
2. Reconcile document rows vs objects (presign/complete flow).
3. Re-upload missing field photos if needed.

### 4. Upstream cost-core / pm-core down

- Platform remains up for local domain data; provisioning / sync features degrade.
- Health endpoint reports `cost_core` / `pm_core` down without leaking hostnames.
- Restart local engines (`scripts/start-engines.ps1`) or compose profile `official`.

### 5. Full region / host loss

1. Provision new host or cluster from `k8s/` / Helm when ready.
2. Restore DB + object storage.
3. Point DNS / Cloudflare to new origin.
4. Validate network policy: only middleware → upstream.

## Communication

- Declare incident owner and status page note.
- Do not expose internal engine URLs to customers.

## Related

- Backup: [database-backup.md](./database-backup.md)
- Docs mirror: [../../const-docs/runbooks/disaster-recovery.md](../../const-docs/runbooks/disaster-recovery.md)

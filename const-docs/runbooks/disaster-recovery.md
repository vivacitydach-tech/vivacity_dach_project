# Disaster recovery (docs overview)

Operational detail lives in infra runbooks:

- [const-infra/runbooks/disaster-recovery.md](../../const-infra/runbooks/disaster-recovery.md)
- [const-infra/runbooks/database-backup.md](../../const-infra/runbooks/database-backup.md)

## Quick reference

| Asset | Local | Recovery note |
|---|---|---|
| Middleware DB | XAMPP MySQL `middleware_prod` | `mysqldump` / restore |
| Engines | `cost-core` / `pm-core` or compose `official` | Restart; re-provision projects if needed |
| Objects | MinIO | Restore bucket; reconcile document rows |
| API | Nest on :3000 | Redeploy; smoke `/v1/health` + login |

**RTO / RPO intent:** API ≤ 4h / ≤ 1h; objects ≤ 8h / ≤ 24h.

Do not expose upstream engine hostnames to customers during an incident.

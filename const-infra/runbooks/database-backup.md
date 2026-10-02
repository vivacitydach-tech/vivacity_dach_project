# Runbook — database backup

## Scope

| Store | Local today | Production target |
|---|---|---|
| Middleware primary | XAMPP MySQL `middleware_prod` | PostgreSQL 16 (`middleware_prod`) |
| Support Postgres | Compose `postgres` (engines / trials) | Managed Postgres |
| Object storage | MinIO | S3-compatible |

## Local MySQL (current middleware MVP)

```powershell
# Adjust path if mysqldump is not on PATH
mysqldump -u root middleware_prod > "backup-middleware_prod-$(Get-Date -Format yyyyMMdd-HHmm).sql"
```

Restore:

```powershell
mysql -u root middleware_prod < backup-middleware_prod-YYYYMMDD-HHmm.sql
```

## Compose Postgres (engines / future middleware)

```bash
docker compose --profile local-engines exec -T postgres \
  pg_dump -U target target_enterprise > backup-pg-$(date +%Y%m%d).sql
```

## Cadence (intent)

| Environment | Frequency | Retention |
|---|---|---|
| Laptop / demo | Before risky migrations | 7 days local |
| Staging | Daily | 14 days |
| Production | Continuous + daily full | ≥ 30 days + offsite |

## Checklist after backup

- [ ] File size non-zero
- [ ] Spot-check table counts or `pg_restore --list`
- [ ] Copy off the same disk / machine
- [ ] Record `request_id` / change ticket if tied to a release

## Related

- Disaster recovery: [disaster-recovery.md](./disaster-recovery.md)
- Docs copy: [../../const-docs/runbooks/disaster-recovery.md](../../const-docs/runbooks/disaster-recovery.md)

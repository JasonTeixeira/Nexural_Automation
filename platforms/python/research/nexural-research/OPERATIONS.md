# Nexural Research — Operations Runbook

## Quick Reference

| Item | Value |
|------|-------|
| **API Base** | `http://localhost:8000/api/` |
| **API Docs** | `http://localhost:8000/api/docs` |
| **Health** | `GET /api/health` |
| **Readiness** | `GET /api/health/ready` |
| **Deep Health** | `GET /api/health/deep` |
| **Metrics** | `GET /metrics` (Prometheus) |
| **Version** | 2.0.0 |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXURAL_AUTH_ENABLED` | `false` | Enable API key authentication |
| `NEXURAL_API_KEYS` | (empty) | Comma-separated valid API keys |
| `NEXURAL_RATE_LIMIT` | `120` | Requests per minute per IP |
| `NEXURAL_MAX_UPLOAD_MB` | `100` | Maximum CSV upload size |
| `NEXURAL_MAX_SESSIONS` | `1000` | Maximum concurrent sessions |
| `NEXURAL_SESSION_TTL_HOURS` | `24` | Auto-expire sessions after N hours |
| `NEXURAL_CORS_ORIGINS` | `localhost:*` | Allowed CORS origins |
| `NEXURAL_DATABASE_URL` | `sqlite:///data/nexural.db` | Database connection string |
| `NEXURAL_REDIS_URL` | (empty) | Redis URL for shared sessions (e.g. `redis://localhost:6379`) |
| `NEXURAL_LOG_LEVEL` | `INFO` | Logging level |
| `NEXURAL_CACHE_MAX_SIZE` | `500` | LRU cache max entries |
| `NEXURAL_CACHE_TTL` | `300` | Cache TTL in seconds |
| `NEXURAL_HSTS_ENABLED` | `false` | Enable HSTS header (requires HTTPS) |

## Starting the Application

```bash
# Development
pip install -e ".[dev]"
uvicorn nexural_research.api.app:app --reload --port 8000

# Production (Docker)
docker compose up -d

# Production (Kubernetes)
kubectl apply -f k8s/deployment.yaml
```

## Monitoring

### Health Checks
- **Liveness:** `GET /api/health` — Is the process alive?
- **Readiness:** `GET /api/health/ready` — Can it serve requests? (includes cache stats)
- **Deep:** `GET /api/health/deep` — Full dependency check (disk, DuckDB, DB, cache)

### Prometheus Metrics
Scrape `GET /metrics` for:
- `nexural_requests_total` — Request count by method/path
- `nexural_request_duration_seconds_sum` — Total processing time
- `nexural_http_status_total` — Status code distribution
- `nexural_active_sessions` — Current session count
- `nexural_cache_hits_total` / `nexural_cache_misses_total` — Cache performance

### Alert Rules (Suggested)
```yaml
- alert: HighErrorRate
  expr: rate(nexural_http_status_total{status=~"5.."}[5m]) > 0.05
  for: 5m

- alert: HighLatency
  expr: nexural_request_duration_seconds_sum / nexural_requests_total > 2
  for: 10m

- alert: CacheMissRate
  expr: nexural_cache_misses_total / (nexural_cache_hits_total + nexural_cache_misses_total) > 0.9
  for: 15m
```

## Incident Response

### Server Down (5xx errors)
1. Check `GET /api/health/deep` for component-level status
2. Check logs: `docker logs nexural-research --tail 100`
3. If DB issue: restart PostgreSQL, then app
4. If memory issue: check session count, trigger cleanup

### Slow Responses
1. Check `/metrics` for request duration breakdown
2. Check cache hit rate — if low, cache may be cold (restart)
3. Check concurrent session count — may need to increase `MAX_SESSIONS` or scale

### Data Loss
1. Sessions persist as Parquet in `data/sessions/`
2. Session metadata in SQLite/PostgreSQL `analysis_sessions` table
3. Restore: restart app — `load_persisted_sessions()` runs automatically

## Backup Strategy

### Local
```bash
# Backup sessions and database
tar -czf nexural-backup-$(date +%Y%m%d).tar.gz data/sessions/ data/nexural.db
```

### Production (S3)
```bash
aws s3 sync data/sessions/ s3://nexural-backups/sessions/ --delete
aws s3 cp data/nexural.db s3://nexural-backups/db/nexural-$(date +%Y%m%d).db
```

## Scaling

### Vertical (Single Instance)
- Increase `MAX_SESSIONS` for more concurrent users
- Increase `CACHE_MAX_SIZE` for better hit rates
- Use PostgreSQL instead of SQLite for concurrent writes

### Horizontal (Multiple Instances)
- Requires Redis for shared session state (set `NEXURAL_REDIS_URL`)
- Use PostgreSQL for shared database (set `NEXURAL_DATABASE_URL`)
- Deploy behind load balancer (nginx/ALB)
- Use Kubernetes HPA for auto-scaling (see `k8s/deployment.yaml`)

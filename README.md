# node-postgres-exporter

A lightweight, configurable Prometheus exporter for PostgreSQL written in Node.js.

- Collects core PostgreSQL metrics (connections, database size)
- Collects metrics about itself (scrape duration, error count)
- Supports dynamic custom metrics via `queries.json`
- Supports multiple database connections via `databases.json`
- Secured with API key using Bearer auth
- Fully Docker-compatible and cloud-ready
- Fast to set up, easy to extend

---

## Quickstart

### 1. Clone and configure

```bash
git clone git@github.com/ducks/node-postgres-exporter.git
cd node-postgres-exporter
cp .env.example .env
cp databases.json.example databases.json
```

Edit `.env` to match your environment:

```
EXPORTER_PORT=9187
EXPORTER_API_KEY=Defacing-Tingle-Caucus8-Refueling
QUERIES_FILE=/app/queries.json
DBS_CONFIG_FILE=/app/databases.json
```

Edit `databases.json` to match your environment:
```
{
  "databases": [
    {
      "name": "db1",
      "host": "postgres1",
      "port": 5432,
      "user": "postgres",
      "pass": "postgres",
      "database": "db1"
    },
    {
      "name": "db2",
      "host": "postgres2",
      "port": 5432,
      "user": "postgres",
      "pass": "postgres",
      "database": "db2"
    }
  ]
}
```

### 2. Define your metrics

Edit or mount a custom `queries.json` file:

```
[
  {
    "name": "active_users",
    "help": "Number of active users in the system",
    "type": "gauge",
    "labels": ["status"],
    "query": "SELECT status, COUNT(*)::int FROM users GROUP BY status"
  }
]
```

### 3. Run it

```
docker build -t pg-exporter .
docker run -p 9187:9187 \
  --env-file .env \
  -v $(pwd)/queries.json:/app/queries.json \
  -v $(pwd)/databases.json:/app/databases.json \
  pg-exporter
```

Or with Docker Compose:

`docker compose up`

### 4. Configure Prometheus

```
scrape_configs:
  - job_name: 'postgres_exporter'
    static_configs:
      - targets: ['your-exporter-host:9187']
    authorization:
      type: Bearer
      credentials: your_secret_key
```

## Metrics Exposed

| Metric                                   | Type   | Description                                       |
|------------------------------------------|--------|---------------------------------------------------|
| `pg_active_connections`                  | Gauge  | Number of active PostgreSQL connections           |
| `pg_database_size_bytes{database="..."}` | Gauge  | Size of each database in bytes                    |
| `exporter_up`                            | Gauge  | Always `1` if exporter is running (self-health)   |
| `exporter_errors_total`                  | Counter| Total number of scrape errors encountered         |
| `exporter_scrape_duration_seconds`       | Gauge  | Duration of each scrape in seconds                |
| _Custom metrics_                         | Gauge  | Defined via `queries.json`, dynamically loaded    |

## Endpoints

| Path         | Method | Auth Required | Description                          |
|--------------|--------|----------------|--------------------------------------|
| `/metrics`   | GET    | ✅ Bearer Token | Prometheus scrape endpoint            |
| `/healthz`   | GET    | ❌ None         | Liveness probe for health checks      |
| `/livez`     | GET    | ❌ None         | Liveness probe; returns `200 OK` if process is alive     |
| `/readyz`    | GET    | ❌ None         | Readiness probe. Returns `200 OK` if the database connection is successful. |

### Authorization

The `/metrics` endpoint requires a Bearer token.

You must include the following HTTP header:
```
Authorization: Bearer your_secret_key
```

## Configuration

| Variable            | Description                            |
|---------------------|----------------------------------------|
| `EXPORTER_PORT`     | HTTP server port (default `9187`)      |
| `EXPORTER_API_KEY`  | Bearer token for `/metrics` access     |
| `QUERIES_FILE`      | Path to `queries.json` file            |
| `DBS_CONFIG_FILE`   | Path to `databases.json` file          |

## Testing

Unit tests are written using Vitest.

Unit tests run on `main` branch push/PR. Integration tests requiring live
databases are automatically skipped in CI environments.

To run full tests locally:

`npm test`

## TODOs / Improvement Ideas

- [x] Rate-limit `/metrics` to protect against abuse or scraping loops
- [x] Add exporter self-health metrics (up, scrape duration, error count)
- [x] Add unit tests for query loading and metric registration
- [x] Gracefully shut down DB pools on SIGINT/SIGTERM
- [x] Support multiple database connections
- [x] Add basic GitHub Actions CI integration

Future enhancements:

- [ ] Hot-reload `queries.json` without restart
- [ ] Support token auth via query param (e.g., `?token=...`)
- [ ] Add `/configz` endpoint to expose active config for debugging
- [ ] Publish prebuilt Docker image to GitHub Container Registry
- [ ] Support large `.sql` file queries
- [ ] Expand metric type support beyond Gauge/Counter

## License

MIT

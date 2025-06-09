# 🐘 postgres-exporter

A lightweight, configurable Prometheus exporter for PostgreSQL written in Node.js.

- 🔍 Collects core PostgreSQL metrics (connections, database size)
- 📊 Supports dynamic custom metrics via `queries.json`
- 🔐 Secured with optional API key using Bearer auth
- 🐳 Fully Docker-compatible and cloud-ready
- ⚡ Fast to set up, easy to extend

---

## 🚀 Quickstart

### 1. Clone and configure

```bash
git clone https://github.com/ducks/postgres-exporter.git
cd postgres-exporter
cp .env.example .env
```

Edit `.env` to match your environment:

```
DB_HOST=your-db-host
DB_PORT=5432
DB_USER=readonly_user
DB_PASS=readonly_pass
DB_NAME=your_database

PORT=9187
EXPORTER_API_KEY=your_secret_key
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

| Metric                                 | Description                                     |
|----------------------------------------|-------------------------------------------------|
| `pg_active_connections`               | Number of active PostgreSQL connections         |
| `pg_database_size_bytes{database="..."}` | Size of each database in bytes                  |
| _Custom metrics_                      | Defined via `queries.json`, dynamically loaded  |

## Endpoints

| Path         | Method | Auth Required | Description                          |
|--------------|--------|----------------|--------------------------------------|
| `/metrics`   | GET    | ✅ Bearer Token | Prometheus scrape endpoint            |
| `/healthz`   | GET    | ❌ None         | Liveness probe for health checks      |
| `/livez`     | GET    | ❌ None         | Alias forLiveness probe for health checks      |
| `/readyz`    | GET    | ❌ None         | Readiness probe. Returns `200 OK` if the database connection is successful. |

### Authorization

The `/metrics` endpoint is protected with a Bearer token.
You must set the `Authorization` header:
`Authorization: Bearer your_secret_key`

## Configuration

| Variable           | Description                            |
| ------------------ | -------------------------------------- |
| `DB_HOST`          | PostgreSQL host                        |
| `DB_PORT`          | PostgreSQL port                        |
| `DB_USER`          | PostgreSQL user                        |
| `DB_PASS`          | PostgreSQL password                    |
| `DB_NAME`          | PostgreSQL database                    |
| `PORT`             | HTTP server port (default `9187`)      |
| `EXPORTER_API_KEY` | Bearer token for `/metrics`            |
| `QUERIES_FILE`     | Optional custom path to `queries.json` |

## License

MIT

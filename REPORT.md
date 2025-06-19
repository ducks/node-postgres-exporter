# SitRep (Situation Report)

## Overview

This project implements a PostgreSQL Prometheus exporter, written in Node.js,
with a focus on configurability, robustness, and multi-database scalability.

The exporter collects both core PostgreSQL metrics and dynamic custom metrics
defined via JSON configuration. A fully runnable Docker Compose setup is
included for testing.

## Work Summary

- Built core Postgres exporter exposing `/metrics` endpoint using Express
- Designed config driven dynamic metrics via `queries.json`
- Implemented API key auth via Bearer token for secure access
- Included core Postgres metrics (active connections, db size)
- Included metrics about exporter (scrape duration, error count)
- Implemented multi-database support via `databases.json` config file
- Refactored to modular, maintainable code structure
- Implemented graceful shutdown to cleanly close all database pools
- Added basic rate limiting to protect against excessive scraping
- Fully containerized with Docker Compose, including two Postgres DBs for demo
- Developed initial automated tests (auth, config loading, metric loading)
- Integrated CI pipeline using Github Actions

## Technical Decisions
- Chose Node.js for rapid iteration, strong ecosystem libraries (prom-client,
  pg), and ease of developer onboarding.

- Chose JSON configuration files for simplicity, explicitness, and easy testing
  without code changes.

- Modular architecture to fully separate database management, metric
  registration, query execution, and HTTP routing

- Injected db label automatically to simplify user-facing configuration and
  support clean multi-database separation.

- Added runtime introspection endpoint (`/configz`) to expose loaded config
  state for operators.

- Structured development using isolated feature branches and atomic commits,
  preserving full traceability of design decisions and implementation evolution.

## Obstacles Encountered
- Never used Prometheus before
- Initial confusion around metric registration order in `prom-client`
- Handling client connection release errors during scrape failures (double
  release)
- Isolating scrape failure handling to ensure exporter stability

## Limitations, Tradeoffs, & Performance Considerations

- **Metric types:** Only `Gauge` and `Counter` supported currently (no
  `Histogram` or `Summary` types yet).

- **Query design:** `queries.json` assumes queries return one numeric value
  and any additional label fields. Complex queries may require explicit
  `valueField` support.

- **Scraping model:** Scrapes databases in parallel, but any individual
  database scrape failure currently causes full scrape failure. No partial
  scrape reporting yet.

- **Cardinality risk:** Query design fully controls metric cardinality.
  Queries returning unbounded distinct label values could introduce
  high-cardinality risk in Prometheus storage.

- **Long-running queries:** Query performance directly affects scrape
  duration. Poorly optimized SQL queries can delay scrapes or cause failures
  under Prometheus timeouts.

- **Connection pool sizing:** Connection pool size (`max: 5` per database) is
  conservative to balance concurrency and resource usage. Larger database sets
  may require tuning.

- **Concurrency control:** No scrape mutex currently; overlapping scrapes may
  occur if Prometheus issues concurrent scrape requests.

- **Internal timeouts:** Exporter does not enforce scrape-level timeouts
  internally; relies on Prometheus scrape timeout configuration to enforce
  scrape deadlines.


## Testing Instructions

1. clone repo - git@github.com:ducks/node-postgres-exporter.git
2. change to example dir - `cd example`
3. Run with Docker Compose - `docker compose up`
4. Exporter available at `http://localhost:9187/metrics`
5. Prometheus available at `http://localhost:9090`
6. Test queries
  - `exporter_scrape_duration_seconds`
  - `pg_active_connections`
  - `pg_database_size_bytes`
  - `pg_scrape_duration_seconds`
  - `pg_scrape_success`
  - `disc_golf_total_holes`
  - `disc_golf_course_count_by_location`
  - `disc_golf_holes_by_location`

## Future Work

### High Priority

1. Secure Database Credenetial Management

- Replace plaintext database credentials in `databases.json` with external
  secret management integration.
- Options include: Kubernetes Secrets, cloud provider secret stores,
  environment variable injection, or HashiCorp Vault.
- Prevent credential exposure via configuration files, CI logs, or image builds.
- Enables safe deployment of the exporter in production environments.

2. Network-resilient scrape buffering

- Decouple database scraping from Prometheus pull cycle
- Run internal periodic scrape loop with local result caching
- Serve cached data to Prometheus to tolerate transient network issues
- Prevents gaps in Prometheus data caused by brief network disruptions

3. Per-Database Failure Isolation

- Prevent single database failure from blocking full scrape response.

4. Expanded Metric Type Support

- Add support for Prometheus Histogram and Summary types.
- Enable richer metrics for latency, distributions, and advanced analysis.



### Medium Priority

1. Schema Validation for Config Files

- Enforce JSON schema validation for `queries.json` and `databases.json`.
- Fail fast on invalid configs for stronger operational safety.

2. Explicit Value Field Extraction

- Add `valueField` property in `queries.json` to disambiguate which numeric
  column maps to metric value.

3. Scrape Concurrency Control

- Protect against simultaneous scrapes triggered by misconfigured Prometheus
  jobs or aggressive scraping behavior.

### Longer-Term Enhancements

1. Cardinality Safeguards

- Add internal protections to detect high-cardinality label sets during scrape.

2. Hot-Reload of Configuration

- Support dynamic config reload without restarting exporter.

3. Database Health Quarantine

- Introduce quarantine behavior for repeatedly failing database instances.

### CI/CD

- Publish prebuilt Docker image.
- Expand automated test coverage (integration tests).
- Automate configuration schema validation in CI pipeline.

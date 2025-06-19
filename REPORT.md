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
  - `pg_active_connections`
  - `pg_database_size_bytes`
  - `disc_golf_total_holes`
  - `disc_golf_course_count_by_location`
  - `disc_golf_holes_by_location`

## Future Work

### High Priority
1. Enhanced Error Isoloation

- Currently, a failure to scrape any single database causes the entire scrape
  to fail
- Future work should allow for partial scrape success:
  - Emit metrics for all healthy databases
  - Record scrape failures per database as distinct error metrics
  - Avoid full exporter scrape failures due to isolated DB outages

2. Support for Additional Metric Types

- Currently only `gauge` metric type is supported
- Adding support for counter, histogram, and summary metric types would enable
  broader metric use cases and better align with Prometheus best practices.

### Medium Priority

1. Schema Validation for Config Files
- Introduce JSON schema validation for both `queries.json` and `databases.json`
- Fail fast on startup for misconfigured or invalid JSON files
- Improves user experience and operational safety

2. Configurable Value Field Extraction
- Allow users to explicitly specify which column should be used as the metric
  value via a `valueField` property
- This removes ambiguity when queries return multiple numeric fields

3. Scrape Concurrency Control
- Introduce scrape mutex to prevent overlapping scrapes in case Prometheus
  issues concurrent requests (e.g. when using multiple targets or load
  balancing).

### Longer Term Enhancements

1. Cardinality Protections
- Implement internal checks to detect or limit high-cardinality label outputs
  during scrapes
- Protects Prometheus storage from unintended growth due to poorly designed
  queries or unbounded label sets

2. Hot Reload of configuration
- Allow configuration changes (new queries or new databases) to be detected and
  applied without requiring exporter restarts.

3. Detect Unhealthy Databases
- Introduce temporary quarantine for repeatedly failing database instances to
  protect scrape performance.

### CI/CD
- Publish prebuilt Docker image
- Full integration tests
- Automated schema validation

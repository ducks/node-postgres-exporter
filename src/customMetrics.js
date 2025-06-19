const fs = require('fs');
const path = require('path');

const { Counter, Gauge } = require('prom-client');

const customMetrics = [];

function loadCustomMetrics(register, queriesFilePath) {
  const filePath = queriesFilePath || path.join(__dirname, '../queries.json');

  if (!fs.existsSync(filePath)) {
    console.warn(`[WARN] No queries file found at ${filePath}`);
    return;
  }

  let queries;
  try {
    queries = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`[ERROR] Failed to parse queries file: ${err.message}`);
    return;
  }

  if (!Array.isArray(queries)) {
    console.error('[ERROR] queries.json must contain an array of query objects');
    return;
  }

  queries.forEach((q, i) => {
    const { name, help, type = 'gauge', labels = [], query } = q;
    console.log(q);

    if (!name || !help || !query) {
      console.warn(`[SKIP] Query entry #${i} is missing required fields.`);
      return;
    }

    try {
      let metric;
      const labelNames = [...labels, 'db'];

      if (type === 'gauge') {
        metric = new Gauge({ name, help, labelNames });
      } else if (type === 'counter') {
        metric = new Counter({ name, help, labelNames });
      } else {
        console.warn(`[SKIP] Unsupported metric type "${type}" for ${name}`);
        return;
      }

      register.registerMetric(metric);
      customMetrics.push({ definition: q, instance: metric });

    } catch (err) {
      console.error(`[ERROR] Failed to register metric "${name}": ${err.message}`);
    }
  });

  console.log(`[INFO] Loaded ${customMetrics.length} custom metrics`);
}

// --- Metric Collector ---
async function collectCustomMetrics(client, dbName) {
  for (const { definition, instance } of customMetrics) {
    try {
      const result = await client.query(definition.query);

      result.rows.forEach(row => {
        const labels = { db: dbName };

        let value = null;
        let valueFieldUsed = definition.valueField || null;

        for (const key in row) {
          if (definition.labels.includes(key)) {
            labels[key] = row[key];
          } else if (!valueFieldUsed && typeof row[key] === 'number' && value === null) {
            valueFieldUsed = key;
            value = row[key];
          } else if (key === valueFieldUsed) {
            value = row[key];
          }
        }

        if (value !== null) {
          if (instance instanceof Gauge) {
            instance.set(labels, value);
          } else if (instance instanceof Counter) {
            instance.inc(labels, value);
          } else {
            console.warn(`[CUSTOM] Unknown metric type for ${definition.name}`);
          }
        } else {
          console.warn(
            `[CUSTOM] No numeric value found for "${definition.name}" row:`,
            row
          );
        }
      });
    } catch (err) {
      console.error(`[CUSTOM] Failed to run "${definition.name}":`, err.message);
    }
  }
}

module.exports = {
  loadCustomMetrics,
  collectCustomMetrics,
};

#!/usr/bin/env node
/* eslint-disable no-console */

const DEFAULT_URL = process.env.PERF_BASE_URL || 'http://127.0.0.1:3000/api';
const DEFAULT_REQUESTS = Number(process.env.PERF_REQUESTS || 200);
const DEFAULT_CONCURRENCY = Number(process.env.PERF_CONCURRENCY || 20);
const DEFAULT_THRESHOLD_MS = Number(process.env.PERF_P95_MS || 800);

function parseArgs(argv) {
  const parsed = {
    url: DEFAULT_URL,
    requests: DEFAULT_REQUESTS,
    concurrency: DEFAULT_CONCURRENCY,
    thresholdMs: DEFAULT_THRESHOLD_MS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];

    if (current === '--url' && next) {
      parsed.url = next;
      i += 1;
      continue;
    }
    if (current === '--requests' && next) {
      parsed.requests = Number(next);
      i += 1;
      continue;
    }
    if (current === '--concurrency' && next) {
      parsed.concurrency = Number(next);
      i += 1;
      continue;
    }
    if (current === '--p95' && next) {
      parsed.thresholdMs = Number(next);
      i += 1;
      continue;
    }
  }

  return parsed;
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx];
}

async function hit(url) {
  const start = performance.now();
  const response = await fetch(url);
  const latencyMs = performance.now() - start;
  return { status: response.status, latencyMs };
}

async function runLoad({ baseUrl, requests, concurrency }) {
  const endpoints = ['/legal/privacy-policy', '/legal/terms'];
  const latencies = [];
  const statusCounts = new Map();
  let failures = 0;
  let sent = 0;

  let cursor = 0;
  const worker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= requests) return;

      const endpoint = endpoints[index % endpoints.length];
      const target = `${baseUrl}${endpoint}`;
      try {
        const result = await hit(target);
        latencies.push(result.latencyMs);
        statusCounts.set(
          result.status,
          (statusCounts.get(result.status) || 0) + 1,
        );
        if (result.status >= 400) failures += 1;
      } catch (_err) {
        failures += 1;
      } finally {
        sent += 1;
      }
    }
  };

  const startedAt = performance.now();
  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, () => worker()),
  );
  const elapsedMs = performance.now() - startedAt;

  return { latencies, statusCounts, failures, sent, elapsedMs };
}

function printSummary(result, thresholdMs) {
  const { latencies, statusCounts, failures, sent, elapsedMs } = result;
  const avg = latencies.length
    ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length
    : 0;
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const min = latencies.length ? Math.min(...latencies) : 0;
  const max = latencies.length ? Math.max(...latencies) : 0;
  const rps = sent > 0 ? (sent * 1000) / elapsedMs : 0;
  const failureRate = sent > 0 ? (failures / sent) * 100 : 0;

  console.log('\nPerformance Smoke Result');
  console.log('------------------------');
  console.log(`Requests:        ${sent}`);
  console.log(`Failures:        ${failures} (${failureRate.toFixed(2)}%)`);
  console.log(`Elapsed:         ${elapsedMs.toFixed(2)} ms`);
  console.log(`Throughput:      ${rps.toFixed(2)} req/s`);
  console.log(`Latency avg:     ${avg.toFixed(2)} ms`);
  console.log(`Latency p50/p95: ${p50.toFixed(2)} / ${p95.toFixed(2)} ms`);
  console.log(`Latency p99:     ${p99.toFixed(2)} ms`);
  console.log(`Latency min/max: ${min.toFixed(2)} / ${max.toFixed(2)} ms`);
  console.log(
    `Status counts:   ${JSON.stringify(Object.fromEntries(statusCounts.entries()))}`,
  );

  if (failureRate > 1 || p95 > thresholdMs) {
    console.error(
      `\nFAIL: thresholds exceeded (failureRate <= 1%, p95 <= ${thresholdMs}ms).`,
    );
    process.exit(1);
  }

  console.log('\nPASS: smoke performance thresholds met.');
}

async function main() {
  const { url, requests, concurrency, thresholdMs } = parseArgs(
    process.argv.slice(2),
  );

  console.log('Running performance smoke test with:');
  console.log(`- Base URL:     ${url}`);
  console.log(`- Requests:     ${requests}`);
  console.log(`- Concurrency:  ${concurrency}`);
  console.log(`- p95 limit:    ${thresholdMs} ms`);

  const warmup = await runLoad({
    baseUrl: url,
    requests: Math.min(20, Math.max(1, Math.floor(requests / 10))),
    concurrency: Math.min(5, concurrency),
  });
  if (warmup.failures > 0) {
    console.error(
      `Warmup failed (${warmup.failures}/${warmup.sent}). Ensure backend is running at ${url}.`,
    );
    process.exit(1);
  }

  const result = await runLoad({
    baseUrl: url,
    requests,
    concurrency,
  });
  printSummary(result, thresholdMs);
}

main().catch((err) => {
  console.error('Performance smoke failed:', err?.message || err);
  process.exit(1);
});

#!/usr/bin/env node
/* eslint-disable no-console */

const DEFAULT_URL = process.env.SECURITY_BASE_URL || 'http://127.0.0.1:3000/api';
const DEFAULT_ATTEMPTS = Number(process.env.SECURITY_LOGIN_ATTEMPTS || 12);
const DEFAULT_CONCURRENCY = Number(process.env.SECURITY_LOGIN_CONCURRENCY || 4);

function parseArgs(argv) {
  const parsed = {
    url: DEFAULT_URL,
    attempts: DEFAULT_ATTEMPTS,
    concurrency: DEFAULT_CONCURRENCY,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];

    if (current === '--url' && next) {
      parsed.url = next;
      i += 1;
      continue;
    }
    if (current === '--attempts' && next) {
      parsed.attempts = Number(next);
      i += 1;
      continue;
    }
    if (current === '--concurrency' && next) {
      parsed.concurrency = Number(next);
      i += 1;
      continue;
    }
  }

  return parsed;
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  return { status: res.status };
}

async function verifyProtectedRoute(baseUrl) {
  const unauthenticated = await requestJson(`${baseUrl}/projects`);
  const tampered = await requestJson(`${baseUrl}/projects`, {
    headers: { Authorization: 'Bearer invalid.token.value' },
  });

  const ok =
    unauthenticated.status === 401 &&
    tampered.status === 401;

  return {
    ok,
    unauthenticatedStatus: unauthenticated.status,
    tamperedStatus: tampered.status,
  };
}

async function runBruteForce(baseUrl, attempts, concurrency) {
  let cursor = 0;
  const statuses = [];
  const body = JSON.stringify({
    identifier: 'non-existent@splitflow.com',
    password: 'WrongPassword123!',
  });

  const worker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= attempts) return;

      try {
        const response = await requestJson(`${baseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
        statuses.push(response.status);
      } catch (_error) {
        statuses.push(599);
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, () => worker()),
  );

  const counts = statuses.reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const has500 = statuses.some((status) => status >= 500);
  const has429 = statuses.some((status) => status === 429);
  const allDefensive = statuses.every((status) =>
    status === 401 || status === 429,
  );

  return {
    statuses,
    counts,
    has500,
    has429,
    allDefensive,
  };
}

async function main() {
  const { url, attempts, concurrency } = parseArgs(process.argv.slice(2));
  console.log('Running security smoke test with:');
  console.log(`- Base URL: ${url}`);
  console.log(`- Attempts: ${attempts}`);
  console.log(`- Concurrency: ${concurrency}`);

  const protectedRoute = await verifyProtectedRoute(url);
  if (!protectedRoute.ok) {
    console.error('FAIL: Protected route checks failed:', protectedRoute);
    process.exit(1);
  }

  const bruteForce = await runBruteForce(url, attempts, concurrency);
  console.log('Brute-force status counts:', bruteForce.counts);

  if (bruteForce.has500) {
    console.error('FAIL: Received at least one 5xx response during brute-force simulation.');
    process.exit(1);
  }
  if (!bruteForce.allDefensive) {
    console.error('FAIL: Found unexpected non-defensive status codes.');
    process.exit(1);
  }
  if (attempts >= 6 && !bruteForce.has429) {
    console.error('FAIL: Expected at least one 429 when attempts >= 6.');
    process.exit(1);
  }

  console.log('PASS: Security smoke checks passed.');
}

main().catch((error) => {
  console.error('Security smoke failed:', error?.message || error);
  process.exit(1);
});

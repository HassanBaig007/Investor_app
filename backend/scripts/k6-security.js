import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const baseUrl = __ENV.K6_BASE_URL || 'http://127.0.0.1:3000';
const loginIdentifier = __ENV.K6_LOGIN_IDENTIFIER || 'non-existent@splitflow.com';
const loginPassword = __ENV.K6_LOGIN_PASSWORD || 'WrongPassword123!';

const status429Counter = new Counter('security_status_429_total');
const status500Counter = new Counter('security_status_5xx_total');

export const options = {
  scenarios: {
    unauthenticated_access: {
      executor: 'constant-vus',
      vus: 5,
      duration: '20s',
      exec: 'unauthenticatedAccess',
    },
    brute_force_login: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      exec: 'bruteForceLogin',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1200'],
    security_status_5xx_total: ['count==0'],
    security_status_429_total: ['count>0'],
  },
};

export function unauthenticatedAccess() {
  const noTokenRes = http.get(`${baseUrl}/api/projects`);
  check(noTokenRes, {
    'protected route without token is rejected': (res) => res.status === 401,
  });
  if (noTokenRes.status >= 500) status500Counter.add(1);

  const tamperedTokenRes = http.get(`${baseUrl}/api/projects`, {
    headers: { Authorization: 'Bearer invalid.token.value' },
  });
  check(tamperedTokenRes, {
    'protected route with tampered token is rejected': (res) => res.status === 401,
  });
  if (tamperedTokenRes.status >= 500) status500Counter.add(1);

  sleep(0.25);
}

export function bruteForceLogin() {
  const loginRes = http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify({
      identifier: loginIdentifier,
      password: loginPassword,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  const acceptedSecurityStatuses = [401, 429];
  check(loginRes, {
    'brute-force login returns defensive status': (res) =>
      acceptedSecurityStatuses.includes(res.status),
  });

  if (loginRes.status === 429) status429Counter.add(1);
  if (loginRes.status >= 500) status500Counter.add(1);

  sleep(0.1);
}

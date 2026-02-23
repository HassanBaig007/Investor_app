import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.K6_BASE_URL || 'http://127.0.0.1:3000';
const p95Ms = Number(__ENV.K6_P95_MS || 800);

export const options = {
  stages: [
    { duration: '20s', target: 20 },
    { duration: '40s', target: 40 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: [`p(95)<${p95Ms}`],
  },
};

export default function () {
  const endpoints = ['/api/legal/privacy-policy', '/api/legal/terms'];
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const response = http.get(`${baseUrl}${endpoint}`);

  check(response, {
    'status is 200': (res) => res.status === 200,
  });

  sleep(0.2);
}

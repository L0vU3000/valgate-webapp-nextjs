/**
 * k6 smoke — three read-only page hits against a URL you pass in.
 *
 * This is a measurement tool, not CI. It never mutates data and it has no
 * default host, so it cannot silently hammer production.
 *
 * Pages (real routes in this app):
 *   /login                  public sign-in form
 *   /app                    signed-in home (issue TM1-71 called this out)
 *   /property/{id}          property record; redirects to /overview when signed in
 *                           (the issue wrote /app/property/[id]; that path does not exist)
 *
 * Unsigned /app and /property on a Clerk *development* instance return 404
 * (x-clerk-auth-reason: protect-rewrite, dev-browser-missing) instead of a
 * 302 to /login. That is expected until TM1-62 provides a session cookie.
 *
 * Run:
 *   BASE_URL=https://<preview>.vercel.app k6 run load/smoke.js
 *
 * Optional:
 *   PROPERTY_ID=PROP-0001
 *   K6_SESSION_COOKIE='__session=...; __client_uat=...'
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = requireBaseUrl();
const PROPERTY_ID = (__ENV.PROPERTY_ID || "PROP-0001").trim();
const SESSION_COOKIE = (__ENV.K6_SESSION_COOKIE || "").trim();
const hasSession = SESSION_COOKIE.length > 0;

// Statuses Clerk/Next may return for a protected page when nobody is signed in.
// 404 is the Clerk development-instance protect-rewrite (see middleware.ts).
const UNSIGNED_PROTECTED_OK = [200, 301, 302, 303, 307, 308, 404];

export const options = {
  vus: 1,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<5000"],
    "http_req_duration{page:login}": ["p(95)<5000"],
    "http_req_duration{page:app}": ["p(95)<5000"],
    "http_req_duration{page:property}": ["p(95)<5000"],
    checks: ["rate>0.99"],
  },
};

/**
 * Require BASE_URL so a missing env var fails immediately instead of
 * guessing localhost or production.
 */
function requireBaseUrl() {
  const raw = (__ENV.BASE_URL || "").trim();
  if (!raw) {
    throw new Error(
      "BASE_URL is required. Example:\n" +
        "  BASE_URL=https://your-preview.vercel.app k6 run load/smoke.js\n" +
        "There is no default host — this script will not guess production or localhost.",
    );
  }
  return raw.replace(/\/$/, "");
}

/**
 * Build request headers. The session cookie is optional; without it the
 * protected pages still run so we can record unsigned latency.
 */
function requestHeaders() {
  const headers = {
    "User-Agent": "valgate-k6-smoke/1.0",
  };
  if (hasSession) {
    headers.Cookie = SESSION_COOKIE;
  }
  return headers;
}

/**
 * Tell k6 which HTTP statuses count as "not a failed request" for a
 * protected page, so unsigned Clerk 404s do not inflate http_req_failed.
 */
function expectedProtectedStatuses() {
  if (hasSession) {
    return http.expectedStatuses(200);
  }
  return http.expectedStatuses(200, 301, 302, 303, 307, 308, 404);
}

/**
 * GET one page and tag the sample so the summary can split p95 by page.
 */
function getPage(path, pageTag, responseCallback) {
  return http.get(BASE_URL + path, {
    headers: requestHeaders(),
    tags: { page: pageTag },
    responseCallback: responseCallback,
  });
}

/**
 * True when this response is an acceptable outcome for a protected page
 * given whether we sent a session cookie.
 */
function isExpectedProtectedStatus(status) {
  if (hasSession) {
    return status === 200;
  }
  return UNSIGNED_PROTECTED_OK.indexOf(status) !== -1;
}

export default function () {
  const login = getPage("/login", "login", http.expectedStatuses(200));
  check(login, {
    "login returned 200": function (res) {
      return res.status === 200;
    },
  });

  const app = getPage("/app", "app", expectedProtectedStatuses());
  check(app, {
    "app returned an expected status": function (res) {
      return isExpectedProtectedStatus(res.status);
    },
  });

  const property = getPage(
    "/property/" + PROPERTY_ID,
    "property",
    expectedProtectedStatuses(),
  );
  check(property, {
    "property returned an expected status": function (res) {
      return isExpectedProtectedStatus(res.status);
    },
  });

  sleep(1);
}

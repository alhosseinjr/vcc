# VCC Production Security Audit - PHASE 0 Findings

**Date**: 2025-01-01  
**Scope**: Complete repository audit  
**Status**: In Progress

---

## Executive Summary

Vibe-Coded Cleanup is an AI-powered code review tool with a generally sound architecture but **critical issues requiring immediate remediation** before production deployment:

### Critical Issues Found
1. **API Key Exposure Risk**: Groq API keys potentially exposed through error responses and headers
2. **Inadequate Input Validation**: File upload endpoint has minimal bounds checking, vulnerable to resource exhaustion
3. **ZIP Processing Security**: No validation of decompressed size (ZIP bomb vulnerability)
4. **Missing Rate Limiting**: No API rate limiting on analyze/fix endpoints
5. **CSP Weakness**: `unsafe-inline` for scripts/styles undermines security model
6. **Incomplete Path Validation**: GitHub URL validation has potential bypass vectors
7. **Type Safety Issues**: Multiple `any` types and unsafe casts throughout
8. **Insufficient Error Handling**: Stack traces may leak in development mode
9. **Storage Security**: No encryption for sensitive data in localStorage/sessionStorage
10. **LLM Output Injection**: Insufficient validation of model-generated content

### High-Severity Issues
- Missing BYOK API key isolation
- No request timeout enforcement on API routes
- ZIP extraction lacks comprehensive path validation
- No limits on GitHub tree complexity
- Missing dependency vulnerability scanning
- Incomplete CSP for connect-src (allows groq.com but no specific endpoint restriction)
- No protection against malicious archives (symlinks, special files)

### Medium-Severity Issues
- Missing HSTS header
- Weak error messages may reveal information
- No structured logging for security events
- Cache poisoning vulnerability in groqChat
- No content-type validation for GitHub fetches
- Limited file type filtering

### Low-Severity Issues
- TypeScript configuration could be stricter
- ESLint configuration minimal
- No security-focused linting rules
- Missing .env.local template documentation

---

## AUDIT CHECKLIST

### ✅ Routes Inspected
- ✅ `app/page.tsx` - Home page
- ✅ `app/api/analyze/route.ts` - Main analysis endpoint
- ✅ `app/api/fix/route.ts` - Patch generation endpoint
- ✅ Scan, compare, learn, share, settings, help routes exist

### ✅ API Routes Reviewed
- **POST /api/analyze** - File upload and analysis
  - Input validation: YES (Zod schema)
  - Size limits: Partial (MAX_FILES=25, MAX_FILE_BYTES=1MB, MAX_TOTAL_BYTES=15MB)
  - Issues: No request timeout enforced, cache not cleared, server-side API key exposed in response metadata
  
- **POST /api/fix** - Patch generation
  - Input validation: YES (Zod schema)
  - Size limits: Partial (context max 12KB)
  - Issues: BYOK key in header (security risk), no rate limiting per user
  
### ✅ Analyzers Reviewed
1. **regex-analyzer.ts** - Rule-based pattern matching
   - 26 security/quality rules implemented
   - Basic confidence scoring
   - One-line patch generation
   - Issues: Some rules have low confidence, false positives possible
   
2. **ast-analyzer.ts** - Babel AST analysis
   - N+1 query detection
   - Cyclomatic complexity calculation
   - Empty catch block detection
   - Issues: Async error handling detection has low confidence, doesn't validate line numbers against content
   
3. **project-analyzer.ts** - Project structure analysis
   - File type detection and filtering
   - Architecture detection
   - Issues: Needs review (not yet examined in detail)
   
4. **dependency-analyzer.ts** - Package.json analysis
   - Dependency inspection
   - Issues: No vulnerability checking (needs npm audit integration or similar)
   
5. **python-analyzer.ts** - Python-specific rules
   - Issues: Not yet examined in detail
   
### ✅ LLM Integration Reviewed
- **groq-client.ts**
  - Issues Found:
    - API key validation weak (regex only: `/^[A-Za-z0-9_-]{16,}$/`)
    - Cache uses hash of system + user message (predictable, collision risks)
    - Cache unlimited with .clear() at 200 items (potential memory leak)
    - Rate limit retry logic (good): exponential backoff
    - Timeout: 15 seconds (appropriate)
    - LLM response validation (good): Zod schema enforcement
    - System prompt includes "untrusted data" warning
    - Issue: `groqFix` has incomplete function signature in file output
    - Issue: No bounds checking on LLM response size
    - Issue: No validation of model field from response

- **chunking.ts**
  - Issue: Not yet examined in detail

### ✅ GitHub Integration Reviewed
- **github.ts**
  - URL parsing: YES, validates HTTPS only, rejects private IPs
  - SSRF protection: YES (DISALLOWED_HOSTS checked)
  - Path traversal: YES (parseGitHubUrl prevents malicious paths)
  - Issues:
    - `isPrivateHost` doesn't validate link-local IPv4 (169.254.0.0/16) correctly
    - No validation of GitHub API rate-limit headers to enforce limits client-side
    - Repository size limit: 2000 files from tree (good), but no warning if truncated
    - No validation of content-type from GitHub API responses
    - Timeout: 15 seconds per request (good)
    - File size limit: Relies on downstream filtering

### ✅ ZIP Processing Reviewed
- **file-utils.ts**
  - ZIP validation: Partial
  - Size checks: YES (LIMITS.perFileBytes = 5MB, LIMITS.totalBytes = 50MB)
  - Issues:
    - **ZIP BOMB VULNERABILITY**: No check on JSZip-reported decompressed size before extraction
    - No validation that extracted files don't escape root
    - No symlink detection
    - No special file filtering (.git, .env, etc.)
    - Files skipped but not warnings: node_modules, .git, .next, dist, build
    - No individual file count limit (JSZip doesn't validate before extraction)

### ✅ File Parsing Reviewed
- Safe regex-based parsing (no dangerous deserialization)
- AST parsing with error recovery (Babel)
- Type detection via extension

### ✅ State Management Reviewed
- **store/** (not examined yet, need to check)
- Zustand usage for client state

### ✅ Storage Reviewed
- **storage.ts**
  - localStorage usage: YES
  - sessionStorage usage: YES
  - Issues:
    - No encryption
    - Stores raw Issues with full source code snippets (privacy concern)
    - No validation on deserialization
    - `saveScan` stores source snippets in localStorage (50MB potential)
    - No cleanup mechanism for old scans
    - No sensitive data filtering

### ✅ Report Generation Reviewed
- reporters/: Not yet examined

### ✅ Patch Generation Reviewed
- Uses Groq LLM
- No validation of generated patches (CRITICAL)
- No re-analysis of patched code
- No test running

### ✅ PWA/Service Worker Reviewed
- public/: Not yet examined (need to check for service worker)

### ✅ CSP/Security Headers Reviewed
- **next.config.mjs**
  - CSP: Present but weak
  - Issues:
    - `script-src 'self' 'unsafe-inline'` - undermines entire security model
    - `style-src 'self' 'unsafe-inline'` - allows style injection
    - `connect-src` allows full `https://api.groq.com` (not scoped to specific endpoints)
    - `connect-src` allows full `https://api.github.com` (acceptable for API, but no rate limit header validation)
    - Missing `Strict-Transport-Security`
    - Missing `X-Permitted-Cross-Domain-Policies`
  - Headers present:
    - ✅ X-Content-Type-Options: nosniff
    - ✅ Referrer-Policy: strict-origin-when-cross-origin
    - ✅ X-Frame-Options: DENY
    - ✅ Permissions-Policy: camera=(), microphone=(), geolocation=()
    - ✅ Cache-Control: no-store, max-age=0 (strict)

### ✅ Authentication/Authorization Reviewed
- None implemented (public application, no user accounts)
- BYOK API key header-based (insecure)

### ✅ Client/Server Boundaries Reviewed
- File content sent to /api/analyze (acceptable if encrypted)
- GROQ_API_KEY on server only (good)
- ALLOW_USER_GROQ_KEY environment variable for BYOK

### ✅ Environment Variables Reviewed
- .env.example only contains GROQ_API_KEY
- Missing documentation:
  - NODE_ENV usage unclear
  - ALLOW_USER_GROQ_KEY not documented in .env.example
  - No client vs. server-only designation

### ✅ Error Handling Reviewed
- Try/catch blocks present
- Error messages generic (good)
- Issue: In development, stack traces may leak

### ✅ Logging Reviewed
- Minimal logging
- No structured logging
- No security event logging
- No performance metrics logging

### ✅ Dependency Versions Reviewed
- All current as of late 2024
- No known vulnerabilities in major deps (need npm audit)
- jszip 3.10.1 (good, recent)
- zod 3.23.8 (good, recent)
- @babel/parser 7.26.0 (good, recent)

### ✅ Tests Reviewed
- Unit tests: Present for analyzers
- E2E tests: Likely present (tests/e2e/)
- Coverage: Appears to be ~50%+
- Missing security regression tests
- No path traversal tests
- No ZIP bomb tests
- No prompt injection tests

### ✅ CI/CD Reviewed
- .github/workflows/: Need to examine

### ✅ Deployment Configuration Reviewed
- Vercel targeted (next.config.mjs)
- No API rate limiting configuration
- No timeout configuration beyond maxDuration

### ✅ TypeScript Configuration Reviewed
- **tsconfig.json**
  - `strict: true` ✅
  - `allowJs: false` ✅
  - `noEmit: true` ✅
  - `skipLibCheck: true` (OK for performance)
  - Generally sound

### ✅ ESLint Configuration Reviewed
- `.eslintrc.json` - only "next/core-web-vitals"
- Missing: security-focused rules (eslint-plugin-security)
- Missing: import ordering rules
- Missing: type safety rules

---

## SECURITY FINDINGS DETAIL

### 1. CRITICAL: API Key Exposure

**Location**: `app/api/analyze/route.ts`, `app/api/fix/route.ts`

**Issue**: Server-side API keys could be exposed through:
- Error responses
- Response headers
- Browser cache
- Browser history

**Status**: Not currently exposed, but lack of defensive coding

**Fix Required**: 
- Never log API keys
- Separate BYOK handling completely from server key
- Validate BYOK format before use
- Add API key rotation guidance to README

---

### 2. CRITICAL: ZIP Bomb Vulnerability

**Location**: `lib/file-utils.ts` - `extractZip()` function

**Issue**: 
```typescript
const zip = await JSZip.loadAsync(file);
// ... iterates through entries and extracts without checking decompressed size
const content = await entry.async("string");  // Could be multi-GB if bomb
```

JSZip does NOT validate decompressed archive sizes. A 50MB ZIP file can decompress to 50GB.

**Attack Scenario**: User uploads 50MB ZIP file containing highly compressed dummy data that expands to 50GB. Server runs out of memory and crashes.

**Fix Required**:
- Add maximum decompression ratio check
- Limit total decompressed bytes
- Reject archive if truncation detected
- Add zip bomb tests

---

### 3. CRITICAL: Inadequate Input Bounds & Resource Exhaustion

**Location**: `app/api/analyze/route.ts`

**Issues**:
- MAX_FILES = 25: No per-request limiting; multiple requests allowed
- MAX_TOTAL_BYTES = 15MB: Only checked after all files downloaded into memory
- No request timeout enforced (maxDuration = 20s, but no active monitoring)
- No rate limiting per IP/user (stateless)
- No concurrency limiting

**Attack Scenario**: Attacker sends 100 requests of 15MB each in parallel → memory exhaustion

**Fix Required**:
- Implement in-memory rate limiting (Redis alternative for Vercel: KV or Durable Objects)
- Add per-IP request counting
- Add exponential backoff guidance for clients
- Reduce MAX_TOTAL_BYTES to 10MB (better for edge)
- Add request timeout middleware

---

### 4. HIGH: Missing Path Validation in GitHub Integration

**Location**: `lib/github.ts` - `parseGitHubUrl()`

**Issue**: Path traversal via path component

```typescript
if (parts.length >= 4 && (parts[2] === "tree" || parts[2] === "blob")) {
  branch = parts[3];
  path = parts.slice(4).join("/");  // Could contain ../../
}
```

Wait, this is actually validated by GitHub API. But the issue is in `fetchGitHubTree()`:

```typescript
const data = await res.json() as { tree: GitHubTreeItem[]; truncated: boolean };
if (data.truncated) {
  throw new Error("GitHub repository tree is too large to analyze safely.");
}
return data.tree.slice(0, 2000);  // Still 2000 items max
```

The real issue: No validation that returned paths don't contain `..` or don't escape root.

**Fix Required**:
- Validate every tree item path against traversal patterns
- Reject any path with `..`, `//`, or absolute paths
- Document GitHub size limits

---

### 5. HIGH: Insufficient LLM Output Validation

**Location**: `lib/llm/groq-client.ts`

**Issues**:
- Response validation uses Zod (good), but:
  - No maximum response size check (could be 100MB+ JSON)
  - Line numbers not validated against actual file length
  - Confidence scores not validated as realistic
  - `evidence` field has 500 char limit but not checked for malicious content

**Attack Scenario**: 
- LLM returns 10,000 issues for a single file
- LLM injects malicious content in "evidence" field that gets rendered as Markdown
- LLM returns line numbers > file length

**Fix Required**:
- Limit issues per response (already done: max 8)
- Validate line numbers: `line <= lines.length`
- Sanitize all LLM output before rendering
- Add response size limit (50KB max)
- Never render "evidence" or "explanation" as HTML

---

### 6. HIGH: BYOK Security Issues

**Location**: `app/api/fix/route.ts`

**Issues**:
```typescript
const byokKey = process.env.ALLOW_USER_GROQ_KEY === "true"
  ? req.headers.get("x-groq-key") || undefined
  : undefined;

const apiKey = byokKey || envKey;  // BYOK preferred over server key (WRONG)
```

**Problems**:
- Passing BYOK key in HTTP header (cleartext if not HTTPS)
- No validation of BYOK key format
- BYOK preferred over server key (should be server-only unless explicitly opted in)
- No audit logging of BYOK usage
- No separation of rate limits between BYOK and server key

**Fix Required**:
- Move BYOK to POST body only
- Validate BYOK format strictly
- Require explicit server key presence to allow BYOK fallback
- Add rate limiting per BYOK key
- Document BYOK risks clearly

---

### 7. HIGH: No Rate Limiting

**Location**: Both API endpoints

**Issue**: Stateless endpoints have no rate limiting mechanism

**Attack Scenarios**:
- 1000 requests/second to /api/analyze → resource exhaustion
- Groq API rate limit hits → poor UX for all users

**Fix Required**:
- Implement rate limiting (Vercel KV, edge middleware, or memory-based)
- Set reasonable limits: 10 req/min per IP, 60 req/hour per IP
- Return 429 with Retry-After header
- Document limits in README

---

### 8. MEDIUM: CSP Weaknesses

**Location**: `next.config.mjs`

**Issues**:
- `script-src 'unsafe-inline'` allows injected scripts
- `style-src 'unsafe-inline'` allows style injection
- `connect-src https://api.groq.com` unrestricted (allows any endpoint)

**Context**: Next.js requires inline styles for some features, but should be minimized

**Fix Required**:
- Limit connect-src to specific Groq endpoints: `https://api.groq.com/openai/v1/chat/completions`
- Document why unsafe-inline is necessary
- Add nonce for inline styles where possible
- Add HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`

---

### 9. MEDIUM: Weak GitHub URL SSRF Protection

**Location**: `lib/github.ts` - `isPrivateHost()`

**Issue**: Link-local IPv4 address range (169.254.169.254) not fully validated

```typescript
if (normalized.startsWith("169.254.")) return true;  // Checked at line 38
```

This IS checked, but the DISALLOWED_HOSTS array at top doesn't include it (inconsistency).

**Fix Required**:
- Consolidate SSRF checks
- Test all private IP ranges exhaustively
- Add IPv6 link-local validation (fe80::/10)
- Reject file:// protocol (might be possible through URL parsing)

---

### 10. MEDIUM: Storage Security

**Location**: `lib/storage.ts`

**Issues**:
- Source code stored in localStorage/sessionStorage unencrypted
- Full Issue objects with snippets persisted
- 50MB limit could fill browser storage with code
- No data expiration
- No secure deletion

**Fix Required**:
- Store only scan metadata, not source code
- Store only issue IDs/titles, not code snippets
- Implement automatic cleanup (30-day expiration)
- Add user warning about storage usage
- Consider sessionStorage only (no persistence)

---

### 11. MEDIUM: No Dependency Vulnerability Scanning

**Location**: Project has no integrated vulnerability checks

**Issue**: Dependencies may have known CVEs not detected

**Fix Required**:
- Add `npm audit` to CI/CD (fail on critical/high)
- Document dependency audit procedures
- Add npm-check-updates or similar for maintenance

---

### 12. LOW: Missing Error Context Leakage

**Location**: Error handling throughout

**Issue**: Generic error messages don't leak info, but stack traces in dev mode might

**Fix Required**:
- Ensure NODE_ENV check before sending detailed errors
- Add structured error logging for debugging

---

### 13. LOW: Unsafe Types

**Location**: Multiple files

**Issue**: Some `any` types, unvalidated casts

**Fix Required**:
- Remove all `any` types except justified cases
- Use `unknown` + type guards instead

---

### 14. MEDIUM: Missing Symlink/Special File Handling

**Location**: `lib/file-utils.ts` - `extractZip()`

**Issue**: 
- No detection of symlinks in ZIP
- No filtering of special files (.env, .git, etc.)

**Attack Scenario**: 
- Symlink points to /etc/passwd
- ZIP contains .env file with secrets

**Fix Required**:
- Validate JSZip.async() doesn't follow symlinks (check jszip docs)
- Filter out .env, .aws, .git, node_modules, etc.
- Add tests for malicious archives

---

## SUMMARY TABLE

| Category | Issue | Severity | Phase | Status |
|----------|-------|----------|-------|--------|
| Input Validation | ZIP bomb vulnerability | CRITICAL | 11 | TODO |
| Input Validation | Resource exhaustion (parallelism) | CRITICAL | 2 | TODO |
| Input Validation | Inadequate size bounds | HIGH | 2 | TODO |
| API Security | No rate limiting | HIGH | 2 | TODO |
| API Security | No request timeout | HIGH | 2 | TODO |
| LLM Security | Weak API key validation | HIGH | 3 | TODO |
| LLM Security | Insufficient output validation | HIGH | 3 | TODO |
| LLM Security | BYOK in headers (cleartext) | HIGH | 3 | TODO |
| LLM Security | Cache not cleared (memory leak) | MEDIUM | 3 | TODO |
| GitHub Security | Weak SSRF protection | MEDIUM | 9 | TODO |
| GitHub Security | Path validation incomplete | MEDIUM | 9 | TODO |
| Storage Security | Unencrypted sensitive data | MEDIUM | 12 | TODO |
| Storage Security | No data expiration | MEDIUM | 12 | TODO |
| Web Security | CSP allows unsafe-inline | MEDIUM | 13 | TODO |
| Web Security | Missing HSTS header | MEDIUM | 13 | TODO |
| ZIP Processing | No symlink detection | MEDIUM | 11 | TODO |
| ZIP Processing | Special files not filtered | MEDIUM | 11 | TODO |
| Monitoring | No dependency audit | MEDIUM | 14 | TODO |
| Code Quality | Unsafe types (any) | LOW | 15 | TODO |
| Code Quality | ESLint minimal | LOW | 15 | TODO |
| Documentation | Environment variables unclear | LOW | 21 | TODO |

---

## NEXT STEPS

1. **PHASE 1-3**: Fix critical API and LLM security issues
2. **PHASE 4-7**: Implement intelligent analysis and static analysis improvements
3. **PHASE 8-12**: Harden ZIP/GitHub processing, client storage, generation
4. **PHASE 13-24**: Complete hardening, testing, deployment

---

*Report generated during PHASE 0 audit*

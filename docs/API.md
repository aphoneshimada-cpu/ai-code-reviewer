# API Reference

## Endpoints

### POST /webhook/github

GitHub webhook receiver for PR events.

**Headers:**
```
X-Hub-Signature-256: sha256=<signature>
X-GitHub-Event: pull_request
Content-Type: application/json
```

**Payload:**
```json
{
  "action": "opened|synchronize",
  "pull_request": {
    "number": 123,
    "title": "Add new feature"
  },
  "repository": {
    "name": "my-repo",
    "owner": {
      "login": "username"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "reviewed_files": 3
}
```

---

### POST /review

Manual code review request.

**Request:**
```json
{
  "code": "function add(a, b) { return a + b; }",
  "language": "javascript"
}
```

**Response:**
```json
{
  "review": "✅ Good practices detected:\n- Clear function naming\n- Simple logic\n\n⚠️ Suggestions:\n- Add JSDoc comments",
  "tokens_used": 245
}
```

---

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "ai-code-reviewer",
  "timestamp": "2026-05-22T12:57:23.325Z"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Code is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 500 Internal Server Error
```json
{
  "error": "MIMO API error: Invalid API key"
}
```

---

## Rate Limiting

- Free tier: 100 reviews/day
- Pro tier: 1,000 reviews/day
- Enterprise: Unlimited

Token usage: ~1,000-5,000 tokens per review

---

## Example Workflow

1. Developer creates PR
2. GitHub sends webhook to `/webhook/github`
3. Bot fetches PR diff
4. Bot calls MIMO API for review
5. Bot posts comment on PR
6. Developer sees review and updates code
7. Bot re-reviews on new commits

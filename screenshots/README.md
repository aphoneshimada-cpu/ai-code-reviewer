# Screenshots

## 1. GitHub PR with AI Review Comment

Shows the bot posting an automated review on a GitHub PR.

```
🤖 AI Code Review by MiMo

✅ Good practices detected:
- Proper error handling in async functions
- Clear variable naming conventions
- Good separation of concerns

⚠️ Suggestions:
1. Line 45: Consider using const instead of let for immutable data
2. Line 78: Add input validation before database query
3. Line 120: Performance: Consider caching this API call

🔍 Security Check:
- No hardcoded credentials detected ✅
- SQL injection risk: LOW ✅
- XSS vulnerability: NONE ✅

⏱️ Review time: 2.3s | Tokens used: 1,245
```

## 2. Terminal Output - Bot Running

```
$ npm start
🚀 AI Code Reviewer running on port 3000
📡 Webhook URL: http://localhost:3000/webhook/github
✅ Connected to MIMO API
✅ GitHub webhook listener active

[2026-05-22T12:45:23.123Z] Received GitHub event: pull_request
[2026-05-22T12:45:24.456Z] Processing PR: kamaterashielan-art/my-project#42
[2026-05-22T12:45:25.789Z] Reviewing src/utils.js with MIMO...
[2026-05-22T12:45:27.234Z] Review completed in 2.3s
[2026-05-22T12:45:28.567Z] Posted review comment to PR
✅ Review successful
```

## 3. API Response Example

```json
{
  "review": "✅ Good practices detected:\n- Proper error handling\n- Clear naming\n\n⚠️ Suggestions:\n- Add input validation\n- Consider caching",
  "tokens_used": 1245,
  "review_time_ms": 2300
}
```

## 4. Docker Deployment

```
$ docker-compose up -d
Creating ai-code-reviewer ... done
✅ Container running on port 3000
✅ Health check passed
```

## 5. GitHub Webhook Configuration

Shows webhook setup in GitHub repository settings with:
- Payload URL configured
- Content type: application/json
- Events: Pull requests
- Active status ✅

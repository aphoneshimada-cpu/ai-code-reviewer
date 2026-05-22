# Setup Guide

## Prerequisites

- Node.js 18+
- GitHub account
- Xiaomi MiMo API key
- Docker (optional)

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/kamaterashielan-art/ai-code-reviewer.git
cd ai-code-reviewer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
MIMO_API_KEY=your_key_from_xiaomimimo.com
MIMO_API_URL=https://api.xiaomimimo.com
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_WEBHOOK_SECRET=your_random_secret_string
PORT=3000
```

### 4. Get GitHub Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `read:org`
4. Copy token to `.env`

### 5. Setup GitHub Webhook

1. Go to your repository Settings → Webhooks
2. Click "Add webhook"
3. Payload URL: `https://your-domain.com/webhook/github`
4. Content type: `application/json`
5. Secret: Use same value as `GITHUB_WEBHOOK_SECRET` in `.env`
6. Events: Select "Pull requests"
7. Click "Add webhook"

## Running

### Development

```bash
npm run dev
```

Server runs on `http://localhost:3000`

### Production

```bash
npm start
```

### Docker

```bash
docker-compose up -d
```

## Testing

### Manual Review

```bash
curl -X POST http://localhost:3000/review \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function add(a, b) { return a + b; }",
    "language": "javascript"
  }'
```

### Health Check

```bash
curl http://localhost:3000/health
```

## Troubleshooting

### Webhook not triggering

- Check webhook delivery in GitHub repo settings
- Verify `GITHUB_WEBHOOK_SECRET` matches
- Check server logs: `tail -f logs/combined.log`

### MIMO API errors

- Verify API key is valid
- Check token quota at https://platform.xiaomimimo.com
- Review API response in logs

### Port already in use

```bash
# Change PORT in .env or use different port
PORT=3001 npm start
```

## Performance Tips

- Limit reviewed files per PR (default: 5)
- Limit patch size (default: 5000 chars)
- Use caching for repeated reviews
- Monitor token usage

## Support

- Issues: https://github.com/kamaterashielan-art/ai-code-reviewer/issues
- Email: support@example.com

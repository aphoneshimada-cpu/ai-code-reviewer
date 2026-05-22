require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { Octokit } = require('octokit');
const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const app = express();
app.use(express.json({ limit: '10mb' }));

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

function verifyWebhookSignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature || !process.env.GITHUB_WEBHOOK_SECRET) return false;
  const hash = crypto
    .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return signature === `sha256=${hash}`;
}

async function reviewCodeWithMIMO(code, language = 'javascript') {
  const response = await axios.post(
    `${process.env.MIMO_API_URL || 'https://api.xiaomimimo.com'}/v1/chat/completions`,
    {
      model: 'mimo-v2.5',
      messages: [
        {
          role: 'system',
          content: `You are an expert code reviewer. Analyze ${language} code for bugs, performance, security, and best practices. Return a concise structured review.`
        },
        { role: 'user', content: `Review this ${language} code:\n\n${code}` }
      ],
      temperature: 0.7,
      max_tokens: 1000
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.MIMO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 25000
    }
  );
  return response.data.choices[0].message.content;
}

async function postReviewComment(owner, repo, prNumber, review) {
  const comment = `🤖 **AI Code Review by MiMo**\n\n${review}\n\n---\n⏱️ ${new Date().toISOString()}`;
  await octokit.rest.issues.createComment({
    owner, repo, issue_number: prNumber, body: comment
  });
}

app.post('/api/webhook', async (req, res) => {
  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const event = req.headers['x-github-event'];
  if (event !== 'pull_request') return res.status(200).json({ message: 'ignored' });

  const { action, pull_request, repository } = req.body;
  if (!['opened', 'synchronize'].includes(action)) {
    return res.status(200).json({ message: 'action ignored' });
  }

  // Vercel functions have ~10s default timeout on hobby; respond fast then process async
  res.status(202).json({ message: 'review queued' });

  try {
    const owner = repository.owner.login;
    const repo = repository.name;
    const prNumber = pull_request.number;
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner, repo, pull_number: prNumber
    });
    const reviews = [];
    for (const file of files.slice(0, 3)) {
      if (file.patch && file.patch.length < 4000) {
        try {
          const r = await reviewCodeWithMIMO(file.patch, file.filename.split('.').pop());
          reviews.push(`**${file.filename}**\n${r}`);
        } catch (e) {
          logger.error(`review failed for ${file.filename}: ${e.message}`);
        }
      }
    }
    if (reviews.length) {
      await postReviewComment(owner, repo, prNumber, reviews.join('\n\n---\n\n'));
    }
  } catch (e) {
    logger.error(`webhook processing: ${e.message}`);
  }
});

app.post('/api/review', async (req, res) => {
  try {
    const { code, language = 'javascript' } = req.body;
    if (!code) return res.status(400).json({ error: 'code required' });
    const review = await reviewCodeWithMIMO(code, language);
    res.json({ review, tokens_used: Math.floor(code.length / 4) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ai-code-reviewer',
    timestamp: new Date().toISOString(),
    runtime: 'vercel-serverless'
  });
});

// Local dev fallback
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => logger.info(`🚀 local dev on :${PORT}`));
}

module.exports = app;

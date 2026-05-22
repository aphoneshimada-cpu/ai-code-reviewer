require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { Octokit } = require('octokit');
const axios = require('axios');
const winston = require('winston');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

const app = express();
app.use(express.json());

// Initialize GitHub client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Verify GitHub webhook signature
function verifyWebhookSignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;

  const hash = crypto
    .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  return signature === `sha256=${hash}`;
}

// Call MIMO API for code review
async function reviewCodeWithMIMO(code, language = 'javascript') {
  try {
    logger.info(`Reviewing ${language} code with MIMO...`);

    const response = await axios.post(
      `${process.env.MIMO_API_URL}/v1/chat/completions`,
      {
        model: 'mimo-v2.5',
        messages: [
          {
            role: 'system',
            content: `You are an expert code reviewer. Analyze the following ${language} code and provide:
1. Bug detection
2. Performance suggestions
3. Best practices
4. Security issues
5. Code quality improvements

Format your response as a structured review with sections.`
          },
          {
            role: 'user',
            content: `Review this ${language} code:\n\n${code}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MIMO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    logger.error('MIMO API error:', error.message);
    throw error;
  }
}

// Post review as GitHub comment
async function postReviewComment(owner, repo, prNumber, review) {
  try {
    logger.info(`Posting review to ${owner}/${repo}#${prNumber}`);

    const comment = `🤖 **AI Code Review by MiMo**\n\n${review}\n\n---\n⏱️ Review completed at ${new Date().toISOString()}`;

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: comment
    });

    logger.info('Review comment posted successfully');
  } catch (error) {
    logger.error('Failed to post comment:', error.message);
    throw error;
  }
}

// GitHub webhook handler
app.post('/webhook/github', async (req, res) => {
  // Verify signature
  if (!verifyWebhookSignature(req)) {
    logger.warn('Invalid webhook signature');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const event = req.headers['x-github-event'];
  const payload = req.body;

  logger.info(`Received GitHub event: ${event}`);

  // Only handle PR events
  if (event !== 'pull_request') {
    return res.status(200).json({ message: 'Event ignored' });
  }

  // Only review on opened or synchronize (new commits)
  if (!['opened', 'synchronize'].includes(payload.action)) {
    return res.status(200).json({ message: 'Action ignored' });
  }

  try {
    const { pull_request, repository } = payload;
    const owner = repository.owner.login;
    const repo = repository.name;
    const prNumber = pull_request.number;

    logger.info(`Processing PR: ${owner}/${repo}#${prNumber}`);

    // Get PR diff
    const { data: prData } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    // Get changed files
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber
    });

    // Review each changed file
    let allReviews = [];
    for (const file of files.slice(0, 5)) { // Limit to first 5 files
      if (file.patch && file.patch.length < 5000) { // Limit patch size
        try {
          const review = await reviewCodeWithMIMO(file.patch, file.filename.split('.').pop());
          allReviews.push(`**File: ${file.filename}**\n${review}`);
        } catch (error) {
          logger.error(`Failed to review ${file.filename}:`, error.message);
        }
      }
    }

    // Post combined review
    if (allReviews.length > 0) {
      const combinedReview = allReviews.join('\n\n---\n\n');
      await postReviewComment(owner, repo, prNumber, combinedReview);
    }

    res.status(200).json({ success: true, reviewed_files: allReviews.length });
  } catch (error) {
    logger.error('Webhook processing error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Manual review endpoint
app.post('/review', async (req, res) => {
  try {
    const { code, language = 'javascript' } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const review = await reviewCodeWithMIMO(code, language);
    res.json({ review, tokens_used: Math.floor(code.length / 4) });
  } catch (error) {
    logger.error('Review error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ai-code-reviewer',
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`🚀 AI Code Reviewer running on port ${PORT}`);
  logger.info(`📡 Webhook URL: http://localhost:${PORT}/webhook/github`);
});

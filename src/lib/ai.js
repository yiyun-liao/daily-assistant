const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY,
});

function loadAgent(agentName) {
  const agentPath = path.join(__dirname, '../../.claude/agents', `${agentName}.md`);
  try { return fs.readFileSync(agentPath, 'utf-8'); } catch { return ''; }
}

function loadUserProfile() {
  const profilePath = path.join(__dirname, '../../config/user-profile.md');
  try { return fs.readFileSync(profilePath, 'utf-8'); } catch { return ''; }
}

function buildSystemPrompt(agentName = 'secretary') {
  const agent = loadAgent(agentName);
  const profile = loadUserProfile();
  return `${agent}\n\n---\n\n## 用戶資料\n${profile}`;
}

async function chat(systemPrompt, userPrompt, { model = 'claude-sonnet-4-20250514', maxTokens = 4096 } = {}) {
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  return response.content[0].text;
}

module.exports = { client, chat, loadAgent, loadUserProfile, buildSystemPrompt };

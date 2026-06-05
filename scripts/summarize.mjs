// AI 摘要生成器，逐条保存到 src/data/summaries.json
// 优先火山引擎（国内直连），也支持 Gemini（需可在 CI 中运行）
// 用法: node scripts/summarize.mjs        # 只生成缺失的
//       node scripts/summarize.mjs --all  # 全部重新生成
// 需要 .env 中设置 VOLCENGINE_API_KEY 或 GEMINI_API_KEY
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 加载 .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^(\w+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  });
}

const DATA_FILE = path.resolve(__dirname, '../src/data/summaries.json');
const POSTS_DIR = path.resolve(__dirname, '../src/content/posts');
const ALL = process.argv.includes('--all');

// 选 API：火山引擎优先
const VOLC_KEY = process.env.VOLCENGINE_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const PROVIDER = VOLC_KEY ? 'volcengine' : GEMINI_KEY ? 'gemini' : null;

if (!PROVIDER) {
  console.log('未设置 API Key，跳过 AI 摘要生成。');
  console.log('本地开发请在 .env 中设置 VOLCENGINE_API_KEY');
  process.exit(0);
}

console.log(`API: ${PROVIDER}\n`);

async function summarize(text) {
  const prompt = `用1-2句中文总结以下技术文章的核心内容。要求：简洁、准确、不要"本文介绍了"这种开头，直接说核心。\n\n${text.substring(0, 8000)}`;

  if (PROVIDER === 'volcengine') {
    const resp = await fetch('https://ark.cn-beijing.volces.com/api/v3/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${VOLC_KEY}` },
      body: JSON.stringify({
        model: 'doubao-seed-1-8-251228',
        input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }]
      }),
    });
    const data = await resp.json();
    const out = data.output?.find(o => o.role === 'assistant');
    if (out?.content?.[0]?.text) return out.content[0].text.trim().replace(/\n/g, ' ');
    throw new Error(`${resp.status}: ${JSON.stringify(data).substring(0, 200)}`);
  }

  if (PROVIDER === 'gemini') {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    // CI 环境不需要代理，本地需要的话设 HTTPS_PROXY
    const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
    if (proxy) {
      const { setGlobalDispatcher, ProxyAgent } = await import('undici');
      try { setGlobalDispatcher(new ProxyAgent(proxy)); } catch(e) {}
    }
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text().trim().replace(/\n/g, ' ');
  }
}

function save(summaries) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(summaries, null, 2), 'utf8');
}

let summaries = {};
if (!ALL && fs.existsSync(DATA_FILE)) {
  summaries = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
let done = 0, errors = 0;

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  if (!ALL && summaries[file]) {
    console.log(`[${i+1}/${files.length}] 跳过 ${file}`);
    continue;
  }

  const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
  const m = content.match(/^---[\s\S]*?---\n([\s\S]*)$/);
  if (!m) continue;

  try {
    console.log(`[${i+1}/${files.length}] ${file}...`);
    summaries[file] = await summarize(m[1].trim());
    save(summaries);
    done++;
    console.log(`  ✓ ${summaries[file].substring(0, 80)}`);
  } catch (e) {
    errors++;
    console.error(`  ✗ ${e.message}`);
  }

  await new Promise(r => setTimeout(r, 200));
}

console.log(`\n完成！${done} 篇 / ${errors} 失败 → ${DATA_FILE}`);

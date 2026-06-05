// AI 摘要生成器：调用火山引擎豆包 API，逐条保存到 src/data/summaries.json
// 用法: node scripts/summarize.mjs        # 只生成缺失的
//       node scripts/summarize.mjs --all  # 全部重新生成
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const API_KEY = process.env.VOLCENGINE_API_KEY;
if (!API_KEY) {
  console.error('请设置 VOLCENGINE_API_KEY 环境变量');
  console.error('例: VOLCENGINE_API_KEY=ark-xxx node scripts/summarize.mjs');
  process.exit(1);
}
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/responses';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, '../src/data/summaries.json');
const POSTS_DIR = path.resolve(__dirname, '../src/content/posts');
const ALL = process.argv.includes('--all');

async function summarize(text) {
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: 'doubao-seed-1-8-251228',
      input: [{ role: 'user', content: [{ type: 'input_text',
        text: `用1-2句中文总结核心内容。不要"本文介绍了"开头，直接说核心：\n\n${text.substring(0, 8000)}`
      }]}]
    }),
  });
  const data = await resp.json();
  const out = data.output?.find(o => o.role === 'assistant');
  if (out?.content?.[0]?.text) return out.content[0].text.trim().replace(/\n/g, ' ');
  throw new Error(`API ${resp.status}: ${JSON.stringify(data).substring(0, 200)}`);
}

function save(summaries) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(summaries, null, 2), 'utf8');
}

// 加载已有数据
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
    save(summaries);  // 逐条保存
    done++;
    console.log(`  ✓ ${summaries[file].substring(0, 80)}`);
  } catch (e) {
    errors++;
    console.error(`  ✗ ${e.message}`);
  }

  // 避免请求太快
  await new Promise(r => setTimeout(r, 200));
}

console.log(`\n完成！${done} 篇 / ${errors} 失败 → ${DATA_FILE}`);

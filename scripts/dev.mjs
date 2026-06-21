// 启动 Astro dev + 后台生成 AI 摘要, 摘要失败不影响服务器.
import { spawn } from 'child_process';

console.log('[dev] 启动 Astro 开发服务器...');
const dev = spawn('npx', ['astro', 'dev', '--port', '4000'], { stdio: 'inherit', shell: true });

// 后台跑摘要, 不阻塞
const summarize = spawn('node', ['scripts/summarize.mjs'], { stdio: 'inherit', shell: true });
summarize.on('exit', (code) => {
  if (code !== 0) console.log('[dev] ⚠ AI 摘要生成异常 (code=%d), 服务器照常运行.', code);
});

process.on('SIGINT', () => { dev.kill(); process.exit(); });
process.on('SIGTERM', () => { dev.kill(); process.exit(); });

import { defineConfig } from 'vite';

// 本地开发用的样例数据（来自 boommanpro.cn 的真实数据形态），仅供 `pnpm dev` 预览；
// 生产环境由插件后端 /journey-api/* 提供实时博客数据。
const mockConfig = {
  siteName: 'boommanpro',
  siteTagline: '爱生活，爱 Coding .....',
  avatarUrl: '',
  topline: 'PERSONAL JOURNAL OF CODE · 构建笔记',
  heroTitle: '把每一个想法，编译成可运行的现实。',
  heroSubtitle: '这里记录我用 AI Coding 构建的一切——从工作流引擎、Halo 插件，到声音克隆与浏览器脚本。',
  afterwordTitle: 'THE JOURNEY CONTINUES',
  afterwordText: '写作即存档，构建即思考。',
  readingsTitle: '直接阅读博客文章',
  mainTitle: '关于我',
  mainSubtitle: 'ABOUT ME',
  mainSummary: '我是王启孟，一名 Java 后台工程师。这里记录我用 AI Coding 构建的一切。',
  mainUrl: '/about',
  postCount: 6,
  categorySlugs: [],
};

const mockStreet = {
  main: {
    title: '关于我',
    subtitle: 'ABOUT ME',
    summary: '我是王启孟，一名 Java 后台工程师。这里记录我用 AI Coding 构建的一切。',
    url: '/about',
  },
  categories: [
    {
      title: '编程分享', subtitle: '87 篇', summary: '编程技术与构建实践', url: '/categories/coding-share',
      posts: [
        { title: 'DGX Spark玩法探索4：本地模型知识汇总', url: '/post/dgx-spark-4', date: '2026-10' },
        { title: '短视频提效工具·剪切流', url: '/post/video-cut-flow', date: '2026-09' },
        { title: 'AI Coding 日常：夏季总结', url: '/post/ai-coding-daiy-review-summer', date: '2026-08' },
        { title: 'AI 工程之外：SOTA 之外的思考', url: '/post/ai-engineering-outside-sota', date: '2026-07' },
        { title: 'Halo 插件开发实录', url: '/post/halo-plugin-dev', date: '2026-06' },
      ],
    },
    {
      title: '个人常用', subtitle: '71 篇', summary: '个人工具与效率清单', url: '/categories/personal',
      posts: [
        { title: '我的 2026 效率工具箱', url: '/post/my-toolbox-2026', date: '2026-09' },
        { title: '家庭 NAS 折腾记', url: '/post/home-nas', date: '2026-05' },
        { title: '双持 Mac 与 DGX 的工作流', url: '/post/mac-dgx-workflow', date: '2026-03' },
        { title: '读书笔记：程序员的知识管理', url: '/post/reading-notes', date: '2026-01' },
        { title: '自动化我的晨间例程', url: '/post/morning-routine', date: '2025-12' },
      ],
    },
    {
      title: '算法记录', subtitle: '15 篇', summary: '刷题与算法笔记', url: '/categories/algorithm-record',
      posts: [
        { title: '滑动窗口套路整理', url: '/post/sliding-window', date: '2026-08' },
        { title: '图论最短路小结', url: '/post/graph-shortest', date: '2026-04' },
        { title: '动态规划：从背包说起', url: '/post/dp-knapsack', date: '2026-01' },
        { title: '每周一题 Vol.12', url: '/post/weekly-12', date: '2025-11' },
        { title: '二分查找的边界细节', url: '/post/binary-search', date: '2025-09' },
      ],
    },
    {
      title: '大模型', subtitle: '21 篇', summary: 'LLM 实践与思考', url: '/categories/llm',
      posts: [
        { title: '本地部署 Qwen 实测', url: '/post/local-qwen', date: '2026-09' },
        { title: 'RAG 检索增强踩坑记', url: '/post/rag-notes', date: '2026-06' },
        { title: '提示词工程的边界', url: '/post/prompt-eng', date: '2026-03' },
        { title: 'Agent 工具调用实践', url: '/post/agent-tools', date: '2025-12' },
        { title: '微调还是提示词？', url: '/post/finetune-vs-prompt', date: '2025-10' },
      ],
    },
  ],
  totalPosts: 202,
};

function sendJson(res, body) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export default defineConfig({
  base: '/',
  plugins: [
    {
      name: 'journey-api-dev-mock',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/journey-api/config')) return sendJson(res, mockConfig);
          if (req.url?.startsWith('/journey-api/street')) return sendJson(res, mockStreet);
          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: { street: 'src/embed.js' },
      output: {
        entryFileNames: 'street.js',
        chunkFileNames: '[name].js',
        assetFileNames: 'street.css',
        manualChunks: { three: ['three'] },
      },
    },
  },
});

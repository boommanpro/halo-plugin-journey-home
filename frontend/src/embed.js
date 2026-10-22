import './style.css';
import { createScene } from './scene.js';
import { buildStations, loadJourney } from './data.js';

const root = document.querySelector('#journey-street');

// 内嵌模式：宿主由主题 journey 模板（或本地预览页）提供 #journey-street 容器
if (root) {
  mount(root);
}

// 坐在长椅上时的小憩语录
const BENCH_QUOTES = [
  '好好欣赏风景 ☁',
  '这条街逛起来真舒服',
  '歇一会儿，再接着走',
  '风把纸墨香吹过来了',
  '对面书屋新到了几篇好文',
  '灵感总在散步时冒出来',
  '树影晃啊晃，像慢下来的日子',
  '听说夜里路灯亮起来更好看',
];

function mount(app) {
  app.classList.add('journey-street-ready');
  app.innerHTML = `
    <div id="scene"></div>
    <div class="scene-caption"><span id="count"></span><a id="archives" href="/post" hidden></a><span id="day-label">日光 · 适合散步</span></div>
    <div class="bubble" hidden></div>
    <div class="tools" aria-label="场景工具"><button id="theme" aria-label="切换夜景" aria-pressed="false">☼</button><button id="view" aria-label="切换跟随视角" aria-pressed="false">◈</button><button id="reset" aria-label="恢复全景">↺</button><button id="fullscreen" aria-label="切换全屏">⛶</button><button id="help" aria-label="操作指南">?</button></div>
    <div class="loader" role="status"><p>正在打开旅程小街</p></div>
    <div class="journey-status" role="status" aria-live="polite"><span></span><button id="retry" hidden>重新加载</button></div>
    <dialog id="detail" aria-labelledby="detail-title"><button class="dialog-close" aria-label="关闭详情">×</button><div class="eyebrow"></div><h2 id="detail-title"></h2><p class="summary"></p><div class="station-content"></div><div class="detail-actions"><a class="station-link" hidden target="_blank" rel="noopener"></a><button class="continue">继续散步 →</button></div></dialog>
    <dialog id="guide" aria-labelledby="guide-title"><button class="dialog-close" aria-label="关闭指南">×</button><h2 id="guide-title">漫游指南</h2><p>拖动环顾，滚轮缩放。点击空地行走，方向键或 W A S D 手动行走。点击房子，小人会走到门口再开门；站到门口的圆圈里按 空格 也能开门，再按一次关闭。</p><p>空格 让小人跳跃；点击长椅可以坐下歇会儿。◈ 在俯瞰全景与跟随小人的玩家视角间切换。</p></dialog>`;

  const find = selector => app.querySelector(selector);
  const setText = (selector, value) => { find(selector).textContent = value; };
  let scene;
  let stations = [];
  let night = false;
  let viewMode = 'overview';
  let disposed = false;
  let bubbleTimer = null;
  const detail = find('#detail');
  const guide = find('#guide');
  const bubble = find('.bubble');

  function status(message, retry = false) {
    setText('.journey-status span', message);
    find('#retry').hidden = !retry;
  }

  const LINK_LABELS = { category: '查看分类 ↗' };

  function openCard(id) {
    const station = stations.find(item => item.id === id);
    if (!station) return;
    scene?.focus(id);
    setText('#detail .eyebrow', `${station.number} / ${station.period}`);
    setText('#detail-title', station.name);
    const link = find('.station-link');
    const content = find('.station-content');
    content.className = 'station-content';
    content.replaceChildren();
    setText('#detail .summary', station.summary || `共收录 ${station.period}的文章`);
    content.classList.add('category-posts');
    content.append(...(station.posts || []).map(post => {
      const item = document.createElement('a');
      item.href = post.url;
      item.target = '_blank';
      item.rel = 'noopener';
      const strong = document.createElement('strong');
      strong.textContent = post.title;
      const date = document.createElement('span');
      date.textContent = post.date;
      const arrow = document.createElement('span');
      arrow.className = 'place-arrow';
      arrow.textContent = '→';
      item.append(strong, date, arrow);
      return item;
    }));
    if (station.url) {
      link.textContent = LINK_LABELS[station.kind] || '查看详情 ↗';
      link.href = station.url;
      link.hidden = false;
    } else {
      link.hidden = true;
    }
    if (!detail.open) detail.showModal();
  }

  // 点击房子 / 空格开门：小人先走到门口，再弹卡片
  function enterPlace(id) {
    scene?.approach(id, () => openCard(id));
  }

  function closeDetail() {
    detail.close();
    if (viewMode === 'follow') scene?.setView('follow');
  }
  detail.addEventListener('cancel', event => { event.preventDefault(); closeDetail(); });
  find('#detail .dialog-close').onclick = closeDetail;
  find('.continue').onclick = closeDetail;
  find('#guide .dialog-close').onclick = () => guide.close();
  find('#help').onclick = () => guide.showModal();
  find('#reset').onclick = () => {
    viewMode = 'overview';
    syncViewButton();
    scene?.reset();
  };
  function syncViewButton() {
    const button = find('#view');
    button.setAttribute('aria-pressed', String(viewMode === 'follow'));
    button.setAttribute('aria-label', viewMode === 'follow' ? '切换俯瞰视角' : '切换跟随视角');
  }
  find('#view').onclick = () => {
    viewMode = viewMode === 'overview' ? 'follow' : 'overview';
    syncViewButton();
    scene?.setView(viewMode);
  };
  find('#theme').onclick = () => {
    night = !night;
    scene?.setNight(night);
    app.classList.toggle('night', night);
    find('#theme').setAttribute('aria-pressed', String(night));
    find('#theme').setAttribute('aria-label', night ? '切换日景' : '切换夜景');
    setText('#day-label', night ? '灯火 · 灵感未眠' : '日光 · 适合散步');
  };
  find('#fullscreen').onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await app.requestFullscreen();
    } catch { status('当前浏览器暂不支持全屏。'); }
  };

  // 全局键盘：空格 = 关卡片 / 开门 / 跳跃（页面任何位置都生效）
  window.addEventListener('keydown', event => {
    if (event.code !== 'Space' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    if (guide.open) { guide.close(); return; }
    if (detail.open) { closeDetail(); return; }
    const id = scene?.space();
    if (id) openCard(id);
  });

  // 坐下小憩：冒泡语录
  function showBubble(text) {
    bubble.textContent = text;
    bubble.hidden = false;
  }
  function startBubbles() {
    showBubble(BENCH_QUOTES[Math.floor(Math.random() * BENCH_QUOTES.length)]);
    bubbleTimer = setInterval(() => {
      showBubble(BENCH_QUOTES[Math.floor(Math.random() * BENCH_QUOTES.length)]);
    }, 4200);
  }
  function stopBubbles() {
    bubble.hidden = true;
    if (bubbleTimer) { clearInterval(bubbleTimer); bubbleTimer = null; }
  }

  async function initialize() {
    find('#retry').hidden = true;
    find('.loader').classList.remove('loaded');
    status('');
    try {
      const data = await loadJourney();
      if (disposed) return;
      stations = buildStations(data.street);
      setText('#count', `${stations.length} 栋建筑 · ${data.street.totalPosts} 篇文章`);
      const archives = find('#archives');
      if (data.street.totalPosts > 0) {
        archives.textContent = `全部 ${data.street.totalPosts} 篇 →`;
        archives.hidden = false;
      }
      scene?.destroy();
      scene = undefined;
      find('#scene').replaceChildren();
      try {
        scene = createScene(find('#scene'), {
          stations,
          onSelect: enterPlace,
          onSit: sitting => (sitting ? startBubbles() : stopBubbles()),
        });
        scene.setNight(night);
      } catch {
        find('#scene').replaceChildren();
        status('当前设备无法启动三维场景。');
      }
    } catch {
      status('旅程暂时无法加载，请稍后重试。', true);
    } finally {
      find('.loader').classList.add('loaded');
      app.classList.add('ready');
    }
  }
  find('#retry').onclick = initialize;
  window.addEventListener('pagehide', event => {
    if (!event.persisted) { disposed = true; stopBubbles(); scene?.destroy(); }
  });
  initialize();
}

import './style.css';
import { createScene } from './scene.js';
import { buildStations, loadJourney } from './data.js';

const root = document.querySelector('#journey-street');

// 内嵌模式：宿主由主题 journey 模板（或本地预览页）提供 #journey-street 容器
if (root) {
  mount(root);
}

function mount(app) {
  app.classList.add('journey-street-ready');
  app.innerHTML = `
    <div id="scene"></div>
    <div class="scene-caption"><span id="count"></span><a id="archives" href="/archives" hidden></a><span id="day-label">日光 · 适合散步</span></div>
    <div class="tools" aria-label="场景工具"><button id="theme" aria-label="切换夜景" aria-pressed="false">☼</button><button id="view" aria-label="切换跟随视角" aria-pressed="false">◈</button><button id="reset" aria-label="恢复全景">↺</button><button id="fullscreen" aria-label="切换全屏">⛶</button><button id="help" aria-label="操作指南">?</button></div>
    <div class="loader" role="status"><p>正在打开旅程小街</p></div>
    <div class="journey-status" role="status" aria-live="polite"><span></span><button id="retry" hidden>重新加载</button></div>
    <dialog id="detail" aria-labelledby="detail-title"><button class="dialog-close" aria-label="关闭详情">×</button><div class="eyebrow"></div><h2 id="detail-title"></h2><p class="summary"></p><div class="station-content"></div><div class="detail-actions"><a class="station-link" hidden target="_blank" rel="noopener"></a><button class="continue">继续散步 →</button></div></dialog>
    <dialog id="guide" aria-labelledby="guide-title"><button class="dialog-close" aria-label="关闭指南">×</button><h2 id="guide-title">漫游指南</h2><p>拖动环顾，滚轮缩放。点击空地行走，方向键或 W A S D 手动行走。点击建筑阅读故事：主建筑是关于我，其余是各分类书屋。◈ 可在俯瞰全景与跟随小人的玩家视角间切换。</p><p>Tab 选择入口，Enter 打开，Esc 返回。右侧按钮切换日夜、恢复全景或进入全屏。</p></dialog>`;

  const find = selector => app.querySelector(selector);
  const setText = (selector, value) => { find(selector).textContent = value; };
  let scene;
  let stations = [];
  let night = false;
  let viewMode = 'overview';
  let disposed = false;
  const detail = find('#detail');
  const guide = find('#guide');

  function status(message, retry = false) {
    setText('.journey-status span', message);
    find('#retry').hidden = !retry;
  }

  const LINK_LABELS = { about: '查看完整介绍 ↗', category: '查看分类 ↗', post: '阅读全文 ↗' };

  function openPlace(id) {
    const station = stations.find(item => item.id === id);
    if (!station) return;
    scene?.focus(id);
    setText('#detail .eyebrow', `${station.number} / ${station.period}`);
    setText('#detail-title', station.name);
    const link = find('.station-link');
    const content = find('.station-content');
    content.className = 'station-content';
    content.replaceChildren();
    if (station.kind === 'category') {
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
    } else if (station.kind === 'about') {
      setText('#detail .summary', station.summary || '点击下方按钮，查看完整介绍。');
    } else {
      setText('#detail .summary', station.summary || '点击下方按钮，到博客里读完整的故事。');
    }
    if (station.url) {
      link.textContent = LINK_LABELS[station.kind] || '查看详情 ↗';
      link.href = station.url;
      link.hidden = false;
    } else {
      link.hidden = true;
    }
    if (!detail.open) detail.showModal();
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
        scene = createScene(find('#scene'), { stations, onSelect: openPlace });
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
    if (!event.persisted) { disposed = true; scene?.destroy(); }
  });
  initialize();
}

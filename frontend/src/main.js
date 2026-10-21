import './style.css';
import './integration.css';
import { createScene } from './scene.js';
import { loadJourney } from './data.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <div id="scene"></div>
  <header class="masthead"><a class="brand" href="/">旅程小街</a><div class="edition"></div><a class="back-link" href="/">返回首页 ↗</a></header>
  <main class="intro"><div class="eyebrow"></div><h1></h1><p></p><button class="explore" disabled>开始探索 →</button></main>
  <div class="scene-caption"><span id="count"></span><span id="day-label">日光 · 适合散步</span></div>
  <div class="tools" aria-label="场景工具"><button id="theme" aria-label="切换夜景" aria-pressed="false">☼</button><button id="reset" aria-label="恢复全景">↺</button><button id="fullscreen" aria-label="切换全屏">⛶</button><button id="help" aria-label="操作指南">?</button></div>
  <nav class="places" aria-label="旅程站点"></nav>
  <footer><span id="afterword"></span><span class="instructions">拖动环顾 · 滚轮缩放 · 点击地面行走 · 点击建筑探索</span></footer>
  <div class="loader" role="status"><p>正在打开旅程小街</p></div>
  <div class="journey-status" role="status" aria-live="polite"><span></span><button id="retry" hidden>重新加载</button></div>
  <dialog id="detail" aria-labelledby="detail-title"><button class="dialog-close" aria-label="关闭详情">×</button><div class="eyebrow"></div><h2 id="detail-title"></h2><p class="summary"></p><div class="station-content"></div><button class="continue">继续散步 →</button></dialog>
  <dialog id="guide" aria-labelledby="guide-title"><button class="dialog-close" aria-label="关闭指南">×</button><h2 id="guide-title">漫游指南</h2><p>拖动环顾，滚轮缩放。点击空地行走，方向键或 W A S D 手动行走。点击建筑或下方站点阅读故事。</p><p>Tab 选择入口，Enter 打开，Esc 返回。右侧按钮切换日夜、恢复全景或进入全屏。</p></dialog>`;

const find = selector => app.querySelector(selector);
const setText = (selector, value) => { find(selector).textContent = value; };
let scene;
let stations = [];
let night = false;
let disposed = false;
const detail = find('#detail');
const guide = find('#guide');

function status(message, retry = false) {
  setText('.journey-status span', message);
  find('#retry').hidden = !retry;
}

function openPlace(id) {
  const station = stations.find(item => item.id === id);
  if (!station) return;
  scene?.focus(id);
  setText('#detail .eyebrow', `${station.number} / ${station.period}`);
  setText('#detail-title', station.name);
  setText('#detail .summary', station.summary);
  setText('.station-content', station.content);
  find('.places').querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.place === id));
  if (!detail.open) detail.showModal();
}

function closeDetail() {
  detail.close();
  scene?.reset();
  find('.places').querySelectorAll('button').forEach(button => button.classList.remove('active'));
}
detail.addEventListener('cancel', event => { event.preventDefault(); closeDetail(); });
find('#detail .dialog-close').onclick = closeDetail;
find('.continue').onclick = closeDetail;
find('#guide .dialog-close').onclick = () => guide.close();
find('#help').onclick = () => guide.showModal();
find('#reset').onclick = () => scene?.reset();
find('.explore').onclick = () => stations.length && openPlace(stations[0].id);
find('#theme').onclick = () => {
  night = !night;
  scene?.setNight(night);
  document.body.classList.toggle('night', night);
  find('#theme').setAttribute('aria-pressed', String(night));
  find('#theme').setAttribute('aria-label', night ? '切换日景' : '切换夜景');
  setText('#day-label', night ? '灯火 · 灵感未眠' : '日光 · 适合散步');
};
find('#fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { status('当前浏览器暂不支持全屏。'); }
};

async function initialize() {
  find('#retry').hidden = true;
  find('.loader').classList.remove('loaded');
  status('');
  try {
    const data = await loadJourney();
    if (disposed) return;
    stations = data.stations;
    const config = data.config;
    document.title = config.siteName;
    setText('.brand', config.siteName);
    setText('.edition', config.siteTagline);
    setText('.intro .eyebrow', config.topline);
    setText('h1', config.heroTitle);
    setText('.intro p', config.heroSubtitle);
    setText('#afterword', [config.afterwordTitle, config.afterwordText].filter(Boolean).join(' · '));
    setText('#count', `${stations.length} 个站点`);
    find('.places').setAttribute('aria-label', config.readingsTitle);
    find('.places').replaceChildren(...stations.map(station => {
      const button = document.createElement('button');
      button.dataset.place = station.id;
      const number = document.createElement('span');
      number.className = 'place-number';
      number.textContent = station.number;
      const title = document.createElement('span');
      title.className = 'place-title';
      title.textContent = station.name;
      const period = document.createElement('small');
      period.textContent = station.period;
      title.append(period);
      button.append(number, title);
      button.onclick = () => openPlace(station.id);
      return button;
    }));
    find('.explore').disabled = !stations.length;
    scene?.destroy();
    scene = undefined;
    find('#scene').replaceChildren();
    if (!stations.length) status('旅程尚未开始，暂时没有已发布的站点。');
    else {
      try {
        scene = createScene(find('#scene'), { stations, onSelect: openPlace });
        scene.setNight(night);
      } catch {
        find('#scene').replaceChildren();
        status('当前设备无法启动三维场景，仍可通过下方站点阅读所有故事。');
      }
    }
  } catch {
    status('旅程暂时无法加载，请稍后重试。', true);
  } finally {
    find('.loader').classList.add('loaded');
    document.body.classList.add('ready');
  }
}
find('#retry').onclick = initialize;
window.addEventListener('pagehide', event => {
  if (!event.persisted) { disposed = true; scene?.destroy(); }
});
initialize();

export const text = (value, fallback = '') => typeof value === 'string' && value.trim() ? value : fallback;

export function normalizeConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('配置格式错误');
  return {
    siteName: text(value.siteName, '旅程小街'),
    siteTagline: text(value.siteTagline, '每一站都有故事'),
    topline: text(value.topline, '欢迎来这里散散步'),
    heroTitle: text(value.heroTitle, '我的旅程'),
    heroSubtitle: text(value.heroSubtitle, '点击建筑，探索故事。'),
    afterwordTitle: text(value.afterwordTitle),
    afterwordText: text(value.afterwordText),
    readingsTitle: text(value.readingsTitle, '旅程站点'),
  };
}

export function normalizeStations(value) {
  if (!Array.isArray(value)) throw new Error('站点格式错误');
  const names = new Set();
  return value.filter(station => {
    if (!station || station.published !== true || !text(station.name) || names.has(station.name)) return false;
    names.add(station.name);
    return true;
  }).sort((a, b) => (Number(a.chapterNo) || 0) - (Number(b.chapterNo) || 0)).map((station, index) => ({
    id: station.name,
    number: String(index + 1).padStart(2, '0'),
    name: text(station.displayName, '未命名站点'),
    period: text(station.period),
    summary: text(station.summary),
    content: text(station.content, '这一站的故事尚未填写。'),
    type: ({ cottage: 'studio', workshop: 'workshop', district: 'archive', tower: 'sound', lab: 'workshop', campus: 'archive' })[station.buildingType] || 'studio',
  }));
}

export function layoutStations(stations) {
  const columns = Math.max(2, Math.ceil(stations.length / 2));
  return {
    width: columns * 11.4 + 1.2,
    buildings: stations.map((station, index) => ({ ...station,
      x: (Math.floor(index / 2) - (columns - 1) / 2) * 11.4,
      z: index % 2 ? 4.7 : -4.7,
      facing: index % 2 ? Math.PI : 0,
    })),
  };
}

export async function loadJourney(fetcher = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const read = async path => {
    const response = await fetcher(path, { signal: controller.signal, credentials: 'omit', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('公开接口请求失败');
    return response.json();
  };
  try {
    const [config, stations] = await Promise.all([
      read('/journey-api/config'), read('/journey-api/stations'),
    ]);
    return { config: normalizeConfig(config), stations: normalizeStations(stations) };
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

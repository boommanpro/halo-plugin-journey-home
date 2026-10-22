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

function normalizeBuilding(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('建筑数据格式错误');
  return {
    title: text(value.title, '未命名'),
    subtitle: text(value.subtitle),
    summary: text(value.summary),
    url: text(value.url),
  };
}

function normalizeCategory(value) {
  const building = normalizeBuilding(value);
  return {
    ...building,
    posts: Array.isArray(value?.posts) ? value.posts.map(post => ({
      title: text(post?.title, '未命名文章'),
      url: text(post?.url),
      date: text(post?.date),
    })).filter(post => post.url) : [],
  };
}

export function normalizeStreet(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('街道数据格式错误');
  return {
    main: normalizeBuilding(value.main),
    categories: Array.isArray(value.categories) ? value.categories.map(normalizeCategory) : [],
    totalPosts: Number(value.totalPosts) || 0,
  };
}

/** 建筑招牌文字：按视觉宽度截断（全角字符计 2、半角计 1），避免长文章标题撑爆招牌。 */
export function signName(name, maxUnits = 14) {
  let units = 0;
  let end = 0;
  for (const char of name) {
    const width = char.codePointAt(0) > 0xff ? 2 : 1;
    if (units + width > maxUnits) break;
    units += width;
    end += char.length;
  }
  return end < name.length ? `${name.slice(0, end)}…` : name;
}

/** 分类房子造型轮换：书屋 / 工坊 / 唱片店 / 画室，让每栋房子都不重样 */
const CATEGORY_TYPES = ['archive', 'workshop', 'sound', 'studio'];

/** 街道数据 → 场景建筑：分类房子（造型轮换）。 */
export function buildStations(street) {
  return street.categories.map((category, index) => ({
    id: `category-${index}`,
    kind: 'category',
    number: String(index + 1).padStart(2, '0'),
    name: category.title,
    signName: signName(category.title),
    period: category.subtitle,
    summary: category.summary,
    url: category.url,
    posts: category.posts,
    type: CATEGORY_TYPES[index % CATEGORY_TYPES.length],
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
    return { street: normalizeStreet(await read('/journey-api/street')) };
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

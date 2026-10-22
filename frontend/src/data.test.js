import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStations, layoutStations, normalizeStreet, signName } from './data.js';

const street = () => ({
  main: { title: '关于我', subtitle: 'ABOUT ME', summary: 'Java 工程师', url: '/about' },
  categories: [
    {
      title: '编程分享', subtitle: '86 篇', summary: '编程技术', url: '/categories/coding-share',
      posts: [
        { title: '文章 A', url: '/post/a', date: '2026-10' },
        { title: '', url: '', date: '' },
      ],
    },
    { title: '个人常用', subtitle: '69 篇', summary: '', url: '/categories/personal', posts: [] },
  ],
  posts: [],
  totalPosts: 202,
});

test('normalizeStreet 校验并归一化街道数据', () => {
  const normalized = normalizeStreet(street());
  assert.equal(normalized.main.title, '关于我');
  assert.equal(normalized.categories.length, 2);
  // 空标题/空链接的分类文章被过滤
  assert.equal(normalized.categories[0].posts.length, 1);
  assert.equal(normalized.totalPosts, 202);
  assert.throws(() => normalizeStreet(null));
  assert.throws(() => normalizeStreet([]));
});

test('buildStations 生成分类房子（造型轮换，无主建筑）', () => {
  const streetData = normalizeStreet(street());
  const stations = buildStations(streetData);
  assert.equal(stations.length, 2);

  const category = stations[0];
  assert.equal(category.id, 'category-0');
  assert.equal(category.kind, 'category');
  assert.equal(category.number, '01');
  assert.equal(category.posts.length, 1);
  assert.equal(category.type, 'archive');

  assert.equal(stations[1].id, 'category-1');
  assert.equal(stations[1].number, '02');
  assert.equal(stations[1].type, 'workshop');
});

test('layoutStations 排布两排建筑并保留字段', () => {
  const layout = layoutStations(buildStations(normalizeStreet(street())));
  assert.equal(layout.buildings.length, 2);
  assert.equal(layout.buildings[0].z, -4.7);
  assert.equal(layout.buildings[1].z, 4.7);
  assert.equal(layout.buildings[1].facing, Math.PI);
  assert.ok(layout.width > 0);
});

test('signName 按视觉宽度截断长标题', () => {
  assert.equal(signName('关于我'), '关于我');
  assert.equal(signName('短视频提效工具·剪切流完整版说明书'), '短视频提效工具…');
  assert.equal(signName('DGX Spark 4 Review'), 'DGX Spark 4 Re…');
  assert.equal(signName('短'), '短');
});

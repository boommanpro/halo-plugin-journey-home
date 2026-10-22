<script setup lang="ts">
import { ref, onMounted } from "vue";
import axios from "axios";
import { VButton, Toast } from "@halo-dev/components";

const apiBase = "/apis/console.api.journey-home.halo.run/v1alpha1";

const loading = ref(false);
const saving = ref(false);
const categoriesLoading = ref(false);

interface CategoryOption {
  displayName: string;
  slug: string;
  postCount: number;
}

const categories = ref<CategoryOption[]>([]);

const form = ref({
  siteName: "我的旅程",
  siteTagline: "A LIFE IN PROGRESS",
  avatarUrl: "",
  topline: "PERSONAL JOURNEY / 个人旅程",
  heroTitle: "每一步，都通向新的自己。",
  heroSubtitle: "从城市出发，在校园继续。",
  afterwordTitle: "THE JOURNEY CONTINUES",
  afterwordText: "在技术、产品与教育之间，持续行走。",
  readingsTitle: "直接阅读个人介绍与完整职业经历",
  mainTitle: "关于我",
  mainSubtitle: "ABOUT ME",
  mainSummary: "",
  mainUrl: "/about",
  categorySlugs: [] as string[],
});

const groups: {
  title: string;
  description: string;
  fields: { key: string; label: string; placeholder: string; hint?: string; type?: string; min?: number; max?: number }[];
}[] = [
  {
    title: "主建筑",
    description: "街道第一栋加高建筑，默认指向个人介绍页",
    fields: [
      { key: "mainTitle", label: "标题", placeholder: "关于我", hint: "建筑招牌文字" },
      { key: "mainSubtitle", label: "招牌副标题", placeholder: "ABOUT ME" },
      { key: "mainSummary", label: "卡片简介", placeholder: "点击建筑后卡片里的简介（留空则显示默认文案）" },
      { key: "mainUrl", label: "跳转链接", placeholder: "/about", hint: "「查看完整介绍」按钮跳转地址" },
    ],
  },
];

async function fetchConfig() {
  loading.value = true;
  try {
    const res = await axios.get(`${apiBase}/config`);
    const c = res.data || {};
    (Object.keys(form.value) as (keyof typeof form.value)[]).forEach((k) => {
      if (c[k] !== undefined && c[k] !== null && c[k] !== "") {
        (form.value as any)[k] = c[k];
      }
    });
    if (!Array.isArray(form.value.categorySlugs)) {
      form.value.categorySlugs = [];
    }
  } catch (e) {
    console.error("Failed to fetch config", e);
  } finally {
    loading.value = false;
  }
}

async function fetchCategories() {
  categoriesLoading.value = true;
  try {
    const res = await axios.get(`${apiBase}/categories`);
    categories.value = res.data || [];
  } catch (e) {
    console.error("Failed to fetch categories", e);
  } finally {
    categoriesLoading.value = false;
  }
}

function toggleCategory(slug: string, checked: boolean) {
  const list = form.value.categorySlugs;
  const index = list.indexOf(slug);
  if (checked && index === -1) {
    if (list.length >= 8) {
      Toast.warning("分类建筑最多选择 8 个");
      return;
    }
    list.push(slug);
  } else if (!checked && index !== -1) {
    list.splice(index, 1);
  }
}

async function save() {
  saving.value = true;
  try {
    await axios.put(`${apiBase}/config`, {
      apiVersion: "journey-home.halo.run/v1alpha1",
      kind: "JourneyPageConfig",
      metadata: { name: "journey-config" },
      spec: { ...form.value },
    });
    Toast.success("保存成功");
  } catch (e: any) {
    Toast.error("保存失败: " + (e.response?.data?.message || e.message));
  } finally {
    saving.value = false;
  }
}

function previewPage() {
  window.open("/journey", "_blank");
}

onMounted(() => {
  fetchConfig();
  fetchCategories();
});
</script>

<template>
  <div class="page-config-panel">
    <div class="toolbar">
      <div class="toolbar-left">
        <h2 class="title">页面设置</h2>
        <span class="subtitle">旅程小街（主题 journey 模板内嵌）的街道配置，建筑数据来自博客文章与分类；页面标题与副文案在 Console「页面」中编辑</span>
      </div>
      <div class="toolbar-right">
        <VButton @click="previewPage">预览主页</VButton>
        <VButton type="primary" :disabled="saving || loading" @click="save">
          {{ saving ? "保存中..." : "保存设置" }}
        </VButton>
      </div>
    </div>

    <div class="form-container">
      <div v-if="loading" class="loading-cell">加载中...</div>
      <template v-else>
        <section v-for="group in groups" :key="group.title" class="form-group-section">
          <h3 class="group-title">{{ group.title }}</h3>
          <p class="group-description">{{ group.description }}</p>
          <div v-for="f in group.fields" :key="f.key" class="form-group">
            <label>
              {{ f.label }}
              <span v-if="f.hint" class="hint">{{ f.hint }}</span>
            </label>
            <input
              v-model="(form as any)[f.key]"
              :type="f.type || 'text'"
              :placeholder="f.placeholder"
              :min="f.min"
              :max="f.max"
            />
          </div>
        </section>

        <section class="form-group-section">
          <h3 class="group-title">分类建筑</h3>
          <p class="group-description">
            勾选作为街道房子的分类（按勾选顺序渲染，最多 8 个）；默认勾选四个核心分类，取消全部则恢复默认
          </p>
          <div v-if="categoriesLoading" class="loading-cell">分类加载中...</div>
          <div v-else-if="categories.length === 0" class="loading-cell">博客还没有可用分类</div>
          <div v-else class="category-list">
            <label v-for="c in categories" :key="c.slug" class="category-item">
              <input
                type="checkbox"
                :checked="form.categorySlugs.includes(c.slug)"
                :aria-label="c.displayName"
                @change="toggleCategory(c.slug, ($event.target as HTMLInputElement).checked)"
              />
              <span class="category-name">{{ c.displayName }}</span>
              <span class="category-count">{{ c.postCount }} 篇</span>
            </label>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.page-config-panel {
  padding: 20px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}
.toolbar-left .title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--color-text, #111827);
}
.toolbar-left .subtitle {
  font-size: 12px;
  color: var(--color-text-secondary, #6b7280);
  margin-top: 4px;
  display: block;
}
.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}
.form-container {
  background: var(--color-bg, #fff);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 20px 24px;
  max-width: 720px;
}
.form-group-section {
  padding-top: 8px;
}
.form-group-section + .form-group-section {
  margin-top: 20px;
  border-top: 1px solid var(--color-border, #e5e7eb);
  padding-top: 20px;
}
.group-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 2px;
  color: var(--color-text, #111827);
}
.group-description {
  font-size: 12px;
  color: var(--color-text-secondary, #9ca3af);
  margin: 0 0 14px;
}
.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text, #374151);
}
.form-group label .hint {
  font-weight: 400;
  font-size: 12px;
  color: var(--color-text-secondary, #9ca3af);
  margin-left: 8px;
}
.form-group input[type="text"],
.form-group input[type="number"] {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  background: var(--color-bg, #fff);
  color: var(--color-text, #111827);
}
.category-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}
.category-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-text, #374151);
}
.category-item:hover {
  border-color: var(--color-primary, #4ccba0);
}
.category-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text-secondary, #9ca3af);
}
.loading-cell {
  text-align: center;
  padding: 24px 16px;
  color: var(--color-text-secondary, #9ca3af);
}
</style>

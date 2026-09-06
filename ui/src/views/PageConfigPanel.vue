<script setup lang="ts">
import { ref, onMounted } from "vue";
import axios from "axios";
import { VButton, Toast } from "@halo-dev/components";

const apiBase = "/apis/console.api.journey-home.halo.run/v1alpha1";

const loading = ref(false);
const saving = ref(false);

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
});

const fields: { key: string; label: string; placeholder: string; hint?: string }[] = [
  { key: "siteName", label: "站名", placeholder: "我的旅程", hint: "页头品牌文字" },
  { key: "siteTagline", label: "页头标语", placeholder: "A LIFE IN PROGRESS", hint: "页头右侧的小标语" },
  { key: "avatarUrl", label: "头像 URL", placeholder: "https://…/avatar.png", hint: "留空则不显示头像" },
  { key: "topline", label: "顶部小标签", placeholder: "PERSONAL JOURNEY / 个人旅程" },
  { key: "heroTitle", label: "主标题", placeholder: "每一步，都通向新的自己。" },
  { key: "heroSubtitle", label: "副标题", placeholder: "从城市出发，在校园继续。" },
  { key: "afterwordTitle", label: "页脚标语", placeholder: "THE JOURNEY CONTINUES" },
  { key: "afterwordText", label: "页脚文案", placeholder: "在技术、产品与教育之间，持续行走。" },
  { key: "readingsTitle", label: "阅读区标题", placeholder: "直接阅读个人介绍与完整职业经历" },
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
  } catch (e) {
    console.error("Failed to fetch config", e);
  } finally {
    loading.value = false;
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

onMounted(fetchConfig);
</script>

<template>
  <div class="page-config-panel">
    <div class="toolbar">
      <div class="toolbar-left">
        <h2 class="title">页面设置</h2>
        <span class="subtitle">旅程主页（/journey）的全局文案与视觉配置</span>
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
        <div v-for="f in fields" :key="f.key" class="form-group">
          <label>
            {{ f.label }}
            <span v-if="f.hint" class="hint">{{ f.hint }}</span>
          </label>
          <input v-model="(form as any)[f.key]" type="text" :placeholder="f.placeholder" />
        </div>
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
.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  background: var(--color-bg, #fff);
  color: var(--color-text, #111827);
}
.loading-cell {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-secondary, #9ca3af);
}
</style>

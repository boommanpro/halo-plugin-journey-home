<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import axios from "axios";
import { VButton, VTag, VSpace, Toast } from "@halo-dev/components";
import StationEditorDialog from "./StationEditorDialog.vue";

const apiBase = "/apis/console.api.journey-home.halo.run/v1alpha1";

const stations = ref<any[]>([]);
const loading = ref(false);
const searchQuery = ref("");
const showEditor = ref(false);
const editingStation = ref<any>(null);

const filteredStations = computed(() => {
  const q = searchQuery.value.toLowerCase();
  return stations.value.filter((s) => {
    if (!q) return true;
    return (
      s.displayName?.toLowerCase().includes(q) ||
      s.period?.toLowerCase().includes(q) ||
      s.content?.toLowerCase().includes(q)
    );
  });
});

async function fetchStations() {
  loading.value = true;
  try {
    const res = await axios.get(`${apiBase}/stations`);
    stations.value = res.data || [];
  } catch (e) {
    console.error("Failed to fetch stations", e);
    Toast.error("加载站点失败");
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingStation.value = null;
  showEditor.value = true;
}

function openEdit(station: any) {
  editingStation.value = station;
  showEditor.value = true;
}

async function handleDelete(name: string) {
  if (!confirm(`确定删除站点 "${name}" 吗？`)) return;
  try {
    await axios.delete(`${apiBase}/stations/${name}`);
    Toast.success("已删除");
    await fetchStations();
  } catch (e) {
    Toast.error("删除失败");
  }
}

async function togglePublished(station: any) {
  try {
    const payload = {
      apiVersion: "journey-home.halo.run/v1alpha1",
      kind: "JourneyStation",
      metadata: { name: station.name, version: station.version || 1 },
      spec: {
        displayName: station.displayName,
        period: station.period,
        chapterNo: station.chapterNo,
        buildingType: station.buildingType,
        content: station.content,
        summary: station.summary,
        published: !station.published,
      },
    };
    await axios.put(`${apiBase}/stations/${station.name}`, payload);
    await fetchStations();
  } catch (e) {
    Toast.error("更新失败");
  }
}

function previewPage() {
  window.open("/journey", "_blank");
}

function buildingMeta(type: string) {
  const map: Record<string, { text: string; color: string }> = {
    cottage: { text: "小屋", color: "#22c55e" },
    workshop: { text: "工坊", color: "#0ea5e9" },
    district: { text: "街区", color: "#8b5cf6" },
    tower: { text: "高楼", color: "#f59e0b" },
    lab: { text: "实验室", color: "#14b8a6" },
    campus: { text: "校园", color: "#ef4444" },
  };
  return map[type] || { text: type, color: "#6b7280" };
}

onMounted(fetchStations);
</script>

<template>
  <div class="station-list-tab">
    <div class="toolbar">
      <div class="toolbar-left">
        <h2 class="title">站点管理</h2>
        <span class="subtitle">每站 = 像素城市中的一栋建筑，按编号从小到大从左到右排列</span>
      </div>
      <div class="toolbar-right">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索站点..."
          class="search-input"
        />
        <VButton @click="previewPage">预览主页</VButton>
        <VButton type="primary" @click="openCreate">+ 新增站点</VButton>
      </div>
    </div>

    <div class="table-container">
      <table class="station-table">
        <thead>
          <tr>
            <th style="width: 64px">编号</th>
            <th>站点名称</th>
            <th style="width: 140px">时间区间</th>
            <th style="width: 100px">建筑造型</th>
            <th>导语</th>
            <th style="width: 80px">发布</th>
            <th style="width: 220px; min-width: 220px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="loading-cell">加载中...</td>
          </tr>
          <tr v-else-if="filteredStations.length === 0">
            <td colspan="7" class="empty-cell">
              暂无站点，点击「新增站点」创建你的第一站
            </td>
          </tr>
          <tr v-for="station in filteredStations" :key="station.name">
            <td class="chapter-no">{{ station.chapterNo ?? 0 }}</td>
            <td>
              <div class="station-name">{{ station.displayName }}</div>
              <div class="station-slug">{{ station.name }}</div>
            </td>
            <td>{{ station.period || "—" }}</td>
            <td>
              <VTag :color="buildingMeta(station.buildingType).color">
                {{ buildingMeta(station.buildingType).text }}
              </VTag>
            </td>
            <td>
              <div class="station-summary">{{ station.summary || "—" }}</div>
            </td>
            <td>
              <label class="switch">
                <input
                  type="checkbox"
                  :checked="station.published"
                  @change="togglePublished(station)"
                />
                <span class="slider"></span>
              </label>
            </td>
            <td>
              <VSpace spacing="sm" :wrap="true">
                <VButton size="sm" @click="openEdit(station)">编辑</VButton>
                <VButton size="sm" type="danger" @click="handleDelete(station.name)">
                  删除
                </VButton>
              </VSpace>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <StationEditorDialog
      v-if="showEditor"
      :station="editingStation"
      :next-chapter="(stations.length + 1)"
      @close="showEditor = false"
      @saved="async () => { await fetchStations(); showEditor = false; }"
    />
  </div>
</template>

<style scoped>
.station-list-tab {
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
  flex-wrap: wrap;
}
.search-input {
  padding: 6px 12px;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 6px;
  font-size: 14px;
  background: var(--color-bg, #fff);
  color: var(--color-text, #111827);
  width: 200px;
}
.table-container {
  background: var(--color-bg, #fff);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
.station-table {
  width: 100%;
  border-collapse: collapse;
}
.station-table th {
  text-align: left;
  padding: 12px;
  background: var(--color-gray-100, #f9fafb);
  border-bottom: 1px solid var(--color-divider, #e5e7eb);
  font-weight: 600;
  font-size: 13px;
  color: var(--color-text-secondary, #6b7280);
}
.station-table td {
  padding: 12px;
  border-bottom: 1px solid var(--color-divider, #f3f4f6);
  font-size: 14px;
  color: var(--color-text, #111827);
}
.station-table tr:hover {
  background: var(--color-gray-100, #f9fafb);
}
.loading-cell,
.empty-cell {
  text-align: center;
  padding: 40px 20px !important;
  color: var(--color-text-secondary, #9ca3af);
}
.chapter-no {
  font-family: "SF Mono", Menlo, monospace;
  font-weight: 600;
  color: var(--color-primary, #00b8a6);
}
.station-name {
  font-weight: 500;
}
.station-slug {
  font-size: 12px;
  color: var(--color-text-secondary, #9ca3af);
  font-family: "SF Mono", Menlo, monospace;
  margin-top: 2px;
}
.station-summary {
  font-size: 13px;
  color: var(--color-text-secondary, #6b7280);
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-border, #d1d5db);
  transition: 0.3s;
  border-radius: 22px;
}
.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: #fff;
  transition: 0.3s;
  border-radius: 50%;
}
input:checked + .slider {
  background-color: var(--color-primary, #00b8a6);
}
input:checked + .slider:before {
  transform: translateX(18px);
}
</style>

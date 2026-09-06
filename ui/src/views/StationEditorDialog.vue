<script setup lang="ts">
import { ref, computed, watch } from "vue";
import axios from "axios";
import { VButton, Toast } from "@halo-dev/components";

const props = defineProps<{
  station: any;
  nextChapter: number;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved"): void;
}>();

const apiBase = "/apis/console.api.journey-home.halo.run/v1alpha1";

const isEdit = computed(() => !!props.station?.name);
const saving = ref(false);

const BUILDINGS = [
  { value: "cottage", label: "起点小屋（坡顶小屋 + 门廊灯）" },
  { value: "workshop", label: "移动工坊（商铺 + 橱窗）" },
  { value: "district", label: "开发街区（两层楼 + 窗阵）" },
  { value: "tower", label: "技术高楼（8 层塔楼 + 天线）" },
  { value: "lab", label: "产品实验室（圆顶 + 青色幕墙）" },
  { value: "campus", label: "校园（钟楼 + 旗杆）" },
];

const form = ref({
  displayName: "",
  period: "",
  chapterNo: 1,
  buildingType: "cottage",
  summary: "",
  content: "",
  published: true,
});

watch(
  () => props.station,
  (s) => {
    if (s) {
      form.value.displayName = s.displayName || "";
      form.value.period = s.period || "";
      form.value.chapterNo = s.chapterNo ?? 1;
      form.value.buildingType = s.buildingType || "cottage";
      form.value.summary = s.summary || "";
      form.value.content = s.content || "";
      form.value.published = s.published ?? true;
    } else {
      form.value = {
        displayName: "",
        period: "",
        chapterNo: props.nextChapter || 1,
        buildingType: "cottage",
        summary: "",
        content: "",
        published: true,
      };
    }
  },
  { immediate: true }
);

function generateSlug(text: string): string {
  const asciiSlug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 40);
  return asciiSlug || "station";
}

async function save() {
  if (!form.value.displayName.trim()) {
    Toast.warning("请输入站点名称");
    return;
  }
  if (!form.value.period.trim()) {
    Toast.warning("请输入时间区间（如 2011 — 2013 或 关于我）");
    return;
  }
  saving.value = true;
  try {
    const payload: any = {
      apiVersion: "journey-home.halo.run/v1alpha1",
      kind: "JourneyStation",
      metadata: isEdit.value
        ? { name: props.station.name, version: props.station?.version || 1 }
        : { generateName: `${generateSlug(form.value.displayName)}-` },
      spec: { ...form.value },
    };

    if (isEdit.value) {
      await axios.put(`${apiBase}/stations/${props.station.name}`, payload);
    } else {
      await axios.post(`${apiBase}/stations`, payload);
    }
    Toast.success("保存成功");
    emit("saved");
  } catch (e: any) {
    Toast.error("保存失败: " + (e.response?.data?.message || e.message));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="dialog-overlay" @click.self="emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <h3>{{ isEdit ? "编辑站点" : "新增站点" }}</h3>
        <button class="close-btn" @click="emit('close')">&times;</button>
      </div>
      <div class="dialog-body">
        <div class="form-row">
          <div class="form-group">
            <label>站点名称 *</label>
            <input v-model="form.displayName" type="text" placeholder="例如：起点小屋" />
          </div>
          <div class="form-group form-group-narrow">
            <label>章节编号 *</label>
            <input v-model.number="form.chapterNo" type="number" min="1" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>时间区间 *</label>
            <input v-model="form.period" type="text" placeholder="例如：2011 — 2013 / 关于我 / 2025 — 至今" />
          </div>
          <div class="form-group">
            <label>建筑造型 *</label>
            <select v-model="form.buildingType">
              <option v-for="b in BUILDINGS" :key="b.value" :value="b.value">
                {{ b.label }}
              </option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>导语（弹窗标题下方的一两句介绍）</label>
          <textarea v-model="form.summary" rows="2" placeholder="例如：在技术、产品与教育之间持续行走。"></textarea>
        </div>
        <div class="form-group">
          <label>正文（进入建筑后弹窗展示的内容）</label>
          <textarea
            v-model="form.content"
            rows="10"
            class="content-editor"
            placeholder="这里写这一站的故事……&#10;&#10;支持多段文字，换行保留。"
          ></textarea>
        </div>
        <div class="form-group checkbox">
          <label>
            <input type="checkbox" v-model="form.published" />
            <span>发布（前台可见）</span>
          </label>
        </div>
      </div>
      <div class="dialog-footer">
        <VButton :disabled="saving" @click="emit('close')">取消</VButton>
        <VButton type="primary" :disabled="saving" @click="save">
          {{ saving ? "保存中..." : "保存" }}
        </VButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.dialog {
  background: var(--color-bg, #fff);
  border-radius: 12px;
  width: 640px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-divider, #e5e7eb);
}
.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text, #111827);
}
.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--color-text-secondary, #6b7280);
}
.dialog-body {
  padding: 20px 24px;
}
.form-group {
  margin-bottom: 16px;
  flex: 1;
}
.form-group-narrow {
  flex: 0 0 110px;
}
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text, #374151);
}
.form-group input[type="text"],
.form-group input[type="number"],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  font-family: inherit;
  background: var(--color-bg, #fff);
  color: var(--color-text, #111827);
}
.form-group textarea {
  resize: vertical;
}
.form-group.checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--color-text, #111827);
}
.form-row {
  display: flex;
  gap: 12px;
}
.content-editor {
  font-family: inherit;
  line-height: 1.8;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-divider, #e5e7eb);
}
</style>

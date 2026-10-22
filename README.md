# Halo Journey Home · 旅程主页

一个游戏化 Halo 博客主页插件：配合 [halo-theme-boommanpro](https://github.com/boommanpro/halo-theme-boommanpro) 主题（≥ 1.3.0）的 `journey` 页面模板，把 `/journey` 变成**主题页面内嵌的 3D 纸墨小街**——页面保留主题的页头/导航/页脚，内容区是一条可漫步的街道。建筑由博客内容实时生成：走进每栋房子，读一篇文章、逛一个分类、认识博主。

> 写作即存档，构建即思考。欢迎来小街散步。

## 特性

- **内嵌主题页面**：由主题 `journey` 模板渲染完整页面框架（页头/导航/页脚/主题 CSS 变量），3D 大舞台（约 78vh）嵌在内容区

- **建筑即博客内容**：街道由三类建筑组成——
  - **主建筑 ×1**：加高的「关于我」塔楼，点击查看博主简介并跳转介绍页（标题/简介/链接后台可配）
  - **分类地标 ×1–4**：按后台勾选的分类生成书屋造型建筑，点开显示该分类最新 5 篇文章与分类入口；未配置时自动取文章数最多的 2 个分类
  - **文章建筑 ×4–12**：最新发布的文章，点击弹出摘要卡片，「阅读全文 ↗」跳转原文

- **每栋房子都不一样**：三角坡顶 / 单坡顶 / 平顶护栏三种屋顶，四种墙色、高低宽窄按建筑轮换，整体保持纸墨画风

- **完整 3D 交互**：拖动环顾、滚轮缩放、点击空地小人自动寻路、方向键 / WASD 行走、点击建筑查看、一键日夜切换（街灯与窗光点亮）、全屏

- **Console 可视化配置**：主建筑、分类建筑勾选、文章数量；页面标题与副文案直接在 Console「页面」里编辑

## 环境要求

| 依赖 | 版本 |
| ---- | ---- |
| Halo | >= 2.20 |
| 主题 | [halo-theme-boommanpro](https://github.com/boommanpro/halo-theme-boommanpro) >= 1.3.0（提供 `journey` 页面模板） |

## 安装

1. 前往 [Releases](https://github.com/boommanpro/halo-plugin-journey-home/releases) 下载最新的 `halo-plugin-journey-home-x.y.z.jar`
2. Halo Console → 插件 → 安装 → 上传 JAR，启动插件
3. 确认存在 slug 为 `journey` 的页面，且模板选择 **journey**（旧版插件创建的页面已满足；没有的话：Console → 页面 → 创建，slug 填 `journey`，模板选 `journey`，发布）

## 使用

### 配置小街

Console → 插件 → 旅程主页 → **页面设置**：

- **主建筑**：标题、招牌副标题、卡片简介、「查看完整介绍」跳转链接（默认 `/about`）
- **分类建筑**：勾选作为地标建筑的分类（按勾选顺序，最多 4 个；不勾选自动取文章数前 2）
- **街道规模**：文章建筑数量（4–12，默认 6）

页面主标题与副文案在 Console「页面」中编辑（作为页面的标题和摘要）。

### 数据来源

街道完全由博客内容驱动，无需手动维护站点数据：

- 文章建筑 = 最新已发布且公开的文章（标题、日期、摘要、永久链接）
- 分类地标 = 所选分类（名称、文章数、最新 5 篇）
- 右上角统计与「全部 N 篇 → 归档」入口来自全站公开文章数

## 3D 小街操作

| 操作                      | 功能                 |
| ------------------------- | -------------------- |
| 拖动 / 滚轮               | 旋转环顾 / 缩放街区  |
| 点击空地                  | 小人自动步行过去     |
| `←→↑↓` / `W` `A` `S` `D` | 手动行走             |
| 点击建筑                  | 打开对应卡片         |
| 右侧工具条                | 日夜切换 / 全景 / 全屏 / 帮助 |

## 技术实现

```
halo-plugin-journey-home/
├── src/main/java/run/halo/journeyhome/
│   ├── endpoint/      # 公开 API（/journey-api/street）+ Console API（config / categories）
│   ├── extension/     # JourneyPageConfig 配置模型
│   ├── service/       # StreetService（博客内容聚合）/ JourneyConfigService
│   └── dto/           # StreetVo / PageConfigVo / CategoryVo
├── src/main/resources/
│   ├── static/                          # 3D 前端产物（street.js / street.css / three.js）
│   └── extensions/                      # ReverseProxy 静态资源声明 + 匿名访问权限
├── frontend/          # 3D 小街源码（Vite + Three.js，内嵌模式构建）
└── ui/                # Console 管理端（Vue 3 + @halo-dev/console-shared）

halo-theme-boommanpro/
└── templates/journey.html   # 页面模板：主题布局框架 + 3D 容器 + 引用插件静态资源
```

- **页面渲染**：`/journey` 由 Halo 页面机制 + 主题 `journey` 模板渲染（主题布局、CSS 变量、暗色模式原生适配）；模板内容区放置 `#journey-street` 容器并引用 `/plugins/JourneyHome/assets/street.js|css`
- **3D 资源**：前端构建产物（固定文件名）随插件 JAR 分发，经 `ReverseProxy` 在 `/plugins/JourneyHome/assets/**` 匿名访问
- **数据接口**（仅 GET、匿名可访问）：

| 接口                          | 说明                                          |
| ----------------------------- | --------------------------------------------- |
| `GET /journey-api/street`     | 街道数据（主建筑 / 分类地标 / 文章建筑 / 统计） |

- **建筑变体**：屋顶（坡顶/单坡/平顶）、墙色、高度、宽度按建筑索引确定性轮换，同数据渲染稳定

## 开发

```bash
# 构建全部（前端 3D + Console UI + 后端，产出 JAR）
./gradlew build

# 本地预览 3D 小街（带 mock 数据宿主页）
cd frontend && pnpm install && pnpm dev
# 打开 http://127.0.0.1:5173/embed-demo.html
```

要求：JDK 21、Node 20+、pnpm 9。

## 从 0.1.x 升级（不兼容变更）

1. **先升级主题到 ≥ 1.3.0**（新版 `journey` 模板），再升级本插件到 0.2.0
2. `/journey-3d/` 独立页面已移除
3. **站点管理（JourneyStation 手动维护）已删除**，街道数据全部来自博客文章与分类；旧站点数据保留在数据库但不再使用
4. Console 中 journey 页面确认模板为 **journey**；导航菜单无需改动

## License

[MIT](https://opensource.org/licenses/MIT)

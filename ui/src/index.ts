import { definePlugin } from "@halo-dev/console-shared";
import { markRaw } from "vue";
import StationListTab from "./views/StationListTab.vue";
import PageConfigPanel from "./views/PageConfigPanel.vue";

export default definePlugin({
  routes: [],
  extensionPoints: {
    "plugin:self:tabs:create": () => [
      {
        id: "journey-home:stations",
        label: "站点管理",
        component: markRaw(StationListTab),
      },
      {
        id: "journey-home:page-config",
        label: "页面设置",
        component: markRaw(PageConfigPanel),
      },
    ],
  },
});

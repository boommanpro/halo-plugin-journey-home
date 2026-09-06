package run.halo.journeyhome.extension;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;
import run.halo.app.extension.AbstractExtension;
import run.halo.app.extension.GVK;
import run.halo.app.extension.Metadata;

/**
 * 旅程主页全局文案配置（单例，metadata.name 固定为 journey-config）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@GVK(group = "journey-home.halo.run",
     version = "v1alpha1",
     kind = "JourneyPageConfig",
     plural = "journeypageconfigs",
     singular = "journeypageconfig")
public class JourneyPageConfig extends AbstractExtension {

    public static final String SINGLETON_NAME = "journey-config";

    public JourneyPageConfig() {
        setMetadata(new Metadata());
    }

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
    private Spec spec;

    @Data
    public static class Spec {
        /** 站点名（页头品牌文字） */
        @Schema(maxLength = 50)
        private String siteName = "我的旅程";

        /** 页头副标语（如 A LIFE IN PROGRESS） */
        @Schema(maxLength = 100)
        private String siteTagline = "A LIFE IN PROGRESS";

        /** 头像图片 URL */
        @Schema
        private String avatarUrl = "";

        /** 顶部小标签（如 PERSONAL JOURNEY / 个人旅程） */
        @Schema(maxLength = 100)
        private String topline = "PERSONAL JOURNEY / 个人旅程";

        /** 主标题（如「每一步，都通向新的自己。」） */
        @Schema(maxLength = 100)
        private String heroTitle = "每一步，都通向新的自己。";

        /** 副标题（如「从城市出发，在校园继续。」） */
        @Schema(maxLength = 100)
        private String heroSubtitle = "从城市出发，在校园继续。";

        /** 页脚标语（如 THE JOURNEY CONTINUES） */
        @Schema(maxLength = 100)
        private String afterwordTitle = "THE JOURNEY CONTINUES";

        /** 页脚文案 */
        @Schema(maxLength = 200)
        private String afterwordText = "在技术、产品与教育之间，持续行走。";

        /** 「直接阅读」降级列表的标题 */
        @Schema(maxLength = 50)
        private String readingsTitle = "直接阅读个人介绍与完整职业经历";
    }
}

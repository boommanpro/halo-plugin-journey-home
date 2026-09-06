package run.halo.journeyhome.extension;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;
import run.halo.app.extension.AbstractExtension;
import run.halo.app.extension.GVK;
import run.halo.app.extension.Metadata;

@Data
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@GVK(group = "journey-home.halo.run",
     version = "v1alpha1",
     kind = "JourneyStation",
     plural = "journeystations",
     singular = "journeystation")
public class JourneyStation extends AbstractExtension {

    public JourneyStation() {
        setMetadata(new Metadata());
    }

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
    private Spec spec;

    @Data
    public static class Spec {
        /** 站点显示名，如「起点小屋」 */
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, maxLength = 50)
        private String displayName;

        /** 时间区间标签，如「2011 — 2013」或「关于我」 */
        @Schema(maxLength = 50)
        private String period;

        /** 章节编号，用于前台 01/02… 展示与排序（小号在前） */
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        private Integer chapterNo = 1;

        /**
         * 建筑造型类型，决定像素城市中的建筑外观。
         * 可选：cottage / workshop / district / tower / lab / campus
         */
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        private String buildingType = "cottage";

        /** 章节弹窗中的正文（纯文本，支持换行） */
        @Schema
        private String content;

        /** 章节弹窗中的导语（较短，显示在标题下方） */
        @Schema(maxLength = 200)
        private String summary;

        /** 是否发布（前台可见） */
        @Schema
        private Boolean published = true;

        @Schema
        private Instant createdAt;

        @Schema
        private Instant updatedAt;
    }
}

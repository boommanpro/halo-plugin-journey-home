package run.halo.journeyhome.dto;

import java.util.List;

/**
 * 3D 街道数据：由博客已发布内容聚合而成。
 *
 * @param main       主建筑（默认「关于我」，跳转链接可配置）
 * @param categories 分类地标建筑（后台可勾选，默认四个核心分类）
 * @param totalPosts 已发布且公开的文章总数（页脚统计用）
 */
public record StreetVo(
    BuildingVo main,
    List<CategoryBuildingVo> categories,
    int totalPosts
) {

    public record BuildingVo(String title, String subtitle, String summary, String url) {}

    /**
     * @param posts 该分类下最新发布的文章（标题/链接/日期）
     */
    public record CategoryBuildingVo(
        String title,
        String subtitle,
        String summary,
        String url,
        List<PostRefVo> posts
    ) {}

    public record PostRefVo(String title, String url, String date) {}
}

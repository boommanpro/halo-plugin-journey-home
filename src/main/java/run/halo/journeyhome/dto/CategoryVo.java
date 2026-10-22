package run.halo.journeyhome.dto;

/** Console 分类选择用：分类名 / slug / 公开文章数。 */
public record CategoryVo(String displayName, String slug, int postCount) {}

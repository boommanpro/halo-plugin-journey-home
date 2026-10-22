package run.halo.journeyhome.service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import run.halo.app.core.extension.content.Category;
import run.halo.app.core.extension.content.Post;
import run.halo.app.extension.ListOptions;
import run.halo.app.extension.ReactiveExtensionClient;
import run.halo.journeyhome.dto.CategoryVo;
import run.halo.journeyhome.dto.PageConfigVo;
import run.halo.journeyhome.dto.StreetVo;

/**
 * 从博客已发布内容聚合 3D 街道数据：主建筑 + 分类地标 + 最新文章。
 */
@Service
@RequiredArgsConstructor
public class StreetService {

    private static final int CATEGORY_LIMIT = 2;
    private static final int CATEGORY_MAX = 4;
    private static final int CATEGORY_POST_LIMIT = 5;
    private static final int EXCERPT_MAX_CHARS = 160;
    private static final DateTimeFormatter MONTH_FORMATTER =
        DateTimeFormatter.ofPattern("yyyy-MM").withZone(ZoneId.systemDefault());

    private final ReactiveExtensionClient client;
    private final JourneyConfigService configService;

    public Mono<StreetVo> buildStreet() {
        return Mono.zip(
                configService.getPageConfig(),
                listPublicPosts(),
                client.listAll(Category.class, new ListOptions(), Sort.unsorted())
                    .collectList())
            .map(tuple -> assemble(tuple.getT1(), tuple.getT2(), tuple.getT3()));
    }

    /** Console 配置面板用：可选分类列表（名称/slug/文章数），按文章数倒序。 */
    public Mono<List<CategoryVo>> listCategoryOptions() {
        return client.listAll(Category.class, new ListOptions(), Sort.unsorted())
            .filter(this::isEligibleCategory)
            .collectList()
            .map(list -> list.stream()
                .sorted(Comparator.comparingInt(this::visiblePostCount).reversed())
                .map(category -> new CategoryVo(
                    category.getSpec().getDisplayName(),
                    category.getSpec().getSlug(),
                    visiblePostCount(category)))
                .toList());
    }

    /** 已发布、未删除、公开且有永久链接的文章，按发布时间倒序。 */
    private Mono<List<Post>> listPublicPosts() {
        return client.listAll(Post.class, new ListOptions(), Sort.unsorted())
            .filter(post -> post.getSpec() != null && post.getStatus() != null
                && !post.isDeleted()
                && !Post.isRecycled(post.getMetadata())
                && post.isPublished()
                && Post.isPublic(post.getSpec())
                && StringUtils.isNotBlank(post.getStatus().getPermalink()))
            .collectList()
            .map(posts -> posts.stream()
                .sorted(Comparator.comparing(this::publishTime,
                    Comparator.nullsLast(Comparator.naturalOrder())))
                .toList());
    }

    private Instant publishTime(Post post) {
        return post.getSpec().getPublishTime();
    }

    private StreetVo assemble(PageConfigVo config, List<Post> posts, List<Category> categories) {
        var main = new StreetVo.BuildingVo(
            config.mainTitle(), config.mainSubtitle(), config.mainSummary(), config.mainUrl());

        var availableBySlug = categories.stream()
            .filter(this::isEligibleCategory)
            .collect(java.util.stream.Collectors.toMap(
                category -> category.getSpec().getSlug(),
                category -> category,
                (first, second) -> first,
                java.util.LinkedHashMap::new));

        var configuredSlugs = config.categorySlugs() == null ? List.<String>of() : config.categorySlugs();
        List<Category> selected;
        if (configuredSlugs.isEmpty()) {
            selected = availableBySlug.values().stream()
                .sorted(Comparator.comparingInt(this::visiblePostCount).reversed())
                .limit(CATEGORY_LIMIT)
                .toList();
        } else {
            selected = configuredSlugs.stream()
                .map(availableBySlug::get)
                .filter(Objects::nonNull)
                .limit(CATEGORY_MAX)
                .toList();
        }
        var categoryBuildings = selected.stream()
            .map(category -> toCategoryBuilding(category, posts))
            .toList();

        var postBuildings = posts.stream()
            .limit(config.postCount())
            .map(this::toPostBuilding)
            .toList();

        return new StreetVo(main, categoryBuildings, postBuildings, posts.size());
    }

    private boolean isEligibleCategory(Category category) {
        return category.getSpec() != null && category.getStatus() != null
            && !category.isDeleted()
            && !category.getSpec().isHideFromList()
            && StringUtils.isNotBlank(category.getStatus().getPermalink())
            && StringUtils.isNotBlank(category.getSpec().getSlug());
    }

    private int visiblePostCount(Category category) {
        var status = category.getStatus();
        if (status.visiblePostCount != null) {
            return status.visiblePostCount;
        }
        return status.postCount != null ? status.postCount : 0;
    }

    private StreetVo.CategoryBuildingVo toCategoryBuilding(Category category, List<Post> posts) {
        String name = category.getMetadata().getName();
        var latest = posts.stream()
            .filter(post -> post.getSpec().getCategories() != null
                && post.getSpec().getCategories().contains(name))
            .limit(CATEGORY_POST_LIMIT)
            .map(post -> new StreetVo.PostRefVo(
                post.getSpec().getTitle(),
                post.getStatus().getPermalink(),
                formatDate(publishTime(post))))
            .toList();
        int count = visiblePostCount(category);
        return new StreetVo.CategoryBuildingVo(
            category.getSpec().getDisplayName(),
            count + " 篇",
            StringUtils.defaultString(category.getSpec().getDescription()),
            category.getStatus().getPermalink(),
            latest);
    }

    private StreetVo.BuildingVo toPostBuilding(Post post) {
        return new StreetVo.BuildingVo(
            post.getSpec().getTitle(),
            formatDate(publishTime(post)),
            truncate(StringUtils.defaultString(post.getStatus().getExcerpt())),
            post.getStatus().getPermalink());
    }

    /** 按 Unicode 码点截断，避免拆开代理对。 */
    private static String truncate(String value) {
        if (value.codePointCount(0, value.length()) <= EXCERPT_MAX_CHARS) {
            return value;
        }
        int end = value.offsetByCodePoints(0, EXCERPT_MAX_CHARS);
        return value.substring(0, end) + "…";
    }

    private static String formatDate(Instant time) {
        return time == null ? "" : MONTH_FORMATTER.format(time);
    }
}

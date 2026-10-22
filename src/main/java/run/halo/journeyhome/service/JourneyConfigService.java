package run.halo.journeyhome.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ServerWebInputException;
import reactor.core.publisher.Mono;
import run.halo.app.extension.ReactiveExtensionClient;
import run.halo.journeyhome.dto.PageConfigVo;
import run.halo.journeyhome.extension.JourneyPageConfig;

import java.util.List;

/**
 * 旅程页面全局文案配置的读写（单例 extension）。
 */
@Service
@RequiredArgsConstructor
public class JourneyConfigService {

    private final ReactiveExtensionClient client;

    /** 读取全局文案配置；不存在或字段缺失时返回默认值（不落库）。 */
    public Mono<PageConfigVo> getPageConfig() {
        return client.fetch(JourneyPageConfig.class, JourneyPageConfig.SINGLETON_NAME)
            .map(c -> toConfigVo(c.getSpec()))
            .defaultIfEmpty(toConfigVo(new JourneyPageConfig.Spec()));
    }

    /** 保存全局文案配置（upsert 单例）。 */
    public Mono<PageConfigVo> savePageConfig(JourneyPageConfig.Spec spec) {
        if (spec == null) {
            return Mono.error(new ServerWebInputException("spec is required"));
        }
        return client.fetch(JourneyPageConfig.class, JourneyPageConfig.SINGLETON_NAME)
            .flatMap(existing -> {
                existing.setSpec(spec);
                return client.update(existing);
            })
            .switchIfEmpty(Mono.defer(() -> {
                JourneyPageConfig config = new JourneyPageConfig();
                config.getMetadata().setName(JourneyPageConfig.SINGLETON_NAME);
                config.setSpec(spec);
                return client.create(config);
            }))
            .map(c -> toConfigVo(c.getSpec()));
    }

    private static String orDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static PageConfigVo toConfigVo(JourneyPageConfig.Spec spec) {
        var defaults = new JourneyPageConfig.Spec();
        Integer postCount = spec.getPostCount();
        if (postCount == null || postCount < 4 || postCount > 12) {
            postCount = defaults.getPostCount();
        }
        return new PageConfigVo(
            orDefault(spec.getSiteName(), defaults.getSiteName()),
            orDefault(spec.getSiteTagline(), defaults.getSiteTagline()),
            orDefault(spec.getAvatarUrl(), ""),
            orDefault(spec.getTopline(), defaults.getTopline()),
            orDefault(spec.getHeroTitle(), defaults.getHeroTitle()),
            orDefault(spec.getHeroSubtitle(), defaults.getHeroSubtitle()),
            orDefault(spec.getAfterwordTitle(), defaults.getAfterwordTitle()),
            orDefault(spec.getAfterwordText(), defaults.getAfterwordText()),
            orDefault(spec.getReadingsTitle(), defaults.getReadingsTitle()),
            orDefault(spec.getMainTitle(), defaults.getMainTitle()),
            orDefault(spec.getMainSubtitle(), defaults.getMainSubtitle()),
            orDefault(spec.getMainSummary(), ""),
            orDefault(spec.getMainUrl(), defaults.getMainUrl()),
            postCount,
            spec.getCategorySlugs() == null ? List.of() : spec.getCategorySlugs()
        );
    }
}

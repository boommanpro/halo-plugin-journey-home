package run.halo.journeyhome.service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ServerWebInputException;
import reactor.core.publisher.Mono;
import run.halo.app.extension.ListOptions;
import run.halo.app.extension.ReactiveExtensionClient;
import run.halo.journeyhome.dto.PageConfigVo;
import run.halo.journeyhome.dto.StationVo;
import run.halo.journeyhome.extension.JourneyPageConfig;
import run.halo.journeyhome.extension.JourneyStation;

@Service
@RequiredArgsConstructor
public class StationService {

    private static final Pattern SLUG_PATTERN =
        Pattern.compile("^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$");
    private static final List<String> BUILDING_TYPES =
        List.of("cottage", "workshop", "district", "tower", "lab", "campus");

    private final ReactiveExtensionClient client;

    public Mono<StationVo> create(JourneyStation station) {
        if (station.getMetadata().getName() == null || station.getMetadata().getName().isBlank()) {
            station.getMetadata().setName(generateSlug(station.getSpec().getDisplayName()));
        }
        validate(station);
        if (station.getSpec().getCreatedAt() == null) {
            station.getSpec().setCreatedAt(Instant.now());
        }
        if (station.getSpec().getChapterNo() == null) {
            station.getSpec().setChapterNo(1);
        }
        if (station.getSpec().getPublished() == null) {
            station.getSpec().setPublished(true);
        }
        return client.create(station).map(StationService::toVo);
    }

    public Mono<StationVo> update(String name, JourneyStation station) {
        return client.fetch(JourneyStation.class, name)
            .switchIfEmpty(Mono.error(new ServerWebInputException("Station not found: " + name)))
            .flatMap(existing -> {
                station.getMetadata().setName(name);
                station.getMetadata().setVersion(existing.getMetadata().getVersion());
                validate(station);
                station.getSpec().setCreatedAt(existing.getSpec().getCreatedAt());
                station.getSpec().setUpdatedAt(Instant.now());
                return client.update(station);
            })
            .map(StationService::toVo);
    }

    public Mono<Void> delete(String name) {
        return client.fetch(JourneyStation.class, name)
            .switchIfEmpty(Mono.error(new ServerWebInputException("Station not found: " + name)))
            .flatMap(client::delete)
            .then();
    }

    public Mono<StationVo> getByName(String name) {
        return client.fetch(JourneyStation.class, name).map(StationService::toVo);
    }

    /** 全量站点（Console 用），按 chapterNo 升序。 */
    public Mono<List<StationVo>> listAll() {
        return client.listAll(JourneyStation.class, new ListOptions(),
                Sort.by(Sort.Order.asc("metadata.name")))
            .map(StationService::toVo)
            .collectList()
            .map(list -> list.stream().sorted(Comparator
                .comparingInt(s -> s.chapterNo() != null ? s.chapterNo() : 0))
                .toList());
    }

    /** 已发布站点（前台用），按 chapterNo 升序。 */
    public Mono<List<StationVo>> listPublished() {
        return client.listAll(JourneyStation.class, new ListOptions(),
                Sort.by(Sort.Order.asc("metadata.name")))
            .filter(s -> Boolean.TRUE.equals(s.getSpec().getPublished()))
            .map(StationService::toVo)
            .collectList()
            .map(list -> list.stream().sorted(Comparator
                .comparingInt(s -> s.chapterNo() != null ? s.chapterNo() : 0))
                .toList());
    }

    /** 读取全局文案配置；不存在时返回默认值对象（不落库）。 */
    public Mono<PageConfigVo> getPageConfig() {
        return client.fetch(JourneyPageConfig.class, JourneyPageConfig.SINGLETON_NAME)
            .map(c -> toConfigVo(c.getSpec()))
            .defaultIfEmpty(toConfigVo(new JourneyPageConfig.Spec()));
    }

    /** 保存全局文案配置（upsert 单例）。 */
    public Mono<PageConfigVo> savePageConfig(JourneyPageConfig.Spec spec) {
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

    private static PageConfigVo toConfigVo(JourneyPageConfig.Spec spec) {
        return new PageConfigVo(
            spec.getSiteName(),
            spec.getSiteTagline(),
            spec.getAvatarUrl(),
            spec.getTopline(),
            spec.getHeroTitle(),
            spec.getHeroSubtitle(),
            spec.getAfterwordTitle(),
            spec.getAfterwordText(),
            spec.getReadingsTitle()
        );
    }

    private static StationVo toVo(JourneyStation s) {
        return new StationVo(
            s.getMetadata().getName(),
            s.getMetadata().getVersion(),
            s.getSpec().getDisplayName(),
            s.getSpec().getPeriod(),
            s.getSpec().getChapterNo(),
            s.getSpec().getBuildingType(),
            s.getSpec().getContent(),
            s.getSpec().getSummary(),
            s.getSpec().getPublished(),
            s.getSpec().getCreatedAt(),
            s.getSpec().getUpdatedAt()
        );
    }

    private static void validate(JourneyStation station) {
        JourneyStation.Spec spec = station.getSpec();
        if (spec == null || spec.getDisplayName() == null || spec.getDisplayName().isBlank()) {
            throw new ServerWebInputException("displayName is required");
        }
        String type = spec.getBuildingType();
        if (type == null || !BUILDING_TYPES.contains(type)) {
            throw new ServerWebInputException(
                "buildingType must be one of " + BUILDING_TYPES);
        }
    }

    private static String generateSlug(String displayName) {
        if (displayName == null || displayName.isBlank()) {
            return "station-" + System.currentTimeMillis();
        }
        String slug = displayName.toLowerCase()
            .replaceAll("[^a-z0-9\\s-]", "")
            .replaceAll("\\s+", "-")
            .replaceAll("-+", "-")
            .replaceAll("^-|-$", "");
        if (slug.isEmpty() || !SLUG_PATTERN.matcher(slug).matches()) {
            return "station-" + System.currentTimeMillis();
        }
        if (slug.length() > 63) {
            slug = slug.substring(0, 63);
        }
        return slug;
    }
}

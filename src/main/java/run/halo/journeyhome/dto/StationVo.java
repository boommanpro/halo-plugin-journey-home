package run.halo.journeyhome.dto;

import java.time.Instant;

public record StationVo(
        String name,
        Long version,
        String displayName,
        String period,
        Integer chapterNo,
        String buildingType,
        String content,
        String summary,
        Boolean published,
        Instant createdAt,
        Instant updatedAt
) {}

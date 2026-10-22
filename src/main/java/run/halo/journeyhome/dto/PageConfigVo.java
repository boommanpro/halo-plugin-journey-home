package run.halo.journeyhome.dto;

import java.util.List;

public record PageConfigVo(
        String siteName,
        String siteTagline,
        String avatarUrl,
        String topline,
        String heroTitle,
        String heroSubtitle,
        String afterwordTitle,
        String afterwordText,
        String readingsTitle,
        String mainTitle,
        String mainSubtitle,
        String mainSummary,
        String mainUrl,
        List<String> categorySlugs
) {}

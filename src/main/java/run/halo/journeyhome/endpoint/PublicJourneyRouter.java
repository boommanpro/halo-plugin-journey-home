package run.halo.journeyhome.endpoint;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.server.HandlerFunction;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.reactive.function.server.ServerResponse;
import reactor.core.publisher.Mono;
import run.halo.journeyhome.service.StationService;

/**
 * 前台公开 API：
 *  - GET /journey-api/stations   已发布站点 JSON
 *  - GET /journey-api/config     全局文案 JSON
 *
 * 前台展示由主题模板负责（boommanpro 主题内置 journey 模板），
 * 创建页面时选择「Journey 交互式旅程」模板即可。
 */
@Component
@RequiredArgsConstructor
public class PublicJourneyRouter implements RouterFunction<ServerResponse> {

    private static final String API_PREFIX = "/journey-api";

    private final StationService stationService;

    @Override
    public Mono<HandlerFunction<ServerResponse>> route(ServerRequest request) {
        // 公开 API 仅响应 GET，其他方法一律不匹配（由全局 405/404 处理）
        if (request.method() != org.springframework.http.HttpMethod.GET) {
            return Mono.empty();
        }
        String path = request.path();
        if (path.equals(API_PREFIX + "/stations")) {
            return Mono.just(this::listStations);
        }
        if (path.equals(API_PREFIX + "/config")) {
            return Mono.just(this::getConfig);
        }
        return Mono.empty();
    }

    private Mono<ServerResponse> listStations(ServerRequest request) {
        return ServerResponse.ok()
            .contentType(MediaType.APPLICATION_JSON)
            .body(stationService.listPublished(),
                run.halo.journeyhome.dto.StationVo.class);
    }

    private Mono<ServerResponse> getConfig(ServerRequest request) {
        return ServerResponse.ok()
            .contentType(MediaType.APPLICATION_JSON)
            .body(stationService.getPageConfig(),
                run.halo.journeyhome.dto.PageConfigVo.class);
    }
}

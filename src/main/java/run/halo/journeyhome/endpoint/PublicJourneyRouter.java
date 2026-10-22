package run.halo.journeyhome.endpoint;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.server.HandlerFunction;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.reactive.function.server.ServerResponse;
import reactor.core.publisher.Mono;
import run.halo.journeyhome.service.StreetService;

/**
 * 前台公开 API（匿名可访问，仅 GET）：
 *  - GET /journey-api/street   3D 街道数据（主建筑 + 分类地标 + 最新文章，来自博客内容）
 *
 * 页面由主题 journey 模板渲染（3D 场景与交互由本插件的静态资源提供）。
 */
@Component
@RequiredArgsConstructor
public class PublicJourneyRouter implements RouterFunction<ServerResponse> {

    private static final String API_PREFIX = "/journey-api";

    private final StreetService streetService;

    @Override
    public Mono<HandlerFunction<ServerResponse>> route(ServerRequest request) {
        // 公开 API 仅响应 GET，其他方法一律不匹配（由全局 405/404 处理）
        if (request.method() != HttpMethod.GET) {
            return Mono.empty();
        }
        if (request.path().equals(API_PREFIX + "/street")) {
            return Mono.just(this::getStreet);
        }
        return Mono.empty();
    }

    private Mono<ServerResponse> getStreet(ServerRequest request) {
        return ServerResponse.ok()
            .contentType(MediaType.APPLICATION_JSON)
            .body(streetService.buildStreet(), run.halo.journeyhome.dto.StreetVo.class);
    }
}

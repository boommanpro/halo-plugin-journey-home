package run.halo.journeyhome.endpoint;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.server.HandlerFunction;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.RouterFunctions;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.reactive.function.server.ServerResponse;
import reactor.core.publisher.Mono;
import run.halo.journeyhome.extension.JourneyPageConfig;
import run.halo.journeyhome.service.JourneyConfigService;
import run.halo.journeyhome.service.StreetService;

/**
 * Console 管理端 API（需管理员登录）：页面文案配置读写 + 可选分类列表。
 */
@Component
@RequiredArgsConstructor
public class ConfigEndpoint implements RouterFunction<ServerResponse> {

    private static final String PREFIX = "/apis/console.api.journey-home.halo.run/v1alpha1";

    private final JourneyConfigService service;
    private final StreetService streetService;

    private final RouterFunction<ServerResponse> delegate = RouterFunctions.route()
        .GET(PREFIX + "/config", this::getConfig)
        .PUT(PREFIX + "/config", this::saveConfig)
        .GET(PREFIX + "/categories", this::listCategories)
        .build();

    @Override
    public Mono<HandlerFunction<ServerResponse>> route(ServerRequest request) {
        return delegate.route(request);
    }

    private Mono<ServerResponse> getConfig(ServerRequest request) {
        return ServerResponse.ok().body(service.getPageConfig(),
            run.halo.journeyhome.dto.PageConfigVo.class);
    }

    private Mono<ServerResponse> saveConfig(ServerRequest request) {
        return request.bodyToMono(JourneyPageConfig.class)
            // spec 为空的非法请求由 service 层统一校验并返回 400
            .flatMap(cfg -> service.savePageConfig(cfg.getSpec()))
            .flatMap(vo -> ServerResponse.ok().bodyValue(vo));
    }

    private Mono<ServerResponse> listCategories(ServerRequest request) {
        return ServerResponse.ok().body(streetService.listCategoryOptions(),
            run.halo.journeyhome.dto.CategoryVo.class);
    }
}

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
import run.halo.journeyhome.extension.JourneyStation;
import run.halo.journeyhome.service.StationService;

/**
 * Console 管理端 API（需管理员登录）。
 */
@Component
@RequiredArgsConstructor
public class StationEndpoint implements RouterFunction<ServerResponse> {

    private static final String PREFIX = "/apis/console.api.journey-home.halo.run/v1alpha1";

    private final StationService service;

    private final RouterFunction<ServerResponse> delegate = RouterFunctions.route()
        .GET(PREFIX + "/stations", this::list)
        .POST(PREFIX + "/stations", this::create)
        .GET(PREFIX + "/stations/{name}", this::get)
        .PUT(PREFIX + "/stations/{name}", this::update)
        .DELETE(PREFIX + "/stations/{name}", this::delete)
        .GET(PREFIX + "/config", this::getConfig)
        .PUT(PREFIX + "/config", this::saveConfig)
        .build();

    @Override
    public Mono<HandlerFunction<ServerResponse>> route(ServerRequest request) {
        return delegate.route(request);
    }

    private Mono<ServerResponse> list(ServerRequest request) {
        return ServerResponse.ok().body(service.listAll(), run.halo.journeyhome.dto.StationVo.class);
    }

    private Mono<ServerResponse> create(ServerRequest request) {
        return request.bodyToMono(JourneyStation.class)
            .flatMap(service::create)
            .flatMap(vo -> ServerResponse.ok().bodyValue(vo));
    }

    private Mono<ServerResponse> get(ServerRequest request) {
        String name = request.pathVariable("name");
        return service.getByName(name)
            .flatMap(vo -> ServerResponse.ok().bodyValue(vo))
            .switchIfEmpty(ServerResponse.notFound().build());
    }

    private Mono<ServerResponse> update(ServerRequest request) {
        String name = request.pathVariable("name");
        return request.bodyToMono(JourneyStation.class)
            .flatMap(station -> service.update(name, station))
            .flatMap(vo -> ServerResponse.ok().bodyValue(vo))
            .switchIfEmpty(ServerResponse.notFound().build());
    }

    private Mono<ServerResponse> delete(ServerRequest request) {
        String name = request.pathVariable("name");
        return service.delete(name)
            .then(ServerResponse.ok().build())
            .onErrorResume(e -> ServerResponse.notFound().build());
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
}

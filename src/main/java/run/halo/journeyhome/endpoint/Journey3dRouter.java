package run.halo.journeyhome.endpoint;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.server.HandlerFunction;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.reactive.function.server.ServerResponse;
import reactor.core.publisher.Mono;

@Component
public class Journey3dRouter implements RouterFunction<ServerResponse> {
    @Override
    public Mono<HandlerFunction<ServerResponse>> route(ServerRequest request) {
        if (request.method() != HttpMethod.GET) {
            return Mono.empty();
        }
        String path = request.path();
        if (path.equals("/journey-3d") || path.equals("/journey-3d/")) {
            var index = new ClassPathResource("journey-3d/index.html", Journey3dRouter.class.getClassLoader());
            return Mono.just(req -> index.exists()
                ? ServerResponse.ok().contentType(MediaType.TEXT_HTML)
                    .header("X-Content-Type-Options", "nosniff")
                    .header("Cache-Control", "no-cache").bodyValue(index)
                : ServerResponse.notFound().build());
        }
        if (!path.startsWith("/journey-3d/")) {
            return Mono.empty();
        }
        String file = path.substring("/journey-3d/".length());
        if (file.isEmpty()) {
            file = "index.html";
        }
        if (!file.equals("index.html") && !file.equals("favicon.svg")
            && !file.matches("assets/[a-zA-Z0-9_-]+\\.(js|css)")) {
            return Mono.just(req -> ServerResponse.notFound().build());
        }
        var resource = new ClassPathResource("journey-3d/" + file, Journey3dRouter.class.getClassLoader());
        MediaType type = file.endsWith(".js") ? MediaType.parseMediaType("application/javascript")
            : MediaTypeFactory.getMediaType(file).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return Mono.just(req -> resource.exists()
            ? ServerResponse.ok().contentType(type).header("X-Content-Type-Options", "nosniff")
                .header("Cache-Control", "no-cache").bodyValue(resource)
            : ServerResponse.notFound().build());
    }
}

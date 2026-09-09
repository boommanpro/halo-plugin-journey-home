package run.halo.journeyhome;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import run.halo.app.extension.Scheme;
import run.halo.app.extension.SchemeManager;
import run.halo.app.plugin.BasePlugin;
import run.halo.app.plugin.PluginContext;
import run.halo.journeyhome.extension.JourneyStation;
import run.halo.journeyhome.extension.JourneyPageConfig;

@Slf4j
@Component
public class JourneyHomePlugin extends BasePlugin {

    private final SchemeManager schemeManager;

    public JourneyHomePlugin(PluginContext pluginContext, SchemeManager schemeManager) {
        super(pluginContext);
        this.schemeManager = schemeManager;
    }

    @Override
    public void start() {
        schemeManager.register(JourneyStation.class);
        schemeManager.register(JourneyPageConfig.class);
        log.info("[journey-home] 插件启动成功！");
    }

    @Override
    public void stop() {
        schemeManager.unregister(Scheme.buildFromType(JourneyStation.class));
        schemeManager.unregister(Scheme.buildFromType(JourneyPageConfig.class));
        log.info("[journey-home] 插件停止！");
    }
}

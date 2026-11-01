package id.alwination.moon;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.plugin.java.JavaPlugin;

public final class MoonPlayerTitlePlugin extends JavaPlugin implements Listener {
    private final HttpClient http = HttpClient.newHttpClient();
    private String apiUrl = "https://api.alwination.id";

    @Override
    public void onEnable() {
        saveDefaultConfig();
        apiUrl = getConfig().getString("api-url", apiUrl).replaceAll("/+$", "");
        getServer().getPluginManager().registerEvents(this, this);
    }

    @EventHandler
    public void onJoin(PlayerJoinEvent event) {
        getServer().getScheduler().runTaskAsynchronously(this, () -> syncPrefix(event.getPlayer().getUniqueId().toString().replace("-", "")));
    }

    private void syncPrefix(String uuid) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(apiUrl + "/v1/profiles/" + uuid))
                .timeout(java.time.Duration.ofSeconds(10))
                .GET()
                .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) return;
            JsonObject profile = JsonParser.parseString(response.body()).getAsJsonObject();
            String prefix = profile.has("prefix") ? profile.get("prefix").getAsString() : "";
            if (prefix.isEmpty()) return;
            getServer().getScheduler().runTask(this, () ->
                getServer().dispatchCommand(getServer().getConsoleSender(),
                    "lp user " + uuid + " meta setprefix \"" + prefix.replace("\"", "") + "\""));
        } catch (Exception error) {
            getLogger().warning("Moon title sync failed for " + uuid + ": " + error.getMessage());
        }
    }
}

package com.pocketpet;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class PetController {
    private static final String PERSONALITY =
            "You are Mochi, a small, affectionate desktop pet. Reply playfully in one or two short sentences.";

    private final RestClient ollama;
    private final String model;

    PetController(@Value("${ollama.base-url}") String url, @Value("${ollama.model}") String model) {
        var http = java.net.http.HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
        var factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(Duration.ofSeconds(60));
        this.ollama = RestClient.builder().baseUrl(url).requestFactory(factory).build();
        this.model = model;
    }

    @GetMapping("/api/health")
    Map<String, String> health() {
        return Map.of("status", "up");
    }

    @PostMapping(value = "/api/chat", consumes = MediaType.APPLICATION_JSON_VALUE)
    Reply chat(@RequestBody ChatInput input) {
        String text = input.message();
        if (text == null || text.isBlank() || text.length() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message must be 1–500 characters");
        }

        var request = new OllamaRequest(model, false,
                List.of(new Message("system", PERSONALITY), new Message("user", text.strip())));
        OllamaReply response;
        try {
            response = ollama.post().uri("/api/chat").contentType(MediaType.APPLICATION_JSON)
                    .body(request).retrieve().body(OllamaReply.class);
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama request failed", exception);
        }

        if (response == null || response.message() == null || response.message().content() == null
                || response.message().content().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama returned an empty reply");
        }
        return new Reply(response.message().content());
    }

    record ChatInput(String message) {}
    record Reply(String reply) {}
    record Message(String role, String content) {}
    record OllamaRequest(String model, boolean stream, List<Message> messages) {}
    record OllamaReply(Message message) {}
}

package com.pocketpet;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OllamaChatService {
    private static final String PERSONALITY =
            "You are Pochita, a small, affectionate desktop pet. Reply playfully in one or two short sentences.";

    private final RestClient ollama;
    private final String model;

    OllamaChatService(@Value("${ollama.base-url}") String url, @Value("${ollama.model}") String model) {
        var http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
        var factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(Duration.ofSeconds(60));
        this.ollama = RestClient.builder().baseUrl(url).requestFactory(factory).build();
        this.model = model;
    }

    String reply(List<Message> history, String text) {
        return reply(PERSONALITY, history, text, null);
    }

    String plan(String instructions, String text) {
        // The local Qwen model supports JSON mode. Ollama Cloud accepts the prompt without it.
        String format = model.equals("qwen3:4b-instruct") ? "json" : null;
        return reply(instructions, List.of(), text, format);
    }

    private String reply(String instructions, List<Message> history, String text, String format) {
        List<Message> messages = new ArrayList<>(history.size() + 2);
        messages.add(new Message("system", instructions));
        messages.addAll(history);
        messages.add(new Message("user", text));
        var request = new OllamaRequest(model, false, messages, format);
        OllamaReply response;
        try {
            response = ollama.post().uri("/api/chat").contentType(MediaType.APPLICATION_JSON)
                    .body(request).retrieve().body(OllamaReply.class);
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == HttpStatus.PAYMENT_REQUIRED.value()) {
                throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "Ollama Cloud requires usage credits", exception);
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama request failed", exception);
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama request failed", exception);
        }

        if (response == null || response.message() == null || response.message().content() == null
                || response.message().content().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Ollama returned an empty reply");
        }
        return response.message().content();
    }

    record Message(String role, String content) {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record OllamaRequest(String model, boolean stream, List<Message> messages, String format) {}
    record OllamaReply(Message message) {}
}

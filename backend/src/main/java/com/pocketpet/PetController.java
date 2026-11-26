package com.pocketpet;

import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PetController {
    private final PetService pets;
    private final OllamaChatService chat;

    public PetController(PetService pets, OllamaChatService chat) {
        this.pets = pets;
        this.chat = chat;
    }

    @GetMapping("/api/health")
    Map<String, String> health() {
        return Map.of("status", "up");
    }

    @GetMapping("/api/pet")
    Pet getPet() {
        return pets.getPet();
    }

    @PostMapping("/api/pet/actions")
    Pet care(@Valid @RequestBody PetActionRequest request) {
        return pets.care(request.action());
    }

    @PostMapping(value = "/api/chat", consumes = MediaType.APPLICATION_JSON_VALUE)
    Reply chat(@Valid @RequestBody ChatInput input) {
        return new Reply(chat.reply(List.of(), input.message().strip()));
    }

    public record PetActionRequest(@NotNull PetService.Action action) {}
    public record ChatInput(@NotBlank @Size(max = 500) String message) {}
    record Reply(String reply) {}
}

package com.pocketpet;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/chat/threads")
public class ChatThreadController {
    private final ChatThreadRepository threads;
    private final ChatMessageRepository messages;
    private final ChatHistoryService history;
    private final OllamaChatService ollama;

    public ChatThreadController(ChatThreadRepository threads, ChatMessageRepository messages,
                                ChatHistoryService history, OllamaChatService ollama) {
        this.threads = threads;
        this.messages = messages;
        this.history = history;
        this.ollama = ollama;
    }

    @GetMapping
    public List<ChatThread> list() {
        return threads.findAllByOrderByUpdatedAtDescIdDesc();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChatThread> get(@PathVariable Integer id) {
        return ResponseEntity.of(threads.findById(id));
    }

    @PostMapping
    public ResponseEntity<ChatThread> create(@Valid @RequestBody SaveThreadRequest request) {
        ChatThread saved = threads.save(new ChatThread(PetService.PET_ID, cleanTitle(request.title()), Instant.now()));
        return ResponseEntity.created(URI.create("/api/chat/threads/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    @Transactional
    public ChatThread rename(@PathVariable Integer id, @Valid @RequestBody SaveThreadRequest request) {
        ChatThread thread = history.lockThread(id);
        thread.rename(cleanTitle(request.title()), Instant.now());
        return thread;
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        threads.delete(history.lockThread(id));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/messages")
    public List<ChatMessage> getMessages(@PathVariable Integer id) {
        requireThread(id);
        return messages.findByThreadIdOrderByIdAsc(id);
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<ChatHistoryService.Exchange> sendMessage(
            @PathVariable Integer id, @Valid @RequestBody SendMessageRequest request) {
        requireThread(id);
        List<ChatMessage> recent = messages.findTop20ByThreadIdOrderByIdDesc(id);
        Integer previousId = recent.isEmpty() ? null : recent.getFirst().getId();
        List<OllamaChatService.Message> context = recent.reversed().stream()
                .map(message -> new OllamaChatService.Message(
                        message.getRole().name().toLowerCase(Locale.ROOT), message.getContent()))
                .toList();

        String text = request.message().strip();
        String reply = ollama.reply(context, text);
        return ResponseEntity.status(HttpStatus.CREATED).body(history.saveExchange(id, previousId, text, reply));
    }

    private void requireThread(Integer id) {
        if (!threads.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat thread not found");
        }
    }

    private String cleanTitle(String title) {
        return title == null || title.isBlank() ? null : title.strip();
    }

    public record SaveThreadRequest(@Size(max = 120) String title) {}
    public record SendMessageRequest(@NotBlank @Size(max = 500) String message) {}
}

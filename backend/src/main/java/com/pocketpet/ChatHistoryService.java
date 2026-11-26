package com.pocketpet;

import java.time.Instant;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ChatHistoryService {
    private final ChatThreadRepository threads;
    private final ChatMessageRepository messages;

    public ChatHistoryService(ChatThreadRepository threads, ChatMessageRepository messages) {
        this.threads = threads;
        this.messages = messages;
    }

    @Transactional
    public Exchange saveExchange(Integer threadId, Integer previousMessageId, String text, String reply) {
        ChatThread thread = lockThread(threadId);
        Integer latestId = messages.findFirstByThreadIdOrderByIdDesc(threadId).map(ChatMessage::getId).orElse(null);
        if (!Objects.equals(previousMessageId, latestId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The conversation changed. Send your message again.");
        }

        Instant now = Instant.now();
        ChatMessage user = messages.save(new ChatMessage(threadId, ChatMessage.Role.USER, text, now));
        ChatMessage assistant = messages.save(new ChatMessage(threadId, ChatMessage.Role.ASSISTANT, reply, now));
        thread.touch(now);
        return new Exchange(user, assistant);
    }

    ChatThread lockThread(Integer id) {
        return threads.findThreadById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat thread not found"));
    }

    public record Exchange(ChatMessage user, ChatMessage assistant) {}
}

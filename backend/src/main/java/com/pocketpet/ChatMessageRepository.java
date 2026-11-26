package com.pocketpet;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Integer> {
    List<ChatMessage> findByThreadIdOrderByIdAsc(Integer threadId);

    List<ChatMessage> findTop20ByThreadIdOrderByIdDesc(Integer threadId);

    Optional<ChatMessage> findFirstByThreadIdOrderByIdDesc(Integer threadId);
}

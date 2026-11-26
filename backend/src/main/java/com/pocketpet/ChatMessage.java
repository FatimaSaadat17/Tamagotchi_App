package com.pocketpet;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "chat_messages")
public class ChatMessage {
    public enum Role {
        USER, ASSISTANT
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, updatable = false)
    private Integer threadId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 10)
    private Role role;

    @Column(nullable = false, updatable = false, columnDefinition = "text")
    private String content;

    @Column(nullable = false, updatable = false)
    private Instant sentAt;

    protected ChatMessage() {
    }

    ChatMessage(Integer threadId, Role role, String content, Instant sentAt) {
        this.threadId = threadId;
        this.role = role;
        this.content = content;
        this.sentAt = sentAt;
    }

    public Integer getId() { return id; }
    public Integer getThreadId() { return threadId; }
    public Role getRole() { return role; }
    public String getContent() { return content; }
    public Instant getSentAt() { return sentAt; }
}

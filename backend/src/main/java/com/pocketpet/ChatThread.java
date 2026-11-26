package com.pocketpet;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "chat_threads")
public class ChatThread {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, updatable = false)
    private Integer petId;

    @Column(length = 120)
    private String title;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected ChatThread() {
    }

    ChatThread(Integer petId, String title, Instant createdAt) {
        this.petId = petId;
        this.title = title;
        this.createdAt = createdAt;
        this.updatedAt = createdAt;
    }

    void rename(String title, Instant now) {
        this.title = title;
        touch(now);
    }

    void touch(Instant now) {
        updatedAt = now;
    }

    public Integer getId() { return id; }
    public Integer getPetId() { return petId; }
    public String getTitle() { return title; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}

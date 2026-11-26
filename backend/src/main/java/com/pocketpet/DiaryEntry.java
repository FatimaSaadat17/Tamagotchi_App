package com.pocketpet;

import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "diary_entries")
public class DiaryEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "entry_date", nullable = false, updatable = false)
    private LocalDate entryDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private DiaryMood mood;

    @Column(length = 120)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String body;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected DiaryEntry() {
    }

    void replaceContent(DiaryMood mood, String title, String body, Instant updatedAt) {
        this.mood = mood;
        this.title = title;
        this.body = body;
        this.updatedAt = updatedAt;
    }

    public Integer getId() {
        return id;
    }

    public LocalDate getEntryDate() {
        return entryDate;
    }

    public DiaryMood getMood() {
        return mood;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}

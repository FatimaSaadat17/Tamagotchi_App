package com.pocketpet;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "calendar_events")
public class CalendarEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false)
    private Instant startsAt;

    @Column(nullable = false)
    private Instant endsAt;

    @Column(nullable = false, length = 80)
    private String timeZone;

    @Column(nullable = false)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    private TaskPriority priority;

    @Column(nullable = false)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    private TaskImportance importance;

    @Column(length = 1000)
    private String notes;

    protected CalendarEvent() {
    }

    void replace(String title, Instant startsAt, Instant endsAt, String timeZone,
                 TaskPriority priority, TaskImportance importance, String notes) {
        this.title = title;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.timeZone = timeZone;
        this.priority = priority;
        this.importance = importance;
        this.notes = notes;
    }

    public Integer getId() { return id; }
    public String getTitle() { return title; }
    public Instant getStartsAt() { return startsAt; }
    public Instant getEndsAt() { return endsAt; }
    public String getTimeZone() { return timeZone; }
    public TaskPriority getPriority() { return priority; }
    public TaskImportance getImportance() { return importance; }
    public String getNotes() { return notes; }
}

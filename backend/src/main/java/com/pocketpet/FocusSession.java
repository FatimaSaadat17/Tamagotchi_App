package com.pocketpet;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "focus_sessions")
public class FocusSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, updatable = false)
    private Integer petId;

    @Column(updatable = false)
    private Integer taskId;

    @Column(nullable = false, updatable = false)
    private Instant startedAt;

    private Instant endedAt;

    @Column(nullable = false, updatable = false)
    private int plannedMinutes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private FocusSessionStatus status;

    @Column(nullable = false)
    private int applesAwarded;

    protected FocusSession() {
    }

    FocusSession(Integer petId, Integer taskId, int plannedMinutes, Instant startedAt) {
        this.petId = petId;
        this.taskId = taskId;
        this.plannedMinutes = plannedMinutes;
        this.startedAt = startedAt;
        this.status = FocusSessionStatus.RUNNING;
    }

    boolean isReadyToComplete(Instant now) {
        return !now.isBefore(startedAt.plus(plannedMinutes, ChronoUnit.MINUTES));
    }

    void complete(Instant now) {
        endedAt = now;
        status = FocusSessionStatus.COMPLETED;
        applesAwarded = 1;
    }

    void cancel(Instant now) {
        endedAt = now.isBefore(startedAt) ? startedAt : now;
        status = FocusSessionStatus.CANCELLED;
    }

    public Integer getId() { return id; }
    public Integer getPetId() { return petId; }
    public Integer getTaskId() { return taskId; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getEndedAt() { return endedAt; }
    public int getPlannedMinutes() { return plannedMinutes; }
    public FocusSessionStatus getStatus() { return status; }
    public int getApplesAwarded() { return applesAwarded; }
}

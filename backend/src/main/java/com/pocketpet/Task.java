package com.pocketpet;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;

@Entity
@Table(name = "tasks")
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "title", nullable=false, length=100)
    private String title;

    @Column(name = "planned_date", nullable=false)
    private LocalDate plannedDate;

    @Column(name = "estimated_minutes", nullable=false)
    @Min(0)
    private Integer estimatedMinutes;

    @Column(name = "status", nullable=false)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    private TaskStatus status;

    @Column(name = "priority", nullable=false)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    private TaskPriority priority;

    @Column(name = "importance", nullable=false)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    private TaskImportance importance;

    public Task() {
    }

    public Task(String title, LocalDate plannedDate, Integer estimatedMinutes,
                TaskStatus status, TaskPriority priority, TaskImportance importance) {
        this.title = title;
        this.plannedDate = plannedDate;
        this.estimatedMinutes = estimatedMinutes;
        this.status = status;
        this.priority = priority;
        this.importance = importance;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public LocalDate getPlannedDate() {
        return plannedDate;
    }

    public void setPlannedDate(LocalDate plannedDate) {
        this.plannedDate = plannedDate;
    }

    public Integer getEstimatedMinutes() {
        return estimatedMinutes;
    }

    public void setEstimatedMinutes(Integer estimatedMinutes) {
        this.estimatedMinutes = estimatedMinutes;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public void setStatus(TaskStatus status) {
        this.status = status;
    }

    public TaskPriority getPriority() {
        return priority;
    }

    public void setPriority(TaskPriority priority) {
        this.priority = priority;
    }

    public TaskImportance getImportance() {
        return importance;
    }

    public void setImportance(TaskImportance importance) {
        this.importance = importance;
    }
}

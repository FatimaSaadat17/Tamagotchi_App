package com.pocketpet;

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
@Table(name = "goals")
public class Goal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 120)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private GoalPeriod period;

    @Column(nullable = false)
    private int target;

    @Column(nullable = false)
    private int progress;

    private LocalDate dueDate;

    protected Goal() {
    }

    void replace(String title, GoalPeriod period, int target, int progress, LocalDate dueDate) {
        this.title = title;
        this.period = period;
        this.target = target;
        this.progress = progress;
        this.dueDate = dueDate;
    }

    void updateProgress(int progress) {
        this.progress = progress;
    }

    public Integer getId() { return id; }
    public String getTitle() { return title; }
    public GoalPeriod getPeriod() { return period; }
    public int getTarget() { return target; }
    public int getProgress() { return progress; }
    public LocalDate getDueDate() { return dueDate; }
}

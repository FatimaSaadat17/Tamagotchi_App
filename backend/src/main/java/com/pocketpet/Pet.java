package com.pocketpet;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Entity
@Table(name = "pets")
public class Pet {
    private static final Duration AWAKE_TIME = Duration.ofHours(4);
    private static final Duration NAP_TIME = Duration.ofMinutes(20);
    private static final Duration SLEEP_CYCLE = AWAKE_TIME.plus(NAP_TIME);

    @Id
    private Integer id;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false)
    private int fullness;

    @Column(nullable = false)
    private int health;

    @Column(nullable = false)
    private int happiness;

    @Column(nullable = false)
    private int apples;

    @Column(nullable = false)
    private boolean sick;

    @Column(nullable = false)
    private Instant hungerAt;

    @Column(nullable = false)
    private Instant napAt;

    protected Pet() {
    }

    void updateCare(Instant now) {
        updateHunger(now);
        Instant wakeAt = napAt.plus(NAP_TIME);
        if (now.isBefore(wakeAt)) return;

        long naps = 1 + Duration.between(wakeAt, now).dividedBy(SLEEP_CYCLE);
        napAt = napAt.plus(SLEEP_CYCLE.multipliedBy(naps));
        if (!sick) health = (int) Math.min(5, health + naps);
    }

    private void updateHunger(Instant now) {
        long elapsed = Duration.between(hungerAt, now).toHours() / 2;
        if (elapsed < 1 || fullness == 0) return;

        fullness = (int) Math.max(0, fullness - elapsed);
        hungerAt = hungerAt.plus(elapsed * 2, ChronoUnit.HOURS);
        if (fullness == 0) {
            sick = true;
            health = Math.min(health, 3);
        }
    }

    void feed(Instant now) {
        if (fullness == 5) throw new ResponseStatusException(HttpStatus.CONFLICT, "Pochita is full");
        if (apples == 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "No apples available");
        fullness++;
        apples--;
        hungerAt = now;
    }

    void inject() {
        if (sick) {
            sick = false;
            health = 5;
        }
    }

    boolean sleepingAt(Instant now) {
        return !sick && !now.isBefore(napAt) && now.isBefore(napAt.plus(NAP_TIME));
    }

    void rest(Instant now) {
        if (!sick) napAt = sleepingAt(now) ? now.plus(AWAKE_TIME) : now;
    }

    void play() {
        happiness = Math.min(5, happiness + 1);
    }

    void awardApple() {
        apples++;
    }

    public Integer getId() { return id; }
    public String getName() { return name; }
    public int getFullness() { return fullness; }
    public int getHealth() { return health; }
    public int getHappiness() { return happiness; }
    public int getApples() { return apples; }
    public boolean isSick() { return sick; }
    public boolean isSleeping() { return sleepingAt(Instant.now()); }
    public Instant getHungerAt() { return hungerAt; }
}

package com.pocketpet;

import java.net.URI;
import java.time.Instant;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/focus-sessions")
public class FocusSessionController {
    private final FocusSessionRepository sessions;
    private final TaskRepository tasks;
    private final PetService pets;

    public FocusSessionController(FocusSessionRepository sessions, TaskRepository tasks, PetService pets) {
        this.sessions = sessions;
        this.tasks = tasks;
        this.pets = pets;
    }

    @GetMapping
    public List<FocusSession> list(@RequestParam(required = false) Integer taskId) {
        return taskId == null ? sessions.findAllByOrderByIdDesc() : sessions.findByTaskIdOrderByIdDesc(taskId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FocusSession> get(@PathVariable Integer id) {
        return ResponseEntity.of(sessions.findById(id));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<FocusSession> start(@Valid @RequestBody StartFocusRequest request) {
        if (request.taskId() != null) {
            tasks.findTaskById(request.taskId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        }
        Pet pet = pets.lockPet();
        if (sessions.existsByPetIdAndStatus(pet.getId(), FocusSessionStatus.RUNNING)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A focus session is already running");
        }
        FocusSession saved = sessions.save(
                new FocusSession(pet.getId(), request.taskId(), request.plannedMinutes(), Instant.now()));
        return ResponseEntity.created(URI.create("/api/focus-sessions/" + saved.getId())).body(saved);
    }

    @PostMapping("/{id}/complete")
    @Transactional
    public FocusSession complete(@PathVariable Integer id) {
        FocusSession session = requireSession(id);
        if (session.getStatus() == FocusSessionStatus.COMPLETED) return session;
        if (session.getStatus() == FocusSessionStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This focus session was cancelled");
        }
        Instant now = Instant.now();
        if (!session.isReadyToComplete(now)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The planned focus time has not elapsed");
        }
        pets.lockPet().awardApple();
        session.complete(now);
        return session;
    }

    @PostMapping("/{id}/cancel")
    @Transactional
    public FocusSession cancel(@PathVariable Integer id) {
        FocusSession session = requireSession(id);
        if (session.getStatus() == FocusSessionStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This focus session is already complete");
        }
        if (session.getStatus() == FocusSessionStatus.RUNNING) session.cancel(Instant.now());
        return session;
    }

    private FocusSession requireSession(Integer id) {
        return sessions.findSessionById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Focus session not found"));
    }

    public record StartFocusRequest(Integer taskId, @NotNull @Min(1) @Max(60) Integer plannedMinutes) {}
}

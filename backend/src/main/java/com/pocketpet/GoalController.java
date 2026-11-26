package com.pocketpet;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/goals")
public class GoalController {
    private final GoalRepository repository;

    public GoalController(GoalRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Goal> list() {
        return repository.findAllByOrderByIdAsc();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Goal> get(@PathVariable Integer id) {
        return ResponseEntity.of(repository.findById(id));
    }

    @PostMapping
    public ResponseEntity<Goal> create(@Valid @RequestBody SaveGoalRequest request) {
        Goal goal = new Goal();
        apply(goal, request);
        Goal saved = repository.save(goal);
        return ResponseEntity.created(URI.create("/api/goals/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    @Transactional
    public Goal replace(@PathVariable Integer id, @Valid @RequestBody SaveGoalRequest request) {
        Goal goal = requireGoal(id);
        apply(goal, request);
        return goal;
    }

    @PatchMapping("/{id}")
    @Transactional
    public Goal updateProgress(@PathVariable Integer id, @Valid @RequestBody UpdateProgressRequest request) {
        Goal goal = requireGoal(id);
        checkProgress(request.progress(), goal.getTarget());
        goal.updateProgress(request.progress());
        return goal;
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        repository.delete(requireGoal(id));
        return ResponseEntity.noContent().build();
    }

    private Goal requireGoal(Integer id) {
        return repository.findGoalById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Goal not found"));
    }

    private void apply(Goal goal, SaveGoalRequest request) {
        int progress = request.progress() == null ? 0 : request.progress();
        checkProgress(progress, request.target());
        goal.replace(request.title().strip(), request.period(), request.target(), progress, request.dueDate());
    }

    private void checkProgress(int progress, int target) {
        if (progress > target) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Progress must not exceed the target");
        }
    }

    public record SaveGoalRequest(
            @NotBlank @Size(max = 120) String title,
            @NotNull GoalPeriod period,
            @NotNull @Min(1) Integer target,
            @Min(0) Integer progress,
            LocalDate dueDate) {
    }

    public record UpdateProgressRequest(@NotNull @Min(0) Integer progress) {}
}

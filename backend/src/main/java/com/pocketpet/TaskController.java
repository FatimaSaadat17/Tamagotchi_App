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
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskRepository taskRepository;

    public TaskController(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @GetMapping
    public List<Task> getTasks() {
        return taskRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> getTask(@PathVariable Integer id) {
        return ResponseEntity.of(taskRepository.findById(id));
    }

    @PostMapping
    public ResponseEntity<Task> createTask(@Valid @RequestBody CreateTaskRequest request) {
        Task task = new Task(
                request.title().strip(),
                request.plannedDate(),
                request.estimatedMinutes(),
                TaskStatus.OPEN,
                request.priority() == null ? TaskPriority.HIGH : request.priority(),
                request.importance() == null ? TaskImportance.IMPORTANT : request.importance());

        Task savedTask = taskRepository.save(task);
        return ResponseEntity.created(URI.create("/api/tasks/" + savedTask.getId())).body(savedTask);
    }

    @PutMapping("/{id}")
    @Transactional
    public Task replaceTask(@PathVariable Integer id, @Valid @RequestBody ReplaceTaskRequest request) {
        Task task = requireTask(id);
        task.setTitle(request.title().strip());
        task.setPlannedDate(request.plannedDate());
        task.setEstimatedMinutes(request.estimatedMinutes());
        task.setStatus(request.status());
        task.setPriority(request.priority());
        task.setImportance(request.importance());
        return task;
    }

    @PatchMapping("/{id}")
    @Transactional
    public Task updateTask(@PathVariable Integer id, @Valid @RequestBody UpdateTaskRequest request) {
        if (request.title() != null && request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Task title must not be blank");
        }
        Task task = requireTask(id);
        if (request.title() != null) task.setTitle(request.title().strip());
        if (request.plannedDate() != null) task.setPlannedDate(request.plannedDate());
        if (request.estimatedMinutes() != null) task.setEstimatedMinutes(request.estimatedMinutes());
        if (request.status() != null) task.setStatus(request.status());
        if (request.priority() != null) task.setPriority(request.priority());
        if (request.importance() != null) task.setImportance(request.importance());
        return task;
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteTask(@PathVariable Integer id) {
        taskRepository.delete(requireTask(id));
        return ResponseEntity.noContent().build();
    }

    private Task requireTask(Integer id) {
        return taskRepository.findTaskById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
    }

    public record CreateTaskRequest(
            @NotBlank @Size(max = 100) String title,
            @NotNull LocalDate plannedDate,
            @NotNull @Min(1) Integer estimatedMinutes,
            TaskPriority priority,
            TaskImportance importance) {
    }

    public record ReplaceTaskRequest(
            @NotBlank @Size(max = 100) String title,
            @NotNull LocalDate plannedDate,
            @NotNull @Min(1) Integer estimatedMinutes,
            @NotNull TaskStatus status,
            @NotNull TaskPriority priority,
            @NotNull TaskImportance importance) {
    }

    public record UpdateTaskRequest(
            @Size(max = 100) String title,
            LocalDate plannedDate,
            @Min(1) Integer estimatedMinutes,
            TaskStatus status,
            TaskPriority priority,
            TaskImportance importance) {
    }
}

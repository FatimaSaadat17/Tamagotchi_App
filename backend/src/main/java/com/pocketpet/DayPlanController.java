package com.pocketpet;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DayPlanController {
    private final DayPlanner planner;

    public DayPlanController(DayPlanner planner) {
        this.planner = planner;
    }

    @PostMapping("/api/day-plans/suggest")
    public Plan suggest(@Valid @RequestBody PlanRequest request) {
        return planner.suggest(request);
    }

    public record PlanRequest(
            @NotNull LocalDate date,
            @NotNull @Min(0) @Max(1439) Integer start,
            @NotNull @Min(1) @Max(1440) Integer end,
            @NotNull @Size(max = 40) List<@NotNull @Valid PlanTask> tasks,
            @NotNull @Size(max = 40) List<@NotNull @Valid FixedEvent> events,
            @Size(max = 500) String preference,
            @Min(1) @Max(60) Integer focusMinutes) {}

    public record PlanTask(
            @NotBlank @Size(max = 80) String id,
            @NotBlank @Size(max = 120) String title,
            @NotNull @Min(1) @Max(1440) Integer minutes,
            @NotNull TaskPriority priority,
            @NotNull TaskImportance importance) {}

    public record FixedEvent(
            @NotBlank @Size(max = 80) String id,
            @NotBlank @Size(max = 120) String title,
            @NotNull @Min(0) @Max(1439) Integer from,
            @NotNull @Min(1) @Max(1440) Integer to) {}

    public enum BlockType { TASK, BREAK, EVENT }

    public record Block(BlockType type, String itemId, int from, int to) {}

    public record Plan(String summary, List<String> highlights, List<Block> blocks, List<String> unscheduledTaskIds) {}
}

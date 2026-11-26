package com.pocketpet;

import java.net.URI;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/events")
public class CalendarEventController {
    private final CalendarEventRepository repository;

    public CalendarEventController(CalendarEventRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<CalendarEvent> list(@RequestParam(required = false) Instant from,
                                    @RequestParam(required = false) Instant to) {
        if (from == null && to == null) return repository.findAllByOrderByStartsAtAscIdAsc();
        if (from == null || to == null || !to.isAfter(from)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Supply from and to with from before to");
        }
        return repository.findByStartsAtLessThanAndEndsAtGreaterThanOrderByStartsAtAscIdAsc(to, from);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CalendarEvent> get(@PathVariable Integer id) {
        return ResponseEntity.of(repository.findById(id));
    }

    @PostMapping
    public ResponseEntity<CalendarEvent> create(@Valid @RequestBody SaveEventRequest request) {
        CalendarEvent event = new CalendarEvent();
        apply(event, request);
        CalendarEvent saved = repository.save(event);
        return ResponseEntity.created(URI.create("/api/events/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    @Transactional
    public CalendarEvent replace(@PathVariable Integer id, @Valid @RequestBody SaveEventRequest request) {
        CalendarEvent event = requireEvent(id);
        apply(event, request);
        return event;
    }

    @PatchMapping("/{id}")
    @Transactional
    public CalendarEvent update(@PathVariable Integer id, @Valid @RequestBody UpdateEventRequest request) {
        CalendarEvent event = requireEvent(id);
        apply(event, new SaveEventRequest(
                request.title() == null ? event.getTitle() : request.title(),
                request.startsAt() == null ? event.getStartsAt() : request.startsAt(),
                request.endsAt() == null ? event.getEndsAt() : request.endsAt(),
                request.timeZone() == null ? event.getTimeZone() : request.timeZone(),
                request.priority() == null ? event.getPriority() : request.priority(),
                request.importance() == null ? event.getImportance() : request.importance(),
                request.notes() == null ? event.getNotes() : request.notes()));
        return event;
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        repository.delete(requireEvent(id));
        return ResponseEntity.noContent().build();
    }

    private CalendarEvent requireEvent(Integer id) {
        return repository.findEventById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
    }

    private void apply(CalendarEvent event, SaveEventRequest request) {
        if (request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event title must not be blank");
        }
        if (!request.endsAt().isAfter(request.startsAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event end must be after start");
        }
        String timeZone;
        try {
            timeZone = ZoneId.of(request.timeZone()).getId();
        } catch (DateTimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid event time zone", exception);
        }
        event.replace(request.title().strip(), request.startsAt(), request.endsAt(), timeZone,
                request.priority() == null ? TaskPriority.MEDIUM : request.priority(),
                request.importance() == null ? TaskImportance.IMPORTANT : request.importance(), request.notes());
    }

    public record SaveEventRequest(
            @NotBlank @Size(max = 120) String title,
            @NotNull Instant startsAt,
            @NotNull Instant endsAt,
            @NotBlank @Size(max = 80) String timeZone,
            TaskPriority priority,
            TaskImportance importance,
            @Size(max = 1000) String notes) {
    }

    public record UpdateEventRequest(
            @Size(max = 120) String title,
            Instant startsAt,
            Instant endsAt,
            @Size(max = 80) String timeZone,
            TaskPriority priority,
            TaskImportance importance,
            @Size(max = 1000) String notes) {
    }
}

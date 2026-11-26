package com.pocketpet;

import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/diary-entries")
public class DiaryEntryController {
    private final DiaryEntryRepository repository;

    public DiaryEntryController(DiaryEntryRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<DiaryEntry> getEntries() {
        return repository.findAllByOrderByEntryDateDesc();
    }

    @GetMapping("/{date}")
    public ResponseEntity<DiaryEntry> getEntry(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.of(repository.findByEntryDate(date));
    }

    @PutMapping("/{date}")
    @Transactional
    public ResponseEntity<DiaryEntry> saveEntry(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Valid @RequestBody SaveDiaryEntryRequest request) {
        String title = request.title().strip();
        String mood = request.mood() == null ? null : request.mood().name();
        boolean created = repository.insertIfAbsent(date, mood, title, request.body()) == 1;
        DiaryEntry entry = repository.findEntryByEntryDate(date)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "The diary entry changed during this request. Try saving again."));

        if (created) {
            return ResponseEntity.created(URI.create("/api/diary-entries/" + date)).body(entry);
        }

        entry.replaceContent(request.mood(), title, request.body(), Instant.now());
        return ResponseEntity.ok(entry);
    }

    @DeleteMapping("/{date}")
    @Transactional
    public ResponseEntity<Void> deleteEntry(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        DiaryEntry entry = repository.findEntryByEntryDate(date)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Diary entry not found"));
        repository.delete(entry);
        return ResponseEntity.noContent().build();
    }

    public record SaveDiaryEntryRequest(DiaryMood mood, @NotBlank @Size(max = 120) String title, @NotBlank String body) {
    }
}

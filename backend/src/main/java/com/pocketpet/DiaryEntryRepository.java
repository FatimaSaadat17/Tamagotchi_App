package com.pocketpet;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DiaryEntryRepository extends JpaRepository<DiaryEntry, Integer> {
    List<DiaryEntry> findAllByOrderByEntryDateDesc();

    Optional<DiaryEntry> findByEntryDate(LocalDate entryDate);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<DiaryEntry> findEntryByEntryDate(LocalDate entryDate);

    @Modifying
    @Query(value = """
            INSERT INTO diary_entries (entry_date, mood, title, body)
            VALUES (:entryDate, :mood, :title, :body)
            ON CONFLICT (entry_date) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("entryDate") LocalDate entryDate, @Param("mood") String mood,
                       @Param("title") String title, @Param("body") String body);
}

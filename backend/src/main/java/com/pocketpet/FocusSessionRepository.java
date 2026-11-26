package com.pocketpet;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface FocusSessionRepository extends JpaRepository<FocusSession, Integer> {
    List<FocusSession> findAllByOrderByIdDesc();

    List<FocusSession> findByTaskIdOrderByIdDesc(Integer taskId);

    boolean existsByPetIdAndStatus(Integer petId, FocusSessionStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<FocusSession> findSessionById(Integer id);
}

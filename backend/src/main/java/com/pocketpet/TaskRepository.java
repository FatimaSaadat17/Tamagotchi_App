package com.pocketpet;

import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface TaskRepository extends JpaRepository<Task, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Task> findTaskById(Integer id);
}

package com.pocketpet;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface GoalRepository extends JpaRepository<Goal, Integer> {
    List<Goal> findAllByOrderByIdAsc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Goal> findGoalById(Integer id);
}

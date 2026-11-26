package com.pocketpet;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface ChatThreadRepository extends JpaRepository<ChatThread, Integer> {
    List<ChatThread> findAllByOrderByUpdatedAtDescIdDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ChatThread> findThreadById(Integer id);
}

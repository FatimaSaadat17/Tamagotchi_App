package com.pocketpet;

import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface PetRepository extends JpaRepository<Pet, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Pet> findPetById(Integer id);
}

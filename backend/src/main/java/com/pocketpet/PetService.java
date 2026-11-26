package com.pocketpet;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PetService {
    static final int PET_ID = 1;

    private final PetRepository repository;

    public PetService(PetRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public Pet getPet() {
        Pet pet = lockPet();
        pet.updateCare(Instant.now());
        return pet;
    }

    @Transactional
    public Pet care(Action action) {
        Pet pet = lockPet();
        Instant now = Instant.now();
        pet.updateCare(now);
        if (action != Action.REST && pet.sleepingAt(now)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Pochita is asleep. Wake him first.");
        }
        switch (action) {
            case FEED -> pet.feed(now);
            case INJECT -> pet.inject();
            case REST -> pet.rest(now);
            case PLAY -> pet.play();
        }
        return pet;
    }

    Pet lockPet() {
        return repository.findPetById(PET_ID)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pet not found"));
    }

    public enum Action {
        FEED, INJECT, REST, PLAY
    }
}

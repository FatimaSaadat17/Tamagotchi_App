package com.pocketpet;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.web.context.WebServerApplicationContext;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
class DesktopReady {
    private final String portFile;

    DesktopReady(@Value("${POCKET_PET_PORT_FILE:}") String portFile) {
        this.portFile = portFile;
    }

    @EventListener
    void publishPort(ApplicationReadyEvent event) throws IOException {
        if (portFile.isBlank()) return;

        var context = (WebServerApplicationContext) event.getApplicationContext();
        Files.writeString(Path.of(portFile), Integer.toString(context.getWebServer().getPort()));
    }
}

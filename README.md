# Pocket Pet

The project contains an Electron shell, a Java 21 Spring Boot API, and Ollama. The default `gemma4:cloud` model sends chat prompts to Ollama Cloud for inference. [Ollama Cloud model setup](https://docs.ollama.com/cloud/models)

## Run the backend with Maven

Install JDK 21 and start Docker. From the project root, stop the containerized backend if it is running on port 8080, then start Ollama:

```sh
docker compose stop backend
docker compose up -d --wait ollama
cd backend
./mvnw spring-boot:run
```

The Maven Wrapper downloads Maven on first use. On Windows, use `mvnw.cmd spring-boot:run` from the `backend` directory. Maven resolves project dependencies and starts Spring Boot. Spring injects the application's dependencies and configuration at runtime. The backend connects to Docker's Ollama on `127.0.0.1:11435`.

From another terminal, check the backend:

```sh
curl -fsS http://127.0.0.1:8080/api/health
```

To enable cloud chat, sign in from the Ollama container and follow the URL it prints:

```sh
docker compose exec ollama ollama signin
```

The Docker volume preserves sign-in across container restarts. For local inference, pull a model with `docker compose exec ollama ollama pull llama3.2:1b`, then run `OLLAMA_MODEL=llama3.2:1b ./mvnw spring-boot:run` from `backend`.

Stop Spring Boot with Ctrl+C and stop the container with `docker compose down`. To run both services in Docker instead, run `docker compose up --build --wait` after stopping Maven. For that mode, set `OLLAMA_MODEL` in a root `.env` file to change models.

## Run the Tamagotchi frontend

The React frontend includes Focus, Diary, Calendar, To-do List, AI Day Schedule, and Edit Event. It saves pet care, tasks, diary entries, goals, and events locally. The chat and day schedule use local demo logic.

```sh
npm ci
npm run dev
```

To launch the desktop app from the project directory:

```sh
npm run build
npm start
```

`npm run package` builds the frontend and packages the desktop app.

Electron opens a compact, resizable Focus window at the bottom-right of the display where your pointer is located.

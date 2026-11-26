# Pocket Pet

The project contains an Electron shell, a Java 21 Spring Boot API, and Ollama. Chat and day planning default to `qwen3:4b-instruct`, which runs locally in the Ollama container. [Qwen3 4B Instruct](https://ollama.com/library/qwen3:4b-instruct)

## Run the backend with Maven

Install JDK 21 and start PostgreSQL. For the first Liquibase run, create an empty database such as `tamagotchi_dev`. Set `SPRING_DATASOURCE_URL` to `jdbc:postgresql://127.0.0.1:5432/tamagotchi_dev` and set `SPRING_DATASOURCE_USERNAME` and `SPRING_DATASOURCE_PASSWORD` to your local database credentials in the environment that launches Spring Boot.

Liquibase applies `backend/src/main/resources/db/changelog/db.changelog-master.yaml` on startup and records the migration in `databasechangelog`. Hibernate validates the resulting schema. Use an empty database for this first migration if you already created `tasks` by hand in another database.

Start Docker if you want chat and day planning. From the project root, stop the containerized backend if it is running on port 8080, start Ollama, and pull its model once:

```sh
docker compose stop backend
docker compose up -d --wait ollama
docker compose exec ollama ollama pull qwen3:4b-instruct
cd backend
./mvnw spring-boot:run
```

The Maven Wrapper downloads Maven on first use. On Windows, use `mvnw.cmd spring-boot:run` from the `backend` directory. Maven resolves project dependencies and starts Spring Boot. Spring injects the application's dependencies and configuration at runtime. The backend connects to Docker's Ollama on `127.0.0.1:11435`.

From another terminal, check the backend:

```sh
curl -fsS http://127.0.0.1:8080/api/health
```

For Ollama Cloud, set `OLLAMA_MODEL` to your chosen cloud tag before starting Spring Boot. Sign in from the Ollama container and follow the URL it prints:

```sh
docker compose exec ollama ollama signin
```

The Docker volume preserves downloaded models and Ollama sign-in across container restarts. To switch to a different local model, pull it and set `OLLAMA_MODEL` to its tag before starting Spring Boot.

Stop Spring Boot with Ctrl+C and stop the container with `docker compose down`. A containerized backend also needs PostgreSQL connection settings and a database host reachable from inside the container.

### Backend API

| Resource | Routes and request fields |
| --- | --- |
| Tasks | List or create at `/api/tasks`. Read, replace, patch, or delete at `/api/tasks/{id}`. |
| Diary | List at `/api/diary-entries`. Read, save, or delete at `/api/diary-entries/{date}` using an ISO date. Saving requires a title and body. |
| Calendar | List or create at `/api/events`. Read, replace, patch, or delete at `/api/events/{id}`. Create with `title`, `startsAt`, `endsAt`, and `timeZone`. Pass ISO timestamps as both `from` and `to` to list overlapping events. |
| Goals | List or create at `/api/goals`. Read, replace, patch progress, or delete at `/api/goals/{id}`. Create with `title`, `period` (`WEEKLY`, `MONTHLY`, or `YEARLY`), and `target`. |
| Pet | Read `GET /api/pet`. Send `POST /api/pet/actions` with `action` set to `FEED`, `INJECT`, `REST`, or `PLAY`. |
| Focus | List or start at `/api/focus-sessions`. Start with `plannedMinutes` (1–60) and an optional `taskId`. Read at `/api/focus-sessions/{id}` or POST to its `/complete` or `/cancel` route. Completion after the planned time awards one apple. |
| Chat | List or create at `/api/chat/threads`. Read, rename, or delete at `/api/chat/threads/{id}`. GET its `/messages` route for history or POST with `message` to save a conversation turn through Ollama. |
| AI day planner | `POST /api/day-plans/suggest` proposes task and break times around fixed events with the configured Ollama model. The app sends the selected date, working hours, remaining tasks, fixed events, and any planning preference. Spring Boot checks the proposed times before returning them. |

## Run the Tamagotchi frontend

The React frontend includes Focus, Diary, Calendar, To-do List, AI Day Schedule, and Edit Event. It saves pet care, tasks, diary entries, goals, events, and accepted day plans locally. **Plan my day** uses the Spring Boot API and the configured Ollama model. Type a planning preference in the Day Plan dock to generate a revised plan. The regular chat dock sends messages to Ollama through Spring Boot and saves exchanges in PostgreSQL. Use **Chat history** to review the conversation.

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

# Pocket Pet

The project contains an Electron shell, a Java 21 Spring Boot API, and Ollama. Chat and day planning default to `qwen3:4b-instruct`, which runs locally in the Ollama container. [Qwen3 4B Instruct](https://ollama.com/library/qwen3:4b-instruct)

## Install the packaged desktop app

### 1. Set up Docker

For the default setup, the destination computer needs a matching Pocket Pet package, Docker with Compose, and an internet connection for the first download of the container images and Qwen model. The desktop package includes the frontend, Spring Boot, and a Java runtime. Docker supplies Ollama and, when needed, PostgreSQL. You can skip installing PostgreSQL, `psql`, Node.js, Maven, and a JDK on a computer that will only run the package.

| Platform | Docker setup |
| --- | --- |
| macOS | Install Docker Desktop for your chip, move Docker to **Applications**, then open it and finish its first-run setup. [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/) |
| Windows | Install Docker Desktop, follow its WSL 2 setup instructions if applicable, and start it in Linux container mode. [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/) |
| Linux | Install and start Docker Desktop, or start Docker Engine with the Compose plugin. The account that launches Pocket Pet needs access to Docker. [Docker Desktop for Linux](https://docs.docker.com/desktop/setup/install/linux/) · [Docker Engine](https://docs.docker.com/engine/install/) · [Compose plugin](https://docs.docker.com/compose/install/linux/) |

Open Terminal or PowerShell and check both commands succeed.

```sh
docker info
docker compose version
```

For a setup with separately installed services, see [Run Pocket Pet without Docker](#run-pocket-pet-without-docker).

### 2. Get and open the Pocket Pet package

Get the package from the person who built it, from a successful **Desktop packages** workflow run, or from `release/` after building it locally. [Desktop packages workflow](.github/workflows/desktop-packages.yml)

| Platform | Install and open |
| --- | --- |
| macOS | Open the matching DMG, drag **Pocket Pet.app** to **Applications**, then open it from there. To update it, quit Pocket Pet before replacing it in **Applications**. |
| Windows x64 | Extract the full ZIP to a folder and double-click **Pocket Pet.exe** inside it. Keep the extracted files together. |
| Linux x64 | On Debian or Ubuntu, install the `.deb` and open **Pocket Pet** from the app menu. For the portable package, extract the `.tar.gz` and launch `./pocket-pet` from the extracted folder on a system that supports Chromium's user namespace sandbox. |

For example, to install the version 0.1.0 Debian package from the folder that contains it, run this command.

```sh
sudo apt install ./pocket-pet_0.1.0_amd64.deb
```

Local macOS builds use an ad-hoc signature when a Developer ID certificate is unavailable. This lets the installed app register for notifications on your Mac. If macOS blocks a build you made yourself, follow Apple's instructions for opening a trusted app. [Safely open apps on your Mac](https://support.apple.com/en-us/102445)

### macOS reminders

Install **Pocket Pet.app** in **Applications** and open it from there. Allow notifications when prompted, or open **System Settings → Notifications → Pocket Pet** to enable them. Keep Pocket Pet running to receive reminders when its window is closed. [macOS notification settings](https://support.apple.com/en-us/guide/mac-help/mh40583/mac)

- Calendar events get reminders **30 minutes** and **15 minutes** before they start.
- Focus and break blocks get a reminder **5 minutes** before they start after you click **Use this plan**. Calendar events already get their calendar reminders.

### 3. Let the first launch finish

Pocket Pet starts Spring Boot and Ollama and downloads `qwen3:4b-instruct` the first time it needs the model. It starts a persistent PostgreSQL container unless it has an external database configured or detects Postgres.app in **Applications** on macOS. When using Postgres.app, Pocket Pet opens the local `tamagotchi_dev` database and creates it if needed. Spring Boot applies Liquibase migrations to set up the tables. [Qwen3 4B Instruct](https://ollama.com/library/qwen3:4b-instruct) · [Postgres.app installation and initialization](https://postgresapp.com/documentation/install.html)

Quitting Pocket Pet stops its Spring Boot process. Docker volumes keep the model and any containerized database between launches. If Postgres.app is installed but you want the Docker database, launch Pocket Pet with `POCKET_PET_DATABASE=docker` in its environment. The two databases have separate data.

## Run Pocket Pet without Docker

Pocket Pet can connect to PostgreSQL and Ollama that you run yourself. The default launch stops if it needs Docker and cannot reach it. Follow these steps to give the launcher both services directly.

### 1. Install and start PostgreSQL

- **macOS with Postgres.app.** Move Postgres.app to **Applications**, open it, and click **Initialize** if prompted. Leave the server running on port `5432`. With the default local login, Pocket Pet creates `tamagotchi_dev` on first launch. For a custom database, port, or password-protected login, use the explicit database settings below. [Postgres.app installation guide](https://postgresapp.com/documentation/install.html)
- **Other PostgreSQL installs.** Install and start the PostgreSQL server for your OS. Create an empty database and give a login ownership of it so Liquibase can create tables. For example, connect as a PostgreSQL administrator in `psql` and run the commands below. Use your existing database settings if you already have a database set up for Pocket Pet. [PostgreSQL installers](https://www.postgresql.org/download/) · [psql documentation](https://www.postgresql.org/docs/current/app-psql.html)

  ```text
  CREATE ROLE pocket_pet LOGIN;
  \password pocket_pet
  CREATE DATABASE tamagotchi_dev OWNER pocket_pet;
  ```

### 2. Install and start Ollama

Install Ollama for your OS. Open Ollama on macOS or Windows, or start its server with `ollama serve` in a separate terminal if it is not already running as a service. In a terminal, download the model and check that the API responds on the native Ollama port. [Ollama installation and quickstart](https://docs.ollama.com/quickstart) · [Ollama CLI reference](https://docs.ollama.com/cli)

```sh
ollama pull qwen3:4b-instruct
curl http://127.0.0.1:11434/api/version
```

In Windows PowerShell, use `curl.exe` for the API check.

### 3. Launch Pocket Pet with the service addresses

**macOS with the default Postgres.app login.** Run the installed app from Terminal so it receives the Ollama address.

```sh
OLLAMA_BASE_URL=http://127.0.0.1:11434 "/Applications/Pocket Pet.app/Contents/MacOS/Pocket Pet"
```

For a source checkout, run `OLLAMA_BASE_URL=http://127.0.0.1:11434 npm start` from the repository root after installing the build tools.

**macOS or Linux with an explicit PostgreSQL login.** In Terminal, use the hostname, port, database name, and username you configured in step 1. The example assumes local PostgreSQL on port `5432`.

```sh
export SPRING_DATASOURCE_URL='jdbc:postgresql://127.0.0.1:5432/tamagotchi_dev'
export SPRING_DATASOURCE_USERNAME='pocket_pet'
printf 'PostgreSQL password: '
read -rs SPRING_DATASOURCE_PASSWORD
printf '\n'
export SPRING_DATASOURCE_PASSWORD
export OLLAMA_BASE_URL='http://127.0.0.1:11434'
```

Then run one of these commands in that same Terminal.

- On macOS, run `"/Applications/Pocket Pet.app/Contents/MacOS/Pocket Pet"`.
- On Linux, run `pocket-pet` for the installed Debian package or `./pocket-pet` from the extracted portable folder.
- For a source checkout, run `npm start` from the repository root after installing the build prerequisites below.

**Windows with an explicit PostgreSQL login.** Open PowerShell in the folder containing the extracted app, then run these commands with your database settings.

```powershell
$env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://127.0.0.1:5432/tamagotchi_dev'
$env:SPRING_DATASOURCE_USERNAME = 'pocket_pet'
$pgCredential = Get-Credential -UserName $env:SPRING_DATASOURCE_USERNAME -Message 'Enter the PostgreSQL password'
$env:SPRING_DATASOURCE_PASSWORD = $pgCredential.GetNetworkCredential().Password
$env:OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
& '.\Pocket Pet.exe'
```

For a source checkout on Windows, run `npm start` from the repository root in the same PowerShell session in place of the last line.

## Run or build from source

### 1. Install the build tools

Use Node.js **22.12 or newer in the 22 series** and a full **JDK 21**. Install both for the architecture you are building for. The project's Maven Wrapper downloads Maven on its first build. [Node.js downloads](https://nodejs.org/en/download) · [Temurin JDK 21 downloads](https://adoptium.net/temurin/releases/?version=21) · [Maven Wrapper documentation](https://maven.apache.org/wrapper/)

Open a terminal in the repository root, where `package.json` is. On macOS, select JDK 21 for the current shell.

```sh
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
```

On Windows or Linux, set `JAVA_HOME` to the JDK 21 installation if your shell selects a different JDK. Check your tools and install the project dependencies.

```sh
node --version
node -p process.arch
java -version
npm ci
```

On macOS, if `java -version` still shows another JDK, check the selected one with `"$JAVA_HOME/bin/java" -version`.

### 2. Start the app or build an installer

To run the full app from your checkout, set up Docker or the separate services as described above, then run this command from the repository root.

```sh
npm start
```

To build and check a package for the operating system and architecture of your build machine, run these commands from the repository root. Packaging bundles the frontend, Spring Boot JAR, and Java runtime. The package check confirms the expected output files and runs the bundled Java.

```sh
npm run package
npm run check:package
```

The output goes in `release/`. On macOS, run `open release` to view it in Finder. Rerun `npm ci` when the lockfile changes.

| Build | Example version 0.1.0 output |
| --- | --- |
| Mac with Apple Silicon (`arm64`) | `Pocket Pet-0.1.0-arm64.dmg` and `Pocket Pet-0.1.0-arm64-mac.zip` |
| Intel Mac (`x64`) | `Pocket Pet-0.1.0.dmg` and `Pocket Pet-0.1.0-mac.zip` |
| Windows x64 | `Pocket Pet-0.1.0-win.zip` |
| Linux x64 | `pocket-pet_0.1.0_amd64.deb` and `pocket-pet-0.1.0.tar.gz` |

## Troubleshoot startup

| Symptom | What to check |
| --- | --- |
| `docker info` fails | Open Docker Desktop or start Docker Engine, then repeat the Docker checks. On Linux, check that your account can access the engine. [Set up Docker](#1-set-up-docker) |
| `psql` is missing | With Docker, Pocket Pet starts the database and applies its migrations for you. If you installed PostgreSQL separately, `psql` is an optional terminal client for administering it. |
| Pocket Pet reports that Ollama is unavailable | The managed Ollama container publishes port `11435` on the host. A separately installed native Ollama server normally uses `11434`. Match `OLLAMA_BASE_URL` to the server you started. |
| Port `8080` is already in use | The packaged app and `npm start` choose a free backend port. The standalone Maven command uses `8080` by default. |

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

The Maven Wrapper downloads Maven on first use. On Windows, use `mvnw.cmd spring-boot:run` from the `backend` directory. Maven resolves project dependencies and starts Spring Boot. Spring injects the application's dependencies and configuration at runtime. The backend connects to Docker's Ollama on `127.0.0.1:11435` by default. If you already run native Ollama, set `OLLAMA_BASE_URL=http://127.0.0.1:11434` and run the Maven command with that setting.

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
| AI day planner | `POST /api/day-plans/suggest` proposes task and break times around fixed events with the configured Ollama model. The app sends the selected date, working hours, remaining tasks, fixed events, any planning preference, and `focusMinutes` (1–60). Spring Boot checks the proposed times and returns individual focus sessions. |

## Run the Tamagotchi frontend

The React frontend includes Focus, Diary, Calendar, To-do List, AI Day Schedule, and Edit Event. It saves pet care, tasks, diary entries, goals, events, and accepted day plans locally.

- In **Focus**, type a whole number from 1 to 60 and click **Start**. The timer uses the number you enter even if the current task has a shorter estimate.
- In **Plan my day**, Pochita asks for the Pomodoro length and waits for **Generate plan**. The planner uses that length to schedule focus sessions through Spring Boot and Ollama. Type a planning preference in the Day Plan dock to revise a draft.
- The chat dock sends messages to Ollama through Spring Boot and saves exchanges in PostgreSQL. Use **Chat history** to review the conversation.

```sh
npm ci
npm run dev
```

To open Electron against a separately started backend on port 8080:

```sh
npm run build
npm run start:ui
```

Electron opens a compact, resizable Focus window at the bottom-right of the display where your pointer is located.

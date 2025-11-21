let pomodoroConfig = null;

// Estado del simulador
const state = {
  mode: "work", // 'work' | 'shortBreak' | 'longBreak'
  remainingSeconds: 0,
  timerId: null,
  isRunning: false,
  completedWorkSessions: 0,
  currentTask: ""
};

// Cargar config.json
async function loadConfig() {
  try {
    const response = await fetch("config.json");
    if (!response.ok) throw new Error();
    pomodoroConfig = await response.json();
    state.remainingSeconds = pomodoroConfig.workMinutes * 60;

    renderApp();
  } catch (error) {
    const app = document.getElementById("app");

    Swal.fire({
      title: "Error cargando configuración",
      text: "No se pudo cargar config.json",
      icon: "error",
      confirmButtonText: "OK",
      background: "#846AC0",
      color: "#fff",
      confirmButtonColor: "#000"
    });

    app.innerHTML =
      "<p style='color:white; text-align:center;'>Error cargando configuración.</p>";
  }
}

// Utilidades
function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function getCurrentTotalSeconds() {
  if (!pomodoroConfig) return 0;
  if (state.mode === "work") return pomodoroConfig.workMinutes * 60;
  if (state.mode === "shortBreak") return pomodoroConfig.shortBreakMinutes * 60;
  return pomodoroConfig.longBreakMinutes * 60;
}

function randomPhrase() {
  const list = pomodoroConfig?.motivationalPhrases || [];
  return list.length ? list[Math.floor(Math.random() * list.length)] : "Focus!";
}

// ====== Render completo ======
function renderApp() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="app-card">
      <span class="mode-pill" id="mode-pill"></span>
      <h1 class="app-title">POMO OSO</h1>
      <p class="app-subtitle">¡Estudia mas inteligente!</p>

      <img src="img/focus.gif" alt="Pomodoro Oso Gif" class="oso-gif" />

      <div class="timer-display" id="timer-display">${formatTime(
        state.remainingSeconds
      )}</div>
      <p class="timer-label" id="timer-label">${randomPhrase()}</p>

      <div class="progress-bar-wrapper">
        <div class="progress-bar-inner" id="progress-bar"></div>
      </div>

      <div class="controls">
        <button class="btn" id="start-pause-btn">INICIO</button>
        <button class="btn" id="reset-btn" disabled>REINICIAR</button>
        <button class="btn" id="skip-btn" disabled>SALTAR</button>
      </div>

      <p class="session-info" id="session-info"></p>

      <div class="task-input-wrapper">
        <p class="task-input-label">¡Termina esa tarea pendiente de una vez!</p>
        <input id="task-input" class="task-input" type="text" placeholder="Tarea para esta sesión" />
      </div>
    </div>
  `;

  attachEventListeners();
  updateUI();
}

// ====== Eventos ======
function attachEventListeners() {
  document.getElementById("start-pause-btn").onclick = () =>
    state.isRunning ? pauseTimer() : startTimer();
  document.getElementById("reset-btn").onclick = resetTimer;
  document.getElementById("skip-btn").onclick = () =>
    finishCurrentSession(true);

  document.getElementById("task-input").onchange = (e) =>
    (state.currentTask = e.target.value.trim());
}

// ====== Timer ======
function startTimer() {
  if (state.isRunning) return;

  state.isRunning = true;
  document.getElementById("start-pause-btn").textContent = "PAUSAR";

  if (!state.currentTask) {
    const v = document.getElementById("task-input").value.trim();
    if (v) state.currentTask = v;
  }

  state.timerId = setInterval(() => {
    state.remainingSeconds -= 1;

    if (state.remainingSeconds <= 0) {
      state.remainingSeconds = 0;
      pauseTimer();
      finishCurrentSession(false);
      return;
    }

    updateUI();
  }, 1000);

  updateUI();
}

function pauseTimer() {
  state.isRunning = false;
  document.getElementById("start-pause-btn").textContent = "RETOMAR";

  clearInterval(state.timerId);
  state.timerId = null;

  updateUI();
}

function resetTimer() {
  pauseTimer();
  const cfg = pomodoroConfig;

  if (state.mode === "work") state.remainingSeconds = cfg.workMinutes * 60;
  else if (state.mode === "shortBreak")
    state.remainingSeconds = cfg.shortBreakMinutes * 60;
  else state.remainingSeconds = cfg.longBreakMinutes * 60;

  updateUI();
}

function switchMode(nextMode) {
  const cfg = pomodoroConfig;

  state.mode = nextMode;
  state.isRunning = false;
  clearInterval(state.timerId);
  state.timerId = null;

  if (nextMode === "work") state.remainingSeconds = cfg.workMinutes * 60;
  else if (nextMode === "shortBreak")
    state.remainingSeconds = cfg.shortBreakMinutes * 60;
  else state.remainingSeconds = cfg.longBreakMinutes * 60;

  updateUI();
}

// ====== Fin de sesión ======
function finishCurrentSession(skipped) {
  const cfg = pomodoroConfig;
  const task = state.currentTask || "Tu tarea";

  let nextMode;

  if (state.mode === "work") {
    if (!skipped) state.completedWorkSessions++;

    const longBreak =
      state.completedWorkSessions % cfg.cyclesBeforeLongBreak === 0;

    nextMode = longBreak ? "longBreak" : "shortBreak";

    Swal.fire({
      title: skipped ? "¡Sesión saltada!" : "¡Pomodoro listo!",
      text: skipped
        ? "Ok, esta sesión no cuenta"
        : `¡Buen trabajo con ${task}! Tiempo para un Break.`,
      imageUrl: "img/shortbreak.gif",
      imageWidth: 150,
      confirmButtonText: longBreak ? "Long break" : "Short break",
      background: "#F65B2B",
      color: "#fff",
      confirmButtonColor: "#000"
    }).then(() => switchMode(nextMode));
  } else {
    Swal.fire({
      title: skipped ? "¡Break saltado!" : "¡De vuelta al work!",
      text: "Vamos por esa tarea atrasada.",
      imageUrl: "img/longbreak.gif",
      imageWidth: 150,
      confirmButtonText: "Comenzar a trabajar",
      background: "#F65B2B",
      color: "#fff",
      confirmButtonColor: "#000"
    }).then(() => switchMode("work"));
  }
}

// ====== UI ======
function updateUI() {
  const total = getCurrentTotalSeconds() || 1;
  const progress = 100 - (state.remainingSeconds / total) * 100;

  document.getElementById("timer-display").textContent = formatTime(
    state.remainingSeconds
  );

  document.getElementById("progress-bar").style.width = `${progress}%`;

  document.getElementById(
    "session-info"
  ).textContent = `Sesiones completadas en focus: ${state.completedWorkSessions}`;

  const label = document.getElementById("timer-label");
  const pill = document.getElementById("mode-pill");

  if (state.mode === "work") {
    pill.textContent = "FOCUS";
    label.textContent = state.currentTask || randomPhrase();
  } else if (state.mode === "shortBreak") {
    pill.textContent = "SHORT BREAK";
    label.textContent = "Estira, toma agua, respira.";
  } else {
    pill.textContent = "LONG BREAK";
    label.textContent = "Bien hecho, relajate un poco.";
  }

  document.getElementById("reset-btn").disabled =
    !state.isRunning && state.remainingSeconds === total;

  document.getElementById("skip-btn").disabled = !state.isRunning;

  if (!state.isRunning && state.remainingSeconds === total) {
    document.getElementById("start-pause-btn").textContent = "INICIO";
  }
}

// ====== Inicio ======
document.addEventListener("DOMContentLoaded", loadConfig);
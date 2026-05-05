const STORAGE_KEY = "bepro-state-v1";
const DAY_COUNT = 7;

// DOM Elements
const elements = {
  dateDisplay: document.getElementById("dateDisplay"),
  coinCount: document.getElementById("coinCount"),
  timerDisplay: document.getElementById("timerDisplay"),
  sessionCount: document.getElementById("sessionCount"),
  totalSessions: document.getElementById("totalSessions"),
  longestStreak: document.getElementById("longestStreak"),
  historyBars: document.getElementById("historyBars"),
  startBtn: document.getElementById("startBtn"),
  resetBtn: document.getElementById("resetBtn"),
  timerNote: document.getElementById("timerNote"),
  presetBtns: Array.from(document.querySelectorAll(".preset-btn")),
  toast: document.getElementById("toast"),
};

// App State
let state = {
  sessions: [], // Array of { date: YYYY-MM-DD, minutes: number }
  currentSession: null, // { startTime: timestamp, minutes: number }
  timerInterval: null,
  timerRunning: false,
};

// Initialize
function init() {
  loadState();
  updateDateDisplay();
  renderAll();
  setupEventListeners();
}

// Storage Management
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const loaded = JSON.parse(saved);
      state.sessions = loaded.sessions || [];
      checkMidnightReset();
    }
  } catch (e) {
    console.error("Failed to load state:", e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      sessions: state.sessions,
      lastSaveDate: new Date().toISOString(),
    }));
  } catch (e) {
    console.error("Failed to save state:", e);
  }
}

// Date Helpers
function getTodayKey() {
  const now = new Date();
  return now.toISOString().split("T")[0]; // YYYY-MM-DD
}

function updateDateDisplay() {
  const today = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  elements.dateDisplay.textContent = formatter.format(today);
}

function checkMidnightReset() {
  // Clean old sessions if needed (optional)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().split("T")[0];
  
  state.sessions = state.sessions.filter(s => s.date >= cutoff);
}

// Timer Management
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function startTimer(minutes) {
  if (state.timerRunning) return;

  state.timerRunning = true;
  state.currentSession = {
    startTime: Date.now(),
    minutes: minutes,
    totalSeconds: minutes * 60,
    remainingSeconds: minutes * 60,
  };

  elements.startBtn.textContent = "Pause";
  elements.startBtn.classList.add("btn-active");
  elements.timerNote.textContent = "Focus active. Stay disciplined.";

  state.timerInterval = setInterval(updateTimer, 1000);
  updateTimer();
}

function pauseTimer() {
  if (!state.timerRunning) return;

  state.timerRunning = false;
  clearInterval(state.timerInterval);
  
  elements.startBtn.textContent = "Resume";
  elements.timerNote.textContent = "Timer paused.";
}

function resetTimer(minutes = 25) {
  state.timerRunning = false;
  clearInterval(state.timerInterval);
  state.currentSession = null;

  elements.startBtn.textContent = "Start Focus";
  elements.startBtn.classList.remove("btn-active");
  elements.timerDisplay.textContent = formatTime(minutes * 60);
  elements.timerNote.textContent = "Ready to focus?";

  updateSessionCount();
}

function updateTimer() {
  if (!state.currentSession || !state.timerRunning) return;

  const elapsed = Date.now() - state.currentSession.startTime;
  const remainingMs = (state.currentSession.totalSeconds * 1000) - elapsed;
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

  state.currentSession.remainingSeconds = remainingSeconds;
  elements.timerDisplay.textContent = formatTime(remainingSeconds);

  if (remainingSeconds <= 0) {
    completeSession();
  }
}

function completeSession() {
  if (!state.currentSession) return;

  const minutesCompleted = state.currentSession.minutes;
  const coinsEarned = minutesCompleted; // 1 minute = 1 coin (BePro formula)

  // Record session
  const today = getTodayKey();
  const existingSession = state.sessions.find(s => s.date === today);
  
  if (existingSession) {
    existingSession.minutes += minutesCompleted;
  } else {
    state.sessions.push({ date: today, minutes: minutesCompleted });
  }

  saveState();
  showToast(`+${coinsEarned} coins earned!`);
  playSound();

  resetTimer(25);
  renderAll();
}

function playSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.frequency.value = 800;
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}

// UI Rendering
function getTodayCoins() {
  const today = getTodayKey();
  const session = state.sessions.find(s => s.date === today);
  return session ? session.minutes : 0; // Minutes = Coins
}

function getTotalSessions() {
  return state.sessions.length;
}

function getLongestStreak() {
  if (state.sessions.length === 0) return 0;

  let streak = 1;
  let maxStreak = 1;

  // Sort sessions by date
  const sorted = [...state.sessions].sort((a, b) => a.date.localeCompare(b.date));

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1].date);
    const currDate = new Date(sorted[i].date);
    const dayDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));

    if (dayDiff === 1) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else if (dayDiff > 1) {
      streak = 1;
    }
  }

  return maxStreak;
}

function renderCoins() {
  const coins = getTodayCoins();
  elements.coinCount.textContent = coins;
}

function renderStats() {
  elements.totalSessions.textContent = getTotalSessions();
  
  const streak = getLongestStreak();
  elements.longestStreak.textContent = streak > 0 ? `${streak} days` : "0 days";
}

function renderHistory() {
  const today = new Date();
  const bars = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split("T")[0];
    
    const session = state.sessions.find(s => s.date === dateKey);
    const minutes = session ? session.minutes : 0;

    // Get day label
    const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });

    // Find max for scaling
    const maxMinutes = Math.max(...state.sessions.map(s => s.minutes), 50);
    const heightPercent = maxMinutes > 0 ? (minutes / maxMinutes) * 100 : 0;

    bars.push(`
      <div class="day-bar">
        <div class="bar-fill" style="height: ${heightPercent}%"></div>
        <p class="day-label">${dayLabel}</p>
      </div>
    `);
  }

  elements.historyBars.innerHTML = bars.join("");
}

function renderSession() {
  if (state.currentSession && state.timerRunning) {
    elements.sessionCount.textContent = `Session ${getTotalSessions() + 1}`;
  } else {
    elements.sessionCount.textContent = `Session ${getTotalSessions() + 1}`;
  }
}

function renderAll() {
  renderCoins();
  renderStats();
  renderHistory();
  renderSession();
}

// Event Listeners
function setupEventListeners() {
  elements.startBtn.addEventListener("click", () => {
    if (state.timerRunning) {
      pauseTimer();
    } else if (state.currentSession) {
      startTimer(state.currentSession.minutes);
    } else {
      startTimer(25);
    }
  });

  elements.resetBtn.addEventListener("click", () => {
    resetTimer(25);
  });

  elements.presetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const minutes = parseInt(btn.dataset.time);
      
      // Update active state
      elements.presetBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Reset with new duration
      resetTimer(minutes);
    });
  });
}

// Toast Notifications
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");

  setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 3000);
}

// Start the app
init();

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatReadableDate(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatShortDay(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date);
}

function formatTimeLabel(isoString) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMinutes(minutes) {
  return `${minutes} min`;
}

function formatClock(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getModeMinutes(mode) {
  if (mode === "focus") {
    return state.settings.focusMinutes;
  }
  if (mode === "shortBreak") {
    return state.settings.shortBreakMinutes;
  }
  return state.settings.longBreakMinutes;
}

function setModeMinutes(mode, minutes) {
  const normalizedMinutes = clamp(minutes, 1, 180);
  if (mode === "focus") {
    state.settings.focusMinutes = normalizedMinutes;
  } else if (mode === "shortBreak") {
    state.settings.shortBreakMinutes = normalizedMinutes;
  } else {
    state.settings.longBreakMinutes = normalizedMinutes;
  }
  saveState();
}

function stopInterval() {
  if (timer.intervalId !== null) {
    window.clearInterval(timer.intervalId);
    timer.intervalId = null;
  }
}

function resetTimerForMode(mode = timer.mode) {
  timer.mode = mode;
  timer.totalSeconds = getModeMinutes(mode) * 60;
  timer.remainingSeconds = timer.totalSeconds;
  timer.endsAt = null;
  timer.isRunning = false;
  stopInterval();
  timer.statusMessage = MODE_CONFIG[mode].status;
}

function startTimer() {
  if (timer.isRunning) {
    return;
  }
  timer.isRunning = true;
  timer.endsAt = Date.now() + timer.remainingSeconds * 1000;
  timer.statusMessage = timer.mode === "focus"
    ? "Protect this block. One thing only."
    : "Take the break fully so the next block feels easier.";
  timer.intervalId = window.setInterval(syncTimer, 250);
  renderTimer();
}

function pauseTimer() {
  if (!timer.isRunning) {
    return;
  }
  timer.remainingSeconds = Math.max(
    0,
    Math.ceil((timer.endsAt - Date.now()) / 1000),
  );
  timer.isRunning = false;
  timer.endsAt = null;
  timer.statusMessage = "Timer paused. Jump back in when you are ready.";
  stopInterval();
  renderTimer();
}

function syncTimer() {
  const remaining = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
  if (remaining !== timer.remainingSeconds) {
    timer.remainingSeconds = remaining;
    renderTimer();
  }
  if (remaining <= 0) {
    finishTimer();
  }
}

function logCompletedFocusSession() {
  const selectedTask = state.tasks.find((task) => task.id === state.selectedTaskId) || null;
  const durationMinutes = Math.round(timer.totalSeconds / 60);
  const sessionIntent = elements.sessionIntent.value.trim();
  const entry = {
    id: uid("session"),
    taskId: selectedTask ? selectedTask.id : null,
    taskTitle: selectedTask ? selectedTask.title : null,
    durationMinutes,
    intent: sessionIntent,
    completedAt: new Date().toISOString(),
    dateKey: getLocalDateKey(),
  };

  state.sessions.unshift(entry);

  if (selectedTask) {
    selectedTask.focusMinutes = (selectedTask.focusMinutes || 0) + durationMinutes;
  }

  saveState();
}

function playChime() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.25);
  gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.03);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.55);
  oscillator.onended = () => {
    audioContext.close().catch(() => {});
  };
}

function finishTimer() {
  stopInterval();
  timer.isRunning = false;
  timer.endsAt = null;
  timer.remainingSeconds = 0;

  if (timer.mode === "focus") {
    logCompletedFocusSession();
    state.focusCycleCount += 1;
    saveState();

    const nextBreakMode = state.focusCycleCount % 4 === 0 ? "longBreak" : "shortBreak";
    resetTimerForMode(nextBreakMode);
    timer.statusMessage = "Focus block complete. Step away for the break.";
  } else {
    resetTimerForMode("focus");
    timer.statusMessage = "Break complete. Your next focus block is ready.";
  }

  playChime();
  renderAll();
}

function getTodayMetrics() {
  const todayKey = getLocalDateKey();
  const todaySessions = state.sessions.filter((entry) => entry.dateKey === todayKey);
  const todayFocusMinutes = todaySessions.reduce((total, entry) => total + entry.durationMinutes, 0);
  const todayDistractions = state.distractions.filter((entry) => entry.dateKey === todayKey);
  const tasksCompletedToday = state.tasks.filter((task) => {
    return task.completed && task.completedAt && task.completedAt.startsWith(todayKey);
  });

  const focusScore = clamp(
    Math.round((todayFocusMinutes * 1.1) + (todaySessions.length * 8) + (tasksCompletedToday.length * 14) - (todayDistractions.length * 7)),
    0,
    100,
  );

  return {
    todaySessions,
    todayFocusMinutes,
    todayDistractions,
    tasksCompletedToday,
    focusScore,
  };
}

function getStreakCount() {
  let streak = 0;
  const seenDays = new Set(state.sessions.map((entry) => entry.dateKey));
  const cursor = new Date();

  while (seenDays.has(getLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getCompletionRate() {
  if (state.tasks.length === 0) {
    return 0;
  }
  const completedCount = state.tasks.filter((task) => task.completed).length;
  return Math.round((completedCount / state.tasks.length) * 100);
}

function buildHistory(days = DAY_COUNT) {
  const history = [];
  const today = new Date();

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    const dateKey = getLocalDateKey(date);
    const focusMinutes = state.sessions
      .filter((entry) => entry.dateKey === dateKey)
      .reduce((sum, entry) => sum + entry.durationMinutes, 0);
    const distractionCount = state.distractions.filter((entry) => entry.dateKey === dateKey).length;

    history.push({
      dateKey,
      label: formatShortDay(dateKey),
      focusMinutes,
      distractionCount,
      isToday: dateKey === getLocalDateKey(),
    });
  }

  return history;
}

function getCoachCopy(metrics) {
  if (!state.tasks.length) {
    return {
      message: "Capture the main things you want done today, then start one 25 minute sprint.",
      tip: "A single active task cuts down decision fatigue and makes it easier to begin.",
    };
  }

  if (!state.selectedTaskId) {
    return {
      message: "Choose one active task before starting the next timer so the session has a clear target.",
      tip: "Use high priority only for work that truly moves the day forward.",
    };
  }

  if (!metrics.todaySessions.length) {
    return {
      message: "Momentum is still wide open. Start one focus block on your active task and let the first win carry the rest.",
      tip: "If starting feels heavy, shrink the target to a 25 minute sprint and begin messy.",
    };
  }

  if (metrics.todayDistractions.length > metrics.todaySessions.length) {
    return {
      message: "Distractions are outpacing deep work today. Close one noisy input before the next session starts.",
      tip: "The fastest improvement usually comes from removing a trigger, not adding more discipline.",
    };
  }

  if (metrics.focusScore >= 75) {
    return {
      message: "You are in a strong rhythm. Protect it by taking your breaks on time and keeping the next task obvious.",
      tip: "When energy is good, batch shallow work after a deep session instead of mixing it inside one block.",
    };
  }

  return {
    message: "You have traction. Finish one active task before adding another so progress stays visible.",
    tip: "Logging distractions is useful because patterns are easier to fix once they are concrete.",
  };
}

function renderStats() {
  const metrics = getTodayMetrics();
  const streakCount = getStreakCount();
  elements.todayLabel.textContent = formatReadableDate();
  elements.heroFocusScore.textContent = String(metrics.focusScore);
  elements.focusMinutesStat.textContent = String(metrics.todayFocusMinutes);
  elements.sessionsStat.textContent = String(metrics.todaySessions.length);
  elements.tasksDoneStat.textContent = String(metrics.tasksCompletedToday.length);
  elements.distractionsStat.textContent = String(metrics.todayDistractions.length);
  elements.streakStat.textContent = `${streakCount} day${streakCount === 1 ? "" : "s"}`;
  elements.completionRateStat.textContent = `${getCompletionRate()}%`;

  const coachCopy = getCoachCopy(metrics);
  elements.coachMessage.textContent = coachCopy.message;
  elements.coachTip.textContent = coachCopy.tip;
}

function renderTimer() {
  elements.timerModeLabel.textContent = MODE_CONFIG[timer.mode].label;
  elements.timerDisplay.textContent = formatClock(timer.remainingSeconds);
  elements.timerStatusLabel.textContent = timer.statusMessage;
  elements.timerLengthLabel.textContent = `${getModeMinutes(timer.mode)} minutes`;
  elements.startPauseButton.textContent = timer.isRunning ? "Pause" : "Start";
  elements.timerFace.classList.toggle("running", timer.isRunning);
  elements.cycleCountBadge.textContent = `Cycle ${(state.focusCycleCount % 4) + 1}`;

  const activeTask = state.tasks.find((task) => task.id === state.selectedTaskId);
  elements.activeTaskLabel.textContent = activeTask
    ? `Active task: ${activeTask.title}`
    : "No active task selected yet.";

  Array.from(elements.modeSwitch.querySelectorAll("[data-mode]")).forEach((button) => {
    const isActive = button.dataset.mode === timer.mode;
    button.classList.toggle("active", isActive);
    button.disabled = timer.isRunning;
  });

  elements.presetButtons.forEach((button) => {
    const preset = Number(button.dataset.preset);
    const isActive = timer.mode === "focus" && state.settings.focusMinutes === preset;
    button.classList.toggle("active", isActive);
    button.disabled = timer.isRunning;
  });

  elements.decreaseTimeButton.disabled = timer.isRunning;
  elements.increaseTimeButton.disabled = timer.isRunning;

  document.title = `${formatClock(timer.remainingSeconds)} | ${MODE_CONFIG[timer.mode].label} | Focus Foundry`;
}

function renderTasks() {
  if (!state.tasks.length) {
    elements.taskList.innerHTML = `
      <li class="empty-state">
        Your task board is empty. Add one meaningful task, mark it active, and let the timer drive the work.
      </li>
    `;
    return;
  }

  const items = state.tasks
    .slice()
    .sort((left, right) => Number(left.completed) - Number(right.completed))
    .map((task) => {
      const focusMinutes = task.focusMinutes || 0;
      const isActive = task.id === state.selectedTaskId;
      const progressLabel = `${focusMinutes}/${task.estimatedMinutes} min`;
      return `
        <li class="task-item ${isActive ? "active" : ""} ${task.completed ? "completed" : ""}">
          <div class="task-top">
            <div>
              <p class="task-title">${escapeHtml(task.title)}</p>
            </div>
            <div class="task-badges">
              <span class="badge priority-${task.priority}">${PRIORITY_LABELS[task.priority]}</span>
              <span class="badge progress">${progressLabel}</span>
            </div>
          </div>
          <div class="task-bottom">
            <div class="task-actions">
              <button type="button" class="ghost-button ${isActive ? "accented" : ""}" data-action="select-task" data-task-id="${task.id}">
                ${isActive ? "Active task" : "Set active"}
              </button>
              <button type="button" class="ghost-button" data-action="toggle-task" data-task-id="${task.id}">
                ${task.completed ? "Mark open" : "Mark done"}
              </button>
              <button type="button" class="danger-button" data-action="delete-task" data-task-id="${task.id}">
                Delete
              </button>
            </div>
          </div>
        </li>
      `;
    })
    .join("");

  elements.taskList.innerHTML = items;
}

function renderDistractions() {
  const recentDistractions = state.distractions
    .slice()
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, 6);

  if (!recentDistractions.length) {
    elements.distractionList.innerHTML = `
      <li class="empty-state">
        No distraction entries yet. Use the quick buttons whenever something pulls your attention away.
      </li>
    `;
    return;
  }

  elements.distractionList.innerHTML = recentDistractions
    .map((entry) => {
      const noteMarkup = entry.note ? ` · ${escapeHtml(entry.note)}` : "";
      return `
        <li class="distraction-item">
          <div>
            <div class="distraction-label">${escapeHtml(entry.label)}</div>
            <div class="distraction-meta">${formatReadableDate(new Date(entry.createdAt))}${noteMarkup}</div>
          </div>
          <span class="muted">${formatTimeLabel(entry.createdAt)}</span>
        </li>
      `;
    })
    .join("");
}

function renderHistory() {
  const history = buildHistory();
  const highestFocusValue = Math.max(...history.map((day) => day.focusMinutes), 1);
  const weeklyFocus = history.reduce((sum, day) => sum + day.focusMinutes, 0);
  const weeklyDistractions = history.reduce((sum, day) => sum + day.distractionCount, 0);
  const bestDay = history.reduce((best, day) => {
    if (!best || day.focusMinutes > best.focusMinutes) {
      return day;
    }
    return best;
  }, null);

  elements.historyChart.innerHTML = history
    .map((day) => {
      const barHeight = Math.max(8, Math.round((day.focusMinutes / highestFocusValue) * 100));
      return `
        <article class="history-day ${day.isToday ? "is-today" : ""}">
          <div class="history-track">
            <div class="history-bar" style="--bar-height: ${barHeight}%"></div>
          </div>
          <div class="history-day-label">${day.label}</div>
          <div class="history-day-meta">${day.focusMinutes} min</div>
          <div class="history-day-meta">${day.distractionCount} distractions</div>
        </article>
      `;
    })
    .join("");

  elements.weeklyFocusStat.textContent = formatMinutes(weeklyFocus);
  elements.bestDayStat.textContent = bestDay && bestDay.focusMinutes > 0
    ? `${bestDay.label} · ${bestDay.focusMinutes} min`
    : "None yet";
  const ratio = weeklyDistractions === 0 ? weeklyFocus : weeklyFocus / weeklyDistractions;
  elements.focusRatioStat.textContent = ratio ? ratio.toFixed(1) : "0.0";
}

function renderAll() {
  renderStats();
  renderTimer();
  renderTasks();
  renderDistractions();
  renderHistory();
}

function addTask(title, estimatedMinutes, priority) {
  state.tasks.unshift({
    id: uid("task"),
    title,
    estimatedMinutes,
    priority,
    focusMinutes: 0,
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
  });

  saveState();
  renderAll();
}

function toggleTask(taskId) {
  const task = state.tasks.find((entry) => entry.id === taskId);
  if (!task) {
    return;
  }

  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;

  if (task.completed && state.selectedTaskId === task.id) {
    state.selectedTaskId = null;
  }

  saveState();
  renderAll();
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  if (state.selectedTaskId === taskId) {
    state.selectedTaskId = null;
  }
  saveState();
  renderAll();
}

function selectTask(taskId) {
  const task = state.tasks.find((entry) => entry.id === taskId && !entry.completed);
  state.selectedTaskId = task ? task.id : null;
  saveState();
  renderAll();
}

function logDistraction(label, note = "") {
  const trimmedLabel = label.trim();
  if (!trimmedLabel) {
    return;
  }

  state.distractions.unshift({
    id: uid("distraction"),
    label: trimmedLabel,
    note: note.trim(),
    createdAt: new Date().toISOString(),
    dateKey: getLocalDateKey(),
  });

  saveState();
  renderAll();
}

function handleTaskSubmit(event) {
  event.preventDefault();

  const title = elements.taskTitle.value.trim();
  const estimatedMinutes = Number(elements.taskEstimate.value);
  const priority = elements.taskPriority.value;

  if (!title || !estimatedMinutes || estimatedMinutes < 5) {
    return;
  }

  addTask(title, estimatedMinutes, priority);
  elements.taskForm.reset();
  elements.taskEstimate.value = "30";
  elements.taskPriority.value = "medium";
  elements.taskTitle.focus();
}

function handleTaskActions(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  const { action, taskId } = button.dataset;
  if (action === "select-task") {
    selectTask(taskId);
  }
  if (action === "toggle-task") {
    toggleTask(taskId);
  }
  if (action === "delete-task") {
    deleteTask(taskId);
  }
}

function handleModeSwitch(event) {
  const button = event.target.closest("[data-mode]");
  if (!button || timer.isRunning) {
    return;
  }

  resetTimerForMode(button.dataset.mode);
  renderTimer();
}

function adjustModeLength(deltaMinutes) {
  if (timer.isRunning) {
    return;
  }

  const newMinutes = getModeMinutes(timer.mode) + deltaMinutes;
  setModeMinutes(timer.mode, newMinutes);
  resetTimerForMode(timer.mode);
  renderTimer();
}

function applyPreset(minutes) {
  if (timer.isRunning) {
    return;
  }

  setModeMinutes("focus", minutes);
  resetTimerForMode("focus");
  renderTimer();
}

function bindEvents() {
  elements.startPauseButton.addEventListener("click", () => {
    if (timer.isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  });

  elements.resetButton.addEventListener("click", () => {
    resetTimerForMode(timer.mode);
    renderTimer();
  });

  elements.modeSwitch.addEventListener("click", handleModeSwitch);

  elements.presetButtons.forEach((button) => {
    button.addEventListener("click", () => applyPreset(Number(button.dataset.preset)));
  });

  elements.decreaseTimeButton.addEventListener("click", () => adjustModeLength(-5));
  elements.increaseTimeButton.addEventListener("click", () => adjustModeLength(5));

  elements.taskForm.addEventListener("submit", handleTaskSubmit);
  elements.taskList.addEventListener("click", handleTaskActions);

  elements.quickLog.addEventListener("click", (event) => {
    const button = event.target.closest("[data-label]");
    if (!button) {
      return;
    }
    logDistraction(button.dataset.label);
  });

  elements.distractionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const note = elements.distractionNote.value.trim();
    if (!note) {
      return;
    }
    logDistraction("Custom", note);
    elements.distractionForm.reset();
    elements.distractionNote.focus();
  });
}

bindEvents();
renderAll();

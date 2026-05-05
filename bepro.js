const STORAGE_KEY = "bepro-focus-engine-v3";
const LEGACY_KEYS = ["focus-foundry-state-v1", "bepro-state-v1"];

const MODE_CONFIG = {
  focus: {
    label: "Deep Focus",
    status: "Start a focus run when you are ready.",
    settingKey: "focusMinutes",
  },
  shortBreak: {
    label: "Short Break",
    status: "Reset your brain and protect the next run.",
    settingKey: "shortBreakMinutes",
  },
  longBreak: {
    label: "Long Break",
    status: "Take a proper reset before the next deep cycle.",
    settingKey: "longBreakMinutes",
  },
};

const PRIORITY_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const ACHIEVEMENTS = [
  {
    id: "first-flame",
    name: "First Flame",
    description: "Finish your first focus run.",
    test: (summary) => summary.totalSessions >= 1,
  },
  {
    id: "rhythm-locked",
    name: "Rhythm Locked",
    description: "Hit a 3 day focus streak.",
    test: (summary) => summary.bestStreak >= 3,
  },
  {
    id: "focus-hoarder",
    name: "Focus Hoarder",
    description: "Bank 300 Focus.",
    test: (summary) => summary.focusBank >= 300,
  },
  {
    id: "closer",
    name: "Closer",
    description: "Complete 5 tasks.",
    test: (summary) => summary.completedTasks >= 5,
  },
];

const elements = {
  todayLabel: document.getElementById("todayLabel"),
  focusBankStat: document.getElementById("focusBankStat"),
  todayFocusStat: document.getElementById("todayFocusStat"),
  comboStat: document.getElementById("comboStat"),
  levelLabel: document.getElementById("levelLabel"),
  levelProgressLabel: document.getElementById("levelProgressLabel"),
  levelProgressFill: document.getElementById("levelProgressFill"),
  levelMessage: document.getElementById("levelMessage"),
  streakStat: document.getElementById("streakStat"),
  sessionsStat: document.getElementById("sessionsStat"),
  focusScoreStat: document.getElementById("focusScoreStat"),
  focusMinutesStat: document.getElementById("focusMinutesStat"),
  cycleCountBadge: document.getElementById("cycleCountBadge"),
  modeSwitch: document.getElementById("modeSwitch"),
  timerRing: document.getElementById("timerRing"),
  timerModeLabel: document.getElementById("timerModeLabel"),
  timerDisplay: document.getElementById("timerDisplay"),
  activeTaskLabel: document.getElementById("activeTaskLabel"),
  timerStatusLabel: document.getElementById("timerStatusLabel"),
  sessionIntent: document.getElementById("sessionIntent"),
  startPauseButton: document.getElementById("startPauseButton"),
  resetButton: document.getElementById("resetButton"),
  presetButtons: Array.from(document.querySelectorAll("[data-preset]")),
  questList: document.getElementById("questList"),
  badgeList: document.getElementById("badgeList"),
  rangeSwitch: document.getElementById("rangeSwitch"),
  rangeTotalStat: document.getElementById("rangeTotalStat"),
  rangeBestStat: document.getElementById("rangeBestStat"),
  rangeAverageStat: document.getElementById("rangeAverageStat"),
  productivityChart: document.getElementById("productivityChart"),
  chartRangeLabel: document.getElementById("chartRangeLabel"),
  chartFooter: document.getElementById("chartFooter"),
  taskForm: document.getElementById("taskForm"),
  taskTitle: document.getElementById("taskTitle"),
  taskEstimate: document.getElementById("taskEstimate"),
  taskPriority: document.getElementById("taskPriority"),
  taskList: document.getElementById("taskList"),
  quickLog: document.getElementById("quickLog"),
  distractionForm: document.getElementById("distractionForm"),
  distractionNote: document.getElementById("distractionNote"),
  distractionTodayStat: document.getElementById("distractionTodayStat"),
  tasksDoneStat: document.getElementById("tasksDoneStat"),
  distractionList: document.getElementById("distractionList"),
  toast: document.getElementById("toast"),
  burstLayer: document.getElementById("burstLayer"),
};

function createDefaultState() {
  return {
    tasks: [],
    sessions: [],
    distractions: [],
    rewards: [],
    selectedTaskId: null,
    focusCycleCount: 0,
    claimedQuestIds: [],
    settings: {
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
    },
  };
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

function formatReadableDate(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatShortDay(dateKey) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
  }).format(dateFromKey(dateKey));
}

function formatDayNumber(dateKey) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
  }).format(dateFromKey(dateKey));
}

function formatMonthLabel(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
  }).format(date);
}

function formatMonthYear(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTimeLabel(isoString) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoString));
}

function formatClock(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatMinutes(minutes) {
  return `${minutes} min`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeSessions(rawSessions) {
  if (!Array.isArray(rawSessions)) {
    return [];
  }

  return rawSessions
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      if ("durationMinutes" in entry && entry.dateKey) {
        return {
          id: entry.id || uid(`session-${index}`),
          taskId: entry.taskId || null,
          taskTitle: entry.taskTitle || null,
          durationMinutes: Number(entry.durationMinutes) || 0,
          intent: entry.intent || "",
          completedAt: entry.completedAt || `${entry.dateKey}T12:00:00`,
          dateKey: entry.dateKey,
          focusReward: Number(entry.focusReward || entry.durationMinutes) || 0,
        };
      }

      if ("minutes" in entry && entry.date) {
        return {
          id: entry.id || uid(`legacy-session-${index}`),
          taskId: null,
          taskTitle: null,
          durationMinutes: Number(entry.minutes) || 0,
          intent: "",
          completedAt: `${entry.date}T12:00:00`,
          dateKey: entry.date,
          focusReward: Number(entry.minutes) || 0,
        };
      }

      return null;
    })
    .filter(Boolean);
}

function normalizeRewards(parsed, sessions) {
  if (Array.isArray(parsed.rewards)) {
    return parsed.rewards
      .map((entry, index) => ({
        id: entry.id || uid(`reward-${index}`),
        amount: Number(entry.amount) || 0,
        reason: entry.reason || "Reward",
        createdAt: entry.createdAt || new Date().toISOString(),
        dateKey: entry.dateKey || getLocalDateKey(new Date(entry.createdAt || Date.now())),
      }))
      .filter((entry) => entry.amount > 0);
  }

  if (sessions.length) {
    return sessions.map((entry) => ({
      id: uid("reward"),
      amount: entry.focusReward || entry.durationMinutes,
      reason: "Focus run",
      createdAt: entry.completedAt,
      dateKey: entry.dateKey,
    }));
  }

  if (parsed.focusBank || parsed.focusCoins) {
    return [{
      id: uid("reward"),
      amount: Number(parsed.focusBank || parsed.focusCoins) || 0,
      reason: "Legacy bank",
      createdAt: "2000-01-01T00:00:00.000Z",
      dateKey: "legacy",
    }];
  }

  return [];
}

function normalizeTasks(rawTasks) {
  if (!Array.isArray(rawTasks)) {
    return [];
  }

  return rawTasks
    .map((task, index) => ({
      id: task.id || uid(`task-${index}`),
      title: String(task.title || "").trim(),
      estimatedMinutes: Number(task.estimatedMinutes || task.estimate || 30) || 30,
      priority: ["high", "medium", "low"].includes(task.priority) ? task.priority : "medium",
      focusMinutes: Number(task.focusMinutes) || 0,
      completed: Boolean(task.completed),
      completedAt: task.completedAt || null,
      rewardGranted: Boolean(task.rewardGranted),
      createdAt: task.createdAt || new Date().toISOString(),
    }))
    .filter((task) => task.title);
}

function normalizeDistractions(rawDistractions) {
  if (!Array.isArray(rawDistractions)) {
    return [];
  }

  return rawDistractions
    .map((entry, index) => ({
      id: entry.id || uid(`distraction-${index}`),
      label: String(entry.label || "Custom").trim(),
      note: String(entry.note || "").trim(),
      createdAt: entry.createdAt || new Date().toISOString(),
      dateKey: entry.dateKey || getLocalDateKey(new Date(entry.createdAt || Date.now())),
    }))
    .filter((entry) => entry.label);
}

function loadState() {
  const sources = [STORAGE_KEY, ...LEGACY_KEYS];
  for (const key of sources) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw);
      const defaults = createDefaultState();
      const sessions = normalizeSessions(parsed.sessions);
      return {
        ...defaults,
        settings: {
          ...defaults.settings,
          ...(parsed.settings || {}),
        },
        tasks: normalizeTasks(parsed.tasks),
        sessions,
        distractions: normalizeDistractions(parsed.distractions),
        rewards: normalizeRewards(parsed, sessions),
        selectedTaskId: parsed.selectedTaskId || null,
        focusCycleCount: Number(parsed.focusCycleCount) || 0,
        claimedQuestIds: Array.isArray(parsed.claimedQuestIds) ? parsed.claimedQuestIds : [],
      };
    } catch (error) {
      console.warn("Unable to parse saved state", error);
    }
  }

  return createDefaultState();
}

let state = loadState();
let selectedRange = "week";

const timer = {
  mode: "focus",
  totalSeconds: state.settings.focusMinutes * 60,
  remainingSeconds: state.settings.focusMinutes * 60,
  isRunning: false,
  intervalId: null,
  endsAt: null,
  statusMessage: MODE_CONFIG.focus.status,
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getFocusBank() {
  return state.rewards.reduce((sum, entry) => sum + entry.amount, 0);
}

function getModeMinutes(mode) {
  return state.settings[MODE_CONFIG[mode].settingKey];
}

function setModeMinutes(mode, minutes) {
  state.settings[MODE_CONFIG[mode].settingKey] = clamp(minutes, 1, 180);
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
  timer.isRunning = false;
  timer.endsAt = null;
  timer.statusMessage = MODE_CONFIG[mode].status;
  stopInterval();
}

function startTimer() {
  if (timer.isRunning) {
    return;
  }

  timer.isRunning = true;
  timer.endsAt = Date.now() + timer.remainingSeconds * 1000;
  timer.statusMessage = timer.mode === "focus"
    ? "Flow state is live. Protect the lane."
    : "Break with intent so the next run lands harder.";
  timer.intervalId = window.setInterval(syncTimer, 250);
  renderTimer();
}

function pauseTimer() {
  if (!timer.isRunning) {
    return;
  }

  timer.remainingSeconds = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
  timer.isRunning = false;
  timer.endsAt = null;
  timer.statusMessage = "Timer paused. Resume when you are ready.";
  stopInterval();
  renderTimer();
}

function syncTimer() {
  if (!timer.isRunning || !timer.endsAt) {
    return;
  }

  const remaining = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
  if (remaining !== timer.remainingSeconds) {
    timer.remainingSeconds = remaining;
    renderTimer();
  }

  if (remaining <= 0) {
    finishTimer();
  }
}

function grantFocus(amount, reason, options = {}) {
  const normalizedAmount = Math.max(0, Math.round(amount));
  if (!normalizedAmount) {
    return;
  }

  const createdAt = options.createdAt || new Date().toISOString();
  state.rewards.unshift({
    id: uid("reward"),
    amount: normalizedAmount,
    reason,
    createdAt,
    dateKey: options.dateKey || getLocalDateKey(new Date(createdAt)),
  });
}

function getTodayMetrics() {
  const todayKey = getLocalDateKey();
  const todaySessions = state.sessions.filter((entry) => entry.dateKey === todayKey);
  const todayFocusMinutes = todaySessions.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const todayDistractions = state.distractions.filter((entry) => entry.dateKey === todayKey);
  const tasksCompletedToday = state.tasks.filter((task) => task.completedAt && task.completedAt.startsWith(todayKey));
  const todayFocusReward = state.rewards
    .filter((entry) => entry.dateKey === todayKey)
    .reduce((sum, entry) => sum + entry.amount, 0);

  const focusScore = clamp(
    Math.round((todayFocusMinutes * 1.05) + (todaySessions.length * 10) + (tasksCompletedToday.length * 16) - (todayDistractions.length * 8)),
    0,
    100,
  );

  return {
    todaySessions,
    todayFocusMinutes,
    todayDistractions,
    tasksCompletedToday,
    todayFocusReward,
    focusScore,
  };
}

function getUniqueSessionDays() {
  return Array.from(new Set(state.sessions.map((entry) => entry.dateKey))).sort();
}

function getCurrentStreak() {
  const days = new Set(getUniqueSessionDays());
  let streak = 0;
  const cursor = new Date();

  while (days.has(getLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getBestStreak() {
  const days = getUniqueSessionDays();
  if (!days.length) {
    return 0;
  }

  let best = 1;
  let streak = 1;
  for (let index = 1; index < days.length; index += 1) {
    const previous = dateFromKey(days[index - 1]);
    const current = dateFromKey(days[index]);
    const diff = Math.round((current - previous) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      streak += 1;
      best = Math.max(best, streak);
    } else if (diff > 1) {
      streak = 1;
    }
  }

  return best;
}

function getComboMultiplier(sessionCount = getTodayMetrics().todaySessions.length) {
  if (sessionCount >= 6) {
    return 4;
  }
  if (sessionCount >= 4) {
    return 3;
  }
  if (sessionCount >= 2) {
    return 2;
  }
  return 1;
}

function getLevelData() {
  const focusBank = getFocusBank();
  let level = 1;
  let carry = focusBank;
  let nextGoal = 120;

  while (carry >= nextGoal) {
    carry -= nextGoal;
    level += 1;
    nextGoal = 120 + ((level - 1) * 60);
  }

  return {
    level,
    progress: carry,
    nextGoal,
    percent: nextGoal ? Math.round((carry / nextGoal) * 100) : 0,
  };
}

function getSummary() {
  return {
    totalSessions: state.sessions.length,
    focusBank: getFocusBank(),
    currentStreak: getCurrentStreak(),
    bestStreak: getBestStreak(),
    completedTasks: state.tasks.filter((task) => task.completed).length,
  };
}

function buildDailyQuests(metrics = getTodayMetrics()) {
  const dateKey = getLocalDateKey();
  return [
    {
      id: `quest-runs-${dateKey}`,
      title: "Finish 2 focus runs",
      progress: metrics.todaySessions.length,
      target: 2,
      reward: 20,
    },
    {
      id: `quest-focus-${dateKey}`,
      title: "Earn 60 Focus today",
      progress: metrics.todayFocusReward,
      target: 60,
      reward: 30,
    },
    {
      id: `quest-close-${dateKey}`,
      title: "Close 1 task",
      progress: metrics.tasksCompletedToday.length,
      target: 1,
      reward: 25,
    },
  ];
}

function claimQuest(questId, triggerElement) {
  const quest = buildDailyQuests().find((entry) => entry.id === questId);
  if (!quest || quest.progress < quest.target || state.claimedQuestIds.includes(questId)) {
    return;
  }

  state.claimedQuestIds.push(questId);
  grantFocus(quest.reward, `Quest: ${quest.title}`);
  saveState();
  spawnBurst(`+${quest.reward} Focus`, triggerElement);
  showToast(`Quest cleared: +${quest.reward} Focus`);
  renderAll();
}

function playChime() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(650, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(910, audioContext.currentTime + 0.25);
  gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.04);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.6);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.62);
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
    const dateKey = getLocalDateKey();
    const now = new Date().toISOString();
    const durationMinutes = Math.round(timer.totalSeconds / 60);
    const newSessionCount = getTodayMetrics().todaySessions.length + 1;
    const combo = getComboMultiplier(newSessionCount);
    const reward = durationMinutes + Math.max(0, combo - 1) * 5;
    const activeTask = state.tasks.find((task) => task.id === state.selectedTaskId) || null;

    state.sessions.unshift({
      id: uid("session"),
      taskId: activeTask ? activeTask.id : null,
      taskTitle: activeTask ? activeTask.title : null,
      durationMinutes,
      intent: elements.sessionIntent.value.trim(),
      completedAt: now,
      dateKey,
      focusReward: reward,
    });

    if (activeTask) {
      activeTask.focusMinutes = (activeTask.focusMinutes || 0) + durationMinutes;
    }

    grantFocus(reward, "Focus run", {
      createdAt: now,
      dateKey,
    });

    state.focusCycleCount += 1;
    elements.sessionIntent.value = "";
    showToast(`Run complete: +${reward} Focus banked`);
    spawnBurst(`+${reward} Focus`, elements.timerRing);
    playChime();

    const nextBreakMode = state.focusCycleCount % 4 === 0 ? "longBreak" : "shortBreak";
    resetTimerForMode(nextBreakMode);
    timer.statusMessage = "Focus secured. Take the break and protect the streak.";
  } else {
    resetTimerForMode("focus");
    timer.statusMessage = "Break complete. Queue up the next deep run.";
    playChime();
  }

  saveState();
  renderAll();
}

function spawnBurst(label, sourceElement) {
  const rect = sourceElement
    ? sourceElement.getBoundingClientRect()
    : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
  const originX = rect.left + (rect.width / 2);
  const originY = rect.top + (rect.height / 2);

  for (let index = 0; index < 7; index += 1) {
    const token = document.createElement("span");
    token.className = "burst-token";
    token.textContent = label;
    token.style.left = `${originX + ((Math.random() - 0.5) * 30)}px`;
    token.style.top = `${originY + ((Math.random() - 0.5) * 20)}px`;
    token.style.setProperty("--burst-x", `${(Math.random() - 0.5) * 170}px`);
    token.style.setProperty("--burst-y", `${-80 - (Math.random() * 120)}px`);
    token.style.animationDelay = `${index * 40}ms`;
    elements.burstLayer.appendChild(token);
    window.setTimeout(() => token.remove(), 1300);
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2600);
}

function renderVault() {
  const metrics = getTodayMetrics();
  const summary = getSummary();
  const levelData = getLevelData();

  elements.todayLabel.textContent = formatReadableDate();
  elements.focusBankStat.textContent = String(summary.focusBank);
  elements.todayFocusStat.textContent = String(metrics.todayFocusReward);
  elements.comboStat.textContent = `x${getComboMultiplier(metrics.todaySessions.length)}`;
  elements.levelLabel.textContent = `Level ${levelData.level}`;
  elements.levelProgressLabel.textContent = `${levelData.progress} / ${levelData.nextGoal}`;
  elements.levelProgressFill.style.width = `${levelData.percent}%`;
  elements.levelMessage.textContent = `${levelData.nextGoal - levelData.progress} more Focus to reach the next level.`;
  elements.streakStat.textContent = `${summary.currentStreak} day${summary.currentStreak === 1 ? "" : "s"}`;
  elements.sessionsStat.textContent = String(metrics.todaySessions.length);
  elements.focusScoreStat.textContent = String(metrics.focusScore);
  elements.focusMinutesStat.textContent = formatMinutes(metrics.todayFocusMinutes);
  elements.distractionTodayStat.textContent = String(metrics.todayDistractions.length);
  elements.tasksDoneStat.textContent = String(metrics.tasksCompletedToday.length);
}

function renderTimer() {
  const progress = timer.totalSeconds ? ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) : 0;
  const angle = `${Math.round(progress * 360)}deg`;
  const activeTask = state.tasks.find((task) => task.id === state.selectedTaskId) || null;

  elements.timerRing.style.setProperty("--progress-angle", angle);
  elements.timerRing.classList.toggle("running", timer.isRunning);
  elements.timerModeLabel.textContent = MODE_CONFIG[timer.mode].label;
  elements.timerDisplay.textContent = formatClock(timer.remainingSeconds);
  elements.activeTaskLabel.textContent = activeTask
    ? `Active task: ${activeTask.title}`
    : "No active task selected yet.";
  elements.timerStatusLabel.textContent = timer.statusMessage;
  elements.cycleCountBadge.textContent = `Cycle ${(state.focusCycleCount % 4) + 1}`;
  elements.startPauseButton.textContent = timer.isRunning ? "Pause" : "Start";

  Array.from(elements.modeSwitch.querySelectorAll("[data-mode]")).forEach((button) => {
    const isActive = button.dataset.mode === timer.mode;
    button.classList.toggle("active", isActive);
    button.disabled = timer.isRunning;
  });

  elements.presetButtons.forEach((button) => {
    const preset = Number(button.dataset.preset);
    const isActive = timer.mode === "focus" && getModeMinutes("focus") === preset;
    button.classList.toggle("active", isActive);
    button.disabled = timer.isRunning;
  });

  document.title = `${formatClock(timer.remainingSeconds)} | BePro`;
}

function renderQuests() {
  const quests = buildDailyQuests();
  elements.questList.innerHTML = quests.map((quest) => {
    const percent = clamp(Math.round((quest.progress / quest.target) * 100), 0, 100);
    const complete = quest.progress >= quest.target;
    const claimed = state.claimedQuestIds.includes(quest.id);
    return `
      <article class="quest-card ${complete ? "complete" : ""}">
        <div class="quest-top">
          <div>
            <p class="quest-title">${escapeHtml(quest.title)}</p>
            <div class="quest-meta">
              <span>${quest.progress} / ${quest.target}</span>
              <span class="quest-reward">+${quest.reward} Focus</span>
            </div>
          </div>
          ${complete && !claimed ? `<button type="button" class="claim-button" data-claim-quest="${quest.id}">Claim</button>` : ""}
          ${claimed ? `<span class="cycle-pill">Claimed</span>` : ""}
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${percent}%"></div>
        </div>
      </article>
    `;
  }).join("");

  const summary = getSummary();
  elements.badgeList.innerHTML = ACHIEVEMENTS.map((achievement) => {
    const unlocked = achievement.test(summary);
    return `
      <article class="badge-card ${unlocked ? "unlocked" : ""}">
        <strong>${achievement.name}</strong>
        <span>${escapeHtml(achievement.description)}</span>
      </article>
    `;
  }).join("");
}

function renderTasks() {
  if (!state.tasks.length) {
    elements.taskList.innerHTML = `
      <li class="empty-state">Add a task, set it active, and let your Focus runs move it forward.</li>
    `;
    return;
  }

  const items = state.tasks
    .slice()
    .sort((left, right) => Number(left.completed) - Number(right.completed))
    .map((task) => {
      const isActive = task.id === state.selectedTaskId;
      return `
        <li class="task-item ${isActive ? "active" : ""} ${task.completed ? "completed" : ""}">
          <div class="task-top">
            <p class="task-title">${escapeHtml(task.title)}</p>
            <div class="task-badges">
              <span class="badge priority-${task.priority}">${PRIORITY_LABELS[task.priority]}</span>
              <span class="badge progress-badge">${task.focusMinutes}/${task.estimatedMinutes} min</span>
            </div>
          </div>
          <div class="task-bottom">
            <div class="task-actions">
              <button type="button" class="ghost-button ${isActive ? "active-state" : ""}" data-action="select-task" data-task-id="${task.id}">
                ${isActive ? "Active" : "Set active"}
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
  const recent = state.distractions
    .slice()
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, 6);

  if (!recent.length) {
    elements.distractionList.innerHTML = `
      <li class="empty-state">No distractions logged yet. Keep it clean or track the triggers when they hit.</li>
    `;
    return;
  }

  elements.distractionList.innerHTML = recent.map((entry) => {
    const note = entry.note ? ` - ${escapeHtml(entry.note)}` : "";
    return `
      <li class="distraction-item">
        <div>
          <div class="distraction-label">${escapeHtml(entry.label)}</div>
          <div class="distraction-meta">${formatReadableDate(new Date(entry.createdAt))}${note}</div>
        </div>
        <span class="distraction-meta">${formatTimeLabel(entry.createdAt)}</span>
      </li>
    `;
  }).join("");
}

function buildRangeData(range) {
  if (range === "week") {
    const points = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const dateKey = getLocalDateKey(date);
      const focusMinutes = state.sessions
        .filter((entry) => entry.dateKey === dateKey)
        .reduce((sum, entry) => sum + entry.durationMinutes, 0);
      points.push({
        key: dateKey,
        label: formatShortDay(dateKey),
        fullLabel: formatReadableDate(date),
        value: focusMinutes,
      });
    }
    return {
      label: "Last 7 days",
      points,
    };
  }

  if (range === "month") {
    const points = [];
    for (let offset = 29; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const dateKey = getLocalDateKey(date);
      const focusMinutes = state.sessions
        .filter((entry) => entry.dateKey === dateKey)
        .reduce((sum, entry) => sum + entry.durationMinutes, 0);
      points.push({
        key: dateKey,
        label: formatDayNumber(dateKey),
        fullLabel: new Intl.DateTimeFormat(undefined, {
          month: "short",
          day: "numeric",
        }).format(date),
        value: focusMinutes,
      });
    }
    return {
      label: "Last 30 days",
      points,
    };
  }

  const points = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - offset);
    const month = date.getMonth();
    const year = date.getFullYear();
    const value = state.sessions.reduce((sum, entry) => {
      const entryDate = dateFromKey(entry.dateKey);
      if (entryDate.getMonth() === month && entryDate.getFullYear() === year) {
        return sum + entry.durationMinutes;
      }
      return sum;
    }, 0);
    points.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: formatMonthLabel(date),
      fullLabel: formatMonthYear(date),
      value,
    });
  }
  return {
    label: "Last 12 months",
    points,
  };
}

function buildLinePath(points) {
  if (!points.length) {
    return "";
  }
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function animateChartLine() {
  const line = elements.productivityChart.querySelector(".chart-line");
  if (!line) {
    return;
  }
  const length = line.getTotalLength();
  line.style.strokeDasharray = `${length}`;
  line.style.strokeDashoffset = `${length}`;
  line.getBoundingClientRect();
  line.style.transition = "stroke-dashoffset 900ms cubic-bezier(0.2, 0.8, 0.2, 1)";
  line.style.strokeDashoffset = "0";
}

function renderChart() {
  const range = buildRangeData(selectedRange);
  const total = range.points.reduce((sum, point) => sum + point.value, 0);
  const average = range.points.length ? Math.round(total / range.points.length) : 0;
  const best = range.points.reduce((winner, point) => {
    if (!winner || point.value > winner.value) {
      return point;
    }
    return winner;
  }, null);

  elements.chartRangeLabel.textContent = range.label;
  elements.rangeTotalStat.textContent = formatMinutes(total);
  elements.rangeAverageStat.textContent = formatMinutes(average);
  elements.rangeBestStat.textContent = best && best.value > 0 ? `${best.fullLabel} - ${best.value} min` : "None yet";
  elements.chartFooter.textContent = best && best.value > 0
    ? `${best.fullLabel} was your strongest period with ${best.value} focused minutes.`
    : "No focus history yet. Finish a session to draw your first curve.";

  const svgWidth = 760;
  const svgHeight = 320;
  const padding = { top: 24, right: 24, bottom: 48, left: 52 };
  const innerWidth = svgWidth - padding.left - padding.right;
  const innerHeight = svgHeight - padding.top - padding.bottom;
  const maxValue = Math.max(...range.points.map((point) => point.value), 10);
  const step = range.points.length > 1 ? innerWidth / (range.points.length - 1) : innerWidth;

  const pointGeometry = range.points.map((point, index) => {
    const x = padding.left + (index * step);
    const y = padding.top + innerHeight - ((point.value / maxValue) * innerHeight);
    return { ...point, x, y };
  });

  const linePath = buildLinePath(pointGeometry);
  const areaPath = pointGeometry.length
    ? `${linePath} L ${pointGeometry[pointGeometry.length - 1].x} ${padding.top + innerHeight} L ${pointGeometry[0].x} ${padding.top + innerHeight} Z`
    : "";

  const labelStride = selectedRange === "month" ? 4 : 1;
  const gridLines = [];
  for (let stepIndex = 0; stepIndex <= 4; stepIndex += 1) {
    const y = padding.top + ((innerHeight / 4) * stepIndex);
    const value = Math.round(maxValue - ((maxValue / 4) * stepIndex));
    gridLines.push(`
      <line class="chart-grid-line" x1="${padding.left}" y1="${y}" x2="${svgWidth - padding.right}" y2="${y}"></line>
      <text class="chart-value-label" x="${padding.left - 10}" y="${y + 4}" text-anchor="end">${value}</text>
    `);
  }

  const labels = pointGeometry.map((point, index) => {
    const shouldShow = selectedRange !== "month" || index % labelStride === 0 || index === pointGeometry.length - 1;
    if (!shouldShow) {
      return "";
    }
    return `<text class="chart-axis-label" x="${point.x}" y="${svgHeight - 16}" text-anchor="middle">${point.label}</text>`;
  }).join("");

  const points = pointGeometry.map((point) => {
    const peakClass = best && point.key === best.key && point.value > 0 ? "is-peak" : "";
    return `<circle class="chart-point ${peakClass}" cx="${point.x}" cy="${point.y}" r="6"></circle>`;
  }).join("");

  elements.productivityChart.innerHTML = `
    <defs>
      <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#1fc8ff" stop-opacity="0.42"></stop>
        <stop offset="100%" stop-color="#1fc8ff" stop-opacity="0.02"></stop>
      </linearGradient>
    </defs>
    ${gridLines.join("")}
    ${areaPath ? `<path class="chart-area" d="${areaPath}"></path>` : ""}
    ${linePath ? `<path class="chart-line" d="${linePath}"></path>` : ""}
    ${points}
    ${labels}
  `;

  animateChartLine();
}

function renderAll() {
  renderVault();
  renderTimer();
  renderQuests();
  renderTasks();
  renderDistractions();
  renderChart();
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
    rewardGranted: false,
    createdAt: new Date().toISOString(),
  });
  saveState();
  renderAll();
}

function selectTask(taskId) {
  const task = state.tasks.find((entry) => entry.id === taskId && !entry.completed);
  state.selectedTaskId = task ? task.id : null;
  saveState();
  renderAll();
}

function toggleTask(taskId, triggerElement) {
  const task = state.tasks.find((entry) => entry.id === taskId);
  if (!task) {
    return;
  }

  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;

  if (task.completed && !task.rewardGranted) {
    task.rewardGranted = true;
    grantFocus(20, "Task cleared");
    spawnBurst("+20 Focus", triggerElement);
    showToast("Task cleared: +20 Focus");
  }

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
  if (!title || estimatedMinutes < 5) {
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
    toggleTask(taskId, button);
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
  });

  elements.questList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-claim-quest]");
    if (!button) {
      return;
    }
    claimQuest(button.dataset.claimQuest, button);
  });

  elements.rangeSwitch.addEventListener("click", (event) => {
    const button = event.target.closest("[data-range]");
    if (!button) {
      return;
    }
    selectedRange = button.dataset.range;
    Array.from(elements.rangeSwitch.querySelectorAll("[data-range]")).forEach((entry) => {
      entry.classList.toggle("active", entry.dataset.range === selectedRange);
    });
    renderChart();
  });
}

bindEvents();
renderAll();

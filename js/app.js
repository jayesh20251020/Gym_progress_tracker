/**
 * app.js
 * -----------------------------------------------------------------------
 * The glue: boots the app, wires up navigation and the rest timer, applies
 * the theme, and manages the optional workout reminder notification.
 * -----------------------------------------------------------------------
 */

const App = (() => {

  const state = {
    activeWorkoutMode: false
  };

  let elapsedTimer = null;
  let reminderInterval = null;

  /* ---------------------------------------------------------------------
   * Theme
   * ------------------------------------------------------------------- */

  function applyTheme() {
    const settings = Storage.get().settings || {};
    const theme = settings.theme || 'dark';

    document.documentElement.setAttribute('data-theme', theme);
  }

  /* ---------------------------------------------------------------------
   * Navigation
   * ------------------------------------------------------------------- */

  function wireNavigation() {

    // One delegated handler handles buttons with data-view.
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-view]');

      if (!btn) return;

      const viewName = btn.dataset.view;

      if (!viewName) return;

      UI.goToView(viewName, {
        showBack: btn.dataset.showBack === 'true'
      });
    });

    const backBtn = document.getElementById('backBtn');

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        UI.goToView('dashboard');
      });
    }

    const startWorkoutFab = document.getElementById('startWorkoutFab');

    if (startWorkoutFab) {
      startWorkoutFab.addEventListener('click', () => {

        if (Workouts.getActive()) {
          UI.goToView('workout');
        } else {
          Workouts.startNewWorkout();
        }

      });
    }
  }

  /* ---------------------------------------------------------------------
   * Rest timer
   * ------------------------------------------------------------------- */

  const timer = {
    seconds: 90,
    remaining: 90,
    interval: null,
    running: false
  };

  function openRestTimer() {

    const el = document.getElementById('restTimer');

    if (!el) return;

    el.classList.remove('hidden');

    requestAnimationFrame(() => {
      el.classList.add('show');
    });

    resetTimer(timer.seconds);
    startTimerTick();
  }

  function closeRestTimer() {

    const el = document.getElementById('restTimer');

    stopTimerTick();

    if (!el) return;

    el.classList.remove('show');

    setTimeout(() => {
      el.classList.add('hidden');
    }, 200);
  }

  function startTimerTick() {

    stopTimerTick();

    timer.running = true;

    const toggleBtn = document.getElementById('restToggle');

    if (toggleBtn) {
      toggleBtn.textContent = 'Pause';
    }

    timer.interval = setInterval(() => {

      timer.remaining--;

      updateTimerDisplay();

      if (timer.remaining <= 0) {

        stopTimerTick();

        UI.toast(
          'Rest complete — back to work!',
          'success'
        );

        if (
          'vibrate' in navigator &&
          typeof navigator.vibrate === 'function'
        ) {
          navigator.vibrate(200);
        }
      }

    }, 1000);
  }

  function stopTimerTick() {

    if (timer.interval !== null) {
      clearInterval(timer.interval);
      timer.interval = null;
    }

    timer.running = false;

    const btn = document.getElementById('restToggle');

    if (btn) {
      btn.textContent = 'Start';
    }
  }

  function resetTimer(seconds) {

    const safeSeconds = Number.isFinite(seconds)
      ? Math.max(0, Math.round(seconds))
      : 90;

    timer.seconds = safeSeconds;
    timer.remaining = safeSeconds;

    updateTimerDisplay();
  }

  function updateTimerDisplay() {

    const display = document.getElementById('restTimeDisplay');

    if (!display) return;

    const remaining = Math.max(0, timer.remaining);

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    display.textContent =
      `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function wireRestTimer() {

    const closeBtn = document.getElementById('restTimerClose');
    const toggleBtn = document.getElementById('restToggle');
    const resetBtn = document.getElementById('restReset');
    const add15Btn = document.getElementById('restAdd15');
    const presets = document.getElementById('restPresets');

    if (closeBtn) {
      closeBtn.addEventListener('click', closeRestTimer);
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {

        if (timer.running) {
          stopTimerTick();
        } else {
          startTimerTick();
        }

      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        resetTimer(timer.seconds);
      });
    }

    if (add15Btn) {
      add15Btn.addEventListener('click', () => {

        timer.remaining += 15;

        updateTimerDisplay();
      });
    }

    if (presets) {
      presets.addEventListener('click', (e) => {

        const btn = e.target.closest('button');

        if (!btn) return;

        const seconds = parseInt(btn.dataset.sec, 10);

        if (!Number.isFinite(seconds)) return;

        presets
          .querySelectorAll('button')
          .forEach(button => {
            button.classList.remove('active');
          });

        btn.classList.add('active');

        resetTimer(seconds);
        startTimerTick();
      });
    }
  }

  /* ---------------------------------------------------------------------
   * Workout reminder
   * ------------------------------------------------------------------- */

  function scheduleReminder() {

    clearReminder();

    const settings = Storage.get().settings || {};

    if (!settings.reminderEnabled) {
      return;
    }

    if (!('Notification' in window)) {
      console.log('Notifications are not supported by this browser.');
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    let lastFired = null;

    reminderInterval = setInterval(() => {

      const now = new Date();

      const currentTime =
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Use local date instead of UTC.
      const todayKey =
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      if (
        currentTime === settings.reminderTime &&
        lastFired !== todayKey
      ) {

        lastFired = todayKey;

        try {
          new Notification('IronLog', {
            body: 'Time for your workout 💪'
          });
        } catch (error) {
          console.error(
            'Could not show IronLog notification:',
            error
          );
        }
      }

    }, 20000);
  }

  function clearReminder() {

    if (reminderInterval !== null) {
      clearInterval(reminderInterval);
      reminderInterval = null;
    }
  }

  /* ---------------------------------------------------------------------
   * Active workout elapsed-time display
   * ------------------------------------------------------------------- */

  function startElapsedTimer() {

    stopElapsedTimer();

    elapsedTimer = setInterval(() => {

      const workout = Workouts.getActive();

      const label =
        document.querySelector('.workout-timer-label');

      if (!workout || !label) {
        return;
      }

      const elapsedMinutes = Math.max(
        0,
        Math.round(
          (Date.now() - workout.startedAt) / 60000
        )
      );

      label.textContent =
        `⏱ ${elapsedMinutes} min elapsed`;

    }, 30000);
  }

  function stopElapsedTimer() {

    if (elapsedTimer !== null) {
      clearInterval(elapsedTimer);
      elapsedTimer = null;
    }
  }

    /* ---------------------------------------------------------------------
   * Logout
   * ------------------------------------------------------------------- */

  async function logout() {

    try {
      const response = await fetch(
        `${window.IRONLOG_CONFIG.API_BASE.replace(/\/$/, '')}/api/logout`,
        {
          method: 'POST',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        UI.toast('Could not log out.', 'error');
        return;
      }

      // Stop timers/reminders.
      stopElapsedTimer();
      clearReminder();
      stopTimerTick();

      // Clear local cached IronLog data.
      localStorage.removeItem('ironlog_data_v1');

      // Send user back to login.
      window.location.href = 'auth.html';

    } catch (error) {

      console.error('IronLog logout failed:', error);

      UI.toast(
        'Could not connect to IronLog server.',
        'error'
      );
    }
  }

  /* ---------------------------------------------------------------------
   * Boot
   * ------------------------------------------------------------------- */
  async function logout() {
  try {
    const response = await fetch(
      `${window.IRONLOG_CONFIG.API_BASE.replace(/\/$/, '')}/api/logout`,
      {
        method: 'POST',
        credentials: 'include'
      }
    );

    if (!response.ok) {
      UI.toast('Could not log out.', 'error');
      return;
    }

    // Stop anything running in the app
    stopElapsedTimer();
    clearReminder();
    stopTimerTick();

    // Remove local user data
    localStorage.removeItem('ironlog_data_v1');

    // Go back to login page
    window.location.href = 'auth.html';

  } catch (error) {
    console.error('IronLog logout failed:', error);
    UI.toast('Could not connect to IronLog server.', 'error');
  }
}
  async function init() {

    const authResult = await Storage.hydrate();

    /*
     * If there is no active login session, send the user
     * to the authentication page.
     */
    if (authResult.loggedOut) {

      window.location.href = 'auth.html';

      return;
    }

    /*
     * Backend failed for another reason.
     * We don't continue because the current app is designed
     * to use the PostgreSQL-backed data after login.
     */
    if (!authResult.success) {

      console.error(
        'IronLog backend is unavailable.'
      );

      UI.toast(
        'Could not connect to IronLog server.',
        'error'
      );

      return;
    }

    // Backend data is now loaded.
    applyTheme();

    wireNavigation();

    wireRestTimer();

    scheduleReminder();

    // Restore workout mode if a workout was already in progress.
    const activeWorkout = Workouts.getActive();

    state.activeWorkoutMode = !!activeWorkout;

    UI.goToView(
      activeWorkout ? 'workout' : 'dashboard'
    );

    startElapsedTimer();
  }

  /* ---------------------------------------------------------------------
   * Public API
   * ------------------------------------------------------------------- */

  document.addEventListener(
    'DOMContentLoaded',
    init
  );

  return {
    state,
    applyTheme,
    openRestTimer,
    closeRestTimer,
    scheduleReminder,
    clearReminder,
    logout
  };

})();

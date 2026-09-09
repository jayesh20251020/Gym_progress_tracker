/**
 * ui.js
 * -----------------------------------------------------------------------
 * Shared UI plumbing:
 * - View navigation
 * - Toast notifications
 * - Modals
 * - Formatting helpers
 * - Dashboard
 * - Exercise Library
 * - History
 * - Calendar
 * - Personal Records
 * - Profile
 * - Settings
 *
 * Interactive workout-builder / active-workout logic lives in workouts.js.
 * Progress charts live in progress.js.
 * -----------------------------------------------------------------------
 */

const UI = (() => {

  /* =====================================================================
   * FORMATTING HELPERS
   * ===================================================================== */

  function unit() {
    return Storage.get().settings?.weightUnit || 'kg';
  }

  /**
   * Format a stored kilogram value for display.
   */
  function fmtWeight(kg) {
    const value = Number(kg);

    if (!Number.isFinite(value)) {
      return `0 ${unit()}`;
    }

    if (unit() === 'lb') {
      return `${Math.round(value * 2.20462 * 10) / 10} lb`;
    }

    return `${Math.round(value * 10) / 10} kg`;
  }

  /**
   * Convert a value typed by the user in the current weight unit
   * into kilograms for storage.
   */
  function rawWeightForUnit(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return 0;
    }

    return unit() === 'lb'
      ? numericValue / 2.20462
      : numericValue;
  }

  /**
   * Convert a stored kilogram value into the currently selected
   * display unit.
   */
  function displayWeightFromKg(kg) {
    const value = Number(kg);

    if (!Number.isFinite(value)) {
      return 0;
    }

    return unit() === 'lb'
      ? Math.round(value * 2.20462 * 10) / 10
      : Math.round(value * 10) / 10;
  }

  /**
   * Format an ISO date string.
   */
  function fmtDate(iso, opts) {
    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
      return 'Unknown date';
    }

    return date.toLocaleDateString(
      undefined,
      opts || {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }
    );
  }

  /**
   * Format duration in seconds.
   */
  function fmtDuration(sec) {
    const seconds = Number(sec);

    if (!Number.isFinite(seconds) || seconds <= 0) {
      return '0 min';
    }

    const minutes = Math.round(seconds / 60);

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Return today's date in YYYY-MM-DD format.
   */
  function todayISO() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Escape user-provided text before inserting it into HTML.
   */
  function escapeHTML(str) {
    return String(str ?? '').replace(
      /[&<>"']/g,
      character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character]
    );
  }

  /* =====================================================================
   * TOASTS
   * ===================================================================== */

  function toast(message, type = 'info') {
    const stack = document.getElementById('toastStack');

    if (!stack) {
      console.warn('IronLog toast container not found:', message);
      return;
    }

    const el = document.createElement('div');

    el.className = `toast toast-${type}`;
    el.textContent = message;

    stack.appendChild(el);

    requestAnimationFrame(() => {
      el.classList.add('show');
    });

    setTimeout(() => {
      el.classList.remove('show');

      setTimeout(() => {
        el.remove();
      }, 250);
    }, 2800);
  }

  /* =====================================================================
   * MODALS
   * ===================================================================== */

  /**
   * Open the shared modal.
   *
   * @param {string} html
   * @param {Object} options
   * @param {Function} options.onClose
   */
  function openModal(html, { onClose } = {}) {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('modal');

    if (!overlay || !modal) {
      console.error('IronLog modal elements are missing.');
      return null;
    }

    modal.innerHTML = html;

    overlay.classList.remove('hidden');

    requestAnimationFrame(() => {
      overlay.classList.add('show');
    });

    document.body.classList.add('modal-open');

    const closeFn = () => closeModal(onClose);

    overlay.onclick = event => {
      if (event.target === overlay) {
        closeFn();
      }
    };

    modal
      .querySelectorAll('[data-modal-close]')
      .forEach(button => {
        button.addEventListener('click', closeFn);
      });

    return modal;
  }

  function closeModal(onClose) {
    const overlay = document.getElementById('modalOverlay');

    if (!overlay) {
      if (onClose) {
        onClose();
      }
      return;
    }

    overlay.classList.remove('show');
    document.body.classList.remove('modal-open');

    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 200);

    if (onClose) {
      onClose();
    }
  }

  /**
   * Shared confirmation dialog.
   */
  function confirmDialog({
    title,
    body,
    confirmText = 'Confirm',
    danger = false
  }) {
    return new Promise(resolve => {
      const modal = openModal(`
        <div class="modal-header">
          <h3>${escapeHTML(title)}</h3>
        </div>

        <div class="modal-body">
          <p>${body}</p>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn ghost" data-modal-close>
            Cancel
          </button>

          <button
            type="button"
            class="btn ${danger ? 'danger' : 'primary'}"
            id="modalConfirmBtn"
          >
            ${escapeHTML(confirmText)}
          </button>
        </div>
      `);

      if (!modal) {
        resolve(false);
        return;
      }

      const confirmButton = modal.querySelector('#modalConfirmBtn');

      confirmButton?.addEventListener('click', () => {
        closeModal();
        resolve(true);
      });

      modal
        .querySelectorAll('[data-modal-close]')
        .forEach(button => {
          button.addEventListener('click', () => {
            resolve(false);
          });
        });
    });
  }

  /* =====================================================================
   * VIEW NAVIGATION
   * ===================================================================== */

  const viewTitles = {
    dashboard: 'Dashboard',
    workout: 'Workout',
    library: 'Exercises',
    progress: 'Progress',
    history: 'History',
    calendar: 'Calendar',
    prs: 'Personal Records',
    profile: 'Profile',
    settings: 'Settings'
  };

  function goToView(viewName, opts = {}) {
    const view = document.querySelector(
      `.view[data-view="${CSS.escape(viewName)}"]`
    );

    if (!view) {
      console.warn(`IronLog view not found: ${viewName}`);
      return;
    }

    document
      .querySelectorAll('.view')
      .forEach(viewElement => {
        viewElement.classList.toggle(
          'active',
          viewElement.dataset.view === viewName
        );
      });

    document
      .querySelectorAll('.nav-item, .bn-item')
      .forEach(button => {
        button.classList.toggle(
          'active',
          button.dataset.view === viewName
        );
      });

    const backButton = document.getElementById('backBtn');

    if (backButton) {
      backButton.classList.toggle('hidden', !opts.showBack);
    }

    const views = document.getElementById('views');

    if (views) {
      views.scrollTop = 0;
    }

    window.scrollTo(0, 0);

    /*
     * Render the selected view every time it is opened so its content
     * always reflects the latest Storage data.
     */
    const renderers = {
      dashboard: renderDashboard,
      library: renderLibrary,
      progress: () => Progress.render(),
      history: renderHistory,
      calendar: renderCalendar,
      prs: renderPRs,
      profile: renderProfile,
      settings: renderSettings,
      workout: () => Workouts.renderWorkoutView()
    };

    if (renderers[viewName]) {
      renderers[viewName]();
    }

    const topbarTitle = document.getElementById('topbarTitle');

    if (topbarTitle) {
      topbarTitle.textContent =
        viewName === 'workout' && App.state.activeWorkoutMode
          ? 'Active Workout'
          : (viewTitles[viewName] || '');
    }
  }

  /* =====================================================================
   * EMPTY STATE
   * ===================================================================== */

  function emptyState({
    icon = '🏋️',
    title,
    body,
    ctaLabel,
    ctaView
  }) {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>

        <p class="empty-title">
          ${escapeHTML(title)}
        </p>

        <p class="empty-body">
          ${escapeHTML(body)}
        </p>

        ${ctaLabel
        ? `
              <button
                type="button"
                class="btn primary"
                data-view="${escapeHTML(ctaView || '')}"
              >
                ${escapeHTML(ctaLabel)}
              </button>
            `
        : ''
      }
      </div>
    `;
  }

  /* =====================================================================
   * DASHBOARD
   * ===================================================================== */

  function computeStreak(workouts) {
    if (!Array.isArray(workouts) || workouts.length === 0) {
      return 0;
    }

    const days = new Set();

    workouts.forEach(workout => {
      if (!workout?.date) {
        return;
      }

      const date = new Date(workout.date);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      days.add(`${year}-${month}-${day}`);
    });

    if (!days.size) {
      return 0;
    }

    let streak = 0;
    const cursor = new Date();

    /*
     * If there is no workout today, begin counting from yesterday.
     */
    const today = todayISO();

    if (!days.has(today)) {
      cursor.setDate(cursor.getDate() - 1);
    }

    while (true) {
      const year = cursor.getFullYear();
      const month = String(cursor.getMonth() + 1).padStart(2, '0');
      const day = String(cursor.getDate()).padStart(2, '0');

      const key = `${year}-${month}-${day}`;

      if (!days.has(key)) {
        break;
      }

      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }

  function renderDashboard() {
    const data = Storage.get();

    const workouts = Array.isArray(data.workouts)
      ? data.workouts
      : [];

    const profile = data.profile || {};

    const el = document.getElementById('dashboardContent');

    if (!el) {
      return;
    }

    const name = profile.name
      ? profile.name.split(' ')[0]
      : '';

    const streak = computeStreak(workouts);

    const now = new Date();

    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    const thisWeek = workouts.filter(workout => {
      const date = new Date(workout.date);

      return (
        !Number.isNaN(date.getTime()) &&
        date >= weekAgo &&
        date <= now
      );
    });

    const totalVolumeAllTime = workouts.reduce(
      (sum, workout) => sum + (Number(workout.totalVolume) || 0),
      0
    );

    const recent = workouts.slice(0, 3);

    let motivation = 'Ready when you are.';

    if (streak >= 2) {
      motivation = `You're on a ${streak}-day streak! 💪`;
    } else if (thisWeek.length > 0) {
      motivation =
        `${thisWeek.length} workout${thisWeek.length > 1 ? 's' : ''} this week 💪`;
    } else if (workouts.length > 0) {
      motivation = 'Keep showing up.';
    }

    el.innerHTML = `
      <div class="dash-greeting">
        <p class="dash-hello">
          ${name
        ? `Welcome back, ${escapeHTML(name)}`
        : 'Welcome to IronLog'
      }
        </p>

        <p class="dash-motivation">
          ${escapeHTML(motivation)}
        </p>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <span class="stat-value">${streak}</span>
          <span class="stat-label">Day streak</span>
        </div>

        <div class="stat-card">
          <span class="stat-value">${workouts.length}</span>
          <span class="stat-label">Total workouts</span>
        </div>

        <div class="stat-card">
          <span class="stat-value">${thisWeek.length}</span>
          <span class="stat-label">This week</span>
        </div>

        <div class="stat-card">
          <span class="stat-value">
            ${profile.weight !== '' &&
        profile.weight !== null &&
        profile.weight !== undefined
        ? displayWeightFromKg(profile.weight)
        : '—'
      }
          </span>

          <span class="stat-label">
            Body weight (${escapeHTML(unit())})
          </span>
        </div>
      </div>

      <button type="button" class="cta-start-workout" id="dashStartWorkout">
        <span>Start a workout</span>

        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6"/>
        </svg>
      </button>

      <div class="section-block">
        <div class="section-heading">
          <h2>Recent workouts</h2>

          ${workouts.length
        ? '<button type="button" class="link-btn" data-view="history">See all</button>'
        : ''
      }
        </div>

        ${recent.length === 0
        ? emptyState({
          icon: '📋',
          title: 'No workouts yet',
          body: 'Your first workout starts here.',
          ctaLabel: 'Start Workout',
          ctaView: 'workout'
        })
        : `
              <div class="workout-list">
                ${recent.map(workoutRowHTML).join('')}
              </div>
            `
      }
      </div>

      <div class="section-block">
        <div class="section-heading">
          <h2>Lifetime volume</h2>
        </div>

        <div class="volume-banner">
          <span class="volume-number">
            ${Math.round(totalVolumeAllTime).toLocaleString()}
          </span>

          <span class="volume-unit">
            ${escapeHTML(unit())} lifted, all time
          </span>
        </div>

        <p class="hint-text">
          Volume = the total weight you’ve moved across every set
          (weight × reps, added up).
        </p>
      </div>
    `;

    const startButton = document.getElementById('dashStartWorkout');

    if (startButton) {
      startButton.addEventListener('click', () => {
        Workouts.startNewWorkout();
      });
    }
  }

  function workoutRowHTML(workout) {
    const exercises = Array.isArray(workout?.exercises)
      ? workout.exercises
      : [];

    const exCount = exercises.length;

    const setCount = exercises.reduce(
      (sum, exercise) =>
        sum + (
          Array.isArray(exercise?.sets)
            ? exercise.sets.length
            : 0
        ),
      0
    );

    return `
      <button
        type="button"
        class="workout-row"
        data-open-workout="${escapeHTML(workout?.id || '')}"
      >
        <div class="workout-row-main">
          <p class="workout-row-name">
            ${escapeHTML(workout?.name || 'Workout')}
          </p>

          <p class="workout-row-meta">
            ${fmtDate(workout?.date)}
            · ${exCount} exercise${exCount !== 1 ? 's' : ''}
            · ${setCount} sets
          </p>
        </div>

        <div class="workout-row-side">
          <span>${fmtDuration(workout?.durationSec)}</span>

          <svg viewBox="0 0 24 24" class="chev" aria-hidden="true">
            <path d="M9 6l6 6-6 6"/>
          </svg>
        </div>
      </button>
    `;
  }

  /* =====================================================================
   * EXERCISE LIBRARY
   * ===================================================================== */

  let libraryFilter = {
    group: 'All',
    search: ''
  };

  function renderLibrary() {
    const el = document.getElementById('libraryContent');

    if (!el) {
      return;
    }

    const all = ExerciseLibrary.getAll();
    const groups = ['All', ...ExerciseLibrary.GROUPS];

    el.innerHTML = `
      <div class="library-toolbar">
        <input
          type="search"
          id="librarySearch"
          class="text-input"
          placeholder="Search exercises…"
          value="${escapeHTML(libraryFilter.search)}"
        >

        <button
          type="button"
          class="btn ghost small"
          id="addCustomExerciseBtn"
        >
          + Add Exercise
        </button>
      </div>

      <div class="chip-row" id="groupChips">
        ${groups.map(group => `
          <button
            type="button"
            class="chip ${libraryFilter.group === group ? 'active' : ''}"
            data-group="${escapeHTML(group)}"
          >
            ${escapeHTML(group)}
          </button>
        `).join('')}
      </div>

      <div class="exercise-list" id="exerciseList"></div>
    `;

    const searchInput =
      document.getElementById('librarySearch');

    const groupChips =
      document.getElementById('groupChips');

    const addButton =
      document.getElementById('addCustomExerciseBtn');

    searchInput?.addEventListener('input', event => {
      libraryFilter.search = event.target.value;
      renderExerciseList();
    });

    groupChips?.addEventListener('click', event => {
      const button = event.target.closest('.chip');

      if (!button) {
        return;
      }

      libraryFilter.group = button.dataset.group || 'All';

      renderLibrary();
    });

    addButton?.addEventListener(
      'click',
      openAddExerciseModal
    );

    renderExerciseList();

    function renderExerciseList() {
      const listEl =
        document.getElementById('exerciseList');

      if (!listEl) {
        return;
      }

      let list = [...all];

      if (libraryFilter.group !== 'All') {
        list = list.filter(
          exercise =>
            exercise.group === libraryFilter.group
        );
      }

      const query = libraryFilter.search
        .trim()
        .toLowerCase();

      if (query) {
        list = list.filter(exercise =>
          String(exercise.name || '')
            .toLowerCase()
            .includes(query)
        );
      }

      if (!list.length) {
        listEl.innerHTML = emptyState({
          icon: '🔍',
          title: 'No exercises found',
          body: 'Try a different search or filter.'
        });

        return;
      }

      listEl.innerHTML = list.map(exercise => `
        <button
          type="button"
          class="exercise-card"
          data-exercise-id="${escapeHTML(exercise.id)}"
        >
          <div class="exercise-card-main">
            <p class="exercise-name">
              ${escapeHTML(exercise.name)}

              ${exercise.beginner
          ? '<span class="badge beginner">Beginner</span>'
          : ''
        }
            </p>

            <p class="exercise-meta">
              ${escapeHTML(exercise.group)}
              ·
              ${escapeHTML(exercise.equipment)}
            </p>
          </div>

          <svg
            viewBox="0 0 24 24"
            class="chev"
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6"/>
          </svg>
        </button>
      `).join('');

      listEl
        .querySelectorAll('.exercise-card')
        .forEach(card => {
          card.addEventListener('click', () => {
            openExerciseDetail(
              card.dataset.exerciseId
            );
          });
        });
    }
  }

  function openExerciseDetail(id) {
    const exercise = ExerciseLibrary.getById(id);

    if (!exercise) {
      return;
    }

    const modal = openModal(`
      <div class="modal-header">
        <h3>${escapeHTML(exercise.name)}</h3>
      </div>

      <div class="modal-body">
        <div class="chip-row" style="margin-bottom:12px;">
          <span class="chip static">
            ${escapeHTML(exercise.group)}
          </span>

          <span class="chip static">
            ${escapeHTML(exercise.equipment)}
          </span>

          ${exercise.beginner
        ? '<span class="chip static beginner">Beginner-friendly</span>'
        : ''
      }
        </div>

        <p class="detail-label">
          How to do it
        </p>

        <p class="detail-text">
          ${escapeHTML(
        exercise.instructions ||
        'No instructions added yet.'
      )}
        </p>

        ${exercise.tips
        ? `
              <p class="detail-label">
                Form tip
              </p>

              <p class="detail-text">
                ${escapeHTML(exercise.tips)}
              </p>
            `
        : ''
      }
      </div>

      <div class="modal-footer">
        <button
          type="button"
          class="btn ghost"
          data-modal-close
        >
          Close
        </button>

        <button
          type="button"
          class="btn primary"
          id="addToWorkoutBtn"
        >
          Add to workout
        </button>
      </div>
    `);

    if (!modal) {
      return;
    }

    modal
      .querySelector('#addToWorkoutBtn')
      ?.addEventListener('click', () => {
        closeModal();
        Workouts.addExerciseToActiveOrDraft(exercise);
      });
  }

  function openAddExerciseModal() {
    const modal = openModal(`
      <div class="modal-header">
        <h3>Add a custom exercise</h3>
      </div>

      <div class="modal-body">
        <label class="field-label">
          Name
        </label>

        <input
          class="text-input"
          id="newExName"
          placeholder="e.g. Cable Crunch"
        >

        <label class="field-label">
          Muscle group
        </label>

        <select
          class="text-input"
          id="newExGroup"
        >
          ${ExerciseLibrary.GROUPS.map(group => `
            <option value="${escapeHTML(group)}">
              ${escapeHTML(group)}
            </option>
          `).join('')}
        </select>

        <label class="field-label">
          Equipment
        </label>

        <input
          class="text-input"
          id="newExEquip"
          placeholder="e.g. Dumbbells"
        >

        <label class="field-label">
          Instructions (optional)
        </label>

        <textarea
          class="text-input"
          id="newExInstructions"
          rows="3"
        ></textarea>

        <label class="checkbox-row">
          <input
            type="checkbox"
            id="newExBeginner"
          >
          Beginner-friendly
        </label>
      </div>

      <div class="modal-footer">
        <button
          type="button"
          class="btn ghost"
          data-modal-close
        >
          Cancel
        </button>

        <button
          type="button"
          class="btn primary"
          id="saveNewExBtn"
        >
          Save exercise
        </button>
      </div>
    `);

    if (!modal) {
      return;
    }

    modal
      .querySelector('#saveNewExBtn')
      ?.addEventListener('click', () => {
        const nameInput =
          document.getElementById('newExName');

        const groupInput =
          document.getElementById('newExGroup');

        const equipmentInput =
          document.getElementById('newExEquip');

        const instructionsInput =
          document.getElementById('newExInstructions');

        const beginnerInput =
          document.getElementById('newExBeginner');

        const name =
          nameInput?.value.trim() || '';

        if (!name) {
          toast(
            'Give the exercise a name.',
            'error'
          );
          return;
        }

        ExerciseLibrary.addCustom({
          name,
          group: groupInput?.value || ExerciseLibrary.GROUPS[0],
          equipment:
            equipmentInput?.value.trim() || 'Other',
          instructions:
            instructionsInput?.value.trim() || '',
          beginner:
            Boolean(beginnerInput?.checked)
        });

        closeModal();

        toast(
          'Exercise added to your library.',
          'success'
        );

        renderLibrary();
      });
  }

  /* =====================================================================
   * HISTORY
   * ===================================================================== */

  function renderHistory() {
    const el = document.getElementById('historyContent');

    if (!el) {
      return;
    }

    const workouts = Array.isArray(Storage.get().workouts)
      ? Storage.get().workouts
      : [];

    if (!workouts.length) {
      el.innerHTML = emptyState({
        icon: '📋',
        title: 'No workouts yet',
        body: 'Completed workouts will show up here.',
        ctaLabel: 'Start Workout',
        ctaView: 'workout'
      });

      return;
    }

    el.innerHTML = `
      <div class="section-heading">
        <h2>
          ${workouts.length}
          workout${workouts.length !== 1 ? 's' : ''}
          logged
        </h2>

        <button
          type="button"
          class="link-btn"
          data-view="calendar"
        >
          View calendar
        </button>
      </div>

      <div class="workout-list">
        ${workouts.map(workoutRowHTML).join('')}
      </div>
    `;

    el
      .querySelectorAll('[data-open-workout]')
      .forEach(row => {
        row.addEventListener('click', () => {
          openWorkoutDetail(
            row.dataset.openWorkout
          );
        });
      });

    el
      .querySelector('[data-view="calendar"]')
      ?.addEventListener('click', () => {
        goToView('calendar', {
          showBack: true
        });
      });
  }

  function openWorkoutDetail(id) {
    const workouts = Storage.get().workouts || [];

    const workout = workouts.find(
      item => item.id === id
    );

    if (!workout) {
      return;
    }

    const exercises = Array.isArray(workout.exercises)
      ? workout.exercises
      : [];

    const setCount = exercises.reduce(
      (sum, exercise) =>
        sum +
        (
          Array.isArray(exercise?.sets)
            ? exercise.sets.length
            : 0
        ),
      0
    );

    const totalVolume =
      Number(workout.totalVolume) || 0;

    const modal = openModal(`
      <div class="modal-header">
        <h3>${escapeHTML(workout.name || 'Workout')}</h3>
      </div>

      <div class="modal-body">
        <p class="detail-text">
          ${fmtDate(workout.date)}
          · ${fmtDuration(workout.durationSec)}
          · ${setCount} sets
          · ${Math.round(totalVolume).toLocaleString()}
          ${escapeHTML(unit())} volume
        </p>

        ${exercises.map(exercise => `
          <div class="detail-exercise">
            <p class="detail-exercise-name">
              ${escapeHTML(exercise.name || 'Exercise')}
            </p>

            <div class="detail-set-table">
              ${Array.isArray(exercise.sets)
        ? exercise.sets.map((set, index) => `
                    <div
                      class="detail-set-row ${set.completed ? 'done' : ''
          }"
                    >
                      <span>
                        Set ${index + 1}
                      </span>

                      <span>
                        ${displayWeightFromKg(set.weight)}
                        ${escapeHTML(unit())}
                      </span>

                      <span>
                        ${escapeHTML(set.reps ?? '')} reps
                      </span>

                      <span>
                        ${set.completed ? '✓' : '—'}
                      </span>
                    </div>
                  `).join('')
        : ''
      }
            </div>
          </div>
        `).join('')}

        ${workout.notes
        ? `
              <p class="detail-label">
                Notes
              </p>

              <p class="detail-text">
                ${escapeHTML(workout.notes)}
              </p>
            `
        : ''
      }
      </div>

      <div class="modal-footer">
        <button
          type="button"
          class="btn ghost danger-text"
          id="deleteWorkoutBtn"
        >
          Delete
        </button>

        <button
          type="button"
          class="btn primary"
          data-modal-close
        >
          Close
        </button>
      </div>
    `);

    if (!modal) {
      return;
    }

    modal
      .querySelector('#deleteWorkoutBtn')
      ?.addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Delete this workout?',
          body: 'This can’t be undone.',
          confirmText: 'Delete',
          danger: true
        });

        if (!ok) {
          return;
        }

        const data = Storage.get();

        Storage.update({
          workouts: (data.workouts || []).filter(
            workoutItem => workoutItem.id !== id
          )
        });

        toast(
          'Workout deleted.',
          'info'
        );

        const activeView =
          document.querySelector('.view.active');

        goToView(
          activeView?.dataset.view || 'history'
        );
      });
  }

  /* =====================================================================
   * CALENDAR
   * ===================================================================== */

  let calCursor = new Date();

  calCursor.setDate(1);

  function renderCalendar() {
    const el =
      document.getElementById('calendarContent');

    if (!el) {
      return;
    }

    const workouts = Array.isArray(Storage.get().workouts)
      ? Storage.get().workouts
      : [];

    const byDay = {};

    workouts.forEach(workout => {
      if (!workout?.date) {
        return;
      }

      const date = new Date(workout.date);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const key =
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      if (!byDay[key]) {
        byDay[key] = [];
      }

      byDay[key].push(workout);
    });

    const year = calCursor.getFullYear();
    const month = calCursor.getMonth();

    const firstDay =
      new Date(year, month, 1);

    const startOffset =
      firstDay.getDay();

    const daysInMonth =
      new Date(year, month + 1, 0).getDate();

    const monthLabel =
      calCursor.toLocaleDateString(
        undefined,
        {
          month: 'long',
          year: 'numeric'
        }
      );

    const streak =
      computeStreak(workouts);

    let cells = '';

    /*
     * Empty cells before the first day of the month.
     */
    for (
      let index = 0;
      index < startOffset;
      index++
    ) {
      cells += `
        <div class="cal-cell empty"></div>
      `;
    }

    /*
     * Actual days.
     */
    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      const key =
        `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const hasWorkout =
        Boolean(byDay[key]);

      const isToday =
        key === todayISO();

      cells += `
        <button
          type="button"
          class="cal-cell
            ${hasWorkout ? 'has-workout' : ''}
            ${isToday ? 'today' : ''}"
          data-date="${key}"
        >
          <span>${day}</span>

          ${hasWorkout
          ? '<div class="cal-dot"></div>'
          : ''
        }
        </button>
      `;
    }

    el.innerHTML = `
      <div class="cal-streak-banner">
        🔥 ${streak}-day streak
      </div>

      <div class="cal-header">
        <button
          type="button"
          class="icon-btn"
          id="calPrev"
          aria-label="Previous month"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        <h2>${escapeHTML(monthLabel)}</h2>

        <button
          type="button"
          class="icon-btn"
          id="calNext"
          aria-label="Next month"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6l6 6-6 6"/>
          </svg>
        </button>
      </div>

      <div class="cal-grid cal-weekdays">
        ${['S', 'M', 'T', 'W', 'T', 'F', 'S']
        .map(day => `<div>${day}</div>`)
        .join('')}
      </div>

      <div class="cal-grid">
        ${cells}
      </div>
    `;

    document
      .getElementById('calPrev')
      ?.addEventListener('click', () => {
        calCursor.setMonth(
          calCursor.getMonth() - 1
        );

        renderCalendar();
      });

    document
      .getElementById('calNext')
      ?.addEventListener('click', () => {
        calCursor.setMonth(
          calCursor.getMonth() + 1
        );

        renderCalendar();
      });

    el
      .querySelectorAll('.cal-cell.has-workout')
      .forEach(cell => {
        cell.addEventListener('click', () => {
          const list =
            byDay[cell.dataset.date] || [];

          if (list.length === 1) {
            openWorkoutDetail(list[0].id);
            return;
          }

          openModal(`
            <div class="modal-header">
              <h3>
                ${fmtDate(cell.dataset.date)}
              </h3>
            </div>

            <div class="modal-body">
              ${list.map(workoutRowHTML).join('')}
            </div>
          `);
        });
      });
  }

  /* =====================================================================
   * PERSONAL RECORDS
   * ===================================================================== */

  function renderPRs() {
    const el =
      document.getElementById('prsContent');

    if (!el) {
      return;
    }

    const prs =
      Storage.get().personalRecords || {};

    const entries =
      Object.entries(prs);

    if (!entries.length) {
      el.innerHTML = emptyState({
        icon: '🏆',
        title: 'No records yet',
        body: 'Complete sets in a workout and your best lifts will show up here automatically.',
        ctaLabel: 'Start Workout',
        ctaView: 'workout'
      });

      return;
    }

    entries.sort(
      (a, b) =>
        new Date(b[1]?.date || 0) -
        new Date(a[1]?.date || 0)
    );

    el.innerHTML = `
      <div class="section-heading">
        <h2>Your best lifts</h2>
      </div>

      <div class="pr-list">
        ${entries.map(([exerciseId, pr]) => {
      const exercise =
        ExerciseLibrary.getById(exerciseId);

      return `
            <div class="pr-card">
              <div>
                <p class="pr-exercise">
                  ${escapeHTML(
        exercise
          ? exercise.name
          : 'Exercise'
      )}
                </p>

                <p class="pr-date">
                  ${fmtDate(pr?.date)}
                </p>
              </div>

              <p class="pr-value">
                ${displayWeightFromKg(pr?.weight)}
                ${escapeHTML(unit())}
                ×
                ${escapeHTML(pr?.reps ?? 0)}
              </p>
            </div>
          `;
    }).join('')}
      </div>
    `;
  }

  function showPRCelebration(
    exerciseName,
    weightKg,
    reps
  ) {
    const overlay =
      document.getElementById('prCelebration');

    const detail =
      document.getElementById('prDetail');

    const closeButton =
      document.getElementById('prCelebrationClose');

    if (!overlay || !detail || !closeButton) {
      return;
    }

    detail.textContent =
      `${exerciseName}: ${displayWeightFromKg(weightKg)} ${unit()} × ${reps} reps`;

    overlay.classList.remove('hidden');

    requestAnimationFrame(() => {
      overlay.classList.add('show');
    });

    let closeTimer;

    const close = () => {
      clearTimeout(closeTimer);

      overlay.classList.remove('show');

      setTimeout(() => {
        overlay.classList.add('hidden');
      }, 250);
    };

    closeButton.onclick = close;

    closeTimer = setTimeout(
      close,
      4000
    );
  }

  /* =====================================================================
   * PROFILE
   * ===================================================================== */

  const GOALS = [
    {
      id: 'muscle',
      label: 'Gain Muscle'
    },
    {
      id: 'weight',
      label: 'Gain Weight'
    },
    {
      id: 'fat',
      label: 'Lose Fat'
    },
    {
      id: 'strength',
      label: 'Strength'
    },
    {
      id: 'fitness',
      label: 'General Fitness'
    }
  ];

  function renderProfile() {
    const el =
      document.getElementById('profileContent');

    if (!el) {
      return;
    }

    const data = Storage.get();

    const profile =
      data.profile || {};

    const settings =
      data.settings || {};

    const workouts =
      Array.isArray(data.workouts)
        ? data.workouts
        : [];

    const totalSets =
      workouts.reduce(
        (sum, workout) =>
          sum +
          (
            Array.isArray(workout?.exercises)
              ? workout.exercises.reduce(
                (exerciseSum, exercise) =>
                  exerciseSum +
                  (
                    Array.isArray(exercise?.sets)
                      ? exercise.sets.length
                      : 0
                  ),
                0
              )
              : 0
          ),
        0
      );

    const goalLabel =
      profile.goal
        ? GOALS.find(
          goal => goal.id === profile.goal
        )?.label
        : null;

    const initial =
      profile.name
        ? profile.name.charAt(0).toUpperCase()
        : '?';

    el.innerHTML = `
      <div class="profile-header">
        <div class="avatar-circle">
          ${escapeHTML(initial)}
        </div>

        <p class="profile-name">
          ${profile.name
        ? escapeHTML(profile.name)
        : 'Your profile'
      }
        </p>

        <p class="profile-goal">
          ${escapeHTML(
        goalLabel || 'No goal set yet'
      )}
        </p>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <span class="stat-value">
            ${workouts.length}
          </span>

          <span class="stat-label">
            Workouts
          </span>
        </div>

        <div class="stat-card">
          <span class="stat-value">
            ${totalSets}
          </span>

          <span class="stat-label">
            Total sets
          </span>
        </div>

        <div class="stat-card">
          <span class="stat-value">
            ${escapeHTML(profile.height || '—')}
          </span>

          <span class="stat-label">
            Height (${escapeHTML(
        settings.heightUnit || 'cm'
      )})
          </span>
        </div>

        <div class="stat-card">
          <span class="stat-value">
            ${profile.weight !== '' &&
        profile.weight !== null &&
        profile.weight !== undefined
        ? displayWeightFromKg(profile.weight)
        : '—'
      }
          </span>

          <span class="stat-label">
            Weight (${escapeHTML(unit())})
          </span>
        </div>
      </div>

      <div class="section-block">
        <div class="section-heading">
          <h2>Edit profile</h2>
        </div>

        <label class="field-label">
          Name
        </label>

        <input
          class="text-input"
          id="pfName"
          value="${escapeHTML(profile.name || '')}"
          placeholder="Your name"
        >

        <label class="field-label">
          Age
        </label>

        <input
          class="text-input"
          id="pfAge"
          type="number"
          min="10"
          max="100"
          value="${escapeHTML(profile.age || '')}"
          placeholder="e.g. 24"
        >

        <label class="field-label">
          Height (${escapeHTML(
        settings.heightUnit || 'cm'
      )})
        </label>

        <input
          class="text-input"
          id="pfHeight"
          type="number"
          value="${escapeHTML(profile.height || '')}"
          placeholder="e.g. 175"
        >

        <label class="field-label">
          Weight (${escapeHTML(unit())})
        </label>

        <input
          class="text-input"
          id="pfWeight"
          type="number"
          step="0.1"
          value="${profile.weight !== '' &&
        profile.weight !== null &&
        profile.weight !== undefined
        ? displayWeightFromKg(profile.weight)
        : ''
      }"
          placeholder="e.g. 70"
        >

        <label class="field-label">
          Fitness goal
        </label>

        <div class="chip-row">
          ${GOALS.map(goal => `
            <button
              type="button"
              class="chip goal-chip ${profile.goal === goal.id
          ? 'active'
          : ''
        }"
              data-goal="${escapeHTML(goal.id)}"
            >
              ${escapeHTML(goal.label)}
            </button>
          `).join('')}
        </div>

        <button
          type="button"
          class="btn primary full-width"
          id="saveProfileBtn"
        >
          Save profile
        </button>
      </div>
    `;

    let selectedGoal =
      profile.goal || '';

    el
      .querySelectorAll('.goal-chip')
      .forEach(chip => {
        chip.addEventListener('click', () => {
          selectedGoal =
            chip.dataset.goal || '';

          el
            .querySelectorAll('.goal-chip')
            .forEach(button => {
              button.classList.toggle(
                'active',
                button === chip
              );
            });
        });
      });

    document
      .getElementById('saveProfileBtn')
      ?.addEventListener('click', () => {
        const name =
          document.getElementById('pfName')
            ?.value.trim() || '';

        const age =
          document.getElementById('pfAge')
            ?.value || '';

        const height =
          document.getElementById('pfHeight')
            ?.value || '';

        const weightInput =
          parseFloat(
            document.getElementById('pfWeight')
              ?.value
          );

        const newProfile = {
          name,
          age,
          height,
          weight: Number.isNaN(weightInput)
            ? ''
            : rawWeightForUnit(weightInput),
          goal: selectedGoal
        };

        Storage.update({
          profile: newProfile
        });

        toast(
          'Profile saved.',
          'success'
        );

        renderProfile();
      });
  }

  /* =====================================================================
   * SETTINGS
   * ===================================================================== */

  function renderSettings() {
    const el =
      document.getElementById('settingsContent');

    if (!el) {
      return;
    }

    const settings =
      Storage.get().settings || {};

    const currentTheme =
      settings.theme || 'dark';

    const currentWeightUnit =
      settings.weightUnit || 'kg';

    const currentHeightUnit =
      settings.heightUnit || 'cm';

    const reminderEnabled =
      Boolean(settings.reminderEnabled);

    const reminderTime =
      settings.reminderTime || '18:00';

    el.innerHTML = `
      <div class="section-block">
        <div class="section-heading">
          <h2>Appearance</h2>
        </div>

        <div class="setting-row">
          <span>Theme</span>

          <div class="segmented" id="themeSeg">
            <button
              type="button"
              class="${currentTheme === 'dark'
        ? 'active'
        : ''
      }"
              data-theme="dark"
            >
              Dark
            </button>

            <button
              type="button"
              class="${currentTheme === 'light'
        ? 'active'
        : ''
      }"
              data-theme="light"
            >
              Light
            </button>
          </div>
        </div>
      </div>

      <div class="section-block">
        <div class="section-heading">
          <h2>Units</h2>
        </div>

        <div class="setting-row">
          <span>Weight unit</span>

          <div class="segmented" id="weightUnitSeg">
            <button
              type="button"
              class="${currentWeightUnit === 'kg'
        ? 'active'
        : ''
      }"
              data-unit="kg"
            >
              kg
            </button>

            <button
              type="button"
              class="${currentWeightUnit === 'lb'
        ? 'active'
        : ''
      }"
              data-unit="lb"
            >
              lb
            </button>
          </div>
        </div>

        <div class="setting-row">
          <span>Height unit</span>

          <div class="segmented" id="heightUnitSeg">
            <button
              type="button"
              class="${currentHeightUnit === 'cm'
        ? 'active'
        : ''
      }"
              data-unit="cm"
            >
              cm
            </button>

            <button
              type="button"
              class="${currentHeightUnit === 'ft'
        ? 'active'
        : ''
      }"
              data-unit="ft"
            >
              ft/in
            </button>
          </div>
        </div>
      </div>

      <div class="section-block">
        <div class="section-heading">
          <h2>Workout reminder</h2>
        </div>

        <p class="hint-text">
          Get a browser notification reminding you to train.
          Works while IronLog is open in a tab.
        </p>

        <div class="setting-row">
          <span>Enable reminder</span>

          <label class="switch">
            <input
              type="checkbox"
              id="reminderToggle"
              ${reminderEnabled ? 'checked' : ''}
            >

            <span class="slider"></span>
          </label>
        </div>

        <div
          class="setting-row"
          id="reminderTimeRow"
          style="${reminderEnabled
        ? ''
        : 'display:none'
      }"
        >
          <span>Reminder time</span>

          <input
            type="time"
            class="text-input time-input"
            id="reminderTime"
            value="${escapeHTML(reminderTime)}"
          >
        </div>
      </div>

      <div class="section-block">
        <div class="section-heading">
          <h2>Your data</h2>
        </div>

        <button
          type="button"
          class="btn ghost full-width"
          id="exportBtn"
        >
          Export data (.json)
        </button>

        <label
          class="btn ghost full-width"
          for="importInput"
          style="text-align:center;cursor:pointer;"
        >
          Import data
        </label>

        <input
          type="file"
          id="importInput"
          accept="application/json"
          class="hidden"
        >

        <button
          type="button"
          class="btn danger full-width"
          id="clearDataBtn"
        >
          Clear all data
        </button>
        
        <button
          type="button"
          class="btn ghost full-width"
          id="logoutBtn"
          style="margin-top:10px;"
        >
      Log out
    </button>
      </div>

      <p class="app-version">
        IronLog · v1.0
      </p>
    `;

    document
      .getElementById('logoutBtn')
      ?.addEventListener('click', () => {
        App.logout();
      });

    /* -------------------------------------------------------------------
     * Theme
     * ------------------------------------------------------------------- */

    document
      .getElementById('themeSeg')
      ?.addEventListener('click', event => {
        const button =
          event.target.closest('button');

        if (!button) {
          return;
        }

        Storage.update({
          settings: {
            ...Storage.get().settings,
            theme:
              button.dataset.theme
          }
        });
        App.applyTheme();
        renderSettings();
      });

    /* -------------------------------------------------------------------
     * Weight unit
     * ------------------------------------------------------------------- */

    document
      .getElementById('weightUnitSeg')
      ?.addEventListener('click', event => {
        const button =
          event.target.closest('button');

        if (!button) {
          return;
        }

        Storage.update({
          settings: {
            ...Storage.get().settings,
            weightUnit:
              button.dataset.unit
          }
        });

        toast(
          `Weight unit set to ${button.dataset.unit}.`,
          'info'
        );

        renderSettings();
      });

    /* -------------------------------------------------------------------
     * Height unit
     * ------------------------------------------------------------------- */

    document
      .getElementById('heightUnitSeg')
      ?.addEventListener('click', event => {
        const button =
          event.target.closest('button');

        if (!button) {
          return;
        }

        Storage.update({
          settings: {
            ...Storage.get().settings,
            heightUnit:
              button.dataset.unit
          }
        });

        renderSettings();
      });

    /* -------------------------------------------------------------------
     * Workout reminder
     * ------------------------------------------------------------------- */

    document
      .getElementById('reminderToggle')
      ?.addEventListener('change', async event => {
        const enabled =
          event.target.checked;

        if (
          enabled &&
          'Notification' in window
        ) {
          const permission =
            await Notification.requestPermission();

          if (permission !== 'granted') {
            toast(
              'Enable notifications in your browser to use reminders.',
              'error'
            );

            event.target.checked = false;

            return;
          }
        }

        Storage.update({
          settings: {
            ...Storage.get().settings,
            reminderEnabled: enabled
          }
        });

        const timeRow =
          document.getElementById(
            'reminderTimeRow'
          );

        if (timeRow) {
          timeRow.style.display =
            enabled ? '' : 'none';
        }

        if (enabled) {
          App.scheduleReminder();
        } else {
          App.clearReminder();
        }
      });

    document
      .getElementById('reminderTime')
      ?.addEventListener('change', event => {
        Storage.update({
          settings: {
            ...Storage.get().settings,
            reminderTime:
              event.target.value
          }
        });

        App.scheduleReminder();

        toast(
          'Reminder time updated.',
          'success'
        );
      });

    /* -------------------------------------------------------------------
     * Export
     * ------------------------------------------------------------------- */

    document
      .getElementById('exportBtn')
      ?.addEventListener('click', () => {
        const blob = new Blob(
          [Storage.exportJSON()],
          {
            type: 'application/json'
          }
        );

        const url =
          URL.createObjectURL(blob);

        const anchor =
          document.createElement('a');

        anchor.href = url;
        anchor.download =
          `ironlog-backup-${todayISO()}.json`;

        document.body.appendChild(anchor);

        anchor.click();

        anchor.remove();

        URL.revokeObjectURL(url);

        toast(
          'Data exported.',
          'success'
        );
      });

    /* -------------------------------------------------------------------
     * Import
     * ------------------------------------------------------------------- */

    document
      .getElementById('importInput')
      ?.addEventListener('change', event => {
        const file =
          event.target.files?.[0];

        if (!file) {
          return;
        }

        const reader =
          new FileReader();

        reader.onload = async () => {
          try {
            const parsed =
              JSON.parse(reader.result);

            /*
             * Basic validation so an unrelated JSON file does not
             * completely replace IronLog's data structure.
             */
            if (
              !parsed ||
              typeof parsed !== 'object' ||
              Array.isArray(parsed)
            ) {
              throw new Error(
                'Invalid IronLog backup structure.'
              );
            }

            const ok =
              await confirmDialog({
                title: 'Import data?',
                body: 'This will replace your current data with the contents of this file.',
                confirmText: 'Import'
              });

            if (!ok) {
              return;
            }

            Storage.replaceAll(parsed);

            toast(
              'Data imported.',
              'success'
            );

            App.applyTheme();

            goToView('dashboard');
          } catch (error) {
            console.error(
              'IronLog import failed:',
              error
            );

            toast(
              'That file doesn’t look like a valid IronLog backup.',
              'error'
            );
          }
        };

        reader.readAsText(file);

        /*
         * Allow the same file to be selected again later.
         */
        event.target.value = '';
      });

    /* -------------------------------------------------------------------
     * Clear all data
     * ------------------------------------------------------------------- */

    document
      .getElementById('clearDataBtn')
      ?.addEventListener('click', async () => {
        const ok =
          await confirmDialog({
            title: 'Clear all data?',
            body: 'This deletes every workout, measurement, and setting. This can’t be undone.',
            confirmText: 'Clear everything',
            danger: true
          });

        if (!ok) {
          return;
        }

        Storage.resetAll();

        toast(
          'All data cleared.',
          'info'
        );

        App.applyTheme();

        goToView('dashboard');
      });
  }

  /* =====================================================================
   * PUBLIC API
   * ===================================================================== */

  return {
    goToView,
    toast,
    openModal,
    closeModal,
    confirmDialog,
    emptyState,

    fmtWeight,
    fmtDate,
    fmtDuration,
    todayISO,
    escapeHTML,

    unit,
    rawWeightForUnit,
    displayWeightFromKg,

    computeStreak,
    showPRCelebration,

    renderDashboard,
    renderLibrary,
    renderHistory,
    renderCalendar,
    renderPRs,
    renderProfile,
    renderSettings
  };
})();

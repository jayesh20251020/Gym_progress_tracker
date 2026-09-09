// ============================================================
// IRONLOG — WORKOUTS
// ============================================================

const Workouts = (() => {

  // ----------------------------------------------------------
  // CONSTANTS
  // ----------------------------------------------------------

  const MAX_REPS = 1000;
  const MAX_WEIGHT_KG = 5000;
  const DEFAULT_WORKOUT_NAME = 'Workout';

  let restTimerInterval = null;
  let restTimerSeconds = 60;


  // ----------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------

  function getData() {
    return Storage.get();
  }


  function getActive() {
    return getData().activeWorkout || null;
  }


  function getWeightUnit() {
    return getData().settings?.weightUnit || 'kg';
  }


  function todayISO() {
    return UI.todayISO();
  }


  function safeNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return null;
    }

    return number;
  }


  function parseReps(value) {
    const reps = safeNumber(value);

    if (reps === null) {
      return null;
    }

    if (!Number.isInteger(reps)) {
      return null;
    }

    if (reps < 1 || reps > MAX_REPS) {
      return null;
    }

    return reps;
  }


  function parseDisplayWeight(value) {
    const weight = safeNumber(value);

    if (weight === null) {
      return null;
    }

    if (weight < 0) {
      return null;
    }

    const unit = getWeightUnit();

    const kg = unit === 'lb'
      ? weight / 2.20462
      : weight;

    if (kg > MAX_WEIGHT_KG) {
      return null;
    }

    return weight;
  }


  function displayWeightToKg(value) {
    const weight = safeNumber(value);

    if (weight === null || weight < 0) {
      return null;
    }

    if (getWeightUnit() === 'lb') {
      return weight / 2.20462;
    }

    return weight;
  }


  function kgToDisplayWeight(value) {
    const kg = safeNumber(value);

    if (kg === null || kg < 0) {
      return '';
    }

    if (getWeightUnit() === 'lb') {
      return Number((kg * 2.20462).toFixed(2));
    }

    return Number(kg.toFixed(2));
  }


  function createSet() {
    return {
      reps: '',
      weight: '',
      completed: false
    };
  }


  function createWorkout() {
    const now = Date.now();

    return {
      id: Storage.uid('wk'),
      name: DEFAULT_WORKOUT_NAME,
      date: todayISO(),
      startedAt: now,
      finishedAt: null,
      exercises: [],
      notes: '',
      totalVolume: 0
    };
  }


  function normalizeSet(set) {
    const reps = parseReps(set?.reps);
    const weight = parseDisplayWeight(set?.weight);

    return {
      reps: reps === null ? '' : reps,
      weight: weight === null ? '' : weight,
      completed: Boolean(set?.completed)
    };
  }


  function normalizeActiveWorkout(workout) {
    if (!workout) {
      return null;
    }

    return {
      id: workout.id || Storage.uid('wk'),
      name: String(workout.name || DEFAULT_WORKOUT_NAME),
      date: workout.date || todayISO(),
      startedAt: workout.startedAt || Date.now(),
      finishedAt: workout.finishedAt || null,
      notes: String(workout.notes || ''),
      totalVolume: Number.isFinite(Number(workout.totalVolume))
        ? Number(workout.totalVolume)
        : 0,

      exercises: Array.isArray(workout.exercises)
        ? workout.exercises.map(exercise => ({
            exerciseId: exercise.exerciseId || exercise.id || '',
            name: String(exercise.name || 'Exercise'),

            sets: Array.isArray(exercise.sets)
              ? exercise.sets.map(normalizeSet)
              : [createSet()]
          }))
        : []
    };
  }


  function saveActive(workout) {
    if (!workout) {
      Storage.update({
        activeWorkout: null
      });

      return null;
    }

    const normalized = normalizeActiveWorkout(workout);

    Storage.update({
      activeWorkout: normalized
    });

    return normalized;
  }


  function getExerciseName(exerciseId) {
    const exercise = ExerciseLibrary.getById(exerciseId);

    return exercise?.name || exerciseId || 'Exercise';
  }


  // ----------------------------------------------------------
  // START WORKOUT
  // ----------------------------------------------------------

  function startNewWorkout(name = DEFAULT_WORKOUT_NAME) {

    const existing = getActive();

    if (existing) {
      UI.toast('You already have an active workout.', 'info');
      UI.goToView('workout');
      renderWorkoutView();
      return existing;
    }

    const workout = createWorkout();

    workout.name = String(name || DEFAULT_WORKOUT_NAME).trim()
      || DEFAULT_WORKOUT_NAME;

    saveActive(workout);

    UI.goToView('workout');
    renderWorkoutView();

    UI.toast('Workout started 💪', 'success');

    return workout;
  }


  // ----------------------------------------------------------
  // ADD EXERCISE
  // ----------------------------------------------------------

  function addExerciseToActiveOrDraft(exerciseId) {

    if (!exerciseId) {
      UI.toast('Invalid exercise.', 'error');
      return;
    }

    let workout = getActive();

    if (!workout) {
      workout = createWorkout();
    }

    workout = normalizeActiveWorkout(workout);

    const exercise = ExerciseLibrary.getById(exerciseId);

    if (!exercise) {
      UI.toast('Exercise not found.', 'error');
      return;
    }

    const alreadyExists = workout.exercises.some(
      item => item.exerciseId === exerciseId
    );

    if (alreadyExists) {
      UI.toast('Exercise is already in this workout.', 'info');

      saveActive(workout);
      UI.goToView('workout');
      renderWorkoutView();

      return;
    }

    workout.exercises.push({
      exerciseId: exercise.id,
      name: exercise.name,
      sets: [createSet()]
    });

    saveActive(workout);

    UI.goToView('workout');
    renderWorkoutView();

    UI.toast(`${exercise.name} added.`, 'success');
  }


  // ----------------------------------------------------------
  // ADD SET
  // ----------------------------------------------------------

  function addSet(exerciseIndex) {

    const workout = getActive();

    if (!workout) {
      return;
    }

    const exercise = workout.exercises?.[exerciseIndex];

    if (!exercise) {
      return;
    }

    const sets = Array.isArray(exercise.sets)
      ? exercise.sets
      : [];

    const previous = sets[sets.length - 1];

    const newSet = createSet();

    // Copy previous values as a convenience.
    // Do NOT copy completion status.
    if (previous) {
      newSet.reps = previous.reps || '';
      newSet.weight = previous.weight || '';
    }

    sets.push(newSet);

    exercise.sets = sets;

    saveActive(workout);
    renderWorkoutView();
  }


  // ----------------------------------------------------------
  // REMOVE SET
  // ----------------------------------------------------------

  function removeSet(exerciseIndex, setIndex) {

    const workout = getActive();

    if (!workout) {
      return;
    }

    const exercise = workout.exercises?.[exerciseIndex];

    if (!exercise || !Array.isArray(exercise.sets)) {
      return;
    }

    if (exercise.sets.length <= 1) {
      UI.toast('An exercise needs at least one set.', 'info');
      return;
    }

    exercise.sets.splice(setIndex, 1);

    saveActive(workout);
    renderWorkoutView();
  }


  // ----------------------------------------------------------
  // REMOVE EXERCISE
  // ----------------------------------------------------------

  function removeExercise(exerciseIndex) {

    const workout = getActive();

    if (!workout) {
      return;
    }

    if (!workout.exercises?.[exerciseIndex]) {
      return;
    }

    workout.exercises.splice(exerciseIndex, 1);

    saveActive(workout);
    renderWorkoutView();

    UI.toast('Exercise removed.', 'info');
  }


  // ----------------------------------------------------------
  // UPDATE SET
  // ----------------------------------------------------------

  function updateSetField(
    exerciseIndex,
    setIndex,
    field,
    value
  ) {

    const workout = getActive();

    if (!workout) {
      return;
    }

    const exercise = workout.exercises?.[exerciseIndex];

    if (!exercise || !exercise.sets?.[setIndex]) {
      return;
    }

    if (field !== 'reps' && field !== 'weight') {
      return;
    }

    // Keep input as string while typing.
    // This prevents issues like clearing an input field.
    if (value === '') {
      exercise.sets[setIndex][field] = '';
      exercise.sets[setIndex].completed = false;

      saveActive(workout);
      return;
    }

    const numericValue = safeNumber(value);

    if (numericValue === null) {
      return;
    }

    if (field === 'reps') {

      if (
        !Number.isInteger(numericValue) ||
        numericValue < 0 ||
        numericValue > MAX_REPS
      ) {
        UI.toast(`Reps must be between 1 and ${MAX_REPS}.`, 'error');
        return;
      }

      exercise.sets[setIndex].reps = numericValue;
    }


    if (field === 'weight') {

      if (numericValue < 0) {
        UI.toast('Weight cannot be negative.', 'error');
        return;
      }

      const kg = displayWeightToKg(numericValue);

      if (kg === null || kg > MAX_WEIGHT_KG) {
        UI.toast('That weight is outside the allowed range.', 'error');
        return;
      }

      exercise.sets[setIndex].weight = numericValue;
    }

    saveActive(workout);
  }


  // ----------------------------------------------------------
  // COMPLETE / UNCOMPLETE SET
  // ----------------------------------------------------------

  function toggleSetComplete(exerciseIndex, setIndex) {

    const workout = getActive();

    if (!workout) {
      return;
    }

    const exercise = workout.exercises?.[exerciseIndex];

    if (!exercise || !exercise.sets?.[setIndex]) {
      return;
    }

    const set = exercise.sets[setIndex];

    const reps = parseReps(set.reps);
    const weight = parseDisplayWeight(set.weight);

    if (!set.completed) {

      if (reps === null) {
        UI.toast('Enter valid reps first.', 'error');
        return;
      }

      if (weight === null) {
        UI.toast('Enter valid weight first.', 'error');
        return;
      }

      set.reps = reps;
      set.weight = weight;
      set.completed = true;

      saveActive(workout);
      renderWorkoutView();

      startRestTimer();

      return;
    }

    set.completed = false;

    saveActive(workout);
    renderWorkoutView();
  }


  // ----------------------------------------------------------
  // NOTES
  // ----------------------------------------------------------

  function updateNotes(value) {

    const workout = getActive();

    if (!workout) {
      return;
    }

    workout.notes = String(value || '');

    saveActive(workout);
  }


  // ----------------------------------------------------------
  // WORKOUT NAME
  // ----------------------------------------------------------

  function updateWorkoutName(value) {

    const workout = getActive();

    if (!workout) {
      return;
    }

    workout.name =
      String(value || '').trim() || DEFAULT_WORKOUT_NAME;

    saveActive(workout);
  }


  // ----------------------------------------------------------
  // CANCEL WORKOUT
  // ----------------------------------------------------------

  function cancelWorkout() {

    const workout = getActive();

    if (!workout) {
      return;
    }

    UI.confirmDialog(
      'Cancel Workout?',
      'Your current workout will be removed.',
      () => {

        stopRestTimer();

        Storage.update({
          activeWorkout: null
        });

        UI.goToView('dashboard');

        UI.toast('Workout cancelled.', 'info');
      }
    );
  }


  // ----------------------------------------------------------
  // ESTIMATED 1RM
  // ----------------------------------------------------------

  function estOneRM(weightKg, reps) {

    const weight = Number(weightKg);
    const repetitions = Number(reps);

    if (
      !Number.isFinite(weight) ||
      !Number.isFinite(repetitions) ||
      weight <= 0 ||
      repetitions <= 0
    ) {
      return 0;
    }

    // Epley formula
    return weight * (1 + repetitions / 30);
  }


  // ----------------------------------------------------------
  // PERSONAL RECORD
  // ----------------------------------------------------------

  function checkPR(
    exerciseId,
    exerciseName,
    weightKg,
    reps
  ) {

    const data = getData();

    if (!data.personalRecords) {
      data.personalRecords = {};
    }

    const weight = Number(weightKg);
    const repetitions = Number(reps);

    if (
      !Number.isFinite(weight) ||
      !Number.isFinite(repetitions) ||
      weight <= 0 ||
      repetitions <= 0
    ) {
      return false;
    }

    const estimated = estOneRM(weight, repetitions);

    const oldPR = data.personalRecords[exerciseId];

    const oldEstimated = oldPR
      ? Number(oldPR.estOneRM || 0)
      : 0;

    if (estimated <= oldEstimated) {
      return false;
    }

    data.personalRecords[exerciseId] = {
      exerciseId,
      exerciseName,
      weight: weight,
      reps: repetitions,
      estOneRM: estimated,
      date: new Date().toISOString()
    };

    Storage.update({
      personalRecords: data.personalRecords
    });

    return true;
  }


  // ----------------------------------------------------------
  // FINISH WORKOUT
  // ----------------------------------------------------------

  function finishWorkout() {

    const active = getActive();

    if (!active) {
      UI.toast('There is no active workout.', 'error');
      return;
    }

    const workout = normalizeActiveWorkout(active);

    if (!workout.exercises.length) {
      UI.toast('Add at least one exercise first.', 'error');
      return;
    }

    const finishedExercises = [];

    let totalVolume = 0;
    let completedSetCount = 0;
    const newPRs = [];

    workout.exercises.forEach(exercise => {

      const completedSets = [];

      exercise.sets.forEach(set => {

        if (!set.completed) {
          return;
        }

        const reps = parseReps(set.reps);
        const displayWeight = parseDisplayWeight(set.weight);

        if (reps === null || displayWeight === null) {
          return;
        }

        const weightKg = displayWeightToKg(displayWeight);

        if (
          weightKg === null ||
          weightKg < 0 ||
          weightKg > MAX_WEIGHT_KG
        ) {
          return;
        }

        const volume = weightKg * reps;

        totalVolume += volume;
        completedSetCount++;

        completedSets.push({
          reps,
          weight: Number(weightKg.toFixed(4)),
          completed: true
        });

        if (
          checkPR(
            exercise.exerciseId,
            exercise.name,
            weightKg,
            reps
          )
        ) {
          newPRs.push({
            exerciseId: exercise.exerciseId,
            name: exercise.name,
            weight: weightKg,
            reps
          });
        }
      });


      if (completedSets.length > 0) {

        finishedExercises.push({
          exerciseId: exercise.exerciseId,
          name: exercise.name,
          sets: completedSets
        });
      }
    });


    if (completedSetCount === 0) {
      UI.toast(
        'Complete at least one valid set before finishing.',
        'error'
      );

      return;
    }


    const now = Date.now();

    const startedAt = Number(workout.startedAt);

    const durationSec =
      Number.isFinite(startedAt) && startedAt > 0
        ? Math.max(0, Math.floor((now - startedAt) / 1000))
        : 0;


    const finishedWorkout = {
      id: workout.id,
      name: workout.name || DEFAULT_WORKOUT_NAME,
      date: workout.date || todayISO(),
      startedAt: workout.startedAt || now,
      finishedAt: now,
      durationSec,
      exercises: finishedExercises,
      notes: workout.notes || '',
      totalVolume: Number(totalVolume.toFixed(2))
    };


    const data = getData();

    const workouts = Array.isArray(data.workouts)
      ? [...data.workouts]
      : [];


    workouts.push(finishedWorkout);


    Storage.update({
      workouts,
      activeWorkout: null
    });


    stopRestTimer();

    UI.goToView('dashboard');


    if (newPRs.length > 0) {

      setTimeout(() => {
        newPRs.forEach(pr => {

          const displayWeight =
            kgToDisplayWeight(pr.weight);

          UI.showPRCelebration(
            pr.name,
            displayWeight,
            pr.reps
          );

        });
      }, 250);
    } else {

      UI.toast('Workout completed! 🔥', 'success');
    }

    return finishedWorkout;
  }


  // ----------------------------------------------------------
  // REST TIMER
  // ----------------------------------------------------------

  function startRestTimer(seconds = 60) {

    stopRestTimer();

    restTimerSeconds = Number(seconds);

    if (
      !Number.isFinite(restTimerSeconds) ||
      restTimerSeconds <= 0
    ) {
      restTimerSeconds = 60;
    }

    showRestTimer();

    restTimerInterval = setInterval(() => {

      restTimerSeconds--;

      updateRestTimer();

      if (restTimerSeconds <= 0) {
        stopRestTimer();

        UI.toast('Rest timer finished! ⏱️', 'success');
      }

    }, 1000);
  }


  function stopRestTimer() {

    if (restTimerInterval) {
      clearInterval(restTimerInterval);
      restTimerInterval = null;
    }

    hideRestTimer();
  }


  function formatTimer(seconds) {

    const total = Math.max(0, Math.floor(seconds));

    const minutes = Math.floor(total / 60);
    const secs = total % 60;

    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }


  function getRestTimerElement() {

    return (
      document.querySelector('#restTimer') ||
      document.querySelector('.rest-timer')
    );
  }


  function showRestTimer() {

    const timer = getRestTimerElement();

    if (!timer) {
      return;
    }

    timer.hidden = false;
    timer.classList.add('active');

    updateRestTimer();
  }


  function hideRestTimer() {

    const timer = getRestTimerElement();

    if (!timer) {
      return;
    }

    timer.classList.remove('active');

    // Don't force hidden if the element has its own UI logic.
    timer.hidden = true;
  }


  function updateRestTimer() {

    const timer = getRestTimerElement();

    if (!timer) {
      return;
    }

    const timeElement =
      timer.querySelector('.rest-time') ||
      timer.querySelector('[data-rest-time]') ||
      timer;

    timeElement.textContent =
      formatTimer(restTimerSeconds);
  }


  // ----------------------------------------------------------
  // RENDER WORKOUT VIEW
  // ----------------------------------------------------------

  function renderWorkoutView() {

    const container =
      document.querySelector('#workoutView') ||
      document.querySelector('.workout-view');

    if (!container) {
      return;
    }

    const workout = getActive();

    if (!workout) {

      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💪</div>
          <h3>No active workout</h3>
          <p>Start a workout and add exercises to begin.</p>

          <button
            type="button"
            class="btn primary"
            data-action="start-workout"
          >
            Start Workout
          </button>
        </div>
      `;

      return;
    }


    const safeWorkout =
      normalizeActiveWorkout(workout);


    const unit =
      getWeightUnit();


    const exercisesHTML =
      safeWorkout.exercises.length > 0

        ? safeWorkout.exercises
            .map((exercise, exerciseIndex) =>
              renderExercise(
                exercise,
                exerciseIndex,
                unit
              )
            )
            .join('')

        : `
          <div class="empty-state workout-empty">
            <div class="empty-state-icon">🏋️</div>
            <h3>No exercises yet</h3>
            <p>Add exercises from the exercise library.</p>

            <button
              type="button"
              class="btn primary"
              data-action="open-library"
            >
              Add Exercise
            </button>
          </div>
        `;


    container.innerHTML = `

      <div class="workout-builder">

        <div class="workout-header">

          <div class="workout-title-area">

            <input
              type="text"
              class="workout-name-input"
              value="${UI.escapeHTML(safeWorkout.name)}"
              placeholder="Workout name"
              maxlength="150"
              data-action="workout-name"
            >

            <div class="workout-date">
              ${UI.fmtDate(safeWorkout.date)}
            </div>

          </div>

          <button
            type="button"
            class="icon-btn"
            title="Cancel workout"
            aria-label="Cancel workout"
            data-action="cancel-workout"
          >
            ×
          </button>

        </div>


        <div class="workout-exercises">

          ${exercisesHTML}

        </div>


        <button
          type="button"
          class="btn ghost add-exercise-btn"
          data-action="open-library"
        >
          + Add Exercise
        </button>


        <div class="workout-notes">

          <label for="workoutNotes">
            Notes
          </label>

          <textarea
            id="workoutNotes"
            class="text-input"
            rows="3"
            maxlength="2000"
            placeholder="How did the workout feel?"
            data-action="workout-notes"
          >${UI.escapeHTML(safeWorkout.notes)}</textarea>

        </div>


        <div class="workout-actions">

          <button
            type="button"
            class="btn danger"
            data-action="cancel-workout"
          >
            Cancel
          </button>

          <button
            type="button"
            class="btn primary"
            data-action="finish-workout"
          >
            Finish Workout
          </button>

        </div>

      </div>
    `;


    bindWorkoutEvents();
  }


  // ----------------------------------------------------------
  // RENDER EXERCISE
  // ----------------------------------------------------------

  function renderExercise(
    exercise,
    exerciseIndex,
    unit
  ) {

    const sets =
      Array.isArray(exercise.sets)
        ? exercise.sets
        : [createSet()];


    const rows = sets
      .map((set, setIndex) => {

        const completed =
          set.completed ? 'done' : '';

        const checked =
          set.completed ? 'checked' : '';

        return `

          <div
            class="set-row ${completed}"
            data-exercise-index="${exerciseIndex}"
            data-set-index="${setIndex}"
          >

            <div class="set-number">
              ${setIndex + 1}
            </div>


            <input
              type="number"
              class="set-input"
              min="1"
              max="${MAX_REPS}"
              step="1"
              inputmode="numeric"
              placeholder="Reps"
              value="${set.reps === '' ? '' : UI.escapeHTML(String(set.reps))}"
              data-field="reps"
              data-exercise-index="${exerciseIndex}"
              data-set-index="${setIndex}"
              ${set.completed ? 'disabled' : ''}
            >


            <input
              type="number"
              class="set-input"
              min="0"
              max="${getWeightUnit() === 'lb'
                ? Math.floor(MAX_WEIGHT_KG * 2.20462)
                : MAX_WEIGHT_KG}"
              step="0.5"
              inputmode="decimal"
              placeholder="${unit}"
              value="${set.weight === '' ? '' : UI.escapeHTML(String(set.weight))}"
              data-field="weight"
              data-exercise-index="${exerciseIndex}"
              data-set-index="${setIndex}"
              ${set.completed ? 'disabled' : ''}
            >


            <button
              type="button"
              class="set-check"
              title="${set.completed ? 'Mark incomplete' : 'Complete set'}"
              aria-label="${set.completed ? 'Mark set incomplete' : 'Complete set'}"
              data-action="toggle-set"
              data-exercise-index="${exerciseIndex}"
              data-set-index="${setIndex}"
            >
              ${checked ? '✓' : '○'}
            </button>


            <button
              type="button"
              class="set-remove"
              title="Remove set"
              aria-label="Remove set"
              data-action="remove-set"
              data-exercise-index="${exerciseIndex}"
              data-set-index="${setIndex}"
            >
              ×
            </button>

          </div>
        `;
      })
      .join('');


    return `

      <section
        class="exercise-block"
        data-exercise-index="${exerciseIndex}"
      >

        <div class="exercise-header">

          <div>

            <h3>
              ${UI.escapeHTML(exercise.name)}
            </h3>

            <span class="exercise-set-count">
              ${sets.length}
              ${sets.length === 1 ? 'set' : 'sets'}
            </span>

          </div>


          <button
            type="button"
            class="icon-btn"
            title="Remove exercise"
            aria-label="Remove exercise"
            data-action="remove-exercise"
            data-exercise-index="${exerciseIndex}"
          >
            ×
          </button>

        </div>


        <div class="set-header">

          <span>Set</span>
          <span>Reps</span>
          <span>Weight (${unit})</span>
          <span>Done</span>
          <span></span>

        </div>


        <div class="set-list">

          ${rows}

        </div>


        <button
          type="button"
          class="btn ghost add-set-btn"
          data-action="add-set"
          data-exercise-index="${exerciseIndex}"
        >
          + Add Set
        </button>

      </section>
    `;
  }


  // ----------------------------------------------------------
  // EVENT BINDING
  // ----------------------------------------------------------

  function bindWorkoutEvents() {

    const container =
      document.querySelector('#workoutView') ||
      document.querySelector('.workout-view');

    if (!container) {
      return;
    }


    // Buttons
    container
      .querySelectorAll('[data-action]')
      .forEach(element => {

        if (
          element.tagName === 'INPUT' ||
          element.tagName === 'TEXTAREA'
        ) {
          return;
        }

        element.addEventListener('click', event => {

          const target =
            event.currentTarget;

          const action =
            target.dataset.action;


          if (action === 'start-workout') {
            startNewWorkout();
          }


          if (action === 'open-library') {

            UI.goToView('library');

            if (typeof UI.renderLibrary === 'function') {
              UI.renderLibrary();
            }
          }


          if (action === 'cancel-workout') {
            cancelWorkout();
          }


          if (action === 'finish-workout') {
            finishWorkout();
          }


          if (action === 'add-set') {

            addSet(
              Number(target.dataset.exerciseIndex)
            );
          }


          if (action === 'remove-set') {

            removeSet(
              Number(target.dataset.exerciseIndex),
              Number(target.dataset.setIndex)
            );
          }


          if (action === 'remove-exercise') {

            removeExercise(
              Number(target.dataset.exerciseIndex)
            );
          }


          if (action === 'toggle-set') {

            toggleSetComplete(
              Number(target.dataset.exerciseIndex),
              Number(target.dataset.setIndex)
            );
          }

        });
      });


    // Inputs
    container
      .querySelectorAll('[data-field]')
      .forEach(input => {

        input.addEventListener('input', event => {

          const target =
            event.currentTarget;

          updateSetField(
            Number(target.dataset.exerciseIndex),
            Number(target.dataset.setIndex),
            target.dataset.field,
            target.value
          );
        });
      });


    // Workout name
    const nameInput =
      container.querySelector(
        '[data-action="workout-name"]'
      );

    if (nameInput) {

      nameInput.addEventListener('change', event => {

        updateWorkoutName(
          event.currentTarget.value
        );
      });
    }


    // Notes
    const notes =
      container.querySelector(
        '[data-action="workout-notes"]'
      );

    if (notes) {

      notes.addEventListener('input', event => {

        updateNotes(
          event.currentTarget.value
        );
      });
    }
  }


  // ----------------------------------------------------------
  // PUBLIC API
  // ----------------------------------------------------------

  return {

    getActive,

    startNewWorkout,

    addExerciseToActiveOrDraft,

    addSet,

    removeSet,

    removeExercise,

    updateSetField,

    toggleSetComplete,

    updateNotes,

    updateWorkoutName,

    cancelWorkout,

    estOneRM,

    checkPR,

    finishWorkout,

    renderWorkoutView,

    startRestTimer,

    stopRestTimer
  };

})();
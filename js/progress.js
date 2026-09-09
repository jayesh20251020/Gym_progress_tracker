/**
 * progress.js
 * -----------------------------------------------------------------------
 * Handles progress tracking:
 * - Body weight
 * - Workout frequency
 * - Strength progression
 * - Total training volume
 * - Measurement history
 * -----------------------------------------------------------------------
 */

const Progress = (() => {

  const PERIODS = {
    '7D': 7,
    '30D': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365
  };

  let currentPeriod = '30D';
  let currentStrengthExercise = null;

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  function getData() {
    return Storage.get() || {};
  }

  function getWorkouts() {
    const workouts = getData().workouts;
    return Array.isArray(workouts) ? workouts : [];
  }

  function getMeasurements() {
    const measurements = getData().measurements;
    return Array.isArray(measurements) ? measurements : [];
  }

  function getDateKey(date) {
    const d = new Date(date);

    if (Number.isNaN(d.getTime())) return null;

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  }

  function getStartDate(days) {
    const date = new Date();

    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1));

    return date;
  }

  function isWithinPeriod(date, days) {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return false;

    parsed.setHours(0, 0, 0, 0);

    return parsed >= getStartDate(days);
  }

  function formatDate(date) {
    if (typeof UI !== 'undefined' && UI.fmtDate) {
      return UI.fmtDate(date);
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return '';

    return parsed.toLocaleDateString();
  }

  function escapeHTML(value) {
    if (typeof UI !== 'undefined' && UI.escapeHTML) {
      return UI.escapeHTML(String(value ?? ''));
    }

    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // -----------------------------------------------------------------------
  // Canvas setup
  // -----------------------------------------------------------------------

  function setupCanvas(canvas) {
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    const width = Math.max(
      300,
      Math.round(rect.width || 600)
    );

    const height = 180;

    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

    return {
      ctx,
      width,
      height
    };
  }

  function clearCanvas(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
  }

  // -----------------------------------------------------------------------
  // Body weight chart
  // -----------------------------------------------------------------------

  function drawWeightChart(canvas) {
    const setup = setupCanvas(canvas);

    if (!setup) return;

    const {
      ctx,
      width,
      height
    } = setup;

    clearCanvas(ctx, width, height);

    const days = PERIODS[currentPeriod];

    let measurements = getMeasurements()
      .filter(item => {
        return item &&
          item.date &&
          Number.isFinite(Number(item.weight)) &&
          isWithinPeriod(item.date, days);
      })
      .sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
      });

    // If there are not enough points in the selected period,
    // show the available history instead.
    if (measurements.length < 2) {
      measurements = getMeasurements()
        .filter(item => {
          return item &&
            item.date &&
            Number.isFinite(Number(item.weight));
        })
        .sort((a, b) => {
          return new Date(a.date) - new Date(b.date);
        });
    }

    if (measurements.length === 0) {
      drawEmptyChart(
        ctx,
        width,
        height,
        'No weight data yet'
      );
      return;
    }

    const values = measurements.map(
      item => Number(item.weight)
    );

    const min = Math.min(...values);
    const max = Math.max(...values);

    const range = Math.max(1, max - min);

    const padding = {
      top: 20,
      right: 20,
      bottom: 25,
      left: 40
    };

    const chartWidth =
      width - padding.left - padding.right;

    const chartHeight =
      height - padding.top - padding.bottom;

    // Grid
    ctx.beginPath();

    for (let i = 0; i <= 3; i++) {
      const y =
        padding.top +
        (chartHeight / 3) * i;

      ctx.moveTo(
        padding.left,
        y
      );

      ctx.lineTo(
        width - padding.right,
        y
      );
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Line
    ctx.beginPath();

    measurements.forEach((item, index) => {

      const x =
        measurements.length === 1
          ? padding.left + chartWidth / 2
          : padding.left +
            (chartWidth / (measurements.length - 1)) * index;

      const normalized =
        (Number(item.weight) - min) / range;

      const y =
        padding.top +
        chartHeight -
        normalized * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.strokeStyle = 'currentColor';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Points
    measurements.forEach((item, index) => {

      const x =
        measurements.length === 1
          ? padding.left + chartWidth / 2
          : padding.left +
            (chartWidth / (measurements.length - 1)) * index;

      const normalized =
        (Number(item.weight) - min) / range;

      const y =
        padding.top +
        chartHeight -
        normalized * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);

      ctx.fillStyle = 'currentColor';
      ctx.fill();
    });

    // Labels
    ctx.fillStyle = 'currentColor';
    ctx.font = '11px sans-serif';

    ctx.fillText(
      `${max.toFixed(1)} kg`,
      5,
      padding.top + 4
    );

    ctx.fillText(
      `${min.toFixed(1)} kg`,
      5,
      height - padding.bottom
    );
  }

  // -----------------------------------------------------------------------
  // Workout frequency chart
  // -----------------------------------------------------------------------

  function drawFrequencyChart(canvas) {
    const setup = setupCanvas(canvas);

    if (!setup) return;

    const {
      ctx,
      width,
      height
    } = setup;

    clearCanvas(ctx, width, height);

    const days = PERIODS[currentPeriod];

    const workouts = getWorkouts()
      .filter(workout => {
        return workout &&
          workout.date &&
          isWithinPeriod(workout.date, days);
      });

    /*
     * Use sensible buckets depending on the selected period.
     *
     * 7D  -> daily
     * 30D -> daily
     * 3M  -> weekly
     * 6M  -> bi-weekly
     * 1Y  -> monthly
     */
    let bucketSize;

    if (days <= 30) {
      bucketSize = 1;
    } else if (days <= 90) {
      bucketSize = 7;
    } else if (days <= 180) {
      bucketSize = 14;
    } else {
      bucketSize = 30;
    }

    const bucketCount =
      Math.ceil(days / bucketSize);

    const buckets = Array.from(
      { length: bucketCount },
      () => 0
    );

    workouts.forEach(workout => {

      const workoutDate =
        new Date(workout.date);

      if (Number.isNaN(workoutDate.getTime())) {
        return;
      }

      workoutDate.setHours(0, 0, 0, 0);

      const startDate =
        getStartDate(days);

      const difference =
        Math.floor(
          (workoutDate - startDate) /
          86400000
        );

      if (difference < 0 || difference >= days) {
        return;
      }

      const bucketIndex =
        Math.floor(
          difference / bucketSize
        );

      if (
        bucketIndex >= 0 &&
        bucketIndex < buckets.length
      ) {
        buckets[bucketIndex]++;
      }
    });

    const maxValue =
      Math.max(...buckets, 1);

    const padding = {
      top: 15,
      right: 15,
      bottom: 25,
      left: 25
    };

    const chartWidth =
      width - padding.left - padding.right;

    const chartHeight =
      height - padding.top - padding.bottom;

    const barWidth =
      chartWidth / buckets.length;

    // Grid
    ctx.beginPath();

    for (let i = 0; i <= 3; i++) {

      const y =
        padding.top +
        (chartHeight / 3) * i;

      ctx.moveTo(
        padding.left,
        y
      );

      ctx.lineTo(
        width - padding.right,
        y
      );
    }

    ctx.strokeStyle =
      'rgba(255,255,255,0.08)';

    ctx.lineWidth = 1;
    ctx.stroke();

    // Bars
    buckets.forEach((value, index) => {

      const barHeight =
        (value / maxValue) *
        chartHeight;

      const x =
        padding.left +
        index * barWidth +
        2;

      const y =
        padding.top +
        chartHeight -
        barHeight;

      ctx.fillStyle = 'currentColor';

      ctx.fillRect(
        x,
        y,
        Math.max(2, barWidth - 4),
        barHeight
      );
    });

    ctx.fillStyle = 'currentColor';
    ctx.font = '11px sans-serif';

    ctx.fillText(
      String(maxValue),
      5,
      padding.top + 4
    );

    ctx.fillText(
      '0',
      8,
      height - padding.bottom
    );
  }

  // -----------------------------------------------------------------------
  // Strength progression
  // -----------------------------------------------------------------------

  function getStrengthExercises() {
    const map = new Map();

    getWorkouts().forEach(workout => {

      if (!Array.isArray(workout.exercises)) {
        return;
      }

      workout.exercises.forEach(exercise => {

        if (!exercise) return;

        const id =
          exercise.exerciseId ||
          exercise.id ||
          exercise.name;

        if (!id) return;

        if (!map.has(id)) {
          map.set(id, {
            id,
            name: exercise.name || 'Exercise'
          });
        }
      });
    });

    return Array.from(map.values())
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      );
  }

  function getStrengthData(exerciseId) {

    const days = PERIODS[currentPeriod];

    const points = [];

    getWorkouts()
      .filter(workout => {
        return workout &&
          workout.date &&
          isWithinPeriod(workout.date, days);
      })
      .sort((a, b) =>
        new Date(a.date) -
        new Date(b.date)
      )
      .forEach(workout => {

        if (!Array.isArray(workout.exercises)) {
          return;
        }

        const exercise =
          workout.exercises.find(item => {

            const id =
              item?.exerciseId ||
              item?.id ||
              item?.name;

            return id === exerciseId;
          });

        if (!exercise) return;

        if (!Array.isArray(exercise.sets)) {
          return;
        }

        const weights =
          exercise.sets
            .map(set => Number(set?.weight))
            .filter(weight =>
              Number.isFinite(weight) &&
              weight > 0
            );

        if (weights.length === 0) return;

        points.push({
          date: workout.date,
          weight: Math.max(...weights)
        });
      });

    return points;
  }

  function drawStrengthChart(canvas, exerciseId) {

    const setup = setupCanvas(canvas);

    if (!setup) return;

    const {
      ctx,
      width,
      height
    } = setup;

    clearCanvas(ctx, width, height);

    const points =
      getStrengthData(exerciseId);

    if (points.length === 0) {
      drawEmptyChart(
        ctx,
        width,
        height,
        'No strength data yet'
      );
      return;
    }

    const values =
      points.map(point => point.weight);

    const min =
      Math.min(...values);

    const max =
      Math.max(...values);

    const range =
      Math.max(1, max - min);

    const padding = {
      top: 20,
      right: 20,
      bottom: 25,
      left: 40
    };

    const chartWidth =
      width - padding.left - padding.right;

    const chartHeight =
      height - padding.top - padding.bottom;

    // Grid
    ctx.beginPath();

    for (let i = 0; i <= 3; i++) {

      const y =
        padding.top +
        (chartHeight / 3) * i;

      ctx.moveTo(
        padding.left,
        y
      );

      ctx.lineTo(
        width - padding.right,
        y
      );
    }

    ctx.strokeStyle =
      'rgba(255,255,255,0.08)';

    ctx.lineWidth = 1;
    ctx.stroke();

    // Line
    ctx.beginPath();

    points.forEach((point, index) => {

      const x =
        points.length === 1
          ? padding.left + chartWidth / 2
          : padding.left +
            (chartWidth / (points.length - 1)) * index;

      const normalized =
        (point.weight - min) / range;

      const y =
        padding.top +
        chartHeight -
        normalized * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.strokeStyle = 'currentColor';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Points
    points.forEach((point, index) => {

      const x =
        points.length === 1
          ? padding.left + chartWidth / 2
          : padding.left +
            (chartWidth / (points.length - 1)) * index;

      const normalized =
        (point.weight - min) / range;

      const y =
        padding.top +
        chartHeight -
        normalized * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);

      ctx.fillStyle = 'currentColor';
      ctx.fill();
    });

    ctx.fillStyle = 'currentColor';
    ctx.font = '11px sans-serif';

    ctx.fillText(
      `${max.toFixed(1)} kg`,
      5,
      padding.top + 4
    );

    ctx.fillText(
      `${min.toFixed(1)} kg`,
      5,
      height - padding.bottom
    );
  }

  // -----------------------------------------------------------------------
  // Total volume
  // -----------------------------------------------------------------------

  function getTotalVolume() {

    const days = PERIODS[currentPeriod];

    return getWorkouts()
      .filter(workout => {
        return workout &&
          workout.date &&
          isWithinPeriod(workout.date, days);
      })
      .reduce((total, workout) => {

        if (
          Number.isFinite(
            Number(workout.totalVolume)
          )
        ) {
          return total +
            Number(workout.totalVolume);
        }

        if (!Array.isArray(workout.exercises)) {
          return total;
        }

        const workoutVolume =
          workout.exercises.reduce(
            (exerciseTotal, exercise) => {

              if (!Array.isArray(exercise.sets)) {
                return exerciseTotal;
              }

              return exerciseTotal +
                exercise.sets.reduce(
                  (setTotal, set) => {

                    const reps =
                      Number(set?.reps);

                    const weight =
                      Number(set?.weight);

                    if (
                      !Number.isFinite(reps) ||
                      !Number.isFinite(weight)
                    ) {
                      return setTotal;
                    }

                    return setTotal +
                      reps * weight;
                  },
                  0
                );
            },
            0
          );

        return total + workoutVolume;
      }, 0);
  }

  // -----------------------------------------------------------------------
  // Empty chart
  // -----------------------------------------------------------------------

  function drawEmptyChart(
    ctx,
    width,
    height,
    message
  ) {
    ctx.fillStyle = 'currentColor';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';

    ctx.fillText(
      message,
      width / 2,
      height / 2
    );

    ctx.textAlign = 'left';
  }

  // -----------------------------------------------------------------------
  // Measurement modal
  // -----------------------------------------------------------------------

  function openMeasurementModal() {

    const content = `
      <div class="modal-header">
        <h2>Add Measurement</h2>
        <button
          type="button"
          class="icon-btn"
          data-modal-close
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div class="form-group">
        <label for="measurementWeight">
          Weight (kg)
        </label>

        <input
          id="measurementWeight"
          class="text-input"
          type="number"
          min="0"
          step="0.1"
          placeholder="e.g. 60"
        >
      </div>

      <div class="form-group">
        <label for="measurementHeight">
          Height (cm)
        </label>

        <input
          id="measurementHeight"
          class="text-input"
          type="number"
          min="0"
          step="0.1"
          placeholder="e.g. 175"
        >
      </div>

      <div class="form-group">
        <label for="measurementChest">
          Chest (cm)
        </label>

        <input
          id="measurementChest"
          class="text-input"
          type="number"
          min="0"
          step="0.1"
          placeholder="Optional"
        >
      </div>

      <div class="form-group">
        <label for="measurementWaist">
          Waist (cm)
        </label>

        <input
          id="measurementWaist"
          class="text-input"
          type="number"
          min="0"
          step="0.1"
          placeholder="Optional"
        >
      </div>

      <div class="form-group">
        <label for="measurementArms">
          Arms (cm)
        </label>

        <input
          id="measurementArms"
          class="text-input"
          type="number"
          min="0"
          step="0.1"
          placeholder="Optional"
        >
      </div>

      <div class="modal-actions">
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
          id="saveMeasurementBtn"
        >
          Save Measurement
        </button>
      </div>
    `;

    UI.openModal(content);

    const saveBtn =
      document.getElementById(
        'saveMeasurementBtn'
      );

    if (!saveBtn) return;

    saveBtn.addEventListener(
      'click',
      saveMeasurement
    );
  }

  function saveMeasurement() {

    const weightInput =
      document.getElementById(
        'measurementWeight'
      );

    const heightInput =
      document.getElementById(
        'measurementHeight'
      );

    const chestInput =
      document.getElementById(
        'measurementChest'
      );

    const waistInput =
      document.getElementById(
        'measurementWaist'
      );

    const armsInput =
      document.getElementById(
        'measurementArms'
      );

    const weight =
      Number(weightInput?.value);

    const height =
      Number(heightInput?.value);

    if (
      !Number.isFinite(weight) ||
      weight <= 0
    ) {
      UI.toast(
        'Enter a valid weight.',
        'error'
      );
      return;
    }

    const measurement = {
      date: UI.todayISO(),
      weight,
      height: Number.isFinite(height) && height > 0
        ? height
        : null,
      chest: Number(chestInput?.value) || null,
      waist: Number(waistInput?.value) || null,
      arms: Number(armsInput?.value) || null
    };

    const data = getData();

    const measurements = [
      ...getMeasurements(),
      measurement
    ];

    const profile = {
      ...(data.profile || {}),
      weight
    };

    Storage.update({
      measurements,
      profile
    });

    UI.closeModal();

    UI.toast(
      'Measurement saved.',
      'success'
    );

    render();
  }

  // -----------------------------------------------------------------------
  // Measurement history
  // -----------------------------------------------------------------------

  function renderMeasurementHistory() {

    const container =
      document.getElementById(
        'measurementHistory'
      );

    if (!container) return;

    const measurements =
      getMeasurements()
        .slice()
        .sort((a, b) =>
          new Date(b.date) -
          new Date(a.date)
        );

    if (measurements.length === 0) {
      container.innerHTML =
        '<div class="empty-state">No measurements yet.</div>';
      return;
    }

    container.innerHTML =
      measurements
        .slice(0, 10)
        .map(item => `
          <div class="measurement-row">
            <span>
              ${escapeHTML(formatDate(item.date))}
            </span>

            <span>
              ${Number(item.weight).toFixed(1)} kg
            </span>

            <span>
              ${item.height
                ? `${Number(item.height).toFixed(1)} cm`
                : '—'}
            </span>
          </div>
        `)
        .join('');
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  function render() {

    const container =
      document.getElementById(
        'progressView'
      );

    if (!container) return;

    // Period buttons
    const periodContainer =
      document.getElementById(
        'progressPeriods'
      );

    if (periodContainer) {

      periodContainer.innerHTML =
        Object.keys(PERIODS)
          .map(period => `
            <button
              type="button"
              class="period-chip ${
                period === currentPeriod
                  ? 'active'
                  : ''
              }"
              data-period="${period}"
            >
              ${period}
            </button>
          `)
          .join('');

      periodContainer
        .querySelectorAll('[data-period]')
        .forEach(button => {

          button.addEventListener(
            'click',
            () => {

              currentPeriod =
                button.dataset.period;

              render();
            }
          );
        });
    }

    // Weight chart
    const weightCanvas =
      document.getElementById(
        'weightChart'
      );

    if (weightCanvas) {
      drawWeightChart(weightCanvas);
    }

    // Frequency chart
    const frequencyCanvas =
      document.getElementById(
        'frequencyChart'
      );

    if (frequencyCanvas) {
      drawFrequencyChart(
        frequencyCanvas
      );
    }

    // Total volume
    const volumeElement =
      document.getElementById(
        'totalVolumeValue'
      );

    if (volumeElement) {

      const volume =
        getTotalVolume();

      volumeElement.textContent =
        `${Math.round(volume).toLocaleString()} kg`;
    }

    // Strength exercise selector
    const strengthSelect =
      document.getElementById(
        'strengthExerciseSelect'
      );

    if (strengthSelect) {

      const exercises =
        getStrengthExercises();

      if (
        !currentStrengthExercise ||
        !exercises.some(
          exercise =>
            exercise.id ===
            currentStrengthExercise
        )
      ) {
        currentStrengthExercise =
          exercises[0]?.id || null;
      }

      strengthSelect.innerHTML =
        exercises.length
          ? exercises.map(exercise => `
              <option
                value="${escapeHTML(exercise.id)}"
                ${
                  exercise.id ===
                  currentStrengthExercise
                    ? 'selected'
                    : ''
                }
              >
                ${escapeHTML(exercise.name)}
              </option>
            `).join('')
          : '<option value="">No exercises yet</option>';

      strengthSelect.onchange = () => {

        currentStrengthExercise =
          strengthSelect.value || null;

        render();
      };
    }

    // Strength chart
    const strengthCanvas =
      document.getElementById(
        'strengthChart'
      );

    if (
      strengthCanvas &&
      currentStrengthExercise
    ) {
      drawStrengthChart(
        strengthCanvas,
        currentStrengthExercise
      );
    }

    renderMeasurementHistory();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  return {
    render
  };

})();
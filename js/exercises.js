/**
 * exercises.js
 * -----------------------------------------------------------------------
 * IronLog exercise library.
 *
 * Built-in exercises are static reference data and are NOT stored in
 * LocalStorage or PostgreSQL.
 *
 * User-created exercises are stored separately as `customExercises`
 * through Storage and are merged with the built-in library at runtime.
 * -----------------------------------------------------------------------
 */

const ExerciseLibrary = (() => {

  /* ---------------------------------------------------------------------
   * Exercise groups
   * ------------------------------------------------------------------- */

  const GROUPS = [
    'Chest',
    'Back',
    'Shoulders',
    'Biceps',
    'Triceps',
    'Legs',
    'Core',
    'Cardio'
  ];


  /* ---------------------------------------------------------------------
   * Built-in exercise library
   * ------------------------------------------------------------------- */

  const BUILT_IN = [

    /* -------------------------------------------------------------------
     * Chest
     * ----------------------------------------------------------------- */

    {
      id: 'bench-press',
      name: 'Bench Press',
      group: 'Chest',
      equipment: 'Barbell',
      beginner: false,
      instructions:
        'Lie on a flat bench, lower the bar to your mid-chest, then press it back up until your arms are straight.',
      tips:
        'Keep your feet flat on the floor and your shoulder blades pulled together for a stable base.'
    },

    {
      id: 'incline-db-press',
      name: 'Incline Dumbbell Press',
      group: 'Chest',
      equipment: 'Dumbbells',
      beginner: true,
      instructions:
        'On an inclined bench, press two dumbbells up from shoulder height until your arms are extended.',
      tips:
        'A 30–45° incline targets the upper chest without turning it into a shoulder press.'
    },

    {
      id: 'chest-fly',
      name: 'Chest Fly',
      group: 'Chest',
      equipment: 'Dumbbells or Cable',
      beginner: true,
      instructions:
        'With a slight bend in your elbows, bring your arms together in front of your chest in a wide arc.',
      tips:
        'Move slowly — this is a stretch-and-squeeze exercise, not a heavy lift.'
    },

    {
      id: 'push-up',
      name: 'Push-Up',
      group: 'Chest',
      equipment: 'Bodyweight',
      beginner: true,
      instructions:
        'Lower your body until your chest nearly touches the floor, keeping your body in a straight line, then push back up.',
      tips:
        'Keep your core tight so your hips don’t sag.'
    },


    /* -------------------------------------------------------------------
     * Back
     * ----------------------------------------------------------------- */

    {
      id: 'lat-pulldown',
      name: 'Lat Pulldown',
      group: 'Back',
      equipment: 'Cable Machine',
      beginner: true,
      instructions:
        'Pull the bar down to your upper chest while keeping your torso upright, then let it rise back with control.',
      tips:
        'Think about pulling with your elbows, not just your hands.'
    },

    {
      id: 'seated-cable-row',
      name: 'Seated Cable Row',
      group: 'Back',
      equipment: 'Cable Machine',
      beginner: true,
      instructions:
        'Pull the handle toward your torso while keeping your back straight, then extend your arms back out.',
      tips:
        'Avoid leaning back excessively — the movement should come from your arms and shoulder blades.'
    },

    {
      id: 'deadlift',
      name: 'Deadlift',
      group: 'Back',
      equipment: 'Barbell',
      beginner: false,
      instructions:
        'With the bar over your mid-foot, hinge at the hips, grip the bar, and stand up by driving through your heels.',
      tips:
        'Keep the bar close to your shins the whole way up and keep your back flat.'
    },

    {
      id: 'pull-up',
      name: 'Pull-Up',
      group: 'Back',
      equipment: 'Pull-Up Bar',
      beginner: false,
      instructions:
        'Hang from the bar with an overhand grip and pull your chin above the bar, then lower with control.',
      tips:
        'Use an assisted pull-up machine or resistance band if you can’t yet do a full rep.'
    },


    /* -------------------------------------------------------------------
     * Shoulders
     * ----------------------------------------------------------------- */

    {
      id: 'shoulder-press',
      name: 'Shoulder Press',
      group: 'Shoulders',
      equipment: 'Dumbbells or Barbell',
      beginner: true,
      instructions:
        'Press the weight overhead from shoulder height until your arms are straight, then lower with control.',
      tips:
        'Avoid arching your lower back — brace your core throughout.'
    },

    {
      id: 'lateral-raise',
      name: 'Lateral Raise',
      group: 'Shoulders',
      equipment: 'Dumbbells',
      beginner: true,
      instructions:
        'Raise the dumbbells out to your sides until they reach shoulder height, then lower slowly.',
      tips:
        'Use lighter weight than you think — strict form matters more than load here.'
    },

    {
      id: 'front-raise',
      name: 'Front Raise',
      group: 'Shoulders',
      equipment: 'Dumbbells',
      beginner: true,
      instructions:
        'Raise a dumbbell straight in front of you to shoulder height, then lower with control.',
      tips:
        'Keep a slight bend in the elbow and avoid swinging the weight.'
    },

    {
      id: 'face-pull',
      name: 'Face Pull',
      group: 'Shoulders',
      equipment: 'Cable Machine',
      beginner: true,
      instructions:
        'Pull the rope toward your face, flaring your elbows out wide, then return with control.',
      tips:
        'Great for shoulder health — focus on squeezing your rear shoulders at the end.'
    },


    /* -------------------------------------------------------------------
     * Biceps
     * ----------------------------------------------------------------- */

    {
      id: 'bicep-curl',
      name: 'Bicep Curl',
      group: 'Biceps',
      equipment: 'Dumbbells',
      beginner: true,
      instructions:
        'Curl the dumbbells up toward your shoulders while keeping your elbows pinned to your sides, then lower slowly.',
      tips:
        'Avoid swinging your body to lift the weight — let your biceps do the work.'
    },

    {
      id: 'hammer-curl',
      name: 'Hammer Curl',
      group: 'Biceps',
      equipment: 'Dumbbells',
      beginner: true,
      instructions:
        'Curl the dumbbells up with your palms facing each other the whole time.',
      tips:
        'This grip also works your forearms more than a standard curl.'
    },

    {
      id: 'concentration-curl',
      name: 'Concentration Curl',
      group: 'Biceps',
      equipment: 'Dumbbell',
      beginner: true,
      instructions:
        'Seated, brace your elbow against your inner thigh and curl the dumbbell up slowly.',
      tips:
        'Squeeze at the top of the movement for a full contraction.'
    },


    /* -------------------------------------------------------------------
     * Triceps
     * ----------------------------------------------------------------- */

    {
      id: 'tricep-pushdown',
      name: 'Tricep Pushdown',
      group: 'Triceps',
      equipment: 'Cable Machine',
      beginner: true,
      instructions:
        'Push the bar or rope down until your arms are straight, keeping your elbows tucked at your sides.',
      tips:
        'Only your forearms should move — your upper arms stay still.'
    },

    {
      id: 'overhead-tricep-ext',
      name: 'Overhead Tricep Extension',
      group: 'Triceps',
      equipment: 'Dumbbell',
      beginner: true,
      instructions:
        'With both hands holding one dumbbell overhead, lower it behind your head, then extend back up.',
      tips:
        'Keep your elbows pointed forward, not flared out.'
    },

    {
      id: 'tricep-dip',
      name: 'Tricep Dip',
      group: 'Triceps',
      equipment: 'Bench or Bars',
      beginner: false,
      instructions:
        'Lower your body by bending your elbows, then press back up until your arms are straight.',
      tips:
        'Keep your elbows tucked close to avoid shoulder strain.'
    },


    /* -------------------------------------------------------------------
     * Legs
     * ----------------------------------------------------------------- */

    {
      id: 'squat',
      name: 'Squat',
      group: 'Legs',
      equipment: 'Barbell',
      beginner: false,
      instructions:
        'Lower your hips back and down until your thighs are roughly parallel to the floor, then drive back up.',
      tips:
        'Keep your chest up and your knees tracking in line with your toes.'
    },

    {
      id: 'leg-press',
      name: 'Leg Press',
      group: 'Legs',
      equipment: 'Machine',
      beginner: true,
      instructions:
        'Push the platform away by extending your knees and hips, then return with control.',
      tips:
        'Don’t lock your knees out completely at the top.'
    },

    {
      id: 'leg-curl',
      name: 'Leg Curl',
      group: 'Legs',
      equipment: 'Machine',
      beginner: true,
      instructions:
        'Curl your heels toward your glutes against the machine’s resistance, then lower slowly.',
      tips:
        'Avoid lifting your hips off the pad as you curl.'
    },

    {
      id: 'leg-extension',
      name: 'Leg Extension',
      group: 'Legs',
      equipment: 'Machine',
      beginner: true,
      instructions:
        'Extend your legs to lift the pad until your knees are straight, then lower with control.',
      tips:
        'Pause briefly at the top for a stronger quad contraction.'
    },

    {
      id: 'calf-raise',
      name: 'Calf Raise',
      group: 'Legs',
      equipment: 'Bodyweight or Machine',
      beginner: true,
      instructions:
        'Rise up onto the balls of your feet as high as you can, then lower your heels below the step level.',
      tips:
        'Go slow — calves respond well to a controlled stretch and squeeze.'
    },

    {
      id: 'lunge',
      name: 'Lunge',
      group: 'Legs',
      equipment: 'Bodyweight or Dumbbells',
      beginner: true,
      instructions:
        'Step forward and lower your back knee toward the floor, then push back to standing.',
      tips:
        'Keep your front knee over your ankle, not past your toes.'
    },


    /* -------------------------------------------------------------------
     * Core
     * ----------------------------------------------------------------- */

    {
      id: 'plank',
      name: 'Plank',
      group: 'Core',
      equipment: 'Bodyweight',
      beginner: true,
      instructions:
        'Hold a straight-line position on your forearms and toes, keeping your hips level.',
      tips:
        'Squeeze your glutes and brace your abs like you’re about to be poked in the stomach.'
    },

    {
      id: 'crunches',
      name: 'Crunches',
      group: 'Core',
      equipment: 'Bodyweight',
      beginner: true,
      instructions:
        'Lift your shoulders off the floor by curling your torso toward your knees, then lower back down.',
      tips:
        'Exhale as you curl up — don’t pull on your neck with your hands.'
    },

    {
      id: 'russian-twist',
      name: 'Russian Twist',
      group: 'Core',
      equipment: 'Bodyweight or Plate',
      beginner: true,
      instructions:
        'Seated with feet lifted, rotate your torso side to side, tapping the floor beside you.',
      tips:
        'Move with control — speed doesn’t make this exercise more effective.'
    },

    {
      id: 'hanging-leg-raise',
      name: 'Hanging Leg Raise',
      group: 'Core',
      equipment: 'Pull-Up Bar',
      beginner: false,
      instructions:
        'Hang from a bar and raise your legs until they’re roughly parallel to the floor, then lower slowly.',
      tips:
        'Avoid swinging — control the movement on the way down too.'
    },


    /* -------------------------------------------------------------------
     * Cardio
     * ----------------------------------------------------------------- */

    {
      id: 'treadmill',
      name: 'Treadmill',
      group: 'Cardio',
      equipment: 'Treadmill',
      beginner: true,
      instructions:
        'Walk, jog, or run at a pace you can sustain for your target duration.',
      tips:
        'Track sets as time-based — e.g. "1 set" of 20 minutes at a set incline.'
    },

    {
      id: 'cycling',
      name: 'Cycling',
      group: 'Cardio',
      equipment: 'Stationary Bike',
      beginner: true,
      instructions:
        'Pedal at a steady or interval pace for your target duration.',
      tips:
        'Adjust seat height so your knee has a slight bend at the bottom of the pedal stroke.'
    },

    {
      id: 'rowing-machine',
      name: 'Rowing Machine',
      group: 'Cardio',
      equipment: 'Rower',
      beginner: true,
      instructions:
        'Drive with your legs, then lean back and pull the handle to your chest, reversing the order on the way back.',
      tips:
        'Legs, then back, then arms — and reverse on the return.'
    },

    {
      id: 'jump-rope',
      name: 'Jump Rope',
      group: 'Cardio',
      equipment: 'Jump Rope',
      beginner: true,
      instructions:
        'Jump rope at a steady rhythm, landing softly on the balls of your feet.',
      tips:
        'Keep jumps small and low — you don’t need to jump high, just clear the rope.'
    }
  ];


  /* ---------------------------------------------------------------------
   * Get all exercises
   * ------------------------------------------------------------------- */

  function getAll() {

    const custom =
      Storage.get().customExercises || [];

    return [
      ...BUILT_IN,
      ...custom
    ];
  }


  /* ---------------------------------------------------------------------
   * Get exercise by ID
   * ------------------------------------------------------------------- */

  function getById(id) {

    return getAll().find(
      exercise => exercise.id === id
    );
  }


  /* ---------------------------------------------------------------------
   * Get exercises by muscle group
   * ------------------------------------------------------------------- */

  function getByGroup(group) {

    return getAll().filter(
      exercise => exercise.group === group
    );
  }


  /* ---------------------------------------------------------------------
   * Add custom exercise
   * ------------------------------------------------------------------- */

  function addCustom(exercise) {

    if (!exercise) {
      return null;
    }


    const name =
      String(exercise.name || '').trim();

    const group =
      String(exercise.group || '').trim();


    /*
     * A custom exercise needs at least a name and group.
     */
    if (!name || !group) {

      console.error(
        'Cannot add custom exercise: name and group are required.'
      );

      return null;
    }


    const data = Storage.get();


    const newEx = {

      id: Storage.uid('ex'),

      name,

      group,

      equipment:
        String(exercise.equipment || 'Other').trim(),

      beginner:
        Boolean(exercise.beginner),

      instructions:
        String(exercise.instructions || '').trim(),

      tips:
        String(exercise.tips || '').trim(),

      custom: true
    };


    Storage.update({

      customExercises: [
        ...(data.customExercises || []),
        newEx
      ]

    });


    return newEx;
  }


  /* ---------------------------------------------------------------------
   * Public API
   * ------------------------------------------------------------------- */

  return {

    GROUPS,

    getAll,

    getById,

    getByGroup,

    addCustom

  };

})();
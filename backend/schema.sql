CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) DEFAULT '',
    age INTEGER,
    height NUMERIC,
    weight NUMERIC,
    goal VARCHAR(100) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS workouts (
    id VARCHAR(100) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    workout_date DATE NOT NULL,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS workout_exercises (
    id SERIAL PRIMARY KEY,
    workout_id VARCHAR(100) NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id VARCHAR(100) NOT NULL,
    exercise_name VARCHAR(150) NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_sets (
    id SERIAL PRIMARY KEY,
    workout_exercise_id INTEGER NOT NULL
        REFERENCES workout_exercises(id) ON DELETE CASCADE,
    reps INTEGER,
    weight NUMERIC,
    completed BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS measurements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    measurement_date DATE NOT NULL,
    weight NUMERIC,
    chest NUMERIC,
    waist NUMERIC,
    arms NUMERIC,
    thighs NUMERIC,
    shoulders NUMERIC
);

CREATE TABLE IF NOT EXISTS custom_exercises (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    exercise_group VARCHAR(100),
    equipment VARCHAR(100),
    instructions TEXT DEFAULT '',
    tips TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS personal_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id VARCHAR(100) NOT NULL,
    exercise_name VARCHAR(150) NOT NULL,
    weight NUMERIC NOT NULL,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, exercise_id)
);
-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'dark',
    weight_unit VARCHAR(10) DEFAULT 'kg',
    height_unit VARCHAR(10) DEFAULT 'cm',
    reminder_enabled BOOLEAN DEFAULT FALSE,
    reminder_time VARCHAR(5) DEFAULT '18:00'
);


-- Active workout
CREATE TABLE IF NOT EXISTS active_workouts (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    workout_data JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

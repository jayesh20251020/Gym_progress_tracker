from flask import Blueprint, jsonify, request, session
from database import get_connection
from psycopg.types.json import Jsonb


data = Blueprint("data", __name__)


def get_user_id():
    return session.get("user_id")


# =====================================================================
# GET ALL USER DATA
# =====================================================================

@data.route("/api/data", methods=["GET"])
def get_data():

    user_id = get_user_id()

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    connection = get_connection()

    try:

        with connection.cursor() as cursor:

            # =========================================================
            # PROFILE
            # =========================================================

            cursor.execute("""
                SELECT name, age, height, weight, goal
                FROM profiles
                WHERE user_id = %s
            """, (user_id,))

            row = cursor.fetchone()

            profile = {
                "name": row[0] if row else "",
                "age": row[1] if row else "",
                "height": float(row[2]) if row and row[2] is not None else "",
                "weight": float(row[3]) if row and row[3] is not None else "",
                "goal": row[4] if row else ""
            }


            # =========================================================
            # SETTINGS
            # =========================================================

            cursor.execute("""
                SELECT
                    theme,
                    weight_unit,
                    height_unit,
                    reminder_enabled,
                    reminder_time
                FROM user_settings
                WHERE user_id = %s
            """, (user_id,))

            settings_row = cursor.fetchone()

            settings = {
                "theme": settings_row[0] if settings_row else "dark",
                "weightUnit": settings_row[1] if settings_row else "kg",
                "heightUnit": settings_row[2] if settings_row else "cm",
                "reminderEnabled": (
                    bool(settings_row[3])
                    if settings_row
                    else False
                ),
                "reminderTime": (
                    settings_row[4]
                    if settings_row
                    else "18:00"
                )
            }


            # =========================================================
            # ACTIVE WORKOUT
            # =========================================================

            cursor.execute("""
                SELECT workout_data
                FROM active_workouts
                WHERE user_id = %s
            """, (user_id,))

            active_workout_row = cursor.fetchone()

            active_workout = (
                active_workout_row[0]
                if active_workout_row
                else None
            )


            # =========================================================
            # MEASUREMENTS
            # =========================================================

            cursor.execute("""
                SELECT
                    measurement_date,
                    weight,
                    chest,
                    waist,
                    arms,
                    thighs,
                    shoulders
                FROM measurements
                WHERE user_id = %s
                ORDER BY measurement_date DESC
            """, (user_id,))

            measurements = []

            for row in cursor.fetchall():

                measurements.append({
                    "date": str(row[0]),
                    "weight": (
                        float(row[1])
                        if row[1] is not None
                        else ""
                    ),
                    "chest": (
                        float(row[2])
                        if row[2] is not None
                        else ""
                    ),
                    "waist": (
                        float(row[3])
                        if row[3] is not None
                        else ""
                    ),
                    "arms": (
                        float(row[4])
                        if row[4] is not None
                        else ""
                    ),
                    "thighs": (
                        float(row[5])
                        if row[5] is not None
                        else ""
                    ),
                    "shoulders": (
                        float(row[6])
                        if row[6] is not None
                        else ""
                    )
                })


            # =========================================================
            # CUSTOM EXERCISES
            # =========================================================

            cursor.execute("""
                SELECT
                    id,
                    name,
                    exercise_group,
                    equipment,
                    instructions,
                    tips
                FROM custom_exercises
                WHERE user_id = %s
                ORDER BY id
            """, (user_id,))

            custom_exercises = []

            for row in cursor.fetchall():

                custom_exercises.append({
                    "id": str(row[0]),
                    "name": row[1],
                    "group": row[2] or "",
                    "equipment": row[3] or "",
                    "instructions": row[4] or "",
                    "tips": row[5] or ""
                })


            # =========================================================
            # PERSONAL RECORDS
            # =========================================================

            cursor.execute("""
                SELECT
                    exercise_id,
                    exercise_name,
                    weight,
                    achieved_at
                FROM personal_records
                WHERE user_id = %s
            """, (user_id,))

            personal_records = {}

            for row in cursor.fetchall():

                personal_records[str(row[0])] = {
                    "weight": float(row[2]),
                    "reps": 0,
                    "estOneRM": float(row[2]),
                    "date": str(row[3])
                }


            # =========================================================
            # WORKOUTS
            # =========================================================

            cursor.execute("""
                SELECT
                    id,
                    name,
                    workout_date,
                    started_at,
                    finished_at,
                    notes
                FROM workouts
                WHERE user_id = %s
                ORDER BY workout_date DESC, started_at DESC
            """, (user_id,))

            workouts = []

            for workout_row in cursor.fetchall():

                workout_id = workout_row[0]

                workout = {
                    "id": workout_id,
                    "name": workout_row[1],
                    "date": workout_row[2].isoformat(),
                    "startedAt": (
                        int(workout_row[3].timestamp() * 1000)
                        if workout_row[3]
                        else None
                    ),
                    "finishedAt": (
                        int(workout_row[4].timestamp() * 1000)
                        if workout_row[4]
                        else None
                    ),
                    "notes": workout_row[5] or "",
                    "exercises": []
                }


                # =====================================================
                # WORKOUT EXERCISES
                # =====================================================

                cursor.execute("""
                    SELECT
                        id,
                        exercise_id,
                        exercise_name
                    FROM workout_exercises
                    WHERE workout_id = %s
                    ORDER BY id
                """, (workout_id,))

                for exercise_row in cursor.fetchall():

                    workout_exercise_id = exercise_row[0]

                    exercise = {
                        "exerciseId": exercise_row[1],
                        "name": exercise_row[2],
                        "sets": []
                    }


                    # =================================================
                    # WORKOUT SETS
                    # =================================================

                    cursor.execute("""
                        SELECT
                            reps,
                            weight,
                            completed
                        FROM workout_sets
                        WHERE workout_exercise_id = %s
                        ORDER BY id
                    """, (workout_exercise_id,))

                    for set_row in cursor.fetchall():

                        exercise["sets"].append({
                            "reps": (
                                set_row[0]
                                if set_row[0] is not None
                                else ""
                            ),
                            "weight": (
                                float(set_row[1])
                                if set_row[1] is not None
                                else ""
                            ),
                            "completed": bool(set_row[2])
                        })


                    workout["exercises"].append(exercise)


                # =====================================================
                # TOTAL VOLUME
                # =====================================================

                total_volume = 0

                for exercise in workout["exercises"]:

                    for workout_set in exercise["sets"]:

                        weight = workout_set["weight"]
                        reps = workout_set["reps"]

                        if weight != "" and reps != "":
                            total_volume += weight * reps

                workout["totalVolume"] = total_volume

                workouts.append(workout)


            # =========================================================
            # RETURN ALL DATA
            # =========================================================

            return jsonify({

                "profile": profile,

                "settings": settings,

                "customExercises": custom_exercises,

                "workouts": workouts,

                "activeWorkout": active_workout,

                "measurements": measurements,

                "personalRecords": personal_records
            })

    finally:

        connection.close()


# =====================================================================
# SAVE USER DATA
# =====================================================================

@data.route("/api/data", methods=["PUT"])
def save_data():

    user_id = get_user_id()

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    incoming = request.get_json(silent=True)

    if not isinstance(incoming, dict):
        return jsonify({"error": "Request data must be a JSON object"}), 400

    # Keep one sync request bounded, preventing an oversized payload from
    # exhausting the app or database. The normal UI is far below this limit.
    for key, maximum in {
        "workouts": 500,
        "measurements": 2_000,
        "customExercises": 500,
    }.items():
        value = incoming.get(key, [])
        if not isinstance(value, list) or len(value) > maximum:
            return jsonify({"error": f"Invalid or oversized {key} data"}), 400

    for key in ("profile", "settings", "personalRecords"):
        value = incoming.get(key, {})
        if not isinstance(value, dict):
            return jsonify({"error": f"Invalid {key} data"}), 400

    connection = get_connection()

    try:

        with connection.cursor() as cursor:

            # =========================================================
            # PROFILE
            # =========================================================

            profile = incoming.get("profile", {})

            cursor.execute("""
                INSERT INTO profiles
                    (
                        user_id,
                        name,
                        age,
                        height,
                        weight,
                        goal
                    )
                VALUES
                    (%s, %s, %s, %s, %s, %s)

                ON CONFLICT (user_id)
                DO UPDATE SET
                    name = EXCLUDED.name,
                    age = EXCLUDED.age,
                    height = EXCLUDED.height,
                    weight = EXCLUDED.weight,
                    goal = EXCLUDED.goal
            """, (
                user_id,
                profile.get("name", ""),
                profile.get("age") or None,
                profile.get("height") or None,
                profile.get("weight") or None,
                profile.get("goal", "")
            ))


            # =========================================================
            # SETTINGS
            # =========================================================

            settings = incoming.get("settings", {})

            cursor.execute("""
                INSERT INTO user_settings
                    (
                        user_id,
                        theme,
                        weight_unit,
                        height_unit,
                        reminder_enabled,
                        reminder_time
                    )
                VALUES
                    (%s, %s, %s, %s, %s, %s)

                ON CONFLICT (user_id)
                DO UPDATE SET
                    theme = EXCLUDED.theme,
                    weight_unit = EXCLUDED.weight_unit,
                    height_unit = EXCLUDED.height_unit,
                    reminder_enabled = EXCLUDED.reminder_enabled,
                    reminder_time = EXCLUDED.reminder_time
            """, (
                user_id,
                settings.get("theme", "dark"),
                settings.get("weightUnit", "kg"),
                settings.get("heightUnit", "cm"),
                bool(settings.get("reminderEnabled", False)),
                settings.get("reminderTime", "18:00")
            ))


            # =========================================================
            # ACTIVE WORKOUT
            # =========================================================

            active_workout = incoming.get("activeWorkout")

            if active_workout:

                cursor.execute("""
                    INSERT INTO active_workouts
                        (
                            user_id,
                            workout_data,
                            updated_at
                        )
                    VALUES
                        (%s, %s, CURRENT_TIMESTAMP)

                    ON CONFLICT (user_id)
                    DO UPDATE SET
                        workout_data = EXCLUDED.workout_data,
                        updated_at = CURRENT_TIMESTAMP
                """, (
                    user_id,
                    Jsonb(active_workout)
                ))

            else:

                cursor.execute("""
                    DELETE FROM active_workouts
                    WHERE user_id = %s
                """, (user_id,))


            # =========================================================
            # MEASUREMENTS
            # =========================================================

            cursor.execute("""
                DELETE FROM measurements
                WHERE user_id = %s
            """, (user_id,))

            for measurement in incoming.get("measurements", []):

                measurement_date = measurement.get("date")

                if not measurement_date:
                    continue

                cursor.execute("""
                    INSERT INTO measurements
                        (
                            user_id,
                            measurement_date,
                            weight,
                            chest,
                            waist,
                            arms,
                            thighs,
                            shoulders
                        )
                    VALUES
                        (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    user_id,
                    measurement_date,
                    measurement.get("weight") or None,
                    measurement.get("chest") or None,
                    measurement.get("waist") or None,
                    measurement.get("arms") or None,
                    measurement.get("thighs") or None,
                    measurement.get("shoulders") or None
                ))


            # =========================================================
            # CUSTOM EXERCISES
            # =========================================================

            cursor.execute("""
                DELETE FROM custom_exercises
                WHERE user_id = %s
            """, (user_id,))

            for exercise in incoming.get("customExercises", []):

                cursor.execute("""
                    INSERT INTO custom_exercises
                        (
                            user_id,
                            name,
                            exercise_group,
                            equipment,
                            instructions,
                            tips
                        )
                    VALUES
                        (%s, %s, %s, %s, %s, %s)
                """, (
                    user_id,
                    exercise.get("name", ""),
                    exercise.get("group", ""),
                    exercise.get("equipment", ""),
                    exercise.get("instructions", ""),
                    exercise.get("tips", "")
                ))


            # =========================================================
            # PERSONAL RECORDS
            # =========================================================

            cursor.execute("""
                DELETE FROM personal_records
                WHERE user_id = %s
            """, (user_id,))

            personal_records = incoming.get("personalRecords", {})

            for exercise_id, record in personal_records.items():

                weight = record.get("weight")

                if weight in ("", None):
                    continue

                cursor.execute("""
                    INSERT INTO personal_records
                        (
                            user_id,
                            exercise_id,
                            exercise_name,
                            weight,
                            achieved_at
                        )
                    VALUES
                        (%s, %s, %s, %s, %s)
                """, (
                    user_id,
                    str(exercise_id),
                    record.get("exerciseName", ""),
                    weight,
                    record.get("date")
                ))


            # =========================================================
            # WORKOUTS
            # =========================================================

            workouts = incoming.get("workouts", [])

            for workout in workouts:

                if not isinstance(workout, dict) or not workout.get("id"):
                    continue

                workout_id = str(workout["id"])

                if len(workout_id) > 100:
                    continue


                cursor.execute("""
                    INSERT INTO workouts
                        (
                            id,
                            user_id,
                            name,
                            workout_date,
                            started_at,
                            finished_at,
                            notes
                        )
                    VALUES
                        (%s, %s, %s, %s, %s, %s, %s)

                    ON CONFLICT (id)
                    DO UPDATE SET
                        name = EXCLUDED.name,
                        workout_date = EXCLUDED.workout_date,
                        started_at = EXCLUDED.started_at,
                        finished_at = EXCLUDED.finished_at,
                        notes = EXCLUDED.notes
                    WHERE workouts.user_id = EXCLUDED.user_id
                    RETURNING id
                """, (
                    workout_id,
                    user_id,
                    workout.get("name", "Workout"),
                    workout.get("date", "")[:10],
                    workout.get("startedAt"),
                    workout.get("finishedAt"),
                    workout.get("notes", "")
                ))

                # A globally unique workout ID must never let one account
                # overwrite another account's workout.
                if not cursor.fetchone():
                    raise ValueError("Workout belongs to a different user")


                # -----------------------------------------------------
                # DELETE OLD EXERCISES
                # -----------------------------------------------------

                cursor.execute("""
                    DELETE FROM workout_exercises
                    WHERE workout_id = %s
                """, (workout_id,))


                # -----------------------------------------------------
                # SAVE EXERCISES
                # -----------------------------------------------------

                for exercise in workout.get("exercises", []):

                    cursor.execute("""
                        INSERT INTO workout_exercises
                            (
                                workout_id,
                                exercise_id,
                                exercise_name
                            )
                        VALUES
                            (%s, %s, %s)
                        RETURNING id
                    """, (
                        workout_id,
                        str(exercise.get("exerciseId")),
                        exercise.get("name", "")
                    ))

                    workout_exercise_id = cursor.fetchone()[0]


                    # -------------------------------------------------
                    # SAVE SETS
                    # -------------------------------------------------

                    for workout_set in exercise.get("sets", []):

                        cursor.execute("""
                            INSERT INTO workout_sets
                                (
                                    workout_exercise_id,
                                    reps,
                                    weight,
                                    completed
                                )
                            VALUES
                                (%s, %s, %s, %s)
                        """, (
                            workout_exercise_id,
                            workout_set.get("reps") or None,
                            workout_set.get("weight") or None,
                            bool(
                                workout_set.get(
                                    "completed",
                                    False
                                )
                            )
                        ))


        # =============================================================
        # COMMIT
        # =============================================================

        connection.commit()

        return jsonify({
            "message": "All data saved successfully"
        })


    except Exception as e:

        connection.rollback()

        print("Save data error:", e)

        return jsonify({
            "error": "Failed to save data"
        }), 500


    finally:

        connection.close()

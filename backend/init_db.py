"""Create IronLog's database tables. Run once for a new database."""

from pathlib import Path

from database import get_connection


def main():
    schema = (Path(__file__).parent / "schema.sql").read_text(encoding="utf-8")

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(schema)

    print("IronLog database tables are ready.")


if __name__ == "__main__":
    main()

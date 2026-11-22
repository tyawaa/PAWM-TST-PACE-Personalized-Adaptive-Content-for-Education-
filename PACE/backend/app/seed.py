# Data contoh untuk demo, belum ditinjau guru.

import json

from .config import Settings
from .database import connect, initialize

CONCEPTS = [
    ("greetings", "Greetings and introductions", "introductions", "vocabulary", 4, None, 1),
    ("daily-vocabulary", "Daily activities", "daily-routines", "vocabulary", 4, None, 2),
    (
        "daily-reading",
        "Reading a daily routine",
        "daily-routines",
        "reading",
        4,
        "daily-vocabulary",
        3,
    ),
]

MATERIALS = [
    (
        "greetings-material",
        "greetings",
        "Berkenalan dalam bahasa Inggris",
        "Hello berarti halo. Good morning berarti selamat pagi. Untuk memperkenalkan diri, "
        "gunakan 'My name is ...'. Untuk menanyakan nama, gunakan 'What is your name?'. "
        "Nice to meet you berarti senang berkenalan denganmu.",
    ),
    (
        "daily-vocabulary-material",
        "daily-vocabulary",
        "Kosakata kegiatan sehari-hari",
        "Wake up: bangun tidur. Eat breakfast: sarapan. Go to school: pergi ke sekolah. "
        "Read a book: membaca buku. Sleep: tidur. Contoh: I eat breakfast in the morning.",
    ),
    (
        "daily-reading-material",
        "daily-reading",
        "Bacaan singkat: Rani's morning",
        "Rani wakes up at six. She eats breakfast at home. She goes to school at seven. "
        "She reads a book in class. After school, she plays with her friends.",
    ),
]

QUESTION_SETS = {
    "greetings": [
        (
            "Apa arti 'Hello'?",
            ["Halo", "Tidur", "Buku", "Sekolah"],
            0,
            "Hello digunakan untuk menyapa.",
        ),
        (
            "Sapaan yang tepat pada pagi hari adalah ...",
            ["Good night", "Good morning", "Goodbye", "Thank you"],
            1,
            "Good morning berarti selamat pagi.",
        ),
        (
            "Lengkapi: 'My ... is Rani.'",
            ["book", "school", "name", "morning"],
            2,
            "My name is Rani berarti nama saya Rani.",
        ),
        (
            "Bagaimana menanyakan nama?",
            ["Where is my book?", "I am sleeping.", "Goodbye!", "What is your name?"],
            3,
            "What is your name? digunakan untuk menanyakan nama.",
        ),
        (
            "Arti 'Nice to meet you' adalah ...",
            ["Senang berkenalan denganmu", "Selamat tidur", "Saya lapar", "Ini buku"],
            0,
            "Ungkapan ini digunakan saat berkenalan.",
        ),
    ],
    "daily-vocabulary": [
        (
            "Apa arti 'wake up'?",
            ["Bangun tidur", "Membaca", "Berlari", "Tidur"],
            0,
            "Wake up berarti bangun tidur.",
        ),
        (
            "Bahasa Inggris 'sarapan' adalah ...",
            ["read a book", "eat breakfast", "go to school", "sleep"],
            1,
            "Eat breakfast berarti sarapan.",
        ),
        (
            "Apa arti 'go to school'?",
            ["Pulang ke rumah", "Bermain", "Pergi ke sekolah", "Membaca buku"],
            2,
            "Go to school berarti pergi ke sekolah.",
        ),
        (
            "Lengkapi: 'I ... a book.'",
            ["sleep", "eat", "wake", "read"],
            3,
            "Read a book berarti membaca buku.",
        ),
        (
            "Kata yang berarti 'tidur' adalah ...",
            ["sleep", "read", "eat", "go"],
            0,
            "Sleep berarti tidur.",
        ),
    ],
    "daily-reading": [
        (
            "Rani wakes up at six. What time does Rani wake up?",
            ["At six", "At seven", "At eight", "At nine"],
            0,
            "Kalimat menyebutkan Rani bangun pada pukul enam.",
        ),
        (
            "She eats breakfast at home. Where does she eat breakfast?",
            ["At school", "At home", "At the park", "At the shop"],
            1,
            "At home berarti di rumah.",
        ),
        (
            "She goes to school at seven. Where does she go?",
            ["To the park", "To the shop", "To school", "To bed"],
            2,
            "Kalimat menyebutkan Rani pergi ke sekolah.",
        ),
        (
            "She reads a book in class. What does she read?",
            ["A map", "A letter", "A menu", "A book"],
            3,
            "A book berarti sebuah buku.",
        ),
        (
            "After school, she plays with her friends. When does she play?",
            ["After school", "Before breakfast", "At midnight", "Before waking up"],
            0,
            "After school berarti setelah sekolah.",
        ),
    ],
}


def seed_demo(path):
    with connect(path) as db:
        db.executemany("INSERT OR IGNORE INTO concepts VALUES (?,?,?,?,?,?,?)", CONCEPTS)
        for identifier, concept, title, content in MATERIALS:
            db.execute(
                "INSERT OR IGNORE INTO materials VALUES (?,?,?,?,?,?,?,?)",
                (
                    identifier,
                    concept,
                    title,
                    content,
                    1,
                    "PACE: contoh internal, menunggu tinjauan pengelola/guru",
                    "Belum ditetapkan",
                    0,
                ),
            )
        for concept, questions in QUESTION_SETS.items():
            for index, (prompt, options, correct, explanation) in enumerate(questions, 1):
                db.execute(
                    "INSERT OR IGNORE INTO questions VALUES (?,?,?,?,?,?,?)",
                    (
                        f"{concept}-q{index}",
                        concept,
                        prompt,
                        json.dumps(options),
                        correct,
                        explanation,
                        1,
                    ),
                )


def main() -> None:
    settings: Settings = Settings.from_env()
    initialize(settings.database_path)
    seed_demo(settings.database_path)
    print("Data demo siap.")


if __name__ == "__main__":
    main()

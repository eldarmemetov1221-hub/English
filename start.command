#!/bin/bash
# Запуск My English Tutor на macOS / Linux (двойной клик).
cd "$(dirname "$0")"
echo "My English Tutor -> http://localhost:5173"
echo "Чтобы остановить — закрой это окно (Ctrl+C)."
( sleep 1; open http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173 2>/dev/null ) &
python3 -m http.server 5173

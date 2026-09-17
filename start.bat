@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo    My English Tutor
echo ============================================
echo.
echo Открываю приложение в браузере...
echo Адрес: http://localhost:5173
echo.
echo Чтобы закрыть приложение - просто закрой это окно.
echo.
start "" http://localhost:5173
python -m http.server 5173 2>nul || py -m http.server 5173 2>nul || (
  echo.
  echo [ОШИБКА] Python не найден.
  echo Установи Python с https://python.org
  echo и обязательно поставь галочку "Add Python to PATH".
  echo.
  pause
)

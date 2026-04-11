@echo off
echo ========================================
echo Setup Database PulsaKu
echo ========================================
echo.

REM Set database credentials
set DB_HOST=localhost
set DB_PORT=5432
set DB_USER=postgres
set DB_NAME=pulsa_db

echo Creating database: %DB_NAME%
echo.

REM Create database
psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -c "DROP DATABASE IF EXISTS %DB_NAME%;"
psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -c "CREATE DATABASE %DB_NAME%;"

echo.
echo Database created successfully!
echo.
echo Running migrations...
echo.

REM Run migrations
psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -f database\schema.sql

echo.
echo ========================================
echo Database setup completed!
echo ========================================
echo.
echo You can now run: npm run dev
echo.

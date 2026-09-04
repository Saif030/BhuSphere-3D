@echo off
echo === BhuSphere 3D backend ===
cd /d %~dp0\..\backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

@echo off
echo === BhuSphere 3D frontend ===
cd /d %~dp0\..\frontend
if not exist node_modules npm install
npm run dev

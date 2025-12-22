@echo off
chcp 65001 >nul
echo 正在切换到项目目录...
cd /d "D:\cmy2\cmy\consumable-manager"

echo 正在停止相关进程...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im electron.exe >nul 2>&1

echo 正在删除项目级缓存...
del /f /q "builder-effective-config.yaml" >nul 2>&1
rmdir /s /q "node_modules\.cache" >nul 2>&1
rmdir /s /q "out" >nul 2>&1
rmdir /s /q "dist-win" >nul 2>&1

echo 项目级缓存删除完成！
pause
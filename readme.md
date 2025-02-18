install clang, vs2022, include clang reqs there. install ninja via chocolatey
delete cmakecache if its in the main folder or in the build
updated cmakelists, check it out
ctrl+p then cmake select kit and select clang (not clang-cl) , i have ver 19 something
cd build
cmake .. -G"Unix Makefiles"

choco install vcxsrv
Open "VcXsrv X Server" (or run vcxsrv.exe).
Select Multiple windows.
Check "Disable Access Control" (important for Docker).
Click Next until you reach "Finish", then click Finish.
VcXsrv should now be running in the system tray.
pwshell $env:DISPLAY="host.docker.internal:0"

docker run --rm -it -e DISPLAY=host.docker.internal:0 -v ${PWD}/data:/app/data repulsive_curves /bin/bash -c "cd /app/build && ./repulsive_curves /app/data/test.obj"

<!-- cmake --build build -->

cd ..
build/Debug/repulsive_curves.exe data/petersen_alternate.obj

install clang, vs2022, include clang reqs there. install ninja via chocolatey
delete cmakecache if its in the main folder or in the build
updated cmakelists, check it out
ctrl+p then cmake select kit and select clang (not clang-cl) , i have ver 19 something
cd build
cmake ..
cmake --build build
cd ..
build/Debug/repulsive_curves.exe data/petersen_alternate.obj

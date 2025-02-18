install clang, vs2022, include clang reqs there. install ninja via chocolatey
cd build
cmake ..
cmake --build build
cd ..
build/Debug/repulsive_curves.exe data/petersen_alternate.obj

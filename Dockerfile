# Use Ubuntu as the base image
FROM ubuntu:latest

# Install necessary packages
RUN apt update && apt install -y \
    cmake g++ make git git-lfs \
    libx11-dev libxrandr-dev libxinerama-dev libxcursor-dev libxi-dev \
    libgl1-mesa-dev libglu1-mesa-dev freeglut3-dev

# Initialize Git LFS
RUN git lfs install

# Set working directory
WORKDIR /app

# Clone the repository
RUN git clone https://github.com/utof/repulsive_curves_implementation.git .

# Ensure all LFS-tracked files are pulled
RUN git lfs pull

# Ensure the /data folder exists
RUN ls -lah /app/data

# # Change permissions of the x_y_z_axis.obj file
# RUN chmod +x /app/data/x_y_z_axis.obj

# Create build directory and configure CMake
RUN mkdir build && cd build && cmake -DCMAKE_CXX_STANDARD=17 .. 

# Apply a patch to fix missing <cstdint> in libigl headers after CMake fetches dependencies
RUN find /app/build/_deps/libigl-src/include/igl -type f -exec sed -i '1i #include <cstdint>' {} +

# Compile the project
RUN cd build && make -j$(nproc)

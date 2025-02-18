FROM ubuntu:20.04

# Set noninteractive frontend for apt-get to avoid prompts
ENV DEBIAN_FRONTEND=noninteractive

# Update package lists and install required packages including OpenGL libraries
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        cmake \
        git \
        ca-certificates \
        libx11-dev \
        libxrandr-dev \
        libxinerama-dev \
        libxcursor-dev \
        libxi-dev \
        libgl1-mesa-dev \
        libglu1-mesa-dev \
        freeglut3-dev && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy all repository files into the container
COPY . .

# Remove any existing build directory (if any) and create a fresh one
RUN rm -rf build && mkdir build

# Switch to the build directory
WORKDIR /app/build

# Configure the project with CMake
RUN cmake -DCMAKE_CXX_STANDARD=17 ..

# Build the project
RUN make
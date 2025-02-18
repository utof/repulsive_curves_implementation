<script>
  import { onMount } from "svelte";
  import { init_curve } from "../init_curve.js";
  import { repulsion_iteration } from "../repulsion_iteration.js";
  import { read_curve_file } from "../read_curve_file.js";
  import FileUploader from "$lib/components/FileUploader.svelte";
  import { V, E, Ac, E_adj, lengths } from "$lib/stores.js"; // Import stores

  // Canvas setup
  let canvas;
  let ctx;
  let animationId;
  let isAnimating = false;
  let showSamples = true;
  let OV; // To store the original vertices for reset

  // Parameters from the original main.cpp
  const alpha = 3; // changes the nature of the tangent-point energy
  const beta = 6;  // changes the nature of the tangent-point energy
  const a_const = 0.01; // line search parameter (between 0 and 0.5)
  const b_const = 0.9;  // line search parameter (between 0 and 1)
  const max_iters = 20; // max iterations for projection
  const threshold = 0.001; // constraint threshold

  // Colors
  const orange = { r: 255, g: 179, b: 51 }; // RGB equivalent of (1.0, 0.7, 0.2)

  onMount(async () => {
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth * 0.8;
      canvas.height = window.innerHeight * 0.8;
      render();
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Load initial curve data (example curve)
    const exampleData = `v -1 -1 0
v 1 -1 0
v 1 1 0
v -1 1 0
l 1 2
l 2 3
l 3 4
l 4 1`;

    loadCurveData(exampleData);
  });

  function loadCurveData(content) {
    try {
      const { V: newV, E: newE } = read_curve_file(content);
      // Store the initial vertices for resetting.  Make sure these are *arrays*,
      // not mathjs matrices, so that we can use the spread operator (...) to
      // copy them.
      OV = newV.clone();
      V.set(newV);
      E.set(newE);

      // Initialize curve data, which updates Ac, E_adj, and lengths stores
      const result = init_curve($E, $V);
      Ac.set(result.Ac);
      E_adj.set(result.E_adj);
      lengths.set(result.lengths);

      render();
    } catch (error) {
      console.error("Error loading curve data:", error);
      alert("Error loading curve file. Please check the file format.");
    }
  }

  function handleFileLoaded(event) {
    const content = event.detail.content;
    loadCurveData(content);
  }

  function reset() {
    // Reset to the originally loaded vertices
    if (OV) {
      V.set(OV.clone()); // Use .clone() to avoid modifying the original
      const result = init_curve($E, $V);
      Ac.set(result.Ac);
      E_adj.set(result.E_adj);
      lengths.set(result.lengths);
      render();
    }
  }

  function step() {
    // Call repulsion_iteration with store values
    V.update((v) => {
			console.log("+page.svelte: V dimensions before update:", v.size());
      const newV = repulsion_iteration(
        alpha,
        beta,
        a_const,
        b_const,
        threshold,
        max_iters,
        $E,
        $Ac,
        $E_adj,
        $lengths,
        v
      );
			console.log("+page.svelte: V dimensions after update:", newV.size());
			return newV;
		});
    render();
  }

  function toggleAnimation() {
    isAnimating = !isAnimating;
    if (isAnimating) {
      animate();
    } else {
      cancelAnimationFrame(animationId);
    }
  }

  function animate() {
    step();
    if (isAnimating) {
      animationId = requestAnimationFrame(animate);
    }
  }

  function render() {
    if (!ctx || !$V || !$E) return;

		console.log("+page.svelte: $V dimensions in render():", $V.size());

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Transform 3D coordinates to 2D screen space
    const scale = Math.min(canvas.width, canvas.height) * 0.4;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Draw edges
    if (showSamples) {
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < $E.size()[0]; i++) {
        const v1 = [$V.get([$E.get([i, 0]), 0]), $V.get([$E.get([i, 0]), 1])];
        const v2 = [$V.get([$E.get([i, 1]), 0]), $V.get([$E.get([i, 1]), 1])];
        // console.log('v1', v1, 'v2', v2);
        ctx.moveTo(centerX + v1[0] * scale, centerY + v1[1] * scale);
        ctx.lineTo(centerX + v2[0] * scale, centerY + v2[1] * scale);
      }
      ctx.stroke();

      // Draw vertices
      ctx.fillStyle = `rgb(${orange.r}, ${orange.g}, ${orange.b})`;
      for (let i = 0; i < $V.size()[0]; i++) {
        ctx.beginPath();
        ctx.arc(
          centerX + $V.get([i, 0]) * scale,
          centerY + $V.get([i, 1]) * scale,
          5,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }
    }
  }

  // Keyboard controls
  function handleKeydown(event) {
    switch (event.key.toLowerCase()) {
      case " ":
        toggleAnimation();
        break;
      case "h":
        step();
        break;
      case "r":
        reset();
        break;
      case "p":
        showSamples = !showSamples;
        render();
        break;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="container">
  <FileUploader on:fileLoaded={handleFileLoaded} />
  <canvas id="canvas" />
  <div class="controls">
    <button on:click={toggleAnimation}>
      {isAnimating ? "Stop" : "Start"} Animation [Space]
    </button>
    <button on:click={step}>Step [H]</button>
    <button on:click={reset}>Reset [R]</button>
    <button
      on:click={() => {
        showSamples = !showSamples;
        render();
      }}
    >
      Toggle Points/Edges [P]
    </button>
  </div>
  <div class="instructions">
    <h3>Controls:</h3>
    <ul>
      <li>[Space] - Toggle animation</li>
      <li>H - Single step with fractional Sobolev descent</li>
      <li>R - Reset curve to initial state</li>
      <li>P - Hide/show points and edges</li>
    </ul>
  </div>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    background-color: #1e1e1e;
    min-height: 100vh;
    color: white;
  }

  canvas {
    border: 1px solid #333;
    background-color: black;
  }

  .controls {
    margin-top: 20px;
    display: flex;
    gap: 10px;
  }

  button {
    padding: 8px 16px;
    background-color: #333;
    color: white;
    border: 1px solid #555;
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover {
    background-color: #444;
  }

  .instructions {
    margin-top: 20px;
    padding: 20px;
    background-color: #333;
    border-radius: 4px;
  }

  ul {
    list-style-type: none;
    padding: 0;
  }

  li {
    margin: 8px 0;
  }
</style>

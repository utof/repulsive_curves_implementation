<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  let dragover = false;

  function handleDragEnter(e) {
    e.preventDefault();
    dragover = true;
  }

  function handleDragLeave() {
    dragover = false;
  }

  function handleDrop(e) {
    e.preventDefault();
    dragover = false;
    
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith(".obj")) {
      readFile(file);
    } else {
      alert("Please upload an OBJ file");
    }
  }

  function handleFileInput(e) {
    const file = e.target.files[0];
    if (file && file.name.toLowerCase().endsWith(".obj")) {
      readFile(file);
    } else {
      alert("Please upload an OBJ file");
    }
  }

  function readFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      dispatch("fileLoaded", { content });
    };
    reader.readAsText(file);
  }
</script>

<div
  class="uploader"
  class:dragover
  on:dragenter={handleDragEnter}
  on:dragover|preventDefault
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
>
  <input
    type="file"
    accept=".obj"
    on:change={handleFileInput}
    id="file-input"
  />
  <label for="file-input">
    <div class="upload-content">
      <span class="icon">📁</span>
      <p>Drop OBJ file here or click to upload</p>
    </div>
  </label>
</div>

<style>
  .uploader {
    width: 100%;
    max-width: 400px;
    height: 200px;
    border: 2px dashed #555;
    border-radius: 8px;
    margin: 20px 0;
    transition: all 0.3s ease;
    position: relative;
  }

  .dragover {
    border-color: #888;
    background-color: rgba(255, 255, 255, 0.05);
  }

  input[type="file"] {
    width: 0.1px;
    height: 0.1px;
    opacity: 0;
    overflow: hidden;
    position: absolute;
    z-index: -1;
  }

  label {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
  }

  .upload-content {
    text-align: center;
    color: #888;
  }

  .icon {
    font-size: 2em;
    margin-bottom: 10px;
  }

  p {
    margin: 0;
  }
</style>

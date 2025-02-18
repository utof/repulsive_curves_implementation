import { Matrix, zeros } from "mathjs";

// Given OBJ file content containing a curve,
// find the vertex position and edges of this curve.
//
// THE FILE MUST BE AN OBJ FILE --- not another file format
//
// Inputs:
//   content  string containing the OBJ file content
// Outputs:
//   V  #V by 3 list of 3D positions of each vertex
//   E  #E by 2 list of indices for the vertices of each edge
function read_curve_file(content) {
  const lines = content.split("\n");

  let v_ind = 0;
  let e_ind = 0;

  // Count vertices and edges
  for (const line of lines) {
    if (line[0] === "v") {
      v_ind++;
    }
    if (line[0] === "l") {
      e_ind++;
    }
  }

  // set the sizes of V and E
  let V = zeros(v_ind, 3);
  let E = zeros(e_ind, 2);

  // now, we will go through the file again and actually set the elements of V and E to the values in the file
  v_ind = 0;
  e_ind = 0;

  for (const line of lines) {
    // if the line starts with 'v' (corresponding to a vert)
    if (line[0] === "v") {
      const tokens = line
        .slice(1) // remove the 'v'
        .trim() // remove leading/trailing whitespace
        .split(/\s+/); // split by whitespace

      V.set([v_ind, 0], parseFloat(tokens[0]));
      V.set([v_ind, 1], parseFloat(tokens[1]));
      V.set([v_ind, 2], parseFloat(tokens[2]));

      v_ind++;
    }

    // if the line starts with 'l' (corresponding to an edge)
    if (line[0] === "l") {
      const tokens = line
        .slice(1) // remove the 'l'
        .trim() // remove leading/trailing whitespace
        .split(/\s+/); // split by whitespace

      // Note: Subtract 1 from indices since OBJ files are 1-based but we want 0-based
      E.set([e_ind, 0], parseInt(tokens[0]) - 1);
      E.set([e_ind, 1], parseInt(tokens[1]) - 1);

      e_ind++;
    }
  }

  // Normalize the model to fit in view
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  // Find bounds
  for (let i = 0; i < V.size()[0]; i++) {
    const x = V.get([i, 0]);
    const y = V.get([i, 1]);
    const z = V.get([i, 2]);

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  // Scale to fit in [-1, 1]
  const scale = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;

  // Apply normalization
  for (let i = 0; i < V.size()[0]; i++) {
    V.set([i, 0], ((V.get([i, 0]) - centerX) / scale) * 2);
    V.set([i, 1], ((V.get([i, 1]) - centerY) / scale) * 2);
    V.set([i, 2], ((V.get([i, 2]) - centerZ) / scale) * 2);
  }

  return { V, E };
}

export { read_curve_file };

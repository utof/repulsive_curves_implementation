import { zeros, matrix } from "mathjs";

// Compute two vector of vectors (Ac and E_adj) which only depend
// on the curve's topology and thus won't have to be recomputed
// for each iteration of descent.
//
// Having these will save time on every iteration.
//
// Also, compute the length of every edge in the curve's initial state ("lengths").
// This will be used later when evaluating constraints.
//
// Inputs:
//   E  #E by 2 list of edge indices for the curve
//   V  #V by 3 list of curve vertex positions
// Outputs:
//   Ac  a vector of vectors containing a vector for each edge "I". This vector consists of
//     the edge indices for all edges which do not intersect edge "I"
//   E_adj  a vector of vectors where there is a vector for each point "p" consisting of
//     the edge indices for all edges containing the point "p"
//   lengths  #E by 1 list of the length of each edge in the curve before any iterations were done
function init_curve(E, V) {
  // Input validation
  if (!E || !V) {
    throw new Error("E and V must be defined");
  }

  // Get dimensions
  const pt_num = V.size()[0];
  const edge_num = E.size()[0];

  // Helper function to safely get vertex coordinates
  const getVertexCoords = (idx) => {
    try {
      return [V.get([idx, 0]), V.get([idx, 1]), V.get([idx, 2])];
    } catch (error) {
      console.error(`Error accessing vertex ${idx}:`, error);
      throw new Error(`Invalid vertex access at index ${idx}`);
    }
  };

  // Helper function to safely get edge vertices
  const getEdgeVertices = (idx) => {
    try {
      return [E.get([idx, 0]), E.get([idx, 1])];
    } catch (error) {
      console.error(`Error accessing edge ${idx}:`, error);
      throw new Error(`Invalid edge access at index ${idx}`);
    }
  };

  // Build Ac (adjacency complement)
  let Ac = [];
  for (let i = 0; i < edge_num; i++) {
    let row = [];
    const [i1, i2] = getEdgeVertices(i);

    for (let j = 0; j < edge_num; j++) {
      if (i !== j) {
        // Don't compare edge with itself
        const [j1, j2] = getEdgeVertices(j);
        // Check if edges share no vertices
        if (i1 !== j1 && i1 !== j2 && i2 !== j1 && i2 !== j2) {
          row.push(j);
        }
      }
    }
    Ac.push(row);
  }

  // Build E_adj (edge adjacency)
  let E_adj = Array(pt_num)
    .fill()
    .map(() => []);
  for (let i = 0; i < edge_num; i++) {
    const [v1, v2] = getEdgeVertices(i);
    E_adj[v1].push(i);
    E_adj[v2].push(i);
  }

  // Compute edge lengths
  let lengths = new Array(edge_num);
  for (let i = 0; i < edge_num; i++) {
    const [v1, v2] = getEdgeVertices(i);
    const p1 = getVertexCoords(v1);
    const p2 = getVertexCoords(v2);
    lengths[i] = vectorNorm(subtractVectors(p1, p2));
  }

  // Validation
  if (
    !Ac.every((row) => Array.isArray(row)) ||
    !E_adj.every((row) => Array.isArray(row)) ||
    !lengths.every((l) => typeof l === "number" && !isNaN(l))
  ) {
    throw new Error("Invalid data structures generated");
  }

  return {
    Ac,
    E_adj,
    lengths: matrix([lengths]).reshape([edge_num, 1]), // Make sure lengths is a column vector
  };
}

// Helper functions for vector operations
function subtractVectors(v1, v2) {
  if (!Array.isArray(v1) || !Array.isArray(v2) || v1.length !== v2.length) {
    throw new Error("Invalid vectors for subtraction");
  }
  return v1.map((x, i) => x - v2[i]);
}

function vectorNorm(v) {
  if (!Array.isArray(v)) {
    throw new Error("Vector must be an array");
  }
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

export { init_curve };

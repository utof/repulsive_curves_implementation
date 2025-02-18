import { zeros, multiply, matrix } from "mathjs";
import { loss_derivative } from "./loss_derivative.js";
import { build_weights } from "./build_weights.js";
import { build_A_bar } from "./build_A_bar.js";
import { constraint_derivative } from "./constraint_derivative.js";
import { solveSystem, buildBlockMatrix } from "./lib/matrixSolver.js";

function repulsion_iteration(
  alpha,
  beta,
  a_const,
  b_const,
  threshold,
  max_iters,
  E,
  Ac,
  E_adj,
  lengths,
  V
) {
  console.log("Iteration in Progress");

  // Ensure E is a matrix
  if (!E.size) {
    E = matrix(E);
  }

  // Ensure V is a matrix
  if (!V.size) {
    V = matrix(V);
  }

  // number of points and number of edges
  const pt_num = V.size()[0];
  const edge_num = E.size()[0];

  // Helper functions for safe matrix access
  const getVertex = (idx) => {
    try {
      return [V.get([idx, 0]), V.get([idx, 1]), V.get([idx, 2])];
    } catch (error) {
      console.error(`Error accessing vertex ${idx}:`, error);
      throw new Error(`Invalid vertex access at index ${idx}`);
    }
  };

  const getEdgeVertices = (idx) => {
    try {
      return [E.get([idx, 0]), E.get([idx, 1])];
    } catch (error) {
      console.error(`Error accessing edge ${idx}:`, error);
      throw new Error(`Invalid edge access at index ${idx}`);
    }
  };

  // Count edges connected to vertices with degree > 2
  let three_way = 0;
  for (let i = 0; i < pt_num; i++) {
    if (E_adj[i].length > 2) {
      three_way += E_adj[i].length;
    }
  }

  // Get indices of edges to constrain
  let constr_edges = zeros(three_way, 1);
  let n = 0;
  for (let i = 0; i < pt_num; i++) {
    if (E_adj[i].length > 2) {
      for (let I_ind = 0; I_ind < E_adj[i].length; I_ind++) {
        let I = E_adj[i][I_ind];
        constr_edges.set([n, 0], I);
        n++;
      }
    }
  }

  // Original total length
  const l0 = Array.isArray(lengths)
    ? lengths.reduce((sum, val) => sum + val, 0)
    : lengths.toArray().reduce((sum, val) => sum + val, 0);

  // Get current edge lengths and tangent vectors
  let L = zeros(edge_num, 1);
  let T = zeros(edge_num, 3);

  for (let i = 0; i < edge_num; i++) {
    const [i1, i2] = getEdgeVertices(i);
    const v1 = getVertex(i1);
    const v2 = getVertex(i2);

    const diff = subtractVectors(v2, v1);
    const norm = vectorNorm(diff);

    // Store length
    L.set([i, 0], norm);

    // Store normalized tangent vector
    for (let j = 0; j < 3; j++) {
      T.set([i, j], diff[j] / norm);
    }
  }

  // Build weight matrices and A_bar
  const { W, W0 } = build_weights(alpha, beta, E, Ac, V, T, L);
  const A_bar = build_A_bar(pt_num, E, Ac, T, L, W, W0);

  // Get loss derivative
  const Deriv = loss_derivative(alpha, beta, E, Ac, E_adj, V, T, L);

  // Get constraint derivatives
  const C = constraint_derivative(E, V, L, E_adj, constr_edges);

  const k = C.size()[0];
  const Z = zeros(k, k);

  // Build system matrix using our matrix solver utility
  const Left = buildBlockMatrix(A_bar, C, Z);
  const Right = zeros(k + pt_num * 3, 1);

  for (let i = 0; i < pt_num * 3; i++) {
    Right.set([i, 0], Deriv.get([0, i]));
  }

  // Solve the system
  const Unknown = solveSystem(Left, Right);

  // Get descent direction
  let descent_dir = zeros(pt_num * 3, 1);
  for (let i = 0; i < pt_num; i++) {
    for (let j = 0; j < 3; j++) {
      descent_dir.set([3 * i + j, 0], -Unknown.get([3 * i + j, 0]));
    }
  }

  // TODO: Complete the rest of the implementation with proper matrix handling
  console.log("Iteration Complete");
  return V; // For now, return original V until full implementation is complete
}

// Helper functions
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

export { repulsion_iteration };

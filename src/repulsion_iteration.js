import { zeros, multiply, matrix } from "mathjs";
import { loss_derivative } from "./loss_derivative.js";
import { build_weights } from "./build_weights.js";
import { build_A_bar } from "./build_A_bar.js";
import { constraint_derivative } from "./constraint_derivative.js";
import { solveSystem, buildBlockMatrix } from "./lib/matrixSolver.js";

// Helper functions
function subtractVectors(v1, v2) {
  if (!Array.isArray(v1) || !Array.isArray(v2) || v1.length !== v2.length) {
    console.error("Invalid vectors for subtraction:", { v1, v2 });
    throw new Error("Invalid vectors for subtraction");
  }
  return v1.map((x, i) => x - v2[i]);
}

function vectorNorm(v) {
  if (!Array.isArray(v)) {
    console.error("Invalid vector for norm:", v);
    throw new Error("Invalid vector for norm");
  }
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

function crossProduct(v1, v2) {
  if (
    !Array.isArray(v1) ||
    !Array.isArray(v2) ||
    v1.length !== 3 ||
    v2.length !== 3
  ) {
    console.error("Invalid vectors for cross product:", { v1, v2 });
    throw new Error("Vectors must be 3D arrays for cross product");
  }
  return [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0],
  ];
}

function scaleVector(v, scale) {
  if (!Array.isArray(v)) {
    console.error("Invalid vector for scaling:", v);
    throw new Error("Invalid vector for scaling");
  }
  return v.map((x) => x * scale);
}

function addVectors(v1, v2) {
  if (!Array.isArray(v1) || !Array.isArray(v2) || v1.length !== v2.length) {
    console.error("Invalid vectors for addition:", { v1, v2 });
    throw new Error("Invalid vectors for addition");
  }
  return v1.map((x, i) => x + v2[i]);
}

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

  // Get indices of edges to constrain (connected to high-degree vertices)
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
  console.log("repulsion_iteration.js: Left dimensions:", Left.size());
  console.log("repulsion_iteration.js: Right dimensions:", Right.size());
  const Unknown = solveSystem(Left, Right);

  // Log the dimensions of Unknown
  console.log("repulsion_iteration.js: Unknown dimensions:", Unknown.size());

  // Get descent direction
  let descent_dir = zeros(pt_num * 3, 1);
  for (let i = 0; i < pt_num; i++) {
    for (let j = 0; j < 3; j++) {
      descent_dir.set([3 * i + j, 0], -Unknown.get([3 * i + j, 0]));
    }
  }

  // Normalize the descent direction
  const descent_norm = vectorNorm(descent_dir.toArray().flat());
  descent_dir = descent_dir.map((val) => val / descent_norm);

  // Log the dimensions of descent_dir
  console.log(
    "repulsion_iteration.js: descent_dir dimensions:",
    descent_dir.size()
  );

  // Scale the descent direction for testing
  const scaleFactor = 10000000; // Make the steps much larger
  descent_dir = descent_dir.map((val) => val * scaleFactor);

  // Normalize the derivative (gradient)
  const deriv_norm = vectorNorm(Deriv.toArray().flat());
  const normalized_deriv = Deriv.map((val) => val / deriv_norm);

  // Backtracking line search
  let t = 1.0;
  let V_new = matrix(V); // Initialize V_new with current V

  while (true) {
    // Take a step in the descent direction
    console.log(
      "repulsion_iteration.js: V_new dimensions before update:",
      V_new.size()
    );
    for (let i = 0; i < pt_num; i++) {
      for (let j = 0; j < 3; j++) {
        V_new.set([i, j], V.get([i, j]) + t * descent_dir.get([3 * i + j, 0]));
      }
    }
    console.log(
      "repulsion_iteration.js: V_new dimensions after update:",
      V_new.size()
    );

    // Project onto constraints
    let iter = 0;
    while (iter < max_iters) {
      // Compute new edge lengths
      let L_new = zeros(edge_num, 1);
      for (let i = 0; i < edge_num; i++) {
        const [i1, i2] = getEdgeVertices(i);
        const diff = subtractVectors(getVertex(i2), getVertex(i1));
        L_new.set([i, 0], vectorNorm(diff));
      }

      // Compute constraint values
      let constraint_vals = zeros(k, 1);
      constraint_vals.set(
        [0, 0],
        l0 -
          L_new.toArray()
            .flat()
            .reduce((sum, val) => sum + val, 0)
      );
      for (let i = 1; i < k; i++) {
        const edgeIndex = constr_edges.get([i - 1, 0]);
        constraint_vals.set(
          [i, 0],
          lengths.get([edgeIndex, 0]) - L_new.get([edgeIndex, 0])
        );
      }

      if (vectorNorm(constraint_vals.toArray().flat()) <= threshold) {
        break;
      }

      // Build projection system
      let Right2 = zeros(k + 3 * pt_num, 1);
      for (let i = 0; i < k; i++) {
        Right2.set([i + 3 * pt_num, 0], -constraint_vals.get([i, 0]));
      }

      // Solve projection
      const Unknown2 = solveSystem(Left, Right2);

      // Update positions
      for (let i = 0; i < pt_num; i++) {
        for (let j = 0; j < 3; j++) {
          V_new.set([i, j], V_new.get([i, j]) + Unknown2.get([3 * i + j, 0]));
        }
      }

      iter++;
    }

    // Compute new tangent vectors
    let T_new = zeros(edge_num, 3);
    for (let i = 0; i < edge_num; i++) {
      const [i1, i2] = getEdgeVertices(i);
      const v1 = getVertex(i1);
      const v2 = getVertex(i2);
      const diff = subtractVectors(v2, v1);
      const norm = vectorNorm(diff);
      for (let j = 0; j < 3; j++) {
        T_new.set([i, j], diff[j] / norm);
      }
    }

    // Compute f_delta (energy at new positions)
    let f_delta = 0;
    for (let I = 0; I < Ac.length; I++) {
      for (let J_ind = 0; J_ind < Ac[I].length; J_ind++) {
        let J = Ac[I][J_ind];
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            const edgeIVertices = getEdgeVertices(I);
            const v_i = [
              V.get([edgeIVertices[i], 0]),
              V.get([edgeIVertices[i], 1]),
              V.get([edgeIVertices[i], 2]),
            ];
            const edgeJVertices = getEdgeVertices(J);
            const v_j = [
              V.get([edgeJVertices[j], 0]),
              V.get([edgeJVertices[j], 1]),
              V.get([edgeJVertices[j], 2]),
            ];
            const d = subtractVectors(v_i, v_j);
            const d_norm = vectorNorm(d);
            const t_I = [T.get([I, 0]), T.get([I, 1]), T.get([I, 2])];
            const cross_norm = vectorNorm(crossProduct(t_I, d));
            f_delta +=
              0.25 *
              L.get([I, 0]) *
              L.get([J, 0]) *
              Math.pow(cross_norm, alpha) *
              Math.pow(d_norm, -beta);
          }
        }
      }
    }

    // Compute right_side for Armijo condition
    let right_side = 0;
    for (let i = 0; i < pt_num * 3; i++) {
      right_side += descent_dir.get([i, 0]) * Deriv.get([0, i]);
    }
    right_side *= t * a_const;

    // Check Armijo condition and constraint satisfaction
    if (f_delta <= right_side) {
      V = V_new;
      break; // Step is acceptable
    }

    t = t * b_const; // Reduce step size
    if (t < 1e-10) {
      console.warn("Step size became too small.");
      break;
    }
  }

  // Recenter to barycenter
  let barycenter = [0, 0, 0];
  for (let i = 0; i < edge_num; i++) {
    const [i1, i2] = getEdgeVertices(i);
    const v1 = [V.get([i1, 0]), V.get([i1, 1]), V.get([i1, 2])];
    const v2 = [V.get([i2, 0]), V.get([i2, 1]), V.get([i2, 2])];
    const length_I = L.get([i, 0]);
    barycenter = addVectors(
      barycenter,
      scaleVector(addVectors(v1, v2), 0.5 * length_I)
    );
  }
  let totalLength = 0;
  for (let i = 0; i < L.size()[0]; i++) {
    totalLength += L.get([i, 0]);
  }
  barycenter = scaleVector(barycenter, 1 / totalLength);

  for (let i = 0; i < pt_num; i++) {
    let vertex = [V.get([i, 0]), V.get([i, 1]), V.get([i, 2])];
    let newVertex = subtractVectors(vertex, barycenter);
    for (let j = 0; j < 3; j++) {
      V.set([i, j], newVertex[j]);
    }
  }

  console.log("Iteration Complete");
  return V;
}

export { repulsion_iteration };

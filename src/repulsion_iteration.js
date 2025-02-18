import { zeros, multiply } from "mathjs";
import { loss_derivative } from "./loss_derivative.js";
import { build_weights } from "./build_weights.js";
import { build_A_bar } from "./build_A_bar.js";
import { constraint_derivative } from "./constraint_derivative.js";

// Conduct a single iteration of fractional Sobolev descent on a curve
// to minimize the tangent-point energy
//
// The first 6 inputs to this function are explained in much more
// detail in the main file, where they are meant to be tuned
//
// Inputs:
//   alpha  double which changes the nature of the tangent point energy
//   beta  double which changes the nature of the tangent point energy like alpha
//   a_const  parameter for my implementation of backtracking line search (must be between 0 and 0.5)
//     used as the constant for the Armijo condition
//   b_const  parameter for my implementation of backtracking line search (must be between 0 and 1)
//     where in each step of line search, the step size gets multiplied by b_const
//   threshold  enforces that after the descent step, the norm of the constraints at the new vertex
//     positions is less than this threshold
//   max_iters  max number of iterations to use when iteratively projecting
//   E  #E by 2 list of edge indices for the curve
//   Ac  a vector of vectors containing a vector for each edge "I". This vector consists of
//     the edge indices for all edges which do not intersect edge "I"
//   E_adj  a vector of vectors where there is a vector for each point "p" consisting of
//     the edge indices for all edges containing the point "p"
//   lengths  #E by 1 list of the length of each edge in the curve before any iterations were done
// Outputs:
//   V  #V by 3 list of curve vertex positions after the descent step
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

  // number of points and number of edges
  const pt_num = V.rows;
  const edge_num = E.rows;

  // Count edges connected to vertices with degree > 2
  let three_way = 0;
  for (let i = 0; i < pt_num; i++) {
    if (E_adj[i].length > 2) {
      three_way += E_adj[i].length;
    }
  }

  // Get indices of edges to constrain (connected to high-degree vertices)
  let constr_edges = zeros(three_way);
  let n = 0;
  for (let i = 0; i < pt_num; i++) {
    if (E_adj[i].length > 2) {
      for (let I_ind = 0; I_ind < E_adj[i].length; I_ind++) {
        let I = E_adj[i][I_ind];
        constr_edges.set([n], I);
        n++;
      }
    }
  }

  // Original total length
  const l0 = lengths.reduce((sum, val) => sum + val, 0);

  // Get current edge lengths and tangent vectors
  let L = zeros(edge_num);
  let T = zeros(edge_num, 3);

  for (let i = 0; i < edge_num; i++) {
    const diff = subtractVectors(V.row(E.get([i, 1])), V.row(E.get([i, 0])));
    L.set([i], vectorNorm(diff));
    T.set([i], scaleVector(diff, 1 / L.get([i])));
  }

  // Build weight matrices and A_bar
  const { W, W0 } = build_weights(alpha, beta, E, Ac, V, T, L);
  const A_bar = build_A_bar(pt_num, E, Ac, T, L, W, W0);

  // Get loss derivative
  const Deriv = loss_derivative(alpha, beta, E, Ac, E_adj, V, T, L);

  // Get constraint derivatives
  const C = constraint_derivative(E, V, L, E_adj, constr_edges);

  const k = C.size()[0]; // number of constraints
  const Z = zeros(k, k);

  // Build system matrix
  const Left = zeros(k + pt_num * 3, k + pt_num * 3);
  // TODO: Set values in Left matrix like:
  // Left << A_bar, C.transpose(), C, Z;

  // Build right hand side
  const Right = zeros(k + pt_num * 3);
  for (let i = 0; i < pt_num * 3; i++) {
    Right.set([i], Deriv.get([0, i]));
  }

  // Solve system
  // TODO: Implement solving Left * Unknown = Right
  const Unknown = solveSystem(Left, Right);

  // Get descent direction
  let descent_dir = zeros(pt_num * 3);
  for (let i = 0; i < pt_num; i++) {
    for (let j = 0; j < 3; j++) {
      descent_dir.set([3 * i + j], -Unknown.get([3 * i + j]));
    }
  }

  // Normalize vectors
  const descent_norm = vectorNorm(descent_dir.toArray());
  const deriv_norm = vectorNorm(Deriv.toArray());
  descent_dir = scaleMatrix(descent_dir, 1 / descent_norm);
  Deriv = scaleMatrix(Deriv, 1 / deriv_norm);

  // Backtracking line search
  let t = 1.0;
  while (true) {
    // Take step
    let V_new = zeros(V.size()[0], V.size()[1]);
    for (let i = 0; i < pt_num; i++) {
      for (let j = 0; j < 3; j++) {
        V_new.set([i, j], V.get([i, j]) - t * Unknown.get([3 * i + j]));
      }
    }

    // Get new edge lengths and tangents
    let L_new = zeros(edge_num);
    let T_new = zeros(edge_num, 3);
    for (let i = 0; i < edge_num; i++) {
      const diff = subtractVectors(
        V_new.row(E.get([i, 1])),
        V_new.row(E.get([i, 0]))
      );
      L_new.set([i], vectorNorm(diff));
      T_new.set([i], scaleVector(diff, 1 / L_new.get([i])));
    }

    // Project onto constraints
    let iter = 0;
    while (iter < max_iters) {
      // Get constraint values
      let constraint_vals = zeros(k);
      constraint_vals.set([0], l0 - L_new.reduce((sum, val) => sum + val, 0));
      for (let i = 1; i < k; i++) {
        constraint_vals.set(
          [i],
          lengths[constr_edges.get([i - 1])] -
            L_new.get([constr_edges.get([i - 1])])
        );
      }

      if (vectorNorm(constraint_vals.toArray()) <= threshold) {
        break;
      }

      // Build projection system
      let Right2 = zeros(k + 3 * pt_num);
      for (let i = 0; i < k; i++) {
        Right2.set([i + 3 * pt_num], -constraint_vals.get([i]));
      }

      // Solve projection
      const Unknown2 = solveSystem(Left, Right2);

      // Update positions
      for (let i = 0; i < pt_num; i++) {
        for (let j = 0; j < 3; j++) {
          V_new.set([i, j], V_new.get([i, j]) + Unknown2.get([3 * i + j]));
        }
      }

      // Update lengths and tangents
      for (let i = 0; i < edge_num; i++) {
        const diff = subtractVectors(
          V_new.row(E.get([i, 1])),
          V_new.row(E.get([i, 0]))
        );
        L_new.set([i], vectorNorm(diff));
        T_new.set([i], scaleVector(diff, 1 / L_new.get([i])));
      }

      iter++;
    }

    // Check Armijo condition
    let f_delta = 0;
    let right_side = dotProduct(descent_dir.toArray(), Deriv.toArray());
    right_side *= t * a_const;

    // Compute energies
    for (let I = 0; I < edge_num; I++) {
      for (let J_ind = 0; J_ind < Ac[I].length; J_ind++) {
        const J = Ac[I][J_ind];
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            // Original energy
            const d = subtractVectors(
              V.row(E.get([I, i])),
              V.row(E.get([J, j]))
            );
            const d_norm = vectorNorm(d);
            const cross = crossProduct(T.row(I), d);
            const cross_norm = vectorNorm(cross);
            right_side +=
              L.get([I]) *
              L.get([J]) *
              0.25 *
              Math.pow(cross_norm, alpha) *
              Math.pow(d_norm, -beta);

            // New energy
            const d_new = subtractVectors(
              V_new.row(E.get([I, i])),
              V_new.row(E.get([J, j]))
            );
            const d_norm_new = vectorNorm(d_new);
            const cross_new = crossProduct(T_new.row(I), d_new);
            const cross_norm_new = vectorNorm(cross_new);
            f_delta +=
              L_new.get([I]) *
              L_new.get([J]) *
              0.25 *
              Math.pow(cross_norm_new, alpha) *
              Math.pow(d_norm_new, -beta);
          }
        }
      }
    }

    if (
      f_delta <= right_side &&
      vectorNorm(constraint_vals.toArray()) < threshold
    ) {
      V = V_new;
      break;
    }

    t *= b_const;
  }

  // Recenter to barycenter
  let barycenter = [0, 0, 0];
  for (let i = 0; i < edge_num; i++) {
    const p1 = V.row(E.get([i, 0]));
    const p2 = V.row(E.get([i, 1]));
    const mid = scaleVector(addVectors(p1, p2), 0.5 * L.get([i]));
    barycenter = addVectors(barycenter, mid);
  }
  barycenter = scaleVector(
    barycenter,
    1 / L.reduce((sum, val) => sum + val, 0)
  );

  for (let i = 0; i < pt_num; i++) {
    V.set([i], subtractVectors(V.row(i), barycenter));
  }

  console.log("Iteration Complete");
  return V;
}

// Helper functions
function subtractVectors(v1, v2) {
  return v1.map((x, i) => x - v2[i]);
}

function addVectors(v1, v2) {
  return v1.map((x, i) => x + v2[i]);
}

function scaleVector(v, scale) {
  return v.map((x) => x * scale);
}

function scaleMatrix(m, scale) {
  let result = m.clone();
  for (let i = 0; i < m.size()[0]; i++) {
    for (let j = 0; j < m.size()[1]; j++) {
      result.set([i, j], m.get([i, j]) * scale);
    }
  }
  return result;
}

function crossProduct(v1, v2) {
  return [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0],
  ];
}

function vectorNorm(v) {
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

function dotProduct(v1, v2) {
  return v1.reduce((sum, x, i) => sum + x * v2[i], 0);
}

// TODO: Implement matrix solver
function solveSystem(A, b) {
  // This is a placeholder - need to implement proper matrix solver
  return zeros(b.size()[0]);
}

export { repulsion_iteration };

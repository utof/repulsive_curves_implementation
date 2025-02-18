import { zeros } from "mathjs";

// Compute the derivative of each constraint with respect to vert positions.
// The constraints used are the total length constraint and the
// individual edge length constraint.
//
// Inputs:
//   E  #E by 2 list of edge indices for the curve
//   V  #V by 3 list of curve vertex positions
//   L  #E by 1 list of the length of each edge in the curve
//   E_adj  a vector of vectors where there is a vector for each point "p" consisting of
//     the edge indices for all edges containing the point "p"
//   constr_edges  list of the indices of the edges you want to constrain the lengths of.
// Outputs:
//   C  (1 + #constr_edges) by 3 * #V list of constraints derivatives
function constraint_derivative(E, V, L, E_adj, constr_edges) {
  const pt_num = V.size()[0]; // Changed from V.rows

  // Helper functions for safe matrix access
  const getVertex = (idx) => {
    if (Array.isArray(V.get([idx]))) {
      return V.get([idx]);
    }
    return [V.get([idx, 0]), V.get([idx, 1]), V.get([idx, 2])];
  };

  const getLength = (idx) => (Array.isArray(L) ? L[idx] : L.get([idx, 0]));
  const getEdgeIndex = (i, j) => E.get([i, j]);
  const getConstrEdge = (i) =>
    Array.isArray(constr_edges) ? constr_edges[i] : constr_edges.get([i, 0]);

  // First we will find the derivative of the "total length constraint"
  // Phi_l = l0 - Sum over all edges I of {L(I)}
  let C_l = zeros(1, 3 * pt_num);

  // loop through all points
  for (let p = 0; p < pt_num; p++) {
    let deriv_p = [0, 0, 0]; // will store the derivative wrt phi_p

    // loop through all edges adjacent to p
    for (let I_ind = 0; I_ind < E_adj[p].length; I_ind++) {
      let I = E_adj[p][I_ind];
      let length_I = getLength(I);

      if (getEdgeIndex(I, 0) === p) {
        const v1 = getVertex(getEdgeIndex(I, 0));
        const v2 = getVertex(getEdgeIndex(I, 1));
        let diff = subtractVectors(v1, v2);
        deriv_p = subtractVectors(deriv_p, scaleVector(diff, 1 / length_I));
      } else if (getEdgeIndex(I, 1) === p) {
        const v1 = getVertex(getEdgeIndex(I, 1));
        const v2 = getVertex(getEdgeIndex(I, 0));
        let diff = subtractVectors(v1, v2);
        deriv_p = subtractVectors(deriv_p, scaleVector(diff, 1 / length_I));
      }
    }

    // update the derivative matrix
    C_l.set([0, 3 * p], deriv_p[0]);
    C_l.set([0, 3 * p + 1], deriv_p[1]);
    C_l.set([0, 3 * p + 2], deriv_p[2]);
  }

  // Handle edge length constraints
  const numConstrEdges = Array.isArray(constr_edges)
    ? constr_edges.length
    : constr_edges.size()[0];
  let C_e = zeros(numConstrEdges, 3 * pt_num);

  for (let i = 0; i < numConstrEdges; i++) {
    let I = getConstrEdge(i);
    let i1 = getEdgeIndex(I, 0);
    let i2 = getEdgeIndex(I, 1);

    const v1 = getVertex(i1);
    const v2 = getVertex(i2);
    let diff = subtractVectors(v1, v2);
    let length_I = getLength(I);

    // Set the derivatives for the first vertex
    C_e.set([i, i1 * 3], -diff[0] / length_I);
    C_e.set([i, i1 * 3 + 1], -diff[1] / length_I);
    C_e.set([i, i1 * 3 + 2], -diff[2] / length_I);

    // Set the derivatives for the second vertex
    C_e.set([i, i2 * 3], diff[0] / length_I);
    C_e.set([i, i2 * 3 + 1], diff[1] / length_I);
    C_e.set([i, i2 * 3 + 2], diff[2] / length_I);
  }

  // Combine C_l and C_e into the final constraint matrix
  let C = zeros(C_l.size()[0] + C_e.size()[0], pt_num * 3);

  // Copy total length constraint
  for (let j = 0; j < C_l.size()[1]; j++) {
    C.set([0, j], C_l.get([0, j]));
  }

  // Copy edge length constraints
  for (let i = 0; i < C_e.size()[0]; i++) {
    for (let j = 0; j < C_e.size()[1]; j++) {
      C.set([i + 1, j], C_e.get([i, j]));
    }
  }

  return C;
}

// Helper functions for vector operations
function subtractVectors(v1, v2) {
  return v1.map((x, i) => x - v2[i]);
}

function scaleVector(v, scale) {
  return v.map((x) => x * scale);
}

export { constraint_derivative };

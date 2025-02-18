import { zeros } from "mathjs";

// Compute the derivative of each constraint with respect to vert positions.
// The constraints used are the total length constraint and the
// individual edge length constraint. The formulas for these constraints are on
// page 13 of the paper, but I computed the derivative formulas by hand and then
// confirmed the result with Mathematica).
//
// Inputs:
//   E  #E by 2 list of edge indices for the curve
//   V  #V by 3 list of curve vertex positions
//   L  #E by 1 list of the length of each edge in the curve
//   E_adj  a vector of vectors where there is a vector for each point "p" consisting of
//     the edge indices for all edges containing the point "p"
//   constr_edges  list of the indices of the edges you want to constrain the lengths of.
//     Note that this is different from constraining the total length of all edges. In the
//     code, it is automatically set so that the edges which are in this list are the ones
//     connected to a verticy of index 3 or more.
// Outputs:
//   C  (1 + #constr_edges) by 3 * #V list of the derivative of two constraints: the total length
//     constraint, and the individual edge length constraints. The first row is the derivative
//     of the total length constraint, and each following row corresponds to the derivative of
//     the fixed edge length constraint for a different edge in "constr_edges"
function constraint_derivative(E, V, L, E_adj, constr_edges) {
  const pt_num = V.rows;

  // First we will find the derivative of the "total length constraint"
  // Phi_l = l0 - Sum over all edges I of {L(I)}
  let C_l = zeros(1, 3 * pt_num);

  // loop through all points
  for (let p = 0; p < pt_num; p++) {
    let deriv_p = [0, 0, 0]; // will store the derivative wrt phi_p

    // an edge will contribute to the derivative with respect to phi_p
    // if the edge is adjacent to p

    // loop through all edges adjacent to p
    for (let I_ind = 0; I_ind < E_adj[p].length; I_ind++) {
      let I = E_adj[p][I_ind];

      // add or subtract from deriv_p based on the derivative formula
      if (E.get([I, 0]) === p) {
        let diff = subtractVectors(V.row(E.get([I, 0])), V.row(E.get([I, 1])));
        deriv_p = subtractVectors(deriv_p, scaleVector(diff, 1 / L.get([I])));
      } else if (E.get([I, 1]) === p) {
        let diff = subtractVectors(V.row(E.get([I, 1])), V.row(E.get([I, 0])));
        deriv_p = subtractVectors(deriv_p, scaleVector(diff, 1 / L.get([I])));
      }
    }

    // update the derivative matrix
    C_l.set([0, 3 * p], deriv_p[0]);
    C_l.set([0, 3 * p + 1], deriv_p[1]);
    C_l.set([0, 3 * p + 2], deriv_p[2]);
  }

  // We do the same thing as above but now for constraining
  // the length of a specific set of edges "constr_edges"
  let C_e = zeros(constr_edges.length, 3 * pt_num);

  for (let i = 0; i < C_e.size()[0]; i++) {
    let I = constr_edges.get([i]);

    let i1 = E.get([I, 0]);
    let i2 = E.get([I, 1]);

    let diff = subtractVectors(V.row(i1), V.row(i2));

    // the formula for the derivative was computed by hand
    // the following code implements it
    C_e.set([i, i1 * 3], -diff[0] / L.get([I]));
    C_e.set([i, i1 * 3 + 1], -diff[1] / L.get([I]));
    C_e.set([i, i1 * 3 + 2], -diff[2] / L.get([I]));

    C_e.set([i, i2 * 3], diff[0] / L.get([I]));
    C_e.set([i, i2 * 3 + 1], diff[1] / L.get([I]));
    C_e.set([i, i2 * 3 + 2], diff[2] / L.get([I]));
  }

  // put each constraint in a row of C (the overall constraint derivative matrix which we are returning)
  let C = zeros(C_l.size()[0] + C_e.size()[0], pt_num * 3);

  // Copy C_l and C_e into C
  for (let i = 0; i < C_l.size()[0]; i++) {
    for (let j = 0; j < C_l.size()[1]; j++) {
      C.set([i, j], C_l.get([i, j]));
    }
  }

  for (let i = 0; i < C_e.size()[0]; i++) {
    for (let j = 0; j < C_e.size()[1]; j++) {
      C.set([i + C_l.size()[0], j], C_e.get([i, j]));
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

import { zeros } from "mathjs";

// Compute the derivative of the tangent point energy with respect to each vertex
// position, evaluated at the current vertex positions
//
// Inputs:
//   alpha  double which changes the nature of the tangent point energy
//   beta  double which changes the nature of the tangent point energy like alpha
//   E  #E by 2 list of edge indices for the curve
//   Ac  a vector of vectors containing a vector for each edge "I". This vector consists of
//     the edge indices for all edges which do not intersect edge "I"
//   E_adj  a vector of vectors where there is a vector for each point "p" consisting of
//     the edge indices for all edges containing the point "p"
//   V  #V by 3 list of curve vertex positions
//   T  #E by 3 list of unit tangent vectors for each edge of the curve.
//     Namely, T.row(e) = (V.row(E(e, 1)) - v.row(E(e, 0)))/L(e) where L is the next input
//   L  #E by 1 list of the length of each edge in the curve
// Outputs:
//   Deriv  1 by #V * 3 list of the derivative of the tangent point energy with respect
//     to each vertex position, evaluated at the current vertex positions
function loss_derivative(alpha, beta, E, Ac, E_adj, V, T, L) {
  // this file only works if we assume that there are no edges (u,v) such that u=v

  const pt_num = V.rows;
  let Deriv = zeros(1, 3 * pt_num);

  // first loop through all the points we will be differentiating with respect to
  for (let p = 0; p < pt_num; p++) {
    let deriv_p = [0, 0, 0];

    // now, loop through all the edges "I" containing vertex "i"
    for (let I_ind = 0; I_ind < E_adj[p].length; I_ind++) {
      let I = E_adj[p][I_ind];

      // loop through all edges "J" not intersecting "I"
      for (let J_ind = 0; J_ind < Ac[I].length; J_ind++) {
        let J = Ac[I][J_ind];

        // iterate through combinations of verts from the 2 edges
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            // note that by construction, only I will have point p in it
            if (E.get([I, i]) === p) {
              // relabel the indices so "i1" is the vertex index equal to p
              // "i2" is the one that isn't p
              let i1 = E.get([I, i]);
              let i2 = E.get([I, (i + 1) % 2]);
              let j1 = E.get([J, j]);

              // Case 1,1
              let diff_i2_j1 = subtractVectors(V.row(i2), V.row(j1));
              let cross_term = subtractVectors(
                crossProduct(diff_i2_j1, V.row(i1)),
                crossProduct(V.row(i2), V.row(j1))
              );
              let denom_diff = subtractVectors(V.row(i1), V.row(j1));

              let e1 = [1, 0, 0];
              let e2 = [0, 1, 0];
              let e3 = [0, 0, 1];

              let matrix_cross = diff_i2_j1;
              let TMat = createCrossMatrix(matrix_cross, e1, e2, e3);

              let term1 = scaleVector(
                subtractVectors(V.row(i1), V.row(i2)),
                (1 - alpha) *
                  Math.pow(L.get([I]), -1 * alpha - 1) *
                  Math.pow(vectorNorm(cross_term), alpha) *
                  Math.pow(vectorNorm(denom_diff), -1 * beta)
              );

              let term2 = matrixVectorMultiply(
                TMat,
                scaleVector(
                  cross_term,
                  alpha *
                    Math.pow(L.get([I]), 1 - alpha) *
                    Math.pow(vectorNorm(denom_diff), -1 * beta) *
                    Math.pow(vectorNorm(cross_term), alpha - 2)
                )
              );

              let term3 = scaleVector(
                denom_diff,
                -1 *
                  beta *
                  Math.pow(L.get([I]), 1 - alpha) *
                  Math.pow(vectorNorm(denom_diff), -1 * beta - 2) *
                  Math.pow(vectorNorm(cross_term), alpha)
              );

              deriv_p = addVectors(
                deriv_p,
                scaleVector(
                  addVectors(addVectors(term1, term2), term3),
                  0.25 * L.get([J])
                )
              );

              // Case 2,1
              denom_diff = subtractVectors(V.row(i2), V.row(j1));

              term1 = scaleVector(
                subtractVectors(V.row(i1), V.row(i2)),
                (1 - alpha) *
                  Math.pow(L.get([I]), -1 * alpha - 1) *
                  Math.pow(vectorNorm(cross_term), alpha) *
                  Math.pow(vectorNorm(denom_diff), -1 * beta)
              );

              term2 = matrixVectorMultiply(
                TMat,
                scaleVector(
                  cross_term,
                  alpha *
                    Math.pow(L.get([I]), 1 - alpha) *
                    Math.pow(vectorNorm(denom_diff), -1 * beta) *
                    Math.pow(vectorNorm(cross_term), alpha - 2)
                )
              );

              deriv_p = addVectors(
                deriv_p,
                scaleVector(addVectors(term1, term2), 0.25 * L.get([J]))
              );

              // Cases with J
              // Case J: 1,1
              let TJ = T.row(J);
              TMat = createCrossMatrix(TJ, e1, e2, e3);
              denom_diff = subtractVectors(V.row(i1), V.row(j1));
              cross_term = crossProduct(TJ, denom_diff);

              term1 = scaleVector(
                denom_diff,
                (Math.pow(vectorNorm(cross_term), alpha) *
                  Math.pow(vectorNorm(denom_diff), -1 * beta)) /
                  L.get([I])
              );

              term2 = matrixVectorMultiply(
                TMat,
                scaleVector(
                  cross_term,
                  alpha *
                    L.get([I]) *
                    Math.pow(vectorNorm(denom_diff), -1 * beta) *
                    Math.pow(vectorNorm(cross_term), alpha - 2)
                )
              );

              term3 = scaleVector(
                denom_diff,
                -1 *
                  beta *
                  L.get([I]) *
                  Math.pow(vectorNorm(denom_diff), -1 * beta - 2) *
                  Math.pow(vectorNorm(cross_term), alpha)
              );

              deriv_p = addVectors(
                deriv_p,
                scaleVector(
                  addVectors(addVectors(term1, term2), term3),
                  0.25 * L.get([J])
                )
              );

              // Case J: 1,2
              denom_diff = subtractVectors(V.row(i2), V.row(j1));
              cross_term = crossProduct(TJ, denom_diff);

              deriv_p = addVectors(
                deriv_p,
                scaleVector(
                  subtractVectors(V.row(i1), V.row(i2)),
                  0.25 *
                    (L.get([J]) / L.get([I])) *
                    Math.pow(vectorNorm(cross_term), alpha) *
                    Math.pow(vectorNorm(denom_diff), -1 * beta)
                )
              );
            }
          }
        }
      }
    }

    // put values in the derivative vector
    Deriv.set([0, 3 * p], deriv_p[0]);
    Deriv.set([0, 3 * p + 1], deriv_p[1]);
    Deriv.set([0, 3 * p + 2], deriv_p[2]);
  }

  return Deriv;
}

// Helper functions for vector and matrix operations
function subtractVectors(v1, v2) {
  return v1.map((x, i) => x - v2[i]);
}

function addVectors(v1, v2) {
  return v1.map((x, i) => x + v2[i]);
}

function scaleVector(v, scale) {
  return v.map((x) => x * scale);
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

function createCrossMatrix(v, e1, e2, e3) {
  return [crossProduct(v, e1), crossProduct(v, e2), crossProduct(v, e3)];
}

function matrixVectorMultiply(matrix, vector) {
  return matrix.map((row) =>
    row.reduce((sum, val, i) => sum + val * vector[i], 0)
  );
}

export { loss_derivative };

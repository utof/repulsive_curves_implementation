// src/build_A_bar.js
import { Matrix, zeros, pow } from "mathjs";

// Build the Sobolev inner product matrix A_bar
//
// A_bar satisfies the equation:
// A_bar*g = (the derivative of the tangent point energy with respect to vertex positions)
// where g is the discrete fractional Sobolev gradient
//
// Inputs:
//   pt_num  the number of vertices in the curve (equal to #V)
//   E  #E by 2 list of edge indices for the curve
//   Ac  a vector of vectors containing a vector for each edge "I". This vector consists of
//     the edge indices for all edges which do not intersect edge "I"
//   T  #E by 3 list of unit tangent vectors for each edge of the curve.
//     Namely, T.row(e) = (V.row(E(e, 1)) - v.row(E(e, 0)))/L(e) where L is the next input
//   L  #E by 1 list of the length of each edge in the curve
//   W  #E by #E list of weights used to construct the B matrix
//   W0  #E by #E list of weights used to construct the B0 matrix
// Outputs:
//   A_bar  (3*#V) by (3*#V) matrix corresponding to the fractional Sobolev inner product
//    for a given curve, and given energy.
//
function build_A_bar(pt_num, E, Ac, T, L, W, W0) {
  let B = zeros(pt_num, pt_num);
  let B0 = zeros(pt_num, pt_num);

  // Helper function to safely get length value
  const getLength = (idx) => (Array.isArray(L) ? L[idx] : L.get([idx, 0]));

  // Helper function to safely get weight value
  const getWeight = (w, i, j) => (Array.isArray(w) ? w[i][j] : w.get([i, j]));

  // Helper function to safely get tangent vector
  const getTangent = (idx) => {
    if (Array.isArray(T.get([idx]))) {
      return T.get([idx]);
    }
    return [T.get([idx, 0]), T.get([idx, 1]), T.get([idx, 2])];
  };

  // Helper function to safely get edge index
  const getEdgeIndex = (i, j) => E.get([i, j]);

  for (let I = 0; I < Ac.length; I++) {
    for (let J_ind = 0; J_ind < Ac[I].length; J_ind++) {
      let J = Ac[I][J_ind];

      for (let a = 0; a < 2; a++) {
        for (let b = 0; b < 2; b++) {
          const Ia = getEdgeIndex(I, a);
          const Ib = getEdgeIndex(I, b);
          const Ja = getEdgeIndex(J, a);
          const Jb = getEdgeIndex(J, b);

          // B matrix updates
          const weightIJ = getWeight(W, I, J);
          const lengthI = getLength(I);
          const lengthJ = getLength(J);

          // Update B diagonal blocks
          B.set(
            [Ia, Ib],
            B.get([Ia, Ib]) + (pow(-1, a + b) * weightIJ) / pow(lengthI, 2)
          );
          B.set(
            [Ja, Jb],
            B.get([Ja, Jb]) + (pow(-1, a + b) * weightIJ) / pow(lengthJ, 2)
          );

          // Get tangent vectors
          const tangentI = getTangent(I);
          const tangentJ = getTangent(J);

          // Update B off-diagonal blocks
          const dotProdTangents = dotProduct(tangentI, tangentJ);
          B.set(
            [Ia, Jb],
            B.get([Ia, Jb]) -
              (pow(-1, a + b) * weightIJ * dotProdTangents) /
                (lengthI * lengthJ)
          );
          B.set(
            [Ja, Ib],
            B.get([Ja, Ib]) -
              (pow(-1, a + b) * weightIJ * dotProdTangents) /
                (lengthJ * lengthI)
          );

          // B0 matrix updates
          const weight0IJ = getWeight(W0, I, J);

          // Update B0 diagonal blocks
          B0.set([Ia, Ib], B0.get([Ia, Ib]) + 0.25 * weight0IJ);
          B0.set([Ja, Jb], B0.get([Ja, Jb]) + 0.25 * weight0IJ);

          // Update B0 off-diagonal blocks
          B0.set([Ia, Jb], B0.get([Ia, Jb]) - 0.25 * weight0IJ);
          B0.set([Ja, Ib], B0.get([Ja, Ib]) - 0.25 * weight0IJ);
        }
      }
    }
  }

  let A = Matrix.add(B, B0);
  let A_bar = zeros(A.size()[0] * 3, A.size()[1] * 3);

  // Build block diagonal matrix A_bar
  const n = A.size()[0];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const val = A.get([i, j]);
      // Copy the value to each diagonal block
      A_bar.set([i, j], val);
      A_bar.set([i + n, j + n], val);
      A_bar.set([i + 2 * n, j + 2 * n], val);
    }
  }

  return A_bar;
}

function dotProduct(v1, v2) {
  if (!Array.isArray(v1)) v1 = v1.toArray();
  if (!Array.isArray(v2)) v2 = v2.toArray();
  return v1.reduce((sum, x, i) => sum + x * v2[i], 0);
}

export { build_A_bar };

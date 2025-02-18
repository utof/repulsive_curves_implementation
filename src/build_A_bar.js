// src/build_A_bar.js
import { Matrix, zeros, pow } from "mathjs"; // You might need to install mathjs: npm install mathjs

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

  for (let I = 0; I < Ac.length; I++) {
    for (let J_ind = 0; J_ind < Ac[I].length; J_ind++) {
      let J = Ac[I][J_ind];

      for (let a = 0; a < 2; a++) {
        for (let b = 0; b < 2; b++) {
          B.set(
            [E.get([I, a]), E.get([I, b])],
            B.get([E.get([I, a]), E.get([I, b])]) +
              (pow(-1, a + b) * W.get([I, J])) / pow(L.get([I]), 2)
          );
          B.set(
            [E.get([J, a]), E.get([J, b])],
            B.get([E.get([J, a]), E.get([J, b])]) +
              (pow(-1, a + b) * W.get([I, J])) / pow(L.get([J]), 2)
          );

          B.set(
            [E.get([I, a]), E.get([J, b])],
            B.get([E.get([I, a]), E.get([J, b])]) -
              (pow(-1, a + b) *
                W.get([I, J]) *
                dotProduct(T.row(I), T.row(J))) /
                (L.get([I]) * L.get([J]))
          );
          B.set(
            [E.get([J, a]), E.get([I, b])],
            B.get([E.get([J, a]), E.get([I, b])]) -
              (pow(-1, a + b) *
                W.get([I, J]) *
                dotProduct(T.row(J), T.row(I))) /
                (L.get([J]) * L.get([I]))
          );

          B0.set(
            [E.get([I, a]), E.get([I, b])],
            B0.get([E.get([I, a]), E.get([I, b])]) + 0.25 * W0.get([I, J])
          );
          B0.set(
            [E.get([J, a]), E.get([J, b])],
            B0.get([E.get([J, a]), E.get([J, b])]) + 0.25 * W0.get([I, J])
          );

          B0.set(
            [E.get([I, a]), E.get([J, b])],
            B0.get([E.get([I, a]), E.get([J, b])]) - 0.25 * W0.get([I, J])
          );
          B0.set(
            [E.get([J, a]), E.get([I, b])],
            B0.get([E.get([J, a]), E.get([I, b])]) - 0.25 * W0.get([I, J])
          );
        }
      }
    }
  }

  let A = Matrix.add(B, B0);

  let A_bar = zeros(A.size()[0] * 3, A.size()[1] * 3);

  for (let i = 0; i < A.size()[0]; i++) {
    for (let j = 0; j < A.size()[1]; j++) {
      A_bar.set([i, j], A.get([i, j]));
      A_bar.set([i + A.size()[0], j + A.size()[1]], A.get([i, j]));
      A_bar.set([i + 2 * A.size()[0], j + 2 * A.size()[1]], A.get([i, j]));
    }
  }

  return A_bar;
}

function dotProduct(row1, row2) {
  let result = 0;
  for (let i = 0; i < row1.length; i++) {
    result += row1[i] * row2[i];
  }
  return result;
}

export { build_A_bar };

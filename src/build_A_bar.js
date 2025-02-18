// src/build_A_bar.js
import { zeros, pow, matrix, add } from "mathjs"; // Changed import to include add

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
function build_A_bar(pt_num, E, Ac, T, L, W, W0) {
  console.log("build_A_bar: Starting with inputs", { pt_num });
  console.log("Matrix sizes:", {
    E: E.size ? E.size() : "array",
    T: T.size ? T.size() : "array",
    L: L.size ? L.size() : "array",
    W: W.size ? W.size() : "array",
    W0: W0.size ? W0.size() : "array",
  });

  // Ensure inputs are matrices
  if (!E.size) E = matrix(E);
  if (!T.size) T = matrix(T);
  if (!L.size) L = matrix(Array.isArray(L) ? [L] : L);
  if (!W.size) W = matrix(W);
  if (!W0.size) W0 = matrix(W0);

  let B = zeros(pt_num, pt_num);
  let B0 = zeros(pt_num, pt_num);

  // Helper function to safely get length value
  const getLength = (idx) => {
    try {
      return parseFloat(L.get([idx, 0]));
    } catch (error) {
      console.error("Error getting length at", idx, error);
      throw error;
    }
  };

  // Helper function to safely get weight value
  const getWeight = (w, i, j) => {
    try {
      return parseFloat(w.get([i, j]));
    } catch (error) {
      console.error("Error getting weight", { i, j }, error);
      throw error;
    }
  };

  // Helper function to safely get tangent vector
  const getTangent = (idx) => {
    try {
      console.log(
        "Getting tangent for edge",
        idx,
        "from matrix size",
        T.size()
      );
      const tangent = [
        parseFloat(T.get([idx, 0])),
        parseFloat(T.get([idx, 1])),
        parseFloat(T.get([idx, 2])),
      ];
      console.log("Tangent vector found:", tangent);
      return tangent;
    } catch (error) {
      console.error(
        "Error getting tangent at",
        idx,
        "Matrix size:",
        T.size(),
        error
      );
      throw error;
    }
  };

  // Helper function to safely get edge index
  const getEdgeIndex = (i, j) => {
    try {
      return parseInt(E.get([i, j]));
    } catch (error) {
      console.error("Error getting edge index", { i, j }, error);
      throw error;
    }
  };

  for (let I = 0; I < Ac.length; I++) {
    console.log(
      `Processing edge ${I}, has ${Ac[I].length} non-intersecting edges`
    );

    for (let J_ind = 0; J_ind < Ac[I].length; J_ind++) {
      let J = Ac[I][J_ind];

      for (let a = 0; a < 2; a++) {
        for (let b = 0; b < 2; b++) {
          try {
            const Ia = getEdgeIndex(I, a);
            const Ib = getEdgeIndex(I, b);
            const Ja = getEdgeIndex(J, a);
            const Jb = getEdgeIndex(J, b);

            // B matrix updates
            const weightIJ = getWeight(W, I, J);
            const lengthI = getLength(I);
            const lengthJ = getLength(J);

            // Update B diagonal blocks
            const diagValue = (pow(-1, a + b) * weightIJ) / pow(lengthI, 2);
            B.set([Ia, Ib], B.get([Ia, Ib]) + diagValue);
            B.set([Ja, Jb], B.get([Ja, Jb]) + diagValue);

            // Get tangent vectors
            const tangentI = getTangent(I);
            const tangentJ = getTangent(J);

            // Update B off-diagonal blocks
            const dotProdTangents = dotProduct(tangentI, tangentJ);
            const offDiagValue =
              (pow(-1, a + b) * weightIJ * dotProdTangents) /
              (lengthI * lengthJ);

            B.set([Ia, Jb], B.get([Ia, Jb]) - offDiagValue);
            B.set([Ja, Ib], B.get([Ja, Ib]) - offDiagValue);

            // B0 matrix updates
            const weight0IJ = getWeight(W0, I, J);

            // Update B0 diagonal blocks
            B0.set([Ia, Ib], B0.get([Ia, Ib]) + 0.25 * weight0IJ);
            B0.set([Ja, Jb], B0.get([Ja, Jb]) + 0.25 * weight0IJ);

            // Update B0 off-diagonal blocks
            B0.set([Ia, Jb], B0.get([Ia, Jb]) - 0.25 * weight0IJ);
            B0.set([Ja, Ib], B0.get([Ja, Ib]) - 0.25 * weight0IJ);
          } catch (error) {
            console.error(
              `Error in matrix update for I=${I}, J=${J}, a=${a}, b=${b}:`,
              error
            );
            throw error;
          }
        }
      }
    }
  }

  console.log("Computing final A_bar matrix");
  console.log("B and B0 sizes:", {
    B: B.size(),
    B0: B0.size(),
  });

  let A = add(B, B0); // Changed from Matrix.add to mathjs add
  console.log("A matrix size:", A.size());

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

  console.log("build_A_bar: Completed successfully, A_bar size:", A_bar.size());
  return A_bar;
}

function dotProduct(v1, v2) {
  if (
    !Array.isArray(v1) ||
    !Array.isArray(v2) ||
    v1.length !== 3 ||
    v2.length !== 3
  ) {
    console.error("Invalid vectors for dot product:", { v1, v2 });
    throw new Error("Vectors must be 3D arrays");
  }
  return v1.reduce((sum, x, i) => sum + x * v2[i], 0);
}

export { build_A_bar };

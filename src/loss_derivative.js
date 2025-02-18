import { zeros, matrix } from "mathjs";

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
  console.log("Starting loss_derivative with inputs:", { alpha, beta });
  console.log("Matrix sizes:", {
    E: E.size ? E.size() : "array",
    V: V.size ? V.size() : "array",
    T: T.size ? T.size() : "array",
    L: L.size ? L.size() : "array",
  });

  // Ensure inputs are matrices
  if (!E.size) E = matrix(E);
  if (!V.size) V = matrix(V);
  if (!T.size) T = matrix(T);
  if (!L.size) L = matrix(Array.isArray(L) ? [L] : L);

  const pt_num = V.size()[0];
  console.log("Number of points:", pt_num);

  // Helper functions for safe matrix access
  const getVertex = (idx) => {
    try {
      return [V.get([idx, 0]), V.get([idx, 1]), V.get([idx, 2])];
    } catch (error) {
      console.error("Error getting vertex", idx, error);
      throw error;
    }
  };

  const getEdgeIndex = (edge, vertex) => {
    try {
      return parseInt(E.get([edge, vertex]));
    } catch (error) {
      console.error("Error getting edge index", { edge, vertex }, error);
      throw error;
    }
  };

  const getTangent = (idx) => {
    try {
      return [T.get([idx, 0]), T.get([idx, 1]), T.get([idx, 2])];
    } catch (error) {
      console.error("Error getting tangent", idx, error);
      throw error;
    }
  };

  const getLength = (idx) => {
    try {
      return parseFloat(L.get([idx, 0]));
    } catch (error) {
      console.error("Error getting length", idx, error);
      throw error;
    }
  };

  // Create derivative matrix with proper dimensions
  const derivArray = zeros([1, 3 * pt_num])._data;
  let Deriv = matrix(derivArray);
  console.log("Created Deriv matrix with size:", Deriv.size());

  // First loop through all the points we will be differentiating with respect to
  for (let p = 0; p < pt_num; p++) {
    console.log(`Processing point ${p}`);
    let deriv_p = [0, 0, 0];

    // Now, loop through all the edges "I" containing vertex "i"
    for (let I_ind = 0; I_ind < E_adj[p].length; I_ind++) {
      let I = E_adj[p][I_ind];

      // Loop through all edges "J" not intersecting "I"
      for (let J_ind = 0; J_ind < Ac[I].length; J_ind++) {
        let J = Ac[I][J_ind];

        // Iterate through combinations of verts from the 2 edges
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            // Note that by construction, only I will have point p in it
            if (getEdgeIndex(I, i) === p) {
              // Relabel the indices so "i1" is the vertex index equal to p
              // "i2" is the one that isn't p
              let i1 = getEdgeIndex(I, i);
              let i2 = getEdgeIndex(I, (i + 1) % 2);
              let j1 = getEdgeIndex(J, j);

              // Get vertex positions
              const v_i1 = getVertex(i1);
              const v_i2 = getVertex(i2);
              const v_j1 = getVertex(j1);

              // Case 1,1
              let diff_i2_j1 = subtractVectors(v_i2, v_j1);
              let cross_term = subtractVectors(
                crossProduct(diff_i2_j1, v_i1),
                crossProduct(v_i2, v_j1)
              );
              let denom_diff = subtractVectors(v_i1, v_j1);

              let e1 = [1, 0, 0];
              let e2 = [0, 1, 0];
              let e3 = [0, 0, 1];

              let matrix_cross = diff_i2_j1;
              let TMat = createCrossMatrix(matrix_cross, e1, e2, e3);

              const length_I = getLength(I);
              const length_J = getLength(J);

              let term1 = scaleVector(
                subtractVectors(v_i1, v_i2),
                (1 - alpha) *
                  Math.pow(length_I, -1 * alpha - 1) *
                  Math.pow(vectorNorm(cross_term), alpha) *
                  Math.pow(vectorNorm(denom_diff), -1 * beta)
              );

              let term2 = matrixVectorMultiply(
                TMat,
                scaleVector(
                  cross_term,
                  alpha *
                    Math.pow(length_I, 1 - alpha) *
                    Math.pow(vectorNorm(denom_diff), -1 * beta) *
                    Math.pow(vectorNorm(cross_term), alpha - 2)
                )
              );

              let term3 = scaleVector(
                denom_diff,
                -1 *
                  beta *
                  Math.pow(length_I, 1 - alpha) *
                  Math.pow(vectorNorm(denom_diff), -1 * beta - 2) *
                  Math.pow(vectorNorm(cross_term), alpha)
              );

              deriv_p = addVectors(
                deriv_p,
                scaleVector(
                  addVectors(addVectors(term1, term2), term3),
                  0.25 * length_J
                )
              );

              // Case 2,1
              denom_diff = subtractVectors(v_i2, v_j1);

              term1 = scaleVector(
                subtractVectors(v_i1, v_i2),
                (1 - alpha) *
                  Math.pow(length_I, -1 * alpha - 1) *
                  Math.pow(vectorNorm(cross_term), alpha) *
                  Math.pow(vectorNorm(denom_diff), -1 * beta)
              );

              term2 = matrixVectorMultiply(
                TMat,
                scaleVector(
                  cross_term,
                  alpha *
                    Math.pow(length_I, 1 - alpha) *
                    Math.pow(vectorNorm(denom_diff), -1 * beta) *
                    Math.pow(vectorNorm(cross_term), alpha - 2)
                )
              );

              deriv_p = addVectors(
                deriv_p,
                scaleVector(addVectors(term1, term2), 0.25 * length_J)
              );

              // Cases with J
              // Case J: 1,1
              let TJ = getTangent(J);
              TMat = createCrossMatrix(TJ, e1, e2, e3);
              denom_diff = subtractVectors(v_i1, v_j1);
              cross_term = crossProduct(TJ, denom_diff);

              term1 = scaleVector(
                denom_diff,
                (Math.pow(vectorNorm(cross_term), alpha) *
                  Math.pow(vectorNorm(denom_diff), -1 * beta)) /
                  length_I
              );

              term2 = matrixVectorMultiply(
                TMat,
                scaleVector(
                  cross_term,
                  alpha *
                    length_I *
                    Math.pow(vectorNorm(denom_diff), -1 * beta) *
                    Math.pow(vectorNorm(cross_term), alpha - 2)
                )
              );

              term3 = scaleVector(
                denom_diff,
                -1 *
                  beta *
                  length_I *
                  Math.pow(vectorNorm(denom_diff), -1 * beta - 2) *
                  Math.pow(vectorNorm(cross_term), alpha)
              );

              deriv_p = addVectors(
                deriv_p,
                scaleVector(
                  addVectors(addVectors(term1, term2), term3),
                  0.25 * length_J
                )
              );

              // Case J: 1,2
              denom_diff = subtractVectors(v_i2, v_j1);
              cross_term = crossProduct(TJ, denom_diff);

              deriv_p = addVectors(
                deriv_p,
                scaleVector(
                  subtractVectors(v_i1, v_i2),
                  0.25 *
                    (length_J / length_I) *
                    Math.pow(vectorNorm(cross_term), alpha) *
                    Math.pow(vectorNorm(denom_diff), -1 * beta)
                )
              );
            }
          }
        }
      }
    }

    // Put values in the derivative vector
    console.log(`Setting derivative values for point ${p}:`, deriv_p);
    try {
      Deriv.set([0, 3 * p], deriv_p[0]);
      Deriv.set([0, 3 * p + 1], deriv_p[1]);
      Deriv.set([0, 3 * p + 2], deriv_p[2]);
    } catch (error) {
      console.error(`Error setting derivative values for point ${p}:`, error);
      throw error;
    }
  }

  console.log("Completed loss_derivative, Deriv size:", Deriv.size());
  return Deriv;
}

// Helper functions for vector and matrix operations
function subtractVectors(v1, v2) {
  if (!Array.isArray(v1) || !Array.isArray(v2) || v1.length !== v2.length) {
    console.error("Invalid vectors for subtraction:", { v1, v2 });
    throw new Error("Invalid vectors for subtraction");
  }
  return v1.map((x, i) => x - v2[i]);
}

function addVectors(v1, v2) {
  if (!Array.isArray(v1) || !Array.isArray(v2) || v1.length !== v2.length) {
    console.error("Invalid vectors for addition:", { v1, v2 });
    throw new Error("Invalid vectors for addition");
  }
  return v1.map((x, i) => x + v2[i]);
}

function scaleVector(v, scale) {
  if (!Array.isArray(v)) {
    console.error("Invalid vector for scaling:", v);
    throw new Error("Invalid vector for scaling");
  }
  return v.map((x) => x * scale);
}

function crossProduct(v1, v2) {
  if (
    !Array.isArray(v1) ||
    !Array.isArray(v2) ||
    v1.length !== 3 ||
    v2.length !== 3
  ) {
    console.error("Invalid vectors for cross product:", { v1, v2 });
    throw new Error("Invalid vectors for cross product");
  }
  return [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0],
  ];
}

function vectorNorm(v) {
  if (!Array.isArray(v)) {
    console.error("Invalid vector for norm:", v);
    throw new Error("Invalid vector for norm");
  }
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

function createCrossMatrix(v, e1, e2, e3) {
  if (
    !Array.isArray(v) ||
    !Array.isArray(e1) ||
    !Array.isArray(e2) ||
    !Array.isArray(e3)
  ) {
    console.error("Invalid vectors for cross matrix:", { v, e1, e2, e3 });
    throw new Error("Invalid vectors for cross matrix");
  }
  return [crossProduct(v, e1), crossProduct(v, e2), crossProduct(v, e3)];
}

function matrixVectorMultiply(matrix, vector) {
  if (!Array.isArray(matrix) || !Array.isArray(vector)) {
    console.error("Invalid input for matrix-vector multiply:", {
      matrix,
      vector,
    });
    throw new Error("Invalid input for matrix-vector multiply");
  }
  return matrix.map((row) =>
    row.reduce((sum, val, i) => sum + val * vector[i], 0)
  );
}

export { loss_derivative };

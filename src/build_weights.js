import { zeros, pow, matrix } from "mathjs";

// Build two weight matrices as described in the paper. It will be used in "build_A_bar" to build
// a matrix A_bar which is used for computing Sobolev inner products.
//
// W corresponds to the discrete high-order fractional Sobolev inner product
// W0 corresponds to the discrete low-order term (which will build a matrix B0 which will act
// like a regularizer for the more important matrix B). B and B0 will be used to construct A_bar.
//
// Inputs:
//   alpha  double which changes the nature of the tangent point energy
//   beta  double which changes the nature of the tangent point energy like alpha
//   E  #E by 2 list of edge indices for the curve
//   Ac  a vector of vectors containing a vector for each edge "I". This vector consists of
//     the edge indices for all edges which do not intersect edge "I"
//   V  #V by 3 list of curve vertex positions
//   T  #E by 3 list of unit tangent vectors for each edge of the curve.
//     Namely, T.row(e) = (V.row(E(e, 1)) - v.row(E(e, 0)))/L(e) where L is the next input
//   L  #E by 1 list of the length of each edge in the curve
// Outputs:
//   W  #E by #E list of weights used to construct the B matrix in build_A_bar.js
//   W0  #E by #E list of weights used to construct the B0 matrix in build_A_bar.js
function build_weights(alpha, beta, E, Ac, V, T, L) {
  console.log("build_weights: Starting with inputs", { alpha, beta });

  // Convert input arrays to matrices if needed
  if (!E.size) {
    console.log("Converting E to matrix");
    E = matrix(E);
  }
  if (!V.size) {
    console.log("Converting V to matrix from:", V);
    V = matrix(V);
  }
  if (!T.size) {
    console.log("Converting T to matrix");
    T = matrix(T);
  }
  if (!L.size && Array.isArray(L)) {
    console.log("Converting L to matrix");
    L = matrix([L]).reshape([L.length, 1]);
  }

  console.log("Matrix sizes after conversion:", {
    E: E.size(),
    V: V.size(),
    T: T.size(),
    L: L.size ? L.size() : "array of length " + L.length,
  });

  const edge_num = E.size()[0];
  console.log("Edge count:", edge_num);

  // Helper function to safely get vertex coordinates
  const getVertex = (idx) => {
    try {
      console.log("Getting vertex", idx, "from matrix of size", V.size());
      const vertex = [
        parseFloat(V.get([idx, 0])),
        parseFloat(V.get([idx, 1])),
        parseFloat(V.get([idx, 2])),
      ];
      console.log("Vertex found:", vertex);
      return vertex;
    } catch (error) {
      console.error(
        "Error getting vertex",
        idx,
        "Matrix size:",
        V.size(),
        error
      );
      throw error;
    }
  };

  // Helper function to safely get edge vertices
  const getEdgeVertices = (idx) => {
    try {
      console.log("Getting edge vertices for edge", idx);
      const vertices = [parseInt(E.get([idx, 0])), parseInt(E.get([idx, 1]))];
      console.log("Edge vertices:", vertices);
      return vertices;
    } catch (error) {
      console.error(
        "Error getting edge vertices",
        idx,
        "Matrix size:",
        E.size(),
        error
      );
      throw error;
    }
  };

  // Helper function to safely get tangent vector
  const getTangent = (idx) => {
    try {
      console.log("Getting tangent for edge", idx);
      const tangent = [
        parseFloat(T.get([idx, 0])),
        parseFloat(T.get([idx, 1])),
        parseFloat(T.get([idx, 2])),
      ];
      console.log("Tangent vector:", tangent);
      return tangent;
    } catch (error) {
      console.error(
        "Error getting tangent",
        idx,
        "Matrix size:",
        T.size(),
        error
      );
      throw error;
    }
  };

  const sigma = (beta - 1) / alpha;
  console.log("Computed sigma:", sigma);

  let W = zeros(edge_num, edge_num);
  let W0 = zeros(edge_num, edge_num);

  // Loop through edges
  for (let I = 0; I < Ac.length; I++) {
    console.log(
      `Processing edge ${I}, has ${Ac[I].length} non-intersecting edges`
    );

    for (let J_ind = 0; J_ind < Ac[I].length; J_ind++) {
      let J = Ac[I][J_ind];
      let elt1 = 0;
      let elt2 = 0;

      try {
        const [i1, i2] = getEdgeVertices(I);
        console.log(`Edge ${I} vertices:`, i1, i2);
        const [j1, j2] = getEdgeVertices(J);
        console.log(`Edge ${J} vertices:`, j1, j2);

        // Process all vertex combinations
        for (const i of [i1, i2]) {
          for (const j of [j1, j2]) {
            console.log(`Processing vertex pair (${i}, ${j})`);
            const p = getVertex(i);
            const q = getVertex(j);
            const diff = subtractVectors(p, q);
            const diff_norm = vectorNorm(diff);

            if (Math.abs(diff_norm) < 0.00000001) {
              elt1 += 1000;
              elt2 += 1000;
              console.log("Small diff_norm encountered");
            } else {
              elt1 += 1 / pow(diff_norm, 2 * sigma + 1);

              const tangent = getTangent(I);
              const cross = crossProduct(diff, tangent);
              const k = pow(vectorNorm(cross), 2) / pow(diff_norm, 4);
              elt2 += k / pow(diff_norm, 2 * sigma + 1);
            }
          }
        }

        // Get lengths safely
        const length_I = Array.isArray(L) ? L[I] : parseFloat(L.get([I, 0]));
        const length_J = Array.isArray(L) ? L[J] : parseFloat(L.get([J, 0]));

        const w_val = 0.25 * length_I * length_J * elt1;
        const w0_val = 0.25 * length_I * length_J * elt2;

        W.set([I, J], w_val);
        W0.set([I, J], w0_val);

        console.log(
          `Set weights: W[${I},${J}]=${w_val}, W0[${I},${J}]=${w0_val}`
        );
      } catch (error) {
        console.error(`Error processing edge pair (${I}, ${J}):`, error);
        throw error;
      }
    }
  }

  console.log("build_weights: Completed successfully");
  return { W, W0 };
}

// Helper functions with error checking
function subtractVectors(v1, v2) {
  if (!Array.isArray(v1) || !Array.isArray(v2) || v1.length !== v2.length) {
    console.error("Invalid vectors:", { v1, v2 });
    throw new Error("Invalid vectors for subtraction");
  }
  return v1.map((x, i) => x - v2[i]);
}

function vectorNorm(v) {
  if (!Array.isArray(v)) {
    console.error("Invalid vector for norm:", v);
    throw new Error("Vector must be an array");
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
    throw new Error("Vectors must be 3D arrays");
  }
  return [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0],
  ];
}

export { build_weights };

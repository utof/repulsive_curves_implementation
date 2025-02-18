import { zeros, pow } from "mathjs";

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
  const edge_num = E.rows;

  // sigma is defined in the paper
  // it is used to compute the value of the repulsion energy
  const sigma = (beta - 1) / alpha;

  // Now, when constructing W (which will happen on each iteration), we iterate through Ac
  let W = zeros(edge_num, edge_num);
  // We will construct W0 at the same time (the weights used to make B0)
  let W0 = zeros(edge_num, edge_num);

  // loop through all edges
  for (let I = 0; I < Ac.length; I++) {
    // loop through all edges which don't intersect edge I
    for (let J_ind = 0; J_ind < Ac[I].length; J_ind++) {
      let J = Ac[I][J_ind]; // the index of the edge which doesn't intersect I

      let elt1 = 0;
      let elt2 = 0;

      // iterate through all combinations of endpoints of these 2 edges
      // use the coordinates of each combination of endpoints for formula from the paper for W and W0
      for (let a = 0; a < 2; a++) {
        for (let b = 0; b < 2; b++) {
          let i = E.get([I, a]);
          let j = E.get([J, b]);
          let p = V.row(i);
          let q = V.row(j);
          let diff = subtractVectors(p, q);
          let diff_norm = vectorNorm(diff);

          // sometimes when diff_norm gets super small (by 2 vertices overlapping by chance), we divide by 0 and things mess up
          // this is a quick fix
          if (Math.abs(diff_norm) < 0.00000001) {
            elt1 += 1000;
            elt2 += 1000;
          } else {
            elt1 += 1 / pow(diff_norm, 2 * sigma + 1);

            // use alpha = 2 and beta = 4, as specified for B0
            let alph = 2;
            let bet = 4;

            let cross = crossProduct(subtractVectors(p, q), T.row(I));
            let k = pow(vectorNorm(cross), alph) / pow(diff_norm, bet);
            elt2 += k / pow(diff_norm, 2 * sigma + 1);
          }
        }
      }

      W.set([I, J], 0.25 * L.get([I]) * L.get([J]) * elt1); // update the weight matrix W
      W0.set([I, J], 0.25 * L.get([I]) * L.get([J]) * elt2); // update the weight matrix W0
    }
  }

  return { W, W0 };
}

// Helper functions for vector operations
function subtractVectors(v1, v2) {
  return v1.map((x, i) => x - v2[i]);
}

function vectorNorm(v) {
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

function crossProduct(v1, v2) {
  return [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0],
  ];
}

export { build_weights };

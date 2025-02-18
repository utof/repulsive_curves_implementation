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
function loss_derivative(alpha, beta, E, Ac, E_adj, V, T, L, Deriv) {
  // TODO: Implement the function logic here
  console.log("loss_derivative function called");
}

export { loss_derivative };

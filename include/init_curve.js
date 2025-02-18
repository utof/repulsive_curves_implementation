// Compute two vector of vectors (Ac and E_adj) which only depend
// on the curve's topology and thus won't have to be recomputed
// for each iteration of descent.
//
// Having these will save time on every iteration.
//
// Also, compute the length of every edge in the curve's initial state ("lengths").
// This will be used later when evaluating constraints.
//
// Inputs:
//   E  #E by 2 list of edge indices for the curve
//   V  #V by 3 list of curve vertex positions
// Outputs:
//   Ac  a vector of vectors containing a vector for each edge "I". This vector consists of
//     the edge indices for all edges which do not intersect edge "I"
//   E_adj  a vector of vectors where there is a vector for each point "p" consisting of
//     the edge indices for all edges containing the point "p"
//   lengths  #E by 1 list of the length of each edge in the curve before any iterations were done
function init_curve(E, V, Ac, E_adj, lengths) {
  // TODO: Implement the function logic here
  console.log("init_curve function called");
}

export { init_curve };

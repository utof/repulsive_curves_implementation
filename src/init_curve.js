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
function init_curve(E, V) {
  const pt_num = V.rows;
  const edge_num = E.rows;

  // Later, in each iteration of repulsion we will have to construct a weight matrix w_{I,J}
  // To do this we will need to iterate through all pairs of edges which are disjoint

  // In order to save time later, we will just store all edges J which are disjoint from
  // an edge I in a vector Ac[I]
  // So Ac is a vector of vectors of the form Ac[I]

  // Ac stands for "adjacency complement" because it's all the edges not adjacent to other edges
  // This will only depend on the topology of the mesh
  // So we won't need to recompute it

  // We use arrays for this since different elements will have different lengths
  let Ac = [];

  // build Ac
  for (let i = 0; i < edge_num; i++) {
    let row = [];
    for (let j = 0; j < edge_num; j++) {
      // if edge i and j don't share any vertices, add edge j to the row for edge i
      if (
        !(
          E.get([i, 0]) === E.get([j, 0]) ||
          E.get([i, 0]) === E.get([j, 1]) ||
          E.get([i, 1]) === E.get([j, 0]) ||
          E.get([i, 1]) === E.get([j, 1])
        )
      ) {
        row.push(j);
      }
    }
    Ac.push(row);
  }

  // Note that some of the rows of Ac will be empty, and this is fine

  // Define a vector of vectors called E_Adj
  // One row for each vertex
  // row i contains an element for each edge containing vertex i

  // Similar to "Ac", we only need to build this once since it only depends on the topology
  // of the curve, and it will save us time during each iteration when we need to find the
  // set of edges adjacent to a point.

  let E_adj = [];

  // iterate through all points
  for (let i = 0; i < pt_num; i++) {
    let row = [];
    // iterate through all edges
    for (let j = 0; j < edge_num; j++) {
      // if edge j contains vertex i, add edge j to the row for vertex i
      if (E.get([j, 0]) === i || E.get([j, 1]) === i) {
        row.push(j);
      }
    }
    E_adj.push(row);
  }

  // We will get all the edge lengths now
  // This is important because during each iteration we will want to compare
  // new edge lengths to the edge lengths of the mesh when it was initialized

  let lengths = new Array(edge_num);
  for (let i = 0; i < edge_num; i++) {
    let diff = subtractVectors(V.row(E.get([i, 0])), V.row(E.get([i, 1])));
    lengths[i] = vectorNorm(diff);
  }

  return { Ac, E_adj, lengths };
}

// Helper functions for vector operations
function subtractVectors(v1, v2) {
  return v1.map((x, i) => x - v2[i]);
}

function vectorNorm(v) {
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

export { init_curve };

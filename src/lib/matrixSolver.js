import { lusolve, transpose, matrix, multiply } from "mathjs";

// Implements matrix solving functionality used in repulsion_iteration
// This handles both the main system solve and the projection solves
export function solveSystem(A, b) {
  try {
    // Use LU decomposition to solve the system Ax = b
    return lusolve(A, b);
  } catch (error) {
    console.error("Error solving matrix system:", error);
    throw new Error("Matrix solving failed");
  }
}

// Build the block matrix used in repulsion_iteration
// [ A_bar  C^T ]
// [ C      Z   ]
export function buildBlockMatrix(A_bar, C, Z) {
  const n = A_bar.size()[0];
  const m = C.size()[0];

  // Create the composite matrix
  const result = matrix(
    Array(n + m)
      .fill()
      .map(() => Array(n + m).fill(0))
  );

  // Copy A_bar to top-left block
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      result.set([i, j], A_bar.get([i, j]));
    }
  }

  // Copy C^T to top-right block
  const CT = transpose(C);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      result.set([i, n + j], CT.get([i, j]));
    }
  }

  // Copy C to bottom-left block
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      result.set([n + i, j], C.get([i, j]));
    }
  }

  // Copy Z to bottom-right block
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      result.set([n + i, n + j], Z.get([i, j]));
    }
  }

  return result;
}

// Utility function to check if matrix is well-conditioned enough to solve
export function isWellConditioned(matrix) {
  try {
    // This is a simple check - in production you might want a more sophisticated approach
    const det = abs(det(matrix));
    const norm = norm(matrix);
    return det > 1e-10 && norm < 1e10;
  } catch (error) {
    return false;
  }
}

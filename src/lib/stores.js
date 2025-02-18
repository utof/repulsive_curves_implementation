import { writable } from "svelte/store";
import { matrix } from "mathjs";

// Initialize stores with empty matrices
export const V = writable(matrix()); // Vertex positions
export const E = writable(matrix()); // Edge indices
export const T = writable(matrix()); // Tangent vectors
export const L = writable(matrix()); // Edge lengths
export const Ac = writable([]); // Adjacency complement
export const E_adj = writable([]); // Edge adjacency
export const lengths = writable(matrix()); // Initial edge lengths

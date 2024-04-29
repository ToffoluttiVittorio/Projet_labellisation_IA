/* tslint:disable */
/* eslint-disable */
/**
*/
export function init(): void;
/**
* @param {Uint8Array} data
* @param {number} width
* @param {number} height
* @param {number} channels
* @param {number} n_clusters
* @returns {Hierarchy}
*/
export function build_hierarchy_wasm(data: Uint8Array, width: number, height: number, channels: number, n_clusters: number): Hierarchy;
/**
* @param {Hierarchy} hierarchy
* @param {number} level
* @returns {Uint32Array}
*/
export function cut_hierarchy_wasm(hierarchy: Hierarchy, level: number): Uint32Array;
/**
* @param {Uint8Array} img
* @param {number} width
* @param {number} height
* @param {Uint32Array} labels
* @returns {Uint8Array}
*/
export function display_labels_wasm(img: Uint8Array, width: number, height: number, labels: Uint32Array): Uint8Array;
/**
*/
export class Hierarchy {
  free(): void;
/**
*/
  labels: Uint32Array;
/**
*/
  levels: Float64Array;
/**
*/
  max_level: number;
/**
*/
  parents: Uint32Array;
}

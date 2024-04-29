<template>
  <div id="images-menu-container">
    <select
      class="select-menu"
      v-model="selectedImage"
      @change="handleImageChange"
    >
      <option value="">Sélectionner une image</option>
      <option v-for="image in images" :key="image.id" :value="image">
        {{ image.name }}
      </option>
    </select>
  </div>
  <div class="loading-container" v-if="isLoading">
    <div class="loader"></div>
    <div class="loading-text">Chargement du geotiff...</div>
  </div>

  <div id="labellisation-container">
    <div class="app" id="app">
      <div class="app-header">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value="0.2"
          id="sliderOpacity"
          @input="updateOpacity"
        />
        <button class="export" @click="exportImage">exporter</button>
        <button class="enregistrer" @click="vectorize">
          Enregistrer le patch
        </button>
      </div>

      <div id="table-container">
        <table id="table-nom">
          <thead>
            <tr>
              <th>Index</th>
              <th>Nom du champ</th>
              <th>Couleur</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(field, index) in fields"
              :key="index"
              @click="updateClassColorAndName(field[0], field[1])"
            >
              <td>{{ index + 1 }}</td>
              <td :class="{ selected: index === 0 }">{{ field[0] }}</td>
              <td :style="{ backgroundColor: field[1] }"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="button-container">
        <button @click="moveLeft" :disabled="i === 0">←</button>
        <button @click="moveUp" :disabled="j === 0">↑</button>
        <button @click="moveRight" :disabled="i === numPatchesX - 1">→</button>
        <button @click="moveDown" :disabled="j === numPatchesY - 1">↓</button>
      </div>

      <div class="app-body">
        <div class="slide-container">
          <input
            type="range"
            min="0"
            max="1"
            value="0"
            step="any"
            class="slider"
            id="slider"
            list="markers"
            v-model="sliderValue"
          />
          <div class="slider-values">
            {{ parseFloat(sliderValue).toFixed(2) }}
          </div>
        </div>
        <div class="canvas-container">
          <canvas class="canvas" id="canvas" ref="canvas"></canvas>
          <canvas
            class="canvas"
            id="canvasVector"
            ref="canvasVector"
            :width="this.patchSize"
            :height="this.patchSize"
          ></canvas>
        </div>
      </div>
    </div>
  </div>

  <canvas
    id="previsualisation"
    ref="canvasPrevisu"
    width="300"
    height="300"
  ></canvas>
</template>

<script>
import {
  build_hierarchy_wasm,
  display_labels_wasm,
  cut_hierarchy_wasm,
  Hierarchy,
} from "../../pkg";
import { fromArrayBuffer, fromBlob } from "geotiff";
import proj4 from "proj4";
import * as GeoTIFF from "geotiff";
import axios from "axios";

async function getImageMetadata(image, offsetX, offsetY, patchSize) {
  const fileDir = image.getFileDirectory();
  const ModelPixelScale = fileDir.ModelPixelScale;
  const ModelTiepoint = fileDir.ModelTiepoint;
  const GeoKeyDirectory = fileDir.GeoKeyDirectory;
  const BitsPerSample = fileDir.BitsPerSample;
  const GeoAsciiParams = fileDir.GeoAsciiParams;
  const PhotometricInterpretation = fileDir.PhotometricInterpretation;
  const SamplesPerPixel = fileDir.SamplesPerPixel;
  const Orientation = 1;
  const ProjectedCSTypeGeoKey = image.geoKeys.ProjectedCSTypeGeoKey;

  let metadata = {
    height: patchSize,
    width: patchSize,
    GeoAsciiParams: GeoAsciiParams,
    BitsPerSample: BitsPerSample,
    SamplesPerPixel: SamplesPerPixel,
    PhotometricInterpretation: PhotometricInterpretation,
    Orientation: Orientation,
    ProjectedCSTypeGeoKey: ProjectedCSTypeGeoKey,
    ModelTiepoint: [
      0,
      0,
      0,
      ModelTiepoint[3] + offsetX * ModelPixelScale[0],
      ModelTiepoint[4] - offsetY * ModelPixelScale[1],
      ModelTiepoint[5],
    ],
    ModelPixelScale: ModelPixelScale,
    GeoKeyDirectory: GeoKeyDirectory,
  };
  return metadata;
}

export default {
  name: "LabellisationView",
  props: {
    id: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      sliderValue: 0,
      hierarchy: null,
      tiff: null,
      geoJSON: {
        type: "FeatureCollection",
        features: [],
      },
      className: null,
      classColor: "",
      varFill: null,
      images: [],
      selectedImage: "",
      i: 0,
      j: 0,
      numPatchesX: 0,
      numPatchesY: 0,
      patchSize: 512,
      geotiff: null,
      isLoading: false,
      fields: [],
    };
  },
  async mounted() {
    // this.setupFileInput();
    this.setupSlider();
    this.getImages();
    this.fetchNomenclature(this.id);
  },
  methods: {
    updateClassColorAndName(className, classColor) {
      /**
       * Updates the class color and name for the selected cells.
       *
       * @param {string} className - The name of the class.
       * @param {string} classColor - The color of the class.
       */

      const selectedCells = document.querySelectorAll(".selected");
      selectedCells.forEach((cell) => {
        cell.classList.remove("selected");
      });

      event.target.classList.add("selected");

      this.className = className;
      this.classColor = classColor;
    },

    async fetchNomenclature(id) {
      /**
       * Fetches the nomenclature data from the server based on the provided ID.
       * Also fetches the styles associated with the fetched nomenclature.
       *
       * @param {number} id - The ID of the nomenclature to fetch.
       * @returns {Promise<void>} - A promise that resolves when the data is fetched successfully.
       * @throws {Error} - If there is an error during the data fetching process.
       */
      try {
        const response = await axios.get(
          `http://localhost:5000/gestion/nomenclature/${id}`
        );
        await this.fetchStylesByNomenclature(response.data.nomenclature);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération de la nomenclature:",
          error
        );
      }
    },

    async fetchStylesByNomenclature(nomenclatureId) {
      /**
       * Fetches styles by nomenclature ID.
       * @param {number} nomenclatureId - The ID of the nomenclature.
       * @returns {Promise<void>} - A promise that resolves when the styles are fetched.
       */
      try {
        const response = await axios.get(
          `http://localhost:5000/gestion/nomenclature/${nomenclatureId}/styles`
        );
        this.fields = response.data.styles.map((style) => [
          style.nom,
          style.couleur,
        ]);
        this.className = response.data.styles[0].couleur;
        this.classColor = response.data.styles[0].couleur;
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des styles de la nomenclature:",
          error
        );
      }
    },

    async loadGeoTIFF(url) {
      /**
       * Loads a GeoTIFF file from the specified URL.
       * @param {string} url - The URL of the GeoTIFF file to load.
       * @returns {Promise<void>} - A promise that resolves when the GeoTIFF file is loaded.
       */
      this.isLoading = true;

      console.time("fetch");
      const response = await fetch(url);
      console.timeEnd("fetch");

      console.time("arrayBuffer");
      const arrayBuffer = await response.arrayBuffer();
      console.timeEnd("arrayBuffer");

      console.time("fromArrayBuffer");
      this.geotiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
      console.timeEnd("fromArrayBuffer");

      this.isLoading = false;
    },

    moveLeft() {
      /**
       * Decreases the value of `this.i` by 1 and calls the `setupFileInput` method.
       *
       * @returns {void}
       */
      if (this.i > 0) {
        this.i--;
        this.setupFileInput();
      }
    },

    moveUp() {
      /**
       * Decreases the value of `j` by 1 and calls the `setupFileInput` method.
       * If `j` is already 0, no action is taken.
       */
      if (this.j > 0) {
        this.j--;
        this.setupFileInput();
      }
    },

    moveRight() {
      /**
       * Moves the selection to the right.
       * If the current index is less than the number of patches in the X direction minus 1,
       * increments the index by 1 and sets up the file input.
       */
      if (this.i < this.numPatchesX - 1) {
        this.i++;
        this.setupFileInput();
      }
    },

    moveDown() {
      /**
       * Moves the selection down by one patch.
       * If the current row index (`j`) is less than the total number of patches in the Y direction (`numPatchesY - 1`),
       * the row index is incremented by one and the `setupFileInput()` method is called.
       */
      if (this.j < this.numPatchesY - 1) {
        this.j++;
        this.setupFileInput();
      }
    },

    async handleImageChange() {
      /**
       * Handles the change event when a new image is selected.
       * Loads the GeoTIFF file with the given name and sets up the file input.
       * @returns {Promise<void>} A promise that resolves when the image is loaded and the file input is set up.
       */
      await this.loadGeoTIFF(this.selectedImage.name);
      this.setupFileInput();
    },

    async getImages() {
      /**
       * Retrieves images for a specific chantier (construction site) from the server.
       * @async
       * @method getImages
       * @returns {Promise<void>} A promise that resolves when the images are successfully retrieved.
       */
      axios
        .get("http://localhost:5000/data/chantier/getImages", {
          params: {
            id_chantier: this.id,
          },
        })
        .then((response) => {
          this.images = [...response.data.images];
          // console.log(this.images);
        })
        .catch((error) => {
          console.error("Erreur lors de la récupération des images :", error);
        });
    },

    async getPatch() {
      /**
       * Retrieves a patch from the geotiff image and performs various operations on it.
       * @returns {Promise<ArrayBuffer>} The patch data as an ArrayBuffer.
       */
      const image = await this.geotiff.getImage();

      const imageWidth = image.getWidth();
      const imageHeight = image.getHeight();

      // Check if the i, j values are outside the image boundaries
      if (
        this.i * this.patchSize > imageWidth ||
        this.j * this.patchSize > imageHeight
      ) {
        console.log("Index out of bounds");
        return;
      }

      const pool = new GeoTIFF.Pool();

      this.numPatchesX = Math.ceil(imageWidth / this.patchSize);
      this.numPatchesY = Math.ceil(imageHeight / this.patchSize);

      const canvas = this.$refs.canvasPrevisu;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const rectWidth = canvas.width / this.numPatchesX;
      const rectHeight = canvas.height / this.numPatchesY;

      // Draw grid on the canvas
      for (let x = 0; x < this.numPatchesX; x++) {
        for (let y = 0; y < this.numPatchesY; y++) {
          ctx.strokeStyle = "black";
          ctx.strokeRect(x * rectWidth, y * rectHeight, rectWidth, rectHeight);
          ctx.fillStyle =
            x === this.i && y === this.j ? "red" : "rgba(0, 0, 0, 0)";
          ctx.fillRect(x * rectWidth, y * rectHeight, rectWidth, rectHeight);
        }
      }

      // Fetch patches from the server and draw them on the canvas
      axios
        .get("http://localhost:5000/get_patches", {
          params: {
            image_id: this.selectedImage.id,
          },
        })
        .then((response) => {
          response.data.forEach((patch) => {
            const x = patch.i;
            const y = patch.j;

            ctx.fillStyle = "green";
            ctx.fillRect(x * rectWidth, y * rectHeight, rectWidth, rectHeight);
          });
        })
        .catch((error) => {
          console.log(error);
        });

      const offsetX = this.i * this.patchSize;
      const offsetY = this.j * this.patchSize;

      // Read the patch data from the image
      const patch = await image.readRasters({
        pool: pool,
        window: [
          offsetX,
          offsetY,
          offsetX + this.patchSize,
          offsetY + this.patchSize,
        ],
        interleave: true,
      });

      // Get metadata for the patch
      const metadata = await getImageMetadata(
        image,
        offsetX,
        offsetY,
        this.patchSize
      );

      // Convert the patch to ArrayBuffer
      const arrayBufferPatch = await GeoTIFF.writeArrayBuffer(patch, metadata);

      return arrayBufferPatch;
    },

    async setupFileInput() {
      /**
       * Sets up the file input and processes the selected file.
       * @returns {Promise<void>} A promise that resolves when the file processing is complete.
       */
      this.sliderValue = 0;
      const arrayBuffer = await this.getPatch();
      await this.processTiff(arrayBuffer);
    },

    async readTiff(buffer) {
      /**
       * Reads a TIFF image from a buffer and returns the image data.
       *
       * @param {ArrayBuffer} buffer - The buffer containing the TIFF image data.
       * @returns {Object} An object containing the width, height, channels, and data of the image.
       * @throws {Error} If the image is not an 8-bit image.
       */
      const tiff = await fromArrayBuffer(buffer);
      const image = await tiff.getImage();

      const width = image.getWidth();
      const height = image.getHeight();
      const channels = image.getSamplesPerPixel();

      const bytesPerValue = image.getBytesPerPixel() / channels;
      if (bytesPerValue !== 1) {
        throw new Error("Only 8-bit images are supported");
      }

      const data = await image.readRasters();

      const merged = new Uint8Array(width * height * channels);
      data.forEach((channel, i) => {
        merged.set(channel, i * width * height);
      });

      return {
        width,
        height,
        channels,
        data: merged,
      };
    },

    async processTiff(buffer) {
      /**
       * Processes a TIFF image buffer and performs labelization.
       * @param {ArrayBuffer} buffer - The TIFF image buffer.
       * @returns {Promise<void>} - A promise that resolves when the labelization process is complete.
       */
      this.tiff = await this.readTiff(buffer);

      const clusterCount = Math.round(
        (this.tiff.width * this.tiff.height) / 200
      );
      this.hierarchy = build_hierarchy_wasm(
        this.tiff.data,
        this.tiff.width,
        this.tiff.height,
        this.tiff.channels,
        clusterCount
      );
      const labels = cut_hierarchy_wasm(this.hierarchy, 0);
      const bitmapResult = display_labels_wasm(
        this.tiff.data,
        this.tiff.width,
        this.tiff.height,
        labels
      );

      const uint8ClampedArray = new Uint8ClampedArray(bitmapResult);
      const imageData = new ImageData(
        uint8ClampedArray,
        this.tiff.width,
        this.tiff.height
      );
      const imageBitmap = await createImageBitmap(imageData);

      let canvas = this.$refs.canvas;
      let ctx = canvas.getContext("2d");
      canvas.width = this.tiff.width;
      canvas.height = this.tiff.height;
      ctx.drawImage(imageBitmap, 0, 0);

      let ctxVector = this.$refs.canvasVector.getContext("2d");
      this.$refs.canvasVector.width = this.tiff.width;
      this.$refs.canvasVector.height = this.tiff.height;
      this.$refs.canvasVector.style.opacity = sliderOpacity.value;
      ctxVector.clearRect(0, 0, canvas.width, canvas.height);

      const neighboringRegions = this.findNeighboringRegions(
        labels,
        canvas.width,
        canvas.height
      );

      if (this.varFill) {
        this.$refs.canvasVector.removeEventListener("click", this.varFill);
        const neighboringRegions = this.findNeighboringRegions(
          labels,
          canvas.width,
          canvas.height
        );
        this.varFill = this.fillRegion(labels, neighboringRegions);
        this.$refs.canvasVector.addEventListener("click", this.varFill);
      } else {
        this.varFill = this.fillRegion(labels, neighboringRegions);
        this.$refs.canvasVector.addEventListener("click", this.varFill);
      }
    },

    convertToGeographicCoords(x, y) {
      /**
       * Converts the given coordinates from a specific projection to geographic coordinates.
       *
       * @param {number} x - The x-coordinate in the source projection.
       * @param {number} y - The y-coordinate in the source projection.
       * @returns {number[]} - An array containing the converted geographic coordinates [longitude, latitude].
       */
      const sourceProjection =
        "+proj=lcc +lat_1=44 +lat_2=49 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
      const destProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";
      return proj4(sourceProjection, destProjection, [x, y]);
    },

    vectorize() {
      /**
       * Converts the geoJSON data to a JSON string, creates a Blob object with the JSON content,
       * and downloads it as a file. Then, sends a POST request to save the patch data to the server.
       *
       * @returns {void}
       */
      const jsonContent = JSON.stringify(this.geoJSON);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "geojson_data.json";
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      axios
        .post("http://localhost:5000/save_patch", {
          name: `image_${this.selectedImage.id}_patch_${this.i}_${this.j}`,
          id_img_sortie: this.selectedImage.id,
          data: this.geoJSON,
          i: this.i,
          j: this.j,
          segmentation_value: parseFloat(this.sliderValue),
          image_png: this.toBlob(),
        })
        .then((response) => {
          console.log(response);
        })
        .catch((error) => {
          console.log(error);
        });
    },

    toBlob() {
      let canvas = this.$refs.canvasVector;
      let dataUrl = canvas.toDataURL("image/png");
      return dataUrl;
    },

    exportImage() {
      /**
       * Export the canvas as an image.
       */
      const image = this.$refs.canvasVector.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = image;
      downloadLink.download = "canvas_image.png";
      downloadLink.click();
    },

    updateOpacity(event) {
      /**
       * Updates the opacity of the canvas vector element.
       * @param {Event} event - The event object triggered by the opacity change.
       */
      this.$refs.canvasVector.style.opacity = event.target.value;
    },

    findNeighboringRegions(labels, width, height) {
      /**
       * Finds the neighboring regions for each label in the given image.
       *
       * @param {Array} labels - The array of labels representing the image.
       * @param {number} width - The width of the image.
       * @param {number} height - The height of the image.
       * @returns {Map} - A map containing the neighboring regions for each label.
       */
      const neighboringRegions = new Map();

      function isValidCoordinate(x, y) {
        /**
         * Checks if the given coordinate is valid within the image boundaries.
         *
         * @param {number} x - The x-coordinate.
         * @param {number} y - The y-coordinate.
         * @returns {boolean} - True if the coordinate is valid, false otherwise.
         */
        return x >= 0 && x < width && y >= 0 && y < height;
      }

      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const currentRegion = labels[y * width + x];

          if (!neighboringRegions.has(currentRegion)) {
            neighboringRegions.set(currentRegion, new Set());
          }

          const neighboringSet = neighboringRegions.get(currentRegion);
          const isOnBorder =
            x === 0 || x === width - 1 || y === 0 || y === height - 1;

          if (isOnBorder) {
            neighboringSet.add(-1);
          }

          const directions = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
          ];

          for (const dir of directions) {
            const neighborX = x + dir.dx;
            const neighborY = y + dir.dy;

            if (isValidCoordinate(neighborX, neighborY)) {
              const neighborRegion = labels[neighborY * width + neighborX];

              if (neighborRegion !== currentRegion) {
                neighboringSet.add(neighborRegion);
              }
            }
          }

          neighboringRegions.set(currentRegion, neighboringSet);
        }
      }

      return neighboringRegions;
    },

    async getCoordinates(file) {
      /**
       * Retrieves the coordinates of the given file.
       * @param {File} file - The file to retrieve coordinates from.
       * @returns {Promise<void>} - A promise that resolves when the coordinates are retrieved.
       */
      const tiff = await fromBlob(file);
      const image = await tiff.getImage();

      const modelPixelScale = await image.fileDirectory.ModelPixelScale;
      const modelTiepoint = await image.fileDirectory.ModelTiepoint;
      const width = image.getWidth();
      const height = image.getHeight();
      const left = modelTiepoint[3];
      const top = modelTiepoint[4];
      const right = left + width * modelPixelScale[0];
      const bottom = top - height * modelPixelScale[1];

      this.topLeftCoords = this.convertToGeographicCoords(left, top);
      this.bottomRightCoords = this.convertToGeographicCoords(right, bottom);
    },

    setupSlider() {
      /**
       * Sets up the slider functionality.
       */
      const slider = document.getElementById("slider");

      let working = false;
      slider.addEventListener("input", async () => {
        const value = slider.valueAsNumber;
        if (working) {
          return;
        }
        working = true;
        await this.handleSlider(value);

        requestAnimationFrame(() => {
          working = false;
        });
      });
    },

    searchNeighborsInReg(pointsSeg, width) {
      /**
       * Searches for neighboring points in a region.
       * @param {Array} pointsSeg - The array of points in the region.
       * @param {number} width - The width of the region.
       * @returns {Map} - A map containing the pixel positions as keys and the set of neighboring positions as values.
       */
      const neighborsMap = new Map();
      for (const [x, y] of pointsSeg) {
        const neighbors = new Set();
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const neighborX = x + dx;
            const neighborY = y + dy;
            const neighborPosition = neighborY * width + neighborX;
            if (
              pointsSeg.some(([nx, ny]) => nx === neighborX && ny === neighborY)
            ) {
              neighbors.add(neighborPosition);
            }
          }
        }
        const pixelPosition = y * width + x;
        neighborsMap.set(pixelPosition, neighbors);
      }

      return neighborsMap;
    },

    traversePixelsInOrder(neighborsMap, width) {
      /**
       * Traverses the pixels in a specific order based on the neighbors map and width.
       * Returns an array of pixels in the order they were visited.
       *
       * @param {Map} neighborsMap - A map containing the neighbors of each pixel.
       * @param {number} width - The width of the image.
       * @returns {Array} - An array of pixels in the order they were visited.
       */
      const visited = new Set();
      const orderedPixels = [];
      let counter = 0;
      let distanceConditionMet = false;

      const startPixel = Array.from(neighborsMap.keys())[0];
      dfs(startPixel);

      function dfs(pixel) {
        if (distanceConditionMet) {
          return;
        }

        orderedPixels.push(pixel);
        visited.add(pixel);
        counter++;

        if (counter >= 10) {
          const [xStart, yStart] = [
            orderedPixels[0] % width,
            Math.floor(orderedPixels[0] / width),
          ];

          const [xCurrent, yCurrent] = [
            pixel % width,
            Math.floor(pixel / width),
          ];

          const distance = Math.sqrt(
            (xCurrent - xStart) ** 2 + (yCurrent - yStart) ** 2
          );

          if (distance <= 2) {
            distanceConditionMet = true;
            return;
          }
        }

        const neighbors = neighborsMap.get(pixel);

        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            dfs(neighbor);
          }
        }
      }

      return orderedPixels;
    },

    convertToCoordinatesXY(pixelList, width) {
      /**
       * Converts a list of pixels to their corresponding coordinates (x, y) based on the given width.
       * @param {number[]} pixelList - The list of pixels to convert.
       * @param {number} width - The width of the image.
       * @returns {number[][]} - The list of coordinates (x, y) corresponding to the pixels.
       */
      const coordinatesList = [];
      for (const pixel of pixelList) {
        const y = pixel % width;
        const x = Math.floor(pixel / width);
        coordinatesList.push([x, y]);
      }
      return coordinatesList;
    },

    convertToCoordinates(pixelList, width, height) {
      /**
       * Converts a list of pixel coordinates to corresponding geographical coordinates.
       *
       * @param {Array} pixelList - The list of pixel coordinates to convert.
       * @param {number} width - The width of the image in pixels.
       * @param {number} height - The height of the image in pixels.
       * @returns {Array} - The list of corresponding geographical coordinates.
       */
      const topLeftLat = this.topLeftCoords[1];
      const topLeftLng = this.topLeftCoords[0];
      const botRightLat = this.bottomRightCoords[1];
      const botRightLng = this.bottomRightCoords[0];
      const latPerPixel = (topLeftLat - botRightLat) / height;
      const lngPerPixel = (botRightLng - topLeftLng) / width;

      const coordinatesList = [];
      for (const [x, y] of pixelList) {
        coordinatesList.push([
          topLeftLng + y * lngPerPixel,
          topLeftLat - x * latPerPixel,
        ]);
      }
      return coordinatesList;
    },

    bfs(labels, visited, i, j, width, height, region, neighbors) {
      /**
       * Performs a breadth-first search (BFS) algorithm to label regions in an image.
       *
       * @param {Array} labels - The array of labels representing the image.
       * @param {Array} visited - The array to keep track of visited pixels.
       * @param {number} i - The starting x-coordinate of the region.
       * @param {number} j - The starting y-coordinate of the region.
       * @param {number} width - The width of the image.
       * @param {number} height - The height of the image.
       * @param {number} region - The label of the region to be labeled.
       * @param {Set} neighbors - The set of neighboring labels.
       */
      let pointsInReg = [];
      let pointsSeg = [];

      let ctxVector = this.$refs.canvasVector.getContext("2d");

      const holesInReg = new Map();

      const queue = [];
      queue.push({ x: i, y: j });

      while (queue.length > 0) {
        const { x, y } = queue.shift();
        if (visited[x][y]) {
          continue;
        }
        visited[x][y] = true;

        if (
          x < 1 ||
          x > width - 2 ||
          y < 1 ||
          y > height - 2 ||
          (region !== labels[x * width + y] &&
            !neighbors.has(labels[x * width + y]))
        ) {
          pointsSeg.push([y, x]);
          ctxVector.fillStyle = "rgb(0,0,0)";
          ctxVector.fillRect(y, x, 1, 1);
          continue;
        }

        if (
          region !== labels[x * width + y] &&
          neighbors.has(labels[x * width + y])
        ) {
          const holeRegion = labels[x * width + y];
          if (!holesInReg.has(holeRegion)) {
            holesInReg.set(holeRegion, []);
          }
          holesInReg.get(holeRegion).push([y, x]);

          ctxVector.fillStyle = "rgb(0,0,0)";
          ctxVector.fillRect(y, x, 1, 1);
          continue;
        }

        pointsInReg.push([y, x]);

        ctxVector.fillStyle = this.classColor;
        ctxVector.fillRect(y, x, 1, 1);

        queue.push({ x: x + 1, y });
        queue.push({ x: x - 1, y });
        queue.push({ x, y: y + 1 });
        queue.push({ x, y: y - 1 });
      }

      const neighborsPerPixel = this.searchNeighborsInReg(
        pointsSeg,
        this.$refs.canvasVector.width
      );
      const orderedPixels = this.traversePixelsInOrder(
        neighborsPerPixel,
        this.$refs.canvasVector.width
      );
      orderedPixels.push(orderedPixels[0]);
      const convOrdPixels = this.convertToCoordinatesXY(
        orderedPixels,
        this.$refs.canvasVector.width
      );

      /*const filteredConvPixels = this.convertToCoordinates(
        convOrdPixels,
        this.$refs.canvasVector.width,
        this.$refs.canvasVector.height
      );*/

      const outerPolygon = {
        type: "Polygon",
        coordinates: [convOrdPixels],
      };

      this.geoJSON.features.push({
        type: "Feature",
        geometry: outerPolygon,
        properties: {
          class_name: this.className,
          class_color: this.classColor,
        },
      });

      const holesPolygons = [];
      holesInReg.forEach((holePixels, holeRegion) => {
        const neighborsPerPixel = this.searchNeighborsInReg(
          holePixels,
          this.$refs.canvasVector.width
        );
        const orderedPixels = this.traversePixelsInOrder(
          neighborsPerPixel,
          this.$refs.canvasVector.width
        );
        orderedPixels.push(orderedPixels[0]);
        const convOrdPixels = this.convertToCoordinatesXY(
          orderedPixels,
          this.$refs.canvasVector.width
        );
        // const filteredConvPixels = this.convertToCoordinates(
        //   convOrdPixels,
        //   this.$refs.canvasVector.width,
        //   this.$refs.canvasVector.height
        // );

        holesPolygons.push(convOrdPixels);
      });

      outerPolygon.coordinates.push(...holesPolygons);

      this.geoJSON.features.push({
        type: "Feature",
        geometry: outerPolygon,
        properties: {
          class_name: this.className,
          class_color: this.classColor,
        },
      });
    },

    flood_fill(labels, y, x, regionBoundaries) {
      /**
       * Performs flood fill algorithm on the given labels array starting from the specified coordinates (y, x).
       * Updates the visited array to keep track of visited pixels.
       * Uses breadth-first search (BFS) to explore neighboring pixels.
       * Only considers neighbors that have a single neighbor.
       *
       * @param {Array} labels - The labels array representing the image.
       * @param {number} y - The y-coordinate of the starting pixel.
       * @param {number} x - The x-coordinate of the starting pixel.
       * @param {Map} regionBoundaries - The map containing region boundaries.
       */
      const height = this.$refs.canvasVector.height;
      const width = this.$refs.canvasVector.width;

      const region = labels[y * width + x];
      const visited = [];

      for (let i = 0; i < height; i++) {
        visited[i] = [];
        for (let j = 0; j < width; j++) {
          visited[i][j] = false;
        }
      }
      const neighbors = Array.from(
        regionBoundaries.get(region) || new Set()
      ).filter(
        (neighbor) => (regionBoundaries.get(neighbor) || new Set()).size === 1
      ); // Filtrer les voisins ayant un seul voisin

      this.bfs(
        labels,
        visited,
        y,
        x,
        width,
        height,
        region,
        new Set(neighbors)
      );
    },

    fillRegion(labels, regionBoundaries) {
      /**
       * Fills a region on the canvas with labels based on the provided region boundaries.
       *
       * @param {Array} labels - The labels to fill the region with.
       * @param {Array} regionBoundaries - The boundaries of the region to fill.
       * @returns {Function} - The event handler function that performs the fill operation.
       */
      return (event) => {
        const rect = this.$refs.canvasVector.getBoundingClientRect();
        const x = Math.floor(event.clientX - rect.left);
        const y = Math.floor(event.clientY - rect.top);

        if (this.tiff) {
          this.flood_fill(labels, y, x, regionBoundaries);
        }
      };
    },

    async handleSlider(value) {
      /**
       * Handles the slider value change event.
       * If the hierarchy and tiff data are available, it calculates the level based on the slider value,
       * cuts the hierarchy using the calculated level, and displays the labels on the canvas.
       * If the varFill flag is true, it also adds event listeners for region filling.
       * Finally, it initializes the geoJSON object.
       *
       * @param {number} value - The value of the slider.
       * @returns {Promise<void>} - A promise that resolves when the image bitmap is created.
       */
      if (this.hierarchy === null || this.tiff === null) {
        return;
      }

      const maxValue = Math.log2(this.hierarchy.max_level);
      const logValue = value * maxValue;
      const level = Math.pow(2, logValue);

      const labels = cut_hierarchy_wasm(this.hierarchy, level);
      const bitmapResult = display_labels_wasm(
        this.tiff.data,
        this.tiff.width,
        this.tiff.height,
        labels
      );

      const uint8ClampedArray = new Uint8ClampedArray(bitmapResult);
      const imageData = new ImageData(
        uint8ClampedArray,
        this.tiff.width,
        this.tiff.height
      );
      const imageBitmap = await createImageBitmap(imageData);

      let canvas = this.$refs.canvas;
      let ctx = canvas.getContext("2d");

      let ctxVector = this.$refs.canvasVector.getContext("2d");
      canvas.width = this.tiff.width;
      canvas.height = this.tiff.height;
      ctx.drawImage(imageBitmap, 0, 0);

      ctxVector.clearRect(0, 0, canvas.width, canvas.height);

      if (this.varFill) {
        this.$refs.canvasVector.removeEventListener("click", this.varFill);
        const neighboringRegions = this.findNeighboringRegions(
          labels,
          canvas.width,
          canvas.height
        );
        this.varFill = this.fillRegion(labels, neighboringRegions);
        this.$refs.canvasVector.addEventListener("click", this.varFill);
      }

      this.geoJSON = {
        type: "FeatureCollection",
        features: [],
      };
    },
  },
};
</script>

<style>
.export {
  display: none;
}
::selection {
  background: #04aa6d;
  color: white;
}
::-moz-selection {
  background: #04aa6d;
  color: white;
}
.select-menu {
  width: 90vw;
  padding: 4px;
  font-size: 1.2em;
  border: none;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
  border: 1px solid #04aa6d;
}
.loading-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: white;
  border: 2px solid black;
  padding: 20px;
  border-radius: 10px;
  z-index: 100;
}

.loader {
  position: relative;
  margin: auto;
  border: 20px solid #eaf0f6;
  border-radius: 50%;
  border-top: 20px solid #04aa6d;
  width: 100px;
  height: 100px;
  animation: spinner 4s linear infinite;
}

@keyframes spinner {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  margin-top: 20px;
  text-align: center;
}

/* Firefox */
input[type="range"]::-moz-range-progress {
  background: #04aa6d;
}

input[type="range"]::-moz-range-track {
  background: #ccc;
}
#table-container {
  border-collapse: collapse;
  position: absolute;
  right: 2.5%;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  overflow-x: auto;
}

#table-nom {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

#table-nom th,
#table-nom td {
  padding: 10px;
  text-align: center;
  border: 1px solid black;
  border-bottom: 1px solid #dddddd89;
}

#table-nom th {
  color: white;
  font-weight: lighter;
  border: 1px solid black;
  background-color: #04aa6d;
}

#table-nom tbody tr:last-child td {
  border: 1px solid black;
}

#table-nom tbody tr:hover {
  background-color: #f9f9f949;
}

#table-nom td:nth-child(3) {
  font-weight: bold;
  color: #fff;
  text-align: center;
}

.selected {
  background-color: yellow;
}

#loading-div {
  position: absolute;
  top: 5vh;
  left: 90vw;
  font-size: 16px;
  color: #333;
}

#previsualisation {
  position: absolute;
  top: 5vh;
  left: 0vw;
}

div.button-container {
  position: absolute;
  bottom: 18%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  gap: 10px;
}

.button-container button {
  padding: 10px;
  font-size: 16px;
  border: none;
  border-radius: 5px;
  background-color: #04aa6d;
  color: white;
  font-family: Arial, sans-serif;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
  transition: background-color 0.3s, color 0.3s, box-shadow 0.3s;
  cursor: pointer;
}

.button-container button:disabled {
  background-color: #cccccc;
  color: black;
}

#images-menu-container {
  width: 10vw;
  position: absolute;
  top: 7vh;
  left: 47%;
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: center;
}

#labellisation-container {
  position: absolute;
  top: 7vh;
  left: 0;

  width: 100vw;
  height: 90vh;
}

#labellisation-container {
  top: 10vh;
}

.app {
  height: 80%;
  display: flex;
  flex-direction: column;
}

.app-header {
  padding: 16px;
}

.app-header .enregistrer {
  position: absolute;
  top: 85%;
  left: 45.8%;
  padding: 10px;
  font-size: 16px;
  border: none;
  border-radius: 5px;
  background-color: #04aa6d;
  color: white;
  font-family: Arial, sans-serif;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
  transition: background-color 0.3s, color 0.3s, box-shadow 0.3s;
  cursor: pointer;
}

.app-body {
  position: absolute;
  width: 100%;
  height: 50%;
  flex-grow: 1;
  display: flex;
  flex-direction: row;
}

input#slider.slider {
  width: 30vh;
}

input[name="range"] {
  position: relative;
  top: 100px;
  width: 150px;
  height: 10px;
  border: 0;

  -webkit-transform: rotate(270deg);
  -moz-transform: rotate(270deg);
  transform: rotate(270deg);
}

.slide-container {
  z-index: 100;
  position: absolute;
  top: 70%;
  left: 25%;
  display: flex;
  flex-direction: row;
  transform: rotate(270deg);
}

.slider-values {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-left: 4px;
  transform: rotate(90deg);
}

.slider-value {
  font-size: 12px;
  text-align: center;
}

.canvas-container {
  aspect-ratio: auto;
  display: flex;
  justify-content: center;
  background-color: black;
  top: 18%;
  left: 37%;
  position: absolute;
}

.canvas {
  background-color: black;
  object-fit: contain;
  image-rendering: pixelated;

  position: absolute;
  top: 0;
  left: 0;
}

#sliderOpacity {
  z-index: 20;
  position: absolute;
  top: 35%;
  right: 2%;
  width: 15vw;
  -webkit-appearance: none;
  appearance: none;
  height: 1.2vh;
  background: #d3d3d3;
  outline: none;
  opacity: 0.7;
  -webkit-transition: 0.2s;
  transition: opacity 0.2s;
  border-radius: 5px;
}

#sliderOpacity:hover {
  opacity: 1;
}

#sliderOpacity::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #4caf50;
  cursor: pointer;
  border-radius: 50%;
}

#sliderOpacity::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #4caf50;
  cursor: pointer;
  border-radius: 50%;
}
</style>

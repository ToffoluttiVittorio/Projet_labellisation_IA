<template>
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
        <tr v-for="(field, index) in fields" :key="index">
          <td>{{ index + 1 }}</td>
          <td>{{ field[0] }}</td>
          <td :style="{ backgroundColor: field[1] }"></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div id="images-menu-container">
    <select v-model="selectedImage" @change="handleImageChange">
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
          value="0.0"
          id="sliderOpacity"
          ref="sliderOpacity"
          @input="updateOpacity"
        />
      </div>

      <div class="app-body">
        <div class="slider-container">
          <input
            type="range"
            min="0"
            max="1"
            value="0"
            step="any"
            class="slider"
            id="slider"
            ref="slider"
            list="markers"
            v-model="sliderValue"
          />
          <div class="slide-values"></div>
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
    id="canvasGeojson"
    ref="canvasGeojson"
    :width="this.patchSize"
    :height="this.patchSize"
  ></canvas>
  <div class="textbox-container">
    <textarea class="textbox" ref="textbox" v-model="reviewText"></textarea>
  </div>
  <button
    id="nextPatchButton"
    ref="nextPatchButton"
    :disabled="isNextPatchDisabled"
    :style="{ backgroundColor: isNextPatchDisabled ? '#808080' : '#04aa6d' }"
    @click="setupFileInput"
  >
    Prochain patch
  </button>
  <div class="review-button-container">
    <button @click="accepter">Accepter</button>
    <button @click="refuser">Refuser</button>
  </div>

  <div class="progressPatch-container">
    <div id="patch-bar-label">Patch</div>
    <progress
      id="progressPatch"
      ref="progressPatch"
      :max="totalNumberOfPatches"
      :value="totalNumberOfPatches - numberOfPatches"
    ></progress>
    <div class="progressPatch-text">
      {{
        totalNumberOfPatches === 0
          ? 0
          : 100 - ((numberOfPatches / totalNumberOfPatches) * 100).toFixed(0)
      }}%
    </div>
  </div>

  <div class="progressImage-container">
    <div id="image-bar-label">Image</div>
    <progress id="progressImage" :max="numImages" :value="idxImage"></progress>
    <div class="progressImage-text">
      {{ ((idxImage / numImages) * 100).toFixed(0) }}%
    </div>
  </div>
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
  name: "ReviewView",
  props: {
    id: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      init: true,
      isNextPatchDisabled: true,
      idxImage: 0,
      totalNumberOfImages: 0,
      numImages: 0,
      totalNumberOfPatches: 0,
      numberOfPatches: 0,
      reviewPercentage: 0.05,
      reviewText: "",
      sliderValue: 0,
      textContent: "",
      buttonColor: "",
      hierarchy: null,
      tiff: null,
      topLeftCoords: [],
      bottomRightCoords: [],
      geoJSON: {
        type: "FeatureCollection",
        features: [],
      },
      classCode: "",
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
    this.fetchNomenclature(this.id);
    this.loadReview();
    await this.handleImageChange();
  },
  methods: {
    async fetchNomenclature(id) {
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
      try {
        const response = await axios.get(
          `http://localhost:5000/gestion/nomenclature/${nomenclatureId}/styles`
        );
        console.log("Styles de la nomenclature:", response.data.styles);
        this.fields = response.data.styles.map((style) => [
          style.nom,
          style.couleur,
        ]);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des styles de la nomenclature:",
          error
        );
      }
    },
    async loadSegmentationValue() {
      await axios
        .get("http://localhost:5000/patch/segmentation_value", {
          params: {
            patch_name: `image_${this.selectedImage.id}_patch_${this.i}_${this.j}`,
          },
        })
        .then((response) => {
          this.sliderValue = response.data.segmentation_value;
        })
        .catch((error) => {
          console.log("Pas de valeur de segmentation pour le patch actuel.");
        });
    },
    loadReview() {
      axios
        .get("http://localhost:5000/chantier/review", {
          params: {
            chantier_id: this.id,
          },
        })
        .then((response) => {
          this.reviewText = response.data.message;
        })
        .catch((error) => {
          console.error(error);
        });
    },
    accepter() {
      axios
        .post("http://localhost:5000/chantier/accepter", {
          chantier_id: this.id,
          message: this.$refs.textbox.value,
        })
        .then((response) => {
          console.log(response.data);
        })
        .catch((error) => {
          console.error(error);
        });
    },
    refuser() {
      axios
        .post("http://localhost:5000/chantier/refuser", {
          chantier_id: this.id,
          message: this.$refs.textbox.value,
        })
        .then((response) => {
          console.log(response.data);
        })
        .catch((error) => {
          console.error(error);
        });
    },
    drawCanvas() {
      // Construire le nom de la table
      let tableName = `image_${this.selectedImage.id}_patch_${this.i}_${this.j}`;
      axios
        .get(`http://localhost:5000/patch/image_png/${tableName}`)
        .then((response) => {
          let base64String = response.data.image_png;
          let image = new Image();
          image.onload = () => {
            let canvas = this.$refs.canvasGeojson;
            let context = canvas.getContext("2d");
            context.drawImage(image, 0, 0);
          };
          image.src = "data:image/png;base64," + base64String;
        });
    },
    async loadGeoTIFF(url) {
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

    async handleImageChange() {
      await this.getImages();
      await this.loadGeoTIFF(this.selectedImage.name);
      this.setupFileInput();
    },

    async getImages() {
      await axios
        .get("http://localhost:5000/data/chantier/getImages", {
          params: {
            id_chantier: this.id,
          },
        })
        .then((response) => {
          this.images = [...response.data.images];
          this.numImages = this.images.length;
          this.selectedImage = this.images[this.idxImage];
        })
        .catch((error) => {
          console.error("Erreur lors de la récupération des images :", error);
        });
    },

    async setTotalNumberOfPatches() {
      const image = await this.geotiff.getImage();
      const imageWidth = image.getWidth();
      const imageHeight = image.getHeight();

      const numPatchesX = Math.ceil(imageWidth / this.patchSize);
      const numPatchesY = Math.ceil(imageHeight / this.patchSize);

      this.totalNumberOfPatches =
        Math.round(numPatchesX * numPatchesY * this.reviewPercentage) - 1;

      this.numberOfPatches = Math.round(
        numPatchesX * numPatchesY * this.reviewPercentage
      );
    },

    async getPatch() {
      this.isNextPatchDisabled = false;
      this.numberOfPatches--;
      if (this.numberOfPatches > 0) {
        const image = await this.geotiff.getImage();

        const imageWidth = image.getWidth();
        const imageHeight = image.getHeight();

        const pool = new GeoTIFF.Pool();

        this.numPatchesX = Math.ceil(imageWidth / this.patchSize);
        this.numPatchesY = Math.ceil(imageHeight / this.patchSize);

        this.i = Math.floor(Math.random() * this.numPatchesX);
        this.j = Math.floor(Math.random() * this.numPatchesY);

        const offsetX = this.i * this.patchSize;
        const offsetY = this.j * this.patchSize;

        // Vérifiez si les valeurs i,j sont en dehors des limites de l'image
        if (
          this.i * this.patchSize > imageWidth ||
          this.j * this.patchSize > imageHeight
        ) {
          console.log("Index out of bounds");
          return;
        }

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

        const metadata = await getImageMetadata(
          image,
          offsetX,
          offsetY,
          this.patchSize
        );

        const arrayBufferPatch = await GeoTIFF.writeArrayBuffer(
          patch,
          metadata
        );
        return arrayBufferPatch;
      } else {
        if (this.idxImage >= this.images.length - 1) {
          this.idxImage++;
          this.isNextPatchDisabled = true;
          console.log("All images reviewed");
          return;
        } else {
          this.isNextPatchDisabled = true;
          this.idxImage++;
          this.selectedImage = this.images[this.idxImage];
          await this.handleImageChange();
        }
        console.log("All patches reviewed");
        return;
      }
    },

    async setupFileInput() {
      if (this.numberOfPatches === 0) {
        await this.setTotalNumberOfPatches();
      }
      const arrayBuffer = await this.getPatch();
      this.processTiff(arrayBuffer);
      this.drawCanvas();
    },

    async readTiff(buffer) {
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

    async processTiff(arrayBuffer) {
      this.tiff = await this.readTiff(arrayBuffer);

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
      this.$refs.canvasVector.style.opacity = this.$refs.sliderOpacity.value;
      ctxVector.clearRect(0, 0, canvas.width, canvas.height);

      const neighboringRegions = this.findNeighboringRegions(
        labels,
        canvas.width,
        canvas.height
      );

      this.varFill = this.fillRegion(labels, neighboringRegions);
      this.$refs.canvasVector.addEventListener("click", this.varFill);
      await this.loadSegmentationValue();
      await this.handleSlider(this.sliderValue);
      this.setupSlider();
    },

    convertToGeographicCoords(x, y) {
      const sourceProjection =
        "+proj=lcc +lat_1=44 +lat_2=49 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
      const destProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";
      return proj4(sourceProjection, destProjection, [x, y]);
    },

    updateOpacity(event) {
      this.$refs.canvasVector.style.opacity = event.target.value;
    },

    findNeighboringRegions(labels, width, height) {
      const neighboringRegions = new Map();
      function isValidCoordinate(x, y) {
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
      const slider = this.$refs.slider;

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
      const coordinatesList = [];
      for (const pixel of pixelList) {
        const y = pixel % width;
        const x = Math.floor(pixel / width);
        coordinatesList.push([x, y]);
      }
      return coordinatesList;
    },

    convertToCoordinates(pixelList, width, height) {
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
      let pointsInReg = [];
      let pointsSeg = [];

      let ctxVector = this.$refs.canvasVector.getContext("2d");

      const holesInReg = new Map();

      const topLeftLat = this.topLeftCoords[1];
      const topLeftLng = this.topLeftCoords[0];
      const botRightLat = this.bottomRightCoords[1];
      const botRightLng = this.bottomRightCoords[0];
      const latPerPixel = (topLeftLat - botRightLat) / height;
      const lngPerPixel = (botRightLng - topLeftLng) / width;

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
          ctxVector.fillStyle = "rgb(255,255,255)";
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
          class_code: this.classCode,
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
        const filteredConvPixels = this.convertToCoordinates(
          convOrdPixels,
          this.$refs.canvasVector.width,
          this.$refs.canvasVector.height
        );

        holesPolygons.push(convOrdPixels);
      });

      outerPolygon.coordinates.push(...holesPolygons);

      this.geoJSON.features.push({
        type: "Feature",
        geometry: outerPolygon,
        properties: {
          class_code: this.classCode,
          class_name: this.className,
          class_color: this.classColor,
        },
      });
    },

    flood_fill(labels, y, x, regionBoundaries) {
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
<style scoped>
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

#image-bar-label {
  font-size: 1.2vw;
  position: absolute;
  left: 21%;
}

.progressImage-container {
  border-radius: 15px;
  height: 2vh;
  margin-top: 1%;
  width: 100%;
  position: relative;
}

#progressImage {
  background-color: #333;
  border-radius: 15px;
  height: 2vh;
  position: absolute;
  left: 25%;
  right: 50%;
  top: 15%;
  width: 50%;
}

.progressImage-text {
  position: absolute;
  top: 70%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
}

#patch-bar-label {
  font-size: 1.2vw;
  position: absolute;
  left: 21%;
}

#progressPatch {
  background-color: #333;
  border-radius: 15px;
  height: 2vh;
  left: 25%;
  right: 50%;
  top: 10%;
  width: 50%;
}

#progressPatch::progress-bar {
  background-color: #04aa6d;
}

.progressPatch-container {
  border-radius: 15px;
  height: 2vh;
  margin-top: 4%;
  width: 100%;
  position: relative;
}

progress::-moz-progress-bar {
  background-color: #04aa6d;
}

progress::-webkit-progress-value {
  background: #04aa6d;
}

.progressPatch-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
}

.textbox-container {
  position: absolute;
  bottom: 10%;
  width: 98%;
  display: flex;
  justify-content: center;
  padding: 10px;
}

.textbox {
  width: 50%;
  height: 100px;
  padding: 10px;
  resize: none;
}

.review-button-container {
  position: absolute;
  bottom: 5%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  gap: 10px;
}

.review-button-container button {
  transition-duration: 0.4s;
  width: 150px;
  height: 40px;
  border: none;
  border-radius: 5px;
  background-color: #04aa6d;
  color: white;
  font-size: 16px;
  font-family: Arial, sans-serif;
  text-align: center;
  line-height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
  transition: background-color 0.3s, color 0.3s, box-shadow 0.3s;
}

.review-button-container button:hover {
  background-color: #048d5e;
  color: #f0f0f0;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.2);
}

#canvasGeojson {
  position: absolute;
  border: 1px solid black;
  position: absolute;
  top: 18.5%;
  right: 20%;
}

#previsualisation {
  position: fixed;
  bottom: 0;
  right: 0;
}

#nextPatchButton {
  transition-duration: 0.4s;
  width: 150px;
  height: 40px;
  border: none;
  border-radius: 5px;
  background-color: #808080;
  color: white;
  font-size: 16px;
  font-family: Arial, sans-serif;
  text-align: center;
  line-height: 40px;
  position: absolute;
  top: 7%;
  left: 80%;
  transform: translateX(-55%);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
  transition: background-color 0.3s, color 0.3s, box-shadow 0.3s;
  z-index: 10;
}

#nextPatchButton:hover {
  background-color: #048d5e;
  color: #f0f0f0;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.2);
}

#images-menu-container {
  display: none;
}

#labellisation-container {
  position: absolute;

  width: 100%;
  height: 80%;
}

#app {
  width: 100%;
  height: 80%;
  display: flex;
  flex-direction: column;
}

.app-header {
  padding: 16px;
  display: none;
}

.app-body {
  width: 100%;
  height: 90%;
  flex-grow: 1;
  display: flex;
  flex-direction: row;
}

input#slider.slider {
  width: 300px;
  display: none;
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

.slider-container {
  display: none;
  padding: 24px 16px 24px 16px;
  background-color: white;
  display: flex;
  flex-direction: row;
}

.slider-values {
  height: 50px;
  width: 50px;
  font-size: 16px;
  color: #000;
  transform: rotate(90deg);
}

.canvas-container {
  position: absolute;
  left: 20%;
  top: 12%;
  /* width: auto;
    height: auto; */
  aspect-ratio: auto;
  display: flex;
  justify-content: center;
  background-color: black;
}

.canvas {
  background-color: black;
  object-fit: contain;
  image-rendering: pixelated;

  position: absolute;
  top: 0;
  left: 20;
}

#sliderOpacity {
  width: 100px;
  -webkit-appearance: none;
  appearance: none;
  height: 10px;
  background: #d3d3d3;
  outline: none;
  opacity: 0.7;
  -webkit-transition: 0.2s;
  transition: opacity 0.2s;
  border-radius: 5px;
  display: none;
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

#class-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  padding: 20px;
}

#class-buttons button {
  padding: 5px 10px;
  font-size: 10px;
  border: solid 1px black;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
</style>

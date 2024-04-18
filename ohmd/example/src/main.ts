import { build_hierarchy_wasm, display_labels_wasm, cut_hierarchy_wasm, Hierarchy } from 'hierarchy_labellisation';
import { fromArrayBuffer, TypedArray, fromBlob } from 'geotiff';
import { log } from 'geotiff/dist-node/logging';
import proj4 from 'proj4';

const sourceProjection = '+proj=lcc +lat_1=44 +lat_2=49 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
const destProjection = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs';

function convertToGeographicCoords(x: any, y: any) {
    return proj4(sourceProjection, destProjection, [x, y]);
}

let hierarchy: Hierarchy | null = null;
let tiff: Awaited<ReturnType<typeof readTiff>> | null = null;

let canvasVector = document.getElementById('canvasVector') as HTMLCanvasElement;
let ctxVector = canvasVector.getContext('2d')!;

let canvas = document.getElementById('canvas') as HTMLCanvasElement;
let ctx = canvas.getContext('2d')!;

let canvasWidth: number;
let canvasHeight: number;

let imagePixels: ImageData;
let regions: { x: number; y: number; class_code: string; class_name: string | null; class_color: string; pixel: string; }[] = [];
// let imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
let topLeftCoords: any[];
let bottomRightCoords: any[];

let geoJSON: any = {
    type: 'FeatureCollection',
    features: []
};

let contours: number[][] = [];


const btnVectorize = document.getElementById('vectorize');
const sliderOpacity = document.getElementById('sliderOpacity') as HTMLInputElement;
// const nomenclature = document.getElementById('nomenclature');
const csvFileInput = document.getElementById('csv-input') as HTMLInputElement;


sliderOpacity.addEventListener('input', () => {
    canvasVector.style.opacity = sliderOpacity.value;
});

btnVectorize?.addEventListener('click', ev => {

    // console.log(JSON.stringify(regions));
    console.log(geoJSON);
    const jsonContent = JSON.stringify(geoJSON);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'geojson_data.json';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);

})

//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

/*  CLASS LABELS FUNCTIONS  */

let classCode: string;
let className: string | null;
let classColor: string;

csvFileInput.addEventListener('change', function () {
    const files = csvFileInput.files!;
    const file = files[0]
    const reader = new FileReader();

    reader.onload = function (e) {
        const csv = reader.result as string;
        processData(csv);
    };

    reader.readAsText(file);
});

function processData(csv: string) {
    const lines = csv.split('\n');

    const classButtonsContainer = document.getElementById('class-buttons') as HTMLElement;
    classButtonsContainer.innerHTML = '';

    lines.forEach((line: string, index: number) => {

        if (index === 0 || line === '') return;

        const columns = line.split(';');

        const code = columns[0];
        const name = columns[1].replace(/_/g, ' ').toUpperCase();
        const color = columns[2].slice(1, -1);
        const colorValues = color.split(',');

        const button = document.createElement('button');
        button.classList.add('btnLabel');
        button.id = code;
        button.textContent = name;
        button.style.backgroundColor = `rgb(${colorValues[0]}, ${colorValues[1]}, ${colorValues[2]})`;
        classButtonsContainer.appendChild(button);

        button.addEventListener('click', function () {
            classCode = this.id;
            className = this.textContent;
            classColor = this.style.backgroundColor;

            // console.log(classColor);

        });

    });
}


//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

/*  SETUP FUNCTIONS  */

function setupFileInput() {
    const fileSelector = document.getElementById('file-selector') as HTMLInputElement;
    fileSelector.addEventListener('change', (_) => {
        const files = fileSelector.files!;

        for (let i = 0; i < files.length; i++) {
            const file = files.item(i)!;
            getCoordinates(file);
            // console.log(`Loading file (${file.name})...`);

            const reader = new FileReader();
            reader.onload = (_) => {
                const arrayBuffer = reader.result as ArrayBuffer;

                processTiff(arrayBuffer);
            }
            reader.readAsArrayBuffer(file);
        }
    });
}

async function getCoordinates(file: File) {

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

    topLeftCoords = convertToGeographicCoords(left, top);
    bottomRightCoords = convertToGeographicCoords(right, bottom);

    console.log('Top Left Coordinates (WGS84):', topLeftCoords);
    console.log('Bottom Right Coordinates (WGS84):', bottomRightCoords);

}

function setupSlider() {
    const slider = document.getElementById('slider') as HTMLInputElement;

    let working = false;
    slider.addEventListener('input', async (_) => {
        const value = slider.valueAsNumber;
        if (working) {
            return;
        }
        working = true;
        await handleSlider(value);

        requestAnimationFrame(() => {
            working = false;
        });
    });
}

const btnExport = document.getElementById('btnExport');

btnExport?.addEventListener('click', () => {

    const image = canvasVector.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = image;
    downloadLink.download = 'canvas_image.png';

    downloadLink.click();

})


//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

/*  FLOOD FILL FUNCTIONS  */

function createContours(labels: Uint32Array) {

    const height = canvasHeight;
    const width = canvasWidth;

    contours = [];

    for (let i = 0; i < height; i++) {
        contours.push([]);
        for (let j = 0; j < width; j++) {
            const index = i * width + j;
            const currentLabel = labels[index];
            const nextLabel = j < width - 1 ? labels[index + 1] : -1;
            const bottomLabel = i < height - 1 ? labels[index + width] : -1;

            // if (j === 0 || j === width - 1 || i === 0 || i === height - 1 || currentLabel !== nextLabel || currentLabel !== bottomLabel) {
            if (currentLabel !== nextLabel || currentLabel !== bottomLabel) {
                contours[i].push(1);
                ctxVector.fillStyle = 'rgb(255, 0, 0)';
                ctxVector.fillRect(j, i, 1, 1);
            } else {
                contours[i].push(0);
                ctxVector.fillStyle = 'rgb(255, 0, 0)';
                ctxVector.fillRect(j, i, 1, 1);
            }
        }
    }
}


function assignContourLabels(labels: Uint32Array): Map<number, Set<[number, number]>> {
    const height = canvasHeight;
    const width = canvasWidth;
    const contoursMap = new Map<number, Set<[number, number]>>();

    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const index = i * width + j;
            const currentLabel = labels[index];
            const nextLabel = j < width - 1 ? labels[index + 1] : -1;
            const bottomLabel = i < height - 1 ? labels[index + width] : -1;

            if (j === 0 || j === width - 1 || i === 0 || i === height - 1 || currentLabel !== nextLabel || currentLabel !== bottomLabel) {
                // Si le pixel est un contour, l'ajouter à la carte des contours pour ce label
                if (!contoursMap.has(currentLabel)) {
                    contoursMap.set(currentLabel, new Set());
                }
                // Vérifier si la clé existe avant d'appeler .get()
                const contourSet = contoursMap.get(currentLabel);
                if (contourSet) {
                    contourSet.add([j, i]);
                }
            }
        }
    }

    return contoursMap;
}

function findNeighboringRegions(labels: Uint32Array): Map<number, Set<number>> {
    const neighboringRegions = new Map<number, Set<number>>();

    function isValidCoordinate(x: number, y: number): boolean {
        return x >= 0 && x < canvasWidth && y >= 0 && y < canvasHeight;
    }

    // Parcourir chaque cellule de la matrice labels
    for (let x = 0; x < canvasWidth; x++) {
        for (let y = 0; y < canvasHeight; y++) {
            const currentRegion = labels[y * canvasWidth + x];

            // Si cette région n'existe pas encore dans la carte des régions voisines, créer un nouvel ensemble pour les régions voisines
            if (!neighboringRegions.has(currentRegion)) {
                neighboringRegions.set(currentRegion, new Set<number>());
            }

            const neighboringSet = neighboringRegions.get(currentRegion)!;

            // Vérifier si le pixel est sur un bord de l'image
            const isOnBorder = x === 0 || x === canvasWidth - 1 || y === 0 || y === canvasHeight - 1;

            // Si le pixel est sur un bord, ajouter la région du bord (-1) à ses voisins
            if (isOnBorder) {
                neighboringSet.add(-1);
            }

            // Vérifier les cellules voisines (haut, bas, gauche, droite)
            const directions = [
                { dx: 0, dy: -1 },
                { dx: 0, dy: 1 },
                { dx: -1, dy: 0 },
                { dx: 1, dy: 0 }
            ];

            for (const dir of directions) {
                const neighborX = x + dir.dx;
                const neighborY = y + dir.dy;

                // Vérifier si les coordonnées du voisin sont valides
                if (isValidCoordinate(neighborX, neighborY)) {
                    const neighborRegion = labels[neighborY * canvasWidth + neighborX];

                    // Si la région du voisin est différente de la région actuelle, l'ajouter aux régions voisines
                    if (neighborRegion !== currentRegion) {
                        neighboringSet.add(neighborRegion);
                    }
                }
            }

            // Mettre à jour l'ensemble des régions voisines pour la région actuelle dans la carte des régions voisines
            neighboringRegions.set(currentRegion, neighboringSet);
        }
    }

    return neighboringRegions;
}


function findRegionBoundaries(labels: Uint32Array, width: number, height: number, neighboringRegions: Map<number, Set<number>>): Map<number, [number, number][]> {
    const regionBoundaries = new Map<number, [number, number][]>();

    function isValidCoordinate(x: number, y: number): boolean {
        return x >= 0 && x < width && y >= 0 && y < height;
    }

    // Parcourir chaque cellule de la matrice labels
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const currentRegion = labels[y * width + x];

            // Vérifier si la région actuelle a des voisins appartenant à une région différente
            let isBoundary = false;
            for (const dir of [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }]) {
                const neighborX = x + dir.dx;
                const neighborY = y + dir.dy;

                // Vérifier si les coordonnées du voisin sont valides
                if (isValidCoordinate(neighborX, neighborY)) {
                    const neighborRegion = labels[neighborY * width + neighborX];
                    if (neighborRegion !== currentRegion) {
                        isBoundary = true;
                        break;
                    }
                } else {
                    // Si les coordonnées du voisin ne sont pas valides, la cellule actuelle est une frontière
                    isBoundary = true;
                    break;
                }
            }

            // Si la cellule actuelle est une frontière, ajouter ses coordonnées à la liste des frontières de la région
            if (isBoundary) {
                if (!regionBoundaries.has(currentRegion)) {
                    regionBoundaries.set(currentRegion, []);
                }
                const boundaries = regionBoundaries.get(currentRegion)!;
                boundaries.push([x, y]);
                regionBoundaries.set(currentRegion, boundaries);
            }
        }
    }

    return regionBoundaries;
}

function colorizeRegionBoundaries(regionBoundaries: Map<number, Set<[number, number]>>) {
    let index = 0;
    for (const [region, boundaries] of regionBoundaries.entries()) {
        index++;

        // Appliquer la couleur aux frontières de cette région
        ctxVector.strokeStyle = '#' + Math.floor(Math.random() * 16777215).toString(16);
        ctxVector.lineWidth = 1;
        ctxVector.beginPath();
        for (const boundary of boundaries) {
            const [x, y] = boundary;
            ctxVector.moveTo(x + 0.5, y + 0.5); // Commencer un nouveau chemin à chaque fois
            // Vous n'avez pas besoin de vérifier si x === 0 car les frontières sont déjà gérées par l'algorithme
            for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
                const newX = x + dx;
                const newY = y + dy;
                if (!boundaries.has([newX, newY])) {
                    // S'il n'y a pas de pixel voisin dans les frontières, dessinez la ligne jusqu'à ce point
                    ctxVector.lineTo(x + 0.5 + dx, y + 0.5 + dy);
                }
            }
        }
        ctxVector.stroke();
    }
}


function searchNeighborsInReg(pointsSeg: number[][]): Map<number, Set<number>> {
    const neighborsMap = new Map<number, Set<number>>();

    for (const [x, y] of pointsSeg) {
        const neighbors = new Set<number>();

        // Examiner les 8 voisins possibles (haut, bas, gauche, droite, diagonales)
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue; // Ignorer le pixel lui-même

                const neighborX = x + dx;
                const neighborY = y + dy;

                // Calculer la position unique du voisin
                const neighborPosition = neighborY * canvasWidth + neighborX;

                // Ajouter le voisin s'il fait partie de pointsSeg
                if (pointsSeg.some(([nx, ny]) => nx === neighborX && ny === neighborY)) {
                    neighbors.add(neighborPosition);
                }
            }
        }
        // Calculer la position unique du pixel actuel
        const pixelPosition = y * canvasWidth + x;

        // Ajouter les voisins à la carte des voisins
        neighborsMap.set(pixelPosition, neighbors);

    }

    return neighborsMap;
}


function traversePixelsInOrder(neighborsMap: Map<number, Set<number>>): number[] {
    const visited = new Set<number>();
    const orderedPixels: number[] = [];
    let counter = 0;
    let distanceConditionMet = false;

    const startPixel = Array.from(neighborsMap.keys())[0];
    dfs(startPixel);

    function dfs(pixel: number) {
        if (distanceConditionMet) {
            return;
        }

        orderedPixels.push(pixel);
        visited.add(pixel);
        counter++;

        if (counter >= 10) {

            const [xStart, yStart] = [orderedPixels[0] % canvasWidth, Math.floor(orderedPixels[0] / canvasWidth)];

            const [xCurrent, yCurrent] = [pixel % canvasWidth, Math.floor(pixel / canvasWidth)];

            const distance = Math.sqrt((xCurrent - xStart) ** 2 + (yCurrent - yStart) ** 2);

            if (distance <= 2) {
                distanceConditionMet = true;
                return;
            }
        }

        const neighbors = neighborsMap.get(pixel)!;

        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                dfs(neighbor);
            }
        }
    }

    return orderedPixels;
}


function convertToCoordinatesXY(pixelList: number[]): number[][] {

    const coordinatesList: number[][] = [];
    for (const pixel of pixelList) {
        const y = pixel % canvasWidth;
        const x = Math.floor(pixel / canvasWidth);
        coordinatesList.push([x, y]);
    }
    return coordinatesList;
}

function convertToCoordinates(pixelList: number[][]): number[][] {

    const topLeftLat = topLeftCoords[1];
    const topLeftLng = topLeftCoords[0];
    const botRightLat = bottomRightCoords[1];
    const botRightLng = bottomRightCoords[0];
    const latPerPixel = (topLeftLat - botRightLat) / canvasHeight;
    const lngPerPixel = (botRightLng - topLeftLng) / canvasWidth;

    const coordinatesList: number[][] = [];
    for (const [x, y] of pixelList) {
        coordinatesList.push([topLeftLng + y * lngPerPixel, topLeftLat - x * latPerPixel]);
    }
    return coordinatesList;
}

function hasUniqueNumbers(list: number[]): boolean {
    const uniqueSet = new Set<number>();
    for (const num of list) {
        if (uniqueSet.has(num)) {
            return false; // Si le nombre est déjà présent, la liste ne contient pas uniquement des nombres uniques
        }
        uniqueSet.add(num); // Ajouter le nombre à l'ensemble
    }
    return true;
}

function drawNumbersAtCoordinates(coordinates: number[][]) {
    for (let i = 0; i < coordinates.length; i++) {
        const [x, y] = coordinates[i];

        // Calculer la valeur de la couleur en fonction de la position dans la liste
        const darkness = i / coordinates.length; // Plus la valeur de "i" est élevée, plus la couleur est claire
        const color = Math.floor(255 * (1 - darkness)); // Calculer la valeur de couleur en fonction de la position

        ctxVector.fillStyle = `rgb(${color}, ${color}, ${color})`;
        ctxVector.fillRect(y, x, 1, 1);
    }
}


function bfs(labels: Uint32Array, visited: boolean[][], i: number, j: number, width: number, height: number, region: number, neighbors: Set<number>) {
    let pointsInReg = [];
    let pointsSeg = [];


    const holesInReg: Map<number, number[][]> = new Map();

    const topLeftLat = topLeftCoords[1];
    const topLeftLng = topLeftCoords[0];
    const botRightLat = bottomRightCoords[1];
    const botRightLng = bottomRightCoords[0];
    const latPerPixel = (topLeftLat - botRightLat) / height;
    const lngPerPixel = (botRightLng - topLeftLng) / width;

    const queue: { x: number, y: number }[] = [];
    queue.push({ x: i, y: j });

    console.log(neighbors);

    while (queue.length > 0) {
        const { x, y } = queue.shift()!;
        if (visited[x][y]) {
            continue;
        }
        visited[x][y] = true;

        if (x < 1 || x > width - 2 || y < 1 || y > height - 2 || (region !== labels[x * width + y] && !(neighbors.has(labels[x * width + y])))) {
            pointsSeg.push([y, x]);
            ctxVector.fillStyle = 'rgb(255,255,255)';
            ctxVector.fillRect(y, x, 1, 1);
            continue;
        }

        if (region !== labels[x * width + y] && (neighbors.has(labels[x * width + y]))) {

            const holeRegion = labels[x * width + y];
            if (!holesInReg.has(holeRegion)) {
                holesInReg.set(holeRegion, []);
            }
            holesInReg.get(holeRegion)!.push([y, x]);

            ctxVector.fillStyle = 'rgb(0,0,0)';
            ctxVector.fillRect(y, x, 1, 1);
            continue;
        }

        pointsInReg.push([y, x]);

        // ctxVector.fillStyle = classColor;
        // ctxVector.fillRect(y, x, 1, 1);

        queue.push({ x: x + 1, y });
        queue.push({ x: x - 1, y });
        queue.push({ x, y: y + 1 });
        queue.push({ x, y: y - 1 });
    }


    const neighborsPerPixel = searchNeighborsInReg(pointsSeg);
    const orderedPixels = traversePixelsInOrder(neighborsPerPixel);
    orderedPixels.push(orderedPixels[0]);
    const convOrdPixels = convertToCoordinatesXY(orderedPixels);
    const filteredConvPixels = convertToCoordinates(convOrdPixels);

    // Créer le polygone extérieur
    const outerPolygon = {
        type: 'Polygon',
        coordinates: [filteredConvPixels]
    };

    // Ajouter le polygone extérieur à la liste des features GeoJSON
    geoJSON.features.push({
        type: 'Feature',
        geometry: outerPolygon,
        properties: {
            class_code: classCode,
            class_name: className,
            class_color: classColor
        }
    });

    // Créer les polygones des trous
    const holesPolygons: number[][][] = [];
    holesInReg.forEach((holePixels, holeRegion) => {
        const neighborsPerPixel = searchNeighborsInReg(holePixels);
        const orderedPixels = traversePixelsInOrder(neighborsPerPixel);
        orderedPixels.push(orderedPixels[0]);
        const convOrdPixels = convertToCoordinatesXY(orderedPixels);
        const filteredConvPixels = convertToCoordinates(convOrdPixels);

        holesPolygons.push(filteredConvPixels); // Ajouter les coordonnées du trou
    });

    // Ajouter les trous au polygone extérieur
    outerPolygon.coordinates.push(...holesPolygons);

    // Ajouter le polygone avec les trous à la liste des features GeoJSON
    geoJSON.features.push({
        type: 'Feature',
        geometry: outerPolygon,
        properties: {
            class_code: classCode,
            class_name: className,
            class_color: classColor
        }
    });


}


// for (const polygon of polygons) {
//     geoJSON.geometry.coordinates.push(polygon);
// }

// geoJSON.features.push(geoJSON);


function flood_fill(labels: Uint32Array, y: number, x: number, regionBoundaries: Map<number, Set<number>>) {


    const height = canvasVector.height;
    const width = canvasVector.width;

    const region = labels[y * width + x];
    // console.log(region);
    const visited: boolean[][] = [];

    // Initialisation de visited
    for (let i = 0; i < height; i++) {
        visited[i] = [];
        for (let j = 0; j < width; j++) {
            visited[i][j] = false;
        }
    }
    const neighbors = Array.from(regionBoundaries.get(region) || new Set<number>())
        .filter(neighbor => (regionBoundaries.get(neighbor) || new Set<number>()).size === 1); // Filtrer les voisins ayant un seul voisin


    bfs(labels, visited, y, x, width, height, region, new Set(neighbors));
}

let varFill: ((event: MouseEvent) => void) | null = null;

const fillRegion = (labels: Uint32Array, regionBoundaries: Map<number, Set<number>>) => {
    return (event: MouseEvent) => {

        const rect = canvasVector.getBoundingClientRect();
        const x = Math.floor(event.clientX - rect.left);
        const y = Math.floor(event.clientY - rect.top);

        // console.log(x, y);

        if (tiff) {
            flood_fill(labels, y, x, regionBoundaries);
        }
    };
};

//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

/*  HANDLE IMAGE SEGMENTATION FUNCTIONS  */

async function handleSlider(value: number) {
    if (hierarchy === null || tiff === null) {
        return;
    }

    const maxValue = Math.log2(hierarchy.max_level);
    const logValue = value * maxValue;
    const level = Math.pow(2, logValue);

    // console.log('Cutting hierarchy...');
    const labels = cut_hierarchy_wasm(hierarchy, level);

    // console.log('Displaying labels...');
    const bitmapResult = display_labels_wasm(tiff.data, tiff.width, tiff.height, labels);

    // console.log('Rendering canvas...');
    const uint8ClampedArray = new Uint8ClampedArray(bitmapResult);
    const imageData = new ImageData(uint8ClampedArray, tiff.width, tiff.height);
    const imageBitmap = await createImageBitmap(imageData);

    canvas.width = tiff.width;
    canvas.height = tiff.height;
    ctx.drawImage(imageBitmap, 0, 0);

    // console.log('Done.');

    ctxVector.clearRect(0, 0, canvasWidth, canvasHeight);

    if (varFill) {
        canvasVector.removeEventListener('click', varFill);

        createContours(labels);

        const contourLabels = assignContourLabels(labels);
        const neighboringRegions = findNeighboringRegions(labels, canvasWidth, canvasHeight)
        // colorizeRegionBoundaries(contourLabels);
        // console.log(contourLabels);
        console.log(neighboringRegions);
        varFill = fillRegion(labels, neighboringRegions);
        canvasVector.addEventListener('click', varFill);
    }

    geoJSON = {
        type: 'FeatureCollection',
        features: []
    };

}

async function readTiff(buffer: ArrayBuffer) {
    const tiff = await fromArrayBuffer(buffer);
    const image = await tiff.getImage();

    const width = image.getWidth();
    const height = image.getHeight();
    const channels = image.getSamplesPerPixel();

    const bytesPerValue = image.getBytesPerPixel() / channels;
    if (bytesPerValue !== 1) {
        throw new Error('Only 8-bit images are supported');
    }

    const data = await image.readRasters() as TypedArray[];

    // Merge channels into a single array
    const merged = new Uint8Array(width * height * channels);
    data.forEach((channel, i) => {
        merged.set(channel, i * width * height);
    });

    return {
        width,
        height,
        channels,
        data: merged,
    }
}


async function processTiff(buffer: ArrayBuffer) {
    tiff = await readTiff(buffer);

    // console.log(`Loaded image (${tiff.width}x${tiff.height}x${tiff.channels}).`);
    // console.log('Building hierarchy...')
    const clusterCount = Math.round(tiff.width * tiff.height / 200);
    hierarchy = build_hierarchy_wasm(tiff.data, tiff.width, tiff.height, tiff.channels, clusterCount)
    // console.log('Cutting hierarchy...');
    const labels = cut_hierarchy_wasm(hierarchy, 0);
    // console.log('Displaying labels...');
    const bitmapResult = display_labels_wasm(tiff.data, tiff.width, tiff.height, labels);


    // Display levels
    const sliderValues = document.getElementsByClassName('slider-values')[0];
    const maxValue = Math.log2(hierarchy.max_level);
    Array.from(sliderValues.children).forEach((node, i) => {
        const logValue = (1 - i / 10) * maxValue;
        node.textContent = `- ${logValue.toFixed(2)}`;
    });

    // Reset slider
    const slider = document.getElementById('slider') as HTMLInputElement;
    slider.value = '0';

    const uint8ClampedArray = new Uint8ClampedArray(bitmapResult);
    const imageData = new ImageData(uint8ClampedArray, tiff.width, tiff.height);
    const imageBitmap = await createImageBitmap(imageData);

    canvasWidth = tiff.width;
    canvas.width = canvasWidth;
    canvasHeight = tiff.height;
    canvas.height = canvasHeight
    ctx.drawImage(imageBitmap, 0, 0);

    canvasVector.width = tiff.width;
    canvasVector.height = tiff.height;
    canvasVector.style.opacity = sliderOpacity.value;

    imagePixels = ctx.getImageData(0, 0, canvas.width, canvas.height);

    ctxVector.clearRect(0, 0, canvasWidth, canvasHeight);

    createContours(labels);

    // console.log(contours);
    // console.log(labels);
    const neighboringRegions = findNeighboringRegions(labels)
    // console.log(neighboringRegions);


    const contourLabels = assignContourLabels(labels);
    // console.log(contourLabels);

    const regionBoundaries = findRegionBoundaries(labels, canvasWidth, canvasHeight, neighboringRegions);
    // console.log(regionBoundaries);
    // colorizeRegionBoundaries(contourLabels);

    // console.log(regionBoundaries);

    varFill = fillRegion(labels, neighboringRegions);
    canvasVector.addEventListener('click', varFill);


}


setupFileInput();
setupSlider();


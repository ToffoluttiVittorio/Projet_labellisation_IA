import { build_hierarchy_wasm, display_labels_wasm, cut_hierarchy_wasm, Hierarchy } from 'hierarchy_labellisation';
import { fromArrayBuffer, TypedArray } from 'geotiff';
import { log } from 'geotiff/dist-node/logging';

let hierarchy: Hierarchy | null = null;
let tiff: Awaited<ReturnType<typeof readTiff>> | null = null;

function setupFileInput() {
    const fileSelector = document.getElementById('file-selector') as HTMLInputElement;
    fileSelector.addEventListener('change', (_) => {
        const files = fileSelector.files!;

        for (let i = 0; i < files.length; i++) {
            const file = files.item(i)!;

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

function bfs(ctx: CanvasRenderingContext2D, labels: Uint32Array, visited: boolean[][], i: number, j: number, width: number, height: number, region: number) {
    const queue: { x: number, y: number }[] = [];
    queue.push({ x: i, y: j });

    while (queue.length > 0) {
        const { x, y } = queue.shift()!;
        if (visited[x][y]) {
            continue;
        }
        visited[x][y] = true;

        if (x < 1 || x >= height - 1 || y < 1 || y >= width - 1 || region !== labels[x * width + y]) {
            console.log('mur');
            continue;
        }

        ctx.fillStyle = `rgb(255, 0, 0)`;
        ctx.fillRect(y, x, 1, 1);

        queue.push({ x: x + 1, y });
        queue.push({ x: x - 1, y });
        queue.push({ x, y: y + 1 });
        queue.push({ x, y: y - 1 });
    }
}

function flood_fill(ctx: CanvasRenderingContext2D, labels: Uint32Array, y: number, x: number, tiff: { width: number; height: number; channels: number; data: Uint8Array; }) {
    const region = labels[y * tiff.width + x];
    const visited: boolean[][] = [];

    // Initialisation de visited
    for (let i = 0; i < tiff.height; i++) {
        visited[i] = [];
        for (let j = 0; j < tiff.width; j++) {
            visited[i][j] = false; // Aucun pixel n'a été visité au début
        }
    }

    bfs(ctx, labels, visited, y, x, tiff.width, tiff.height, region);
}



let varFill: ((event: MouseEvent) => void) | null = null;

// Définir la fonction de gestionnaire d'événements avec les paramètres nécessaires
const fillRegion = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, tiff: any, labels: Uint32Array) => {
    return (event: MouseEvent) => {
        console.log('vrai');

        const rect = canvas.getBoundingClientRect();
        const x = Math.floor(event.clientX - rect.left);
        const y = Math.floor(event.clientY - rect.top);

        if (tiff) {
            flood_fill(ctx, labels, y, x, tiff);
        }
    };
};

function countRegionInstances(labels: Uint32Array): { [region: number]: number } {
    const regionCounts: { [region: number]: number } = {};

    for (const region of labels) {
        if (regionCounts[region]) {
            regionCounts[region]++;
        } else {
            regionCounts[region] = 1;
        }
    }

    return regionCounts;
}


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

    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    canvas.width = tiff.width;
    canvas.height = tiff.height;
    ctx.drawImage(imageBitmap, 0, 0);

    console.log('Done.');

    if (varFill) {
        canvas.removeEventListener('click', varFill);
        varFill = fillRegion(canvas, ctx, tiff, labels);
        canvas.addEventListener('click', varFill)
    }

    // const instancesCount = countRegionInstances(labels);
    // console.log(instancesCount);


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
    hierarchy = build_hierarchy_wasm(tiff.data, tiff.width, tiff.height, tiff.channels, clusterCount);

    // console.log(tiff);

    // console.log('Cutting hierarchy...');
    const labels = cut_hierarchy_wasm(hierarchy, 0);
    console.log(labels);

    // console.log('Displaying labels...');
    const bitmapResult = display_labels_wasm(tiff.data, tiff.width, tiff.height, labels);

    console.log(bitmapResult);

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

    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    canvas.width = tiff.width;
    canvas.height = tiff.height;
    ctx.drawImage(imageBitmap, 0, 0);

    varFill = fillRegion(canvas, ctx, tiff, labels);
    canvas.addEventListener('click', varFill)

}


setupFileInput();
setupSlider();

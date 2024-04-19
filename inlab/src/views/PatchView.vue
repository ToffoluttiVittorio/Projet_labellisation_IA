<template>
    <div class="patch-container">
        <input type="text" v-model="url" placeholder="Entrez l'URL du GeoTIFF" />
        <button @click="loadGeoTIFFFromURL">Charger le GeoTIFF</button>
        <label for="patchSize">Patch Size:</label>
        <select v-model="patchSize" ref="patchSizeSelect">
            <option value="128">128</option>
            <option value="256">256</option>
            <option value="512">512</option>
            <option value="1024">1024</option>
        </select>
        <input type="number" v-model.number="patchIndexI" placeholder="Entrez l'indice i du patch" />
        <input type="number" v-model.number="patchIndexJ" placeholder="Entrez l'indice j du patch" />
        <button @click="getPatch">Charger le patch</button>
        <div id="imageContainer"></div>
        <progress ref="progress" :value="progress" max="100"></progress>
        <button @click="downloadZip" ref="downloadBtn" style="display: none;">Télécharger ZIP</button>
    </div>
</template>

<script>
import * as GeoTIFF from "geotiff";
import JSZip from "jszip";
import { saveAs } from 'file-saver';
import axios from 'axios';

// Fonction pour obtenir les métadonnées de l'image
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
            0, 0, 0,
            ModelTiepoint[3] + (offsetX * ModelPixelScale[0]),
            ModelTiepoint[4] - (offsetY * ModelPixelScale[1]),
            ModelTiepoint[5]
        ],
        ModelPixelScale: ModelPixelScale,
        GeoKeyDirectory: GeoKeyDirectory
    };

    return metadata;
}

export default {
    data() {
        return {
            url: '',
            patchSize: '512',
            progress: 0,
            patchIndexI: 0,
            patchIndexJ: 0,
            zip: new JSZip()
        };
    },

    methods: {
        async getPatch() {
            const tiff = await GeoTIFF.fromUrl(this.url);
            const image = await tiff.getImage();
            // Vérifiez si les valeurs i,j sont en dehors des limites de l'image
            if (this.patchIndexI * parseInt(this.patchSize) > image.getWidth() || this.patchIndexJ * parseInt(this.patchSize) > image.getHeight()) {
                console.log("Index out of bounds")
                return;
            }
            const pool = new GeoTIFF.Pool();
            const patchSize = parseInt(this.patchSize);
            const offsetX = this.patchIndexI * patchSize;
            const offsetY = this.patchIndexJ * patchSize;
            const patchName = `image_${this.patchIndexI}_${this.patchIndexJ}.tiff`;
            const idImageSortie = 2;
            const patch = await image.readRasters({
                pool: pool,
                window: [offsetX, offsetY, offsetX + patchSize, offsetY + patchSize],
                interleave: true,
            });
            const metadata = await getImageMetadata(image, offsetX, offsetY, patchSize);
            const arrayBufferPatch = GeoTIFF.writeArrayBuffer(patch, metadata);
            const blob = new Blob([arrayBufferPatch], { type: 'application/octet-stream' });
            saveAs(blob, patchName);
            // const uploadPatch = await axios.post('http://localhost:5000/data/patch', { name: patchName, id_img_sortie: idImageSortie });
            // const updateCurrentPatch = await axios.post('http://localhost:5000/data/update_current_patch', { id: idImageSortie, current_patch: [this.patchIndexI, this.patchIndexJ] });
            return arrayBufferPatch;
        },

        async loadGeoTIFFFromURL() {
            let arrayBufferPatch;
            if (this.url) {
                try {
                    console.log(this.url);
                    const tiff = await GeoTIFF.fromUrl(this.url);
                    console.log(tiff);
                    const image = await tiff.getImage();
                    const pool = new GeoTIFF.Pool();
                    const patchSize = parseInt(this.patchSize);
                    arrayBufferPatch = await this.readPatches(image, patchSize, pool);
                    const downloadBtn = this.$refs.downloadBtn;
                    downloadBtn.style.display = 'block';
                    console.log('bbb');
                } catch (error) {
                    console.error('Erreur lors du chargement du GeoTIFF : ', error);
                }
            }
            console.log(arrayBufferPatch[0])
            return arrayBufferPatch[0];
        },

        async readPatches(image, patchSize, pool) {
            const promises = [];
            const totalPatches = Math.ceil(image.getWidth() / patchSize) * Math.ceil(image.getHeight() / patchSize);
            this.progress = 0;
            this.$refs.progress.max = totalPatches;

            const height = image.getHeight();
            const width = image.getWidth();

            for (let i = 0; i < width; i += patchSize) {
                for (let j = 0; j < height; j += patchSize) {
                    const promise = image.readRasters({
                        pool: pool,
                        window: [i, j, Math.min(i + patchSize, width), Math.min(j + patchSize, height)],
                        interleave: true,
                    }).then(patch => {
                        return getImageMetadata(image, i, j, patchSize).then(metadata => {
                            const arrayBufferPatch = GeoTIFF.writeArrayBuffer(patch, metadata);
                            const blob = new Blob([arrayBufferPatch], { type: 'application/octet-stream' });
                            this.zip.file(`image_${i}_${j}.tiff`, blob);
                            this.progress += 1;
                            return arrayBufferPatch;
                        });
                    });
                    promises.push(promise);
                }
            }
            return Promise.all(promises);
        },

        downloadZip() {
            this.zip.generateAsync({ type: "blob" }).then((content) => {
                saveAs(content, "example.zip");
            });
        }
    },

};
</script>

<style scoped>
.patch-container {

    position: absolute;
    top: 10vh;

}
</style>
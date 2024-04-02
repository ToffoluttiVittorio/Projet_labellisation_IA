import * as GeoTIFF from "geotiff";
import JSZip from "jszip";
import { saveAs } from 'file-saver';

var zip = new JSZip();

// Fonction pour charger le GeoTIFF à partir du fichier uploadé par l'utilisateur
async function loadGeoTIFF(file) {
  try {
    // Créer un objet FileReader pour lire le contenu du fichier
    const reader = new FileReader();

    reader.onload = async function (event) {
      const arrayBuffer = event.target.result;
      // Créer un objet GeoTIFF
      const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);

      // Lire une image spécifique du GeoTIFF (par exemple, l'image 0)
      const image = await tiff.getImage();

      const pool = new GeoTIFF.Pool();

      const patchSizeSelect = document.getElementById('patchSize');

      let patchSize = parseInt(patchSizeSelect.value);

      patchSizeSelect.onchange = function () {
        patchSize = parseInt(this.value);
      }

      console.log(image.getWidth(), image.getHeight())

      const arrayBuffers = [];
      for (let i = 0; i < image.getWidth(); i += patchSize) {
        for (let j = 0; j < image.getHeight(); j += patchSize) {
          const patch = await image.readRasters({
            pool: pool,
            window: [i, j, i + patchSize, j + patchSize],
            interleave: true,
          });
          getImageMetadata(image, i, j, 512).then(metadata => {
            const arrayBufferPatch = GeoTIFF.writeArrayBuffer(patch, metadata);
            arrayBuffers.push(arrayBufferPatch);
            const blob = new Blob([arrayBufferPatch], { type: 'application/octet-stream' });
            zip.file(`image_${i}_${j}.tiff`, blob);
          });
        }
      }

      console.log(arrayBuffers[0])

      const select = document.createElement('select');
      arrayBuffers.forEach((buffer, index) => {
        // Créer une nouvelle option pour chaque patch
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `Patch ${index}`;
        select.appendChild(option);
      });
      select.addEventListener('change', (event) => {
        const buffer = arrayBuffers[event.target.value];
        displayPatch(buffer);
      });
      document.body.appendChild(select);


      const downloadBtn = document.getElementById('downloadBtn');
      downloadBtn.style.display = 'block';

      downloadBtn.addEventListener('click', function () {
        zip.generateAsync({ type: "blob" }).then(function (content) {
          // see FileSaver.js
          saveAs(content, "example.zip");
        });

      });

    };

    // Lire le fichier GeoTIFF en tant qu'ArrayBuffer une fois qu'il est chargé par l'utilisateur
    reader.readAsArrayBuffer(file);
  } catch (error) {
    console.error('Erreur lors du chargement du GeoTIFF : ', error);
  }
}

// Fonction pour charger le GeoTIFF à partir du fichier uploadé par l'utilisateur
async function loadGeoTIFFFromURL(url) {
  try {
    // Créer un objet GeoTIFF
    const tiff = await GeoTIFF.fromUrl(url);
    const image = await tiff.getImage();
    const pool = new GeoTIFF.Pool();

    const patchSizeSelect = document.getElementById('patchSize');
    let patchSize = parseInt(patchSizeSelect.value);

    patchSizeSelect.onchange = function () {
      patchSize = parseInt(this.value);
    }

    const arrayBuffers = [];
    for (let i = 0; i < image.getWidth(); i += patchSize) {
      for (let j = 0; j < image.getHeight(); j += patchSize) {
        const patch = await image.readRasters({
          pool: pool,
          window: [i, j, i + patchSize, j + patchSize],
          interleave: true,
        });
        getImageMetadata(image, i, j, 512).then(metadata => {
          const arrayBufferPatch = GeoTIFF.writeArrayBuffer(patch, metadata);
          arrayBuffers.push(arrayBufferPatch);
          const blob = new Blob([arrayBufferPatch], { type: 'application/octet-stream' });
          zip.file(`image_${i}_${j}.tiff`, blob);
        });
      }
    }

    const select = document.createElement('select');
    arrayBuffers.forEach((buffer, index) => {
      // Créer une nouvelle option pour chaque patch
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `Patch ${index}`;
      select.appendChild(option);
    });
    select.addEventListener('change', (event) => {
      const buffer = arrayBuffers[event.target.value];
      displayPatch(buffer);
    });
    document.body.appendChild(select);


    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.style.display = 'block';

    downloadBtn.addEventListener('click', function () {
      zip.generateAsync({ type: "blob" }).then(function (content) {
        // see FileSaver.js
        saveAs(content, "example.zip");
      });

    });
  } catch (error) {
    console.error('Erreur lors du chargement du GeoTIFF : ', error);
  }
}

// Fonction pour obtenir les métadonnées de l'image
async function getImageMetadata(image, patchIndexX, patchIndexY, patchSize) {
  const fileDir = image.getFileDirectory();
  const ModelPixelScale = fileDir.ModelPixelScale;
  const ModelTiepoint = fileDir.ModelTiepoint;
  const GeoKeyDirectory = image.fileDirectory.GeoKeyDirectory;
  const BitsPerSample = fileDir.BitsPerSample;
  const GeoAsciiParams = fileDir.GeoAsciiParams;
  const PhotometricInterpretation = fileDir.PhotometricInterpretation;
  const Compression = fileDir.Compression;
  const SamplesPerPixel = fileDir.SamplesPerPixel;
  const Orientation = 1;
  const ProjectedCSTypeGeoKey = image.geoKeys.ProjectedCSTypeGeoKey;

  //

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
      ModelTiepoint[3] + (patchIndexX * ModelPixelScale[0]),
      ModelTiepoint[4] - (patchIndexY * ModelPixelScale[1]),
      ModelTiepoint[5]
    ],
    ModelPixelScale: ModelPixelScale,
    GeoKeyDirectory: GeoKeyDirectory
  };

  return metadata;

}

function displayPatch(arrayBuffer) {
  const tiff = new window.Tiff({ buffer: arrayBuffer });
  const canvas = tiff.toCanvas();
  if (canvas) {
    // Effacer le conteneur avant d'ajouter le nouveau canvas
    const container = document.getElementById('imageContainer');
    while (container.firstChild) {
      container.firstChild.remove();
    }
    container.appendChild(canvas);
  }
}

// Écouter les changements de l'input de fichier
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', function (event) {
  const file = event.target.files[0]; // Récupérer le premier fichier sélectionné
  if (file) {
    loadGeoTIFF(file); // Appeler loadGeoTIFF avec le fichier sélectionné
  }
});

const urlInput = document.getElementById('urlInput');
const urlBtn = document.getElementById('loadBtn');
urlBtn.addEventListener('click', function () {
  const url = urlInput.value;
  if (url) {
    loadGeoTIFFFromURL(url);
  }
});
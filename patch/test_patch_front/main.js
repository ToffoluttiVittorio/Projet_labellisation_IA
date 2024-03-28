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

      const patches = [];
      for (let i = 0; i < image.getWidth(); i += patchSize) {
        for (let j = 0; j < image.getHeight(); j += patchSize) {
          const patch = await image.readRasters({
            pool: pool,
            window: [i, j, i + patchSize, j + patchSize],
            interleave: true,
          });
          getImageMetadata(image, i, j, 512).then(metadata => {
            const arrayBufferTest = GeoTIFF.writeArrayBuffer(patch, metadata);
            const blob = new Blob([arrayBufferTest], { type: 'application/octet-stream' });

            zip.file(`image_${i}_${j}.tiff`, blob);
          });
          patches.push(patch);
        }
      }

      console.log(patches.length)

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

  return {
    height: patchSize,
    width: patchSize,
    GeoAsciiParams: GeoAsciiParams,
    BitsPerSample: BitsPerSample,
    SamplesPerPixel: SamplesPerPixel,
    PhotometricInterpretation: PhotometricInterpretation,
    Compression: Compression,
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

}

// Function to trigger download of the GeoTIFF
function downloadGeoTIFF(arrayBuffer, fileName) {

  const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();

  window.URL.revokeObjectURL(url);
}

// Écouter les changements de l'input de fichier
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', function (event) {
  const file = event.target.files[0]; // Récupérer le premier fichier sélectionné
  if (file) {
    loadGeoTIFF(file); // Appeler loadGeoTIFF avec le fichier sélectionné
  }
});

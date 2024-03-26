import * as GeoTIFF from "geotiff";

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

      // Obtenir les métadonnées de l'image
      const width = image.getWidth();
      const height = image.getHeight();
      const tileWidth = image.getTileWidth();
      const tileHeight = image.getTileHeight();
      const samplesPerPixel = image.getSamplesPerPixel();

      // when we are actually dealing with geo-data the following methods return
      // meaningful results:
      const origin = image.getOrigin();
      const resolution = image.getResolution();
      const bbox = image.getBoundingBox();

      console.log('width:', width, 'height:', height, 'tileWidth:', tileWidth, 'tileHeight:', tileHeight, 'samplesPerPixel:', samplesPerPixel);
      console.log('origin:', origin, 'resolution:', resolution, 'bbox:', bbox);

      const patchSize = 256;
      const patches = [];
      for (let i = 0; i < width; i += patchSize) {
        for (let j = 0; j < height; j += patchSize) {
          const patch = await image.readRasters({
            window: [i, j, i + patchSize, j + patchSize],
          });
          patches.push(patch);
        }
      }

      // Show the download button once the GeoTIFF is loaded
      const downloadBtn = document.getElementById('downloadBtn');
      downloadBtn.style.display = 'block';

      // Add click event to the download button
      downloadBtn.addEventListener('click', function () {
        downloadGeoTIFF(arrayBuffer.slice(0, 256 * 256 * 3), 'image.tiff');
      });

    };

    // Lire le fichier GeoTIFF en tant qu'ArrayBuffer une fois qu'il est chargé par l'utilisateur
    reader.readAsArrayBuffer(file);
  } catch (error) {
    console.error('Erreur lors du chargement du GeoTIFF : ', error);
  }
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

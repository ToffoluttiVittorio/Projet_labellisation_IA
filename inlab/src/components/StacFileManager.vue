<template>
  <div class="stac-container">
    <h2>STAC File Manager</h2>
    <form @submit.prevent="loadStac">
      Enter STAC URL:
      <input type="text" v-model="url" placeholder="Enter URL" />
      <button type="submit">Enter</button>
    </form>
    <div id="files" class="scrollable">
      <ul>
        <template v-for="folder in folders" :key="folder.name">
          <folder-component
            :folder="folder"
            @toggleFolder="toggleFolder"
            @updateMap="updateMap"
          />
        </template>
      </ul>
    </div>
    <div id="selectedFiles">
      <h2>Selected Layers</h2>
      <ul>
        <p
          v-for="(layer, key) in selectedLayers"
          :key="key"
          @click="zoomToLayer(layer)"
        >
          {{ key }}
        </p>
      </ul>
    </div>
    <button @click="saveProject">Enregistrer le chantier</button>
  </div>

  <div class="save-container">
    <form @submit.prevent="saveChantier">
      <div class="form-group">
        <label for="nomChantier">Nom du chantier : </label>
        <input type="text" id="nomChantier" v-model="nomChantier" />
      </div>
      <div class="form-group">
        <label for="labelliser">À annoter par : </label>
        <select id="labelliser" v-model="labelliser">
          <option value="">Sélectionner un utilisateur</option>
          <option v-for="user in users" :key="user.id" :value="user.username">
            {{ user.username }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label for="review">À review par : </label>
        <select id="review" v-model="review">
          <option value="">Sélectionner un utilisateur</option>
          <option v-for="user in users" :key="user.id" :value="user.username">
            {{ user.username }}
          </option>
        </select>
      </div>
      <div id="nomenclature-container" class="form-group">
        <label for="nomenclature">Nomenclature:</label>
        <input type="text" id="nomenclature" v-model="nomenclature" />

        <div id="nomenclature">
          <div id="nomenclature-select">
            <label for="nomenclature"
              >Sélectionnez une nomenclature existante :</label
            >
            <p></p>
            <input
              type="file"
              id="csv-input"
              accept=".csv"
              @change="updateNomCsv"
            />
            <p></p>
            <select id="nomenclature" @change="getStyles">
              <option value="" disabled selected>
                Choisissez une nomenclature
              </option>
              <option
                v-for="nomenclature in nomenclatures"
                :value="nomenclature.id"
              >
                {{ nomenclature.nom }}
              </option>
            </select>
          </div>
          <form @submit.prevent="handleCreaNomSubmit">
            <label for="textContent">Créer un champs :</label>
            <input
              type="text"
              id="textContent"
              name="textContent"
              v-model="textContent"
            />
            <label for="buttonColor">Couleur:</label>
            <input
              type="color"
              id="buttonColor"
              name="buttonColor"
              v-model="buttonColor"
            />
            <button type="submit">Créer Bouton</button>
          </form>
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
                  <td @click="removeField(index)">X</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <button type="submit">Enregistrer le chantier</button>
    </form>
  </div>
</template>

<style>
#selectedFiles {
  margin-top: 20px;
  overflow-y: auto;
  height: 30%;
}
p {
  text-align: left;
}
li {
  text-align: left;
}
.scrollable {
  height: 50%;
  overflow-y: auto;
}
</style>

<script>
import * as STAC from "./stac.js";
import STACLayer from "ol-stac";
import axios from "axios";
import { pan } from "ol/interaction/Interaction";
import FolderComponent from "./FolderComponent.vue";
import { containsCoordinate, extend } from "ol/extent";
import { Style, Stroke } from "ol/style";

export default {
  inject: ["map"],
  data() {
    return {
      clicked: false,
      folders: [],
      // url: "https://canada-spot-ortho.s3.amazonaws.com/catalog.json",
      url: "https://canada-spot-ortho.s3.amazonaws.com/canada_spot_orthoimages/canada_spot5_orthoimages/S5_2005/catalog.json",
      layers: {},
      selectedLayers: {},
      users: [],
      labelliser: "",
      review: "",
      nomChantier: "",
      nomenclature: "",
      fields: [],
      textContent: "",
      buttonColor: "",
      nomenclatures: [],
      selectedNomenclatureId: null,
    };
  },
  mounted() {
    this.fetchUsers();
    this.getNomenclaturesAndStyles();
  },
  methods: {
    updateNomCsv() {
      /**
       * Updates the name of the CSV file.
       *
       * @param {Event} event - The event object triggered by the file input change.
       */
      const files = event.target.files;
      const file = files[0];
      const reader = new FileReader();

      reader.onload = () => {
        const csv = reader.result;
        this.processData(csv);
      };

      reader.readAsText(file);
    },

    processData(csv) {
      /**
       * Process the CSV data and populate the fields array.
       *
       * @param {string} csv - The CSV data to process.
       */
      console.log(this.fields);
      const lines = csv.split("\n");
      lines.forEach((line, index) => {
        if (index === 0 || line === "") return;

        const columns = line.split(";");

        const code = columns[0];
        const name = columns[1].replace(/_/g, " ");
        const color = columns[2].slice(1, -1);
        const colorValues = color.split(",");

        this.fields.push([
          name,
          `rgb(${colorValues[0]}, ${colorValues[1]}, ${colorValues[2]})`,
        ]);
      });
    },

    async toggleFolder(folder) {
      /**
       * Toggles the state of a folder, opening or closing it.
       * If the folder is closed, it creates a StacLayer for each file in the folder.
       *
       * @param {Object} folder - The folder object to toggle.
       * @returns {Promise<void>} - A promise that resolves when the folder state is toggled.
       */
      if (!folder.opened) {
        for (let file of folder.files) {
          await this.createStacLayer(file, folder);
          let panAssetHref = await this.getPanAssetHref(file.href);
          console.log(this.layers[panAssetHref]);
        }
        folder.opened = true;
      }
    },

    removeField(index) {
      /**
       * Removes a field from the list of fields.
       *
       * @param {number} index - The index of the field to remove.
       */
      this.fields.splice(index, 1);
    },

    getNomenclaturesAndStyles() {
      /**
       * Retrieves nomenclatures and styles from the server.
       * Makes a GET request to "http://localhost:5000/gestion/nomenclatures" endpoint.
       * Updates the component's "nomenclatures" data property with the response data.
       * Logs an error message if there is an error during the request.
       */
      axios
        .get("http://localhost:5000/gestion/nomenclatures")
        .then((response) => {
          this.nomenclatures = response.data;
        })
        .catch((error) => {
          console.error(
            "Erreur lors de la récupération des nomenclatures et des styles :",
            error
          );
        });
    },

    getStyles(event) {
      /**
       * Retrieves the styles based on the selected nomenclature.
       * @param {Event} event - The event object triggered by the selection change.
       */
      const selectedNomenclatureId = event.target.value;
      const selectedNomenclature = this.nomenclatures.find(
        (nomenclature) => nomenclature.id === parseInt(selectedNomenclatureId)
      );
      if (selectedNomenclature) {
        this.fields = selectedNomenclature.styles.map((style) => [
          style.nom,
          style.couleur,
        ]);
      } else {
        this.fields = [];
      }
    },

    handleCreaNomSubmit() {
      /**
       * Handles the submission of the form for creating a new name.
       * If the text content or button color is empty, the method returns early.
       * Otherwise, it adds a new entry to the 'fields' array with the provided text content and button color.
       * Finally, it resets the text content and button color to empty values.
       */
      if (this.textContent == "" || this.buttonColor == "") {
        return;
      }
      this.fields.push([this.textContent, this.buttonColor]);
      this.textContent = "";
      this.buttonColor = "";
    },

    fetchUsers() {
      axios
        .get("http://localhost:5000/data/user/getUser")
        .then((response) => {
          this.users = response.data.users;
        })
        .catch((error) => {
          console.error(
            "Erreur lors de la récupération des utilisateurs :",
            error
          );
        });
    },

    saveProject() {
      /**
       * Saves the project.
       *
       * This method sets the z-index and opacity of the save container to make it visible.
       */
      const saveContainer = document.querySelector(".save-container");
      if (saveContainer) {
        saveContainer.style.zIndex = 100;
        saveContainer.style.opacity = 1;
      }
    },

    loadFiles(file, folder) {
      /**
       * Loads a file into the specified folder.
       *
       * @param {Object} file - The file object to be loaded.
       * @param {Object} folder - The folder object where the file will be added.
       */
      try {
        folder.files.push({
          href: file.href,
          checked: false,
        });
      } catch (error) {
        console.error("Error loading files:", error);
      }
    },

    loadFolder(elem, parentFolder) {
      /**
       * Loads a folder from the provided element and adds it to the parent folder.
       *
       * @param {Object} elem - The element representing the folder to load.
       * @param {Object} parentFolder - The parent folder to add the loaded folder to.
       */
      try {
        let index = new STAC.Index();
        index.initialize(elem.href);
        let rootNode = index.getRootNode();
        let folder = {
          name: elem.href,
          files: [],
          checked: false,
          opened: false,
          subfolders: [],
        };
        parentFolder.subfolders.push(folder);
        let children = rootNode.entry.links.filter(
          (link) => link.rel === "item" || link.rel === "child"
        );
        console.log(children);
        for (let child of children) {
          if (child.rel === "item") {
            this.loadFiles(child, folder);
          } else if (child.rel === "child") {
            this.loadFolder(child, folder);
          }
        }
      } catch (error) {
        console.error("Error loading folder:", error);
      }
    },

    loadStac() {
      /**
       * Loads the STAC (SpatioTemporal Asset Catalog) data from the specified URL.
       * Populates the component's `folders` array with the retrieved data.
       *
       * @throws {Error} If there is an error loading the STAC data.
       */
      this.folders = [];
      try {
        let index = new STAC.Index();
        index.initialize(this.url);
        let rootNode = index.getRootNode();
        let children = rootNode.entry.links.filter(
          (link) => link.rel === "item" || link.rel === "child"
        );
        let folder = {
          name: this.url,
          files: [],
          checked: false,
          opened: false,
          subfolders: [],
        };
        this.folders.push(folder);
        for (const child of children) {
          if (child.rel === "item") {
            this.loadFiles(child, folder);
          } else if (child.rel === "child") {
            this.loadFolder(child, folder);
          }
        }
      } catch (error) {
        console.error("Error loading STAC:", error);
      }
    },

    async updateMap(file) {
      /**
       * Updates the map with the given file.
       * @param {Object} file - The file object to update the map with.
       * @returns {Promise<void>} - A promise that resolves when the map is updated.
       */
      let panAssetHref = await this.getPanAssetHref(file.href);
      if (file.checked) {
        let stac = new STACLayer({ url: file.href });
        stac.boundsStyle_.stroke_.color_ = "#FF0000";
        this.selectedLayers[panAssetHref] = stac;
        this.map.map.addLayer(stac);
        // stac.on("sourceready", () => {
        //   this.map.map.getView().fit(stac.getExtent());
        // });
      } else {
        let stac = this.selectedLayers[panAssetHref];
        if (stac) {
          this.map.map.removeLayer(stac);
          delete this.selectedLayers[panAssetHref];
        }
      }
    },

    intersectsCoordinate(extent, coordinate) {
      /**
       * Checks if a given coordinate intersects with a given extent.
       *
       * @param {Array<number>} extent - The extent to check against.
       * @param {Array<number>} coordinate - The coordinate to check.
       * @returns {boolean} - True if the coordinate intersects with the extent, false otherwise.
       */
      return containsCoordinate(extent, coordinate);
    },

    async createStacLayer(file, folder) {
      /**
       * Creates a STAC layer using the provided file and folder.
       * @param {Object} file - The file object containing the href property.
       * @param {string} folder - The folder name.
       * @returns {Promise<void>} - A promise that resolves when the STAC layer is created.
       */
      let panAssetHref = await this.getPanAssetHref(file.href);
      let stac = new STACLayer({ url: file.href });
      stac.boundsStyle_.stroke_.color_ = "#3399CC";
      this.layers[panAssetHref] = stac;
      this.map.map.addLayer(stac);
      stac.on("sourceready", () => {
        this.map.map.on("click", (event) => {
          if (this.intersectsCoordinate(stac.getExtent(), event.coordinate)) {
            console.log(stac);
            console.log(stac.getExtent());
            this.selectStacLayer(stac, folder);
          }
        });
      });
    },

    async removeStacLayer(file) {
      /**
       * Removes a STAC layer from the map.
       *
       * @param {Object} file - The file object representing the STAC layer to be removed.
       * @returns {Promise<void>} - A promise that resolves when the layer is successfully removed.
       */
      let panAssetHref = await this.getPanAssetHref(file.href);
      let stac = this.layers[panAssetHref];
      if (stac) {
        this.map.map.removeLayer(stac);
        delete this.layers[panAssetHref];
      }
    },

    async selectStacLayer(stac, folder) {
      /**
       * Selects a STAC layer and updates the map accordingly.
       *
       * @param {Object} stac - The selected STAC layer.
       * @param {Object} folder - The folder containing the STAC layer files.
       * @returns {void}
       */
      let fileUrl = stac.getData()._url;
      // let panAssetHref = await this.getPanAssetHref(fileUrl);
      // console.log("Selected STACLayer:", stac);
      // console.log("Selected STACLayer assets: ", stac.getAssets());
      // console.log("Selected STACLayer extent:", stac.getExtent());
      // console.log("Selected STACLayer properties:", stac.getData()._url);
      // console.log(folder);
      folder.files.forEach((file) => {
        if (file.href === fileUrl) {
          file.checked = !file.checked;
          this.updateMap(file);
        }
      });
    },

    zoomToLayer(layer) {
      this.map.map.getView().fit(layer.getExtent());
    },

    async getPanAssetHref(url) {
      /**
       * Retrieves the href of a PAN asset from a given URL.
       * If the response contains a 'pan' asset, the href of that asset is returned.
       * Otherwise, the href of the first asset in the response is returned.
       *
       * @param {string} url - The URL to fetch the asset from.
       * @returns {string} The href of the PAN asset or the first asset in the response.
       * @throws {Error} If there was an error fetching the asset.
       */
      try {
        const response = await axios.get(url);
        const assets = response.data.assets;
        return assets.pan ? assets.pan.href : Object.values(assets)[0].href;
      } catch (error) {
        console.error("Error fetching asset:", error);
        throw error;
      }
    },

    saveChantier() {
      /**
       * Saves the chantier (project) by sending HTTP requests to create nomenclature, chantier, and image_sortie.
       *
       * Steps:
       * 1. Retrieves the user_id from the session storage.
       * 2. Finds the annotateur and reviewer based on their usernames.
       * 3. Checks if the clicked flag is true or if annotateur or reviewer is not selected. If so, returns without performing any action.
       * 4. Sets the clicked flag to true.
       * 5. Creates a project object with the selected layers.
       * 6. Sends a POST request to create the nomenclature.
       * 7. Retrieves the nomenclatureId from the response.
       * 8. Sends a POST request to create the chantier.
       * 9. For each layer in the project, sends a POST request to create an image_sortie.
       * 10. Once all the axios requests are completed, changes the route to "labellisation" with the chantier id as a parameter.
       * 11. Handles any errors that occur during the process.
       */
      const user_id = sessionStorage.getItem("user_id");
      const annotateur = this.users.find(
        (user) => user.username === this.labelliser
      );
      const reviewer = this.users.find((user) => user.username === this.review);

      if (this.clicked || !annotateur || !reviewer) {
        return; // Si oui, ne rien faire ou si les utilisateurs ne sont pas sélectionnés
      }

      // Marquer le clic comme effectué

      this.clicked = true;

      let project = {
        layers: Object.keys(this.selectedLayers),
      };

      axios
        .post("http://localhost:5000/gestion/nomenclature", {
          nom: this.nomenclature,
          champs: this.fields,
        })
        .then((response) => {
          console.log("Nomenclature créée");
          const nomenclatureId = response.data.id;

          axios
            .post("http://localhost:5000/data/chantier", {
              name: this.nomChantier,
              nomenclature: nomenclatureId,
              nbr_image: project.layers.length,
              stac_url: this.url,
              createur: user_id,
              annotateur: annotateur.id,
              reviewer: reviewer.id,
              message: "",
            })
            .then((response) => {
              // Enregistrez chaque couche comme une image_sortie
              let promises = project.layers.map((layer) => {
                return axios.post("http://localhost:5000/data/image_sortie", {
                  name: layer,
                  id_chantier: response.data.id,
                  current_patch: [0, 0],
                });
              });

              // Une fois que toutes les requêtes axios sont terminées, changez de route
              axios.all(promises).then(() => {
                this.$router.push({
                  name: "labellisation",
                  params: { id: response.data.id },
                });
              });
            });
        })
        .catch((error) => {
          console.error(
            "Erreur lors de la création de la nomenclature :",
            error
          );
        });
    },
  },
  components: {
    FolderComponent,
  },
};
</script>

<style>
.save-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 85vw;
  height: 75vh;
  max-height: 75vh;
  /* Hauteur maximale */
  overflow-y: auto;
  background-color: white;
  border: solid black 1px;
  opacity: 0;
}

.save-container form {
  width: 100%;
  height: 100%;
  display: grid;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.stac-container {
  position: absolute;
  left: 0;
  top: 5vh;
  width: 25%;
  height: 95vh;
  overflow: auto;
  border-right: 1px solid #ccc;

  overflow-y: auto;
  z-index: 10;
}

li {
  text-align: left;
}

.scrollable {
  height: 80%;
  overflow-y: auto;
}

#nomenclature-container {
  display: flex;
  flex-direction: column;
}

#nomenclature {
  display: flex;
  align-items: center;
}

#nomenclature form {
  display: flex;
  align-items: center;
}
</style>

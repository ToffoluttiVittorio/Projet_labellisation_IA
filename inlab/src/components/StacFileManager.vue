<template>
  <div class="stac-container">
    <h2>STAC File Manager</h2>
    <form @submit.prevent="loadStac">
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
                  <th>Enlever</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(field, index) in fields" :key="index">
                  <td>{{ index + 1 }}</td>
                  <td :style="{ backgroundColor: field[1] }">{{ field[0] }}</td>
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
    async toggleFolder(folder) {
      if (!folder.opened) {
        for (let file of folder.files) {
          await this.createStacLayer(file, folder);
        }
        folder.opened = true;
      }
    },
    removeField(index) {
      this.fields.splice(index, 1);
    },
    getNomenclaturesAndStyles() {
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
      const saveContainer = document.querySelector(".save-container");
      if (saveContainer) {
        saveContainer.style.zIndex = 100;
        saveContainer.style.opacity = 1;
      }
    },
    loadFiles(file, folder) {
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
      return containsCoordinate(extent, coordinate);
    },
    async createStacLayer(file, folder) {
      let panAssetHref = await this.getPanAssetHref(file.href);
      let stac = new STACLayer({ url: file.href });
      stac.boundsStyle_.stroke_.color_ = "#3399CC";
      this.layers[panAssetHref] = stac;
      this.map.map.addLayer(stac);
      stac.on("sourceready", () => {
        this.map.map.on("click", (event) => {
          if (this.intersectsCoordinate(stac.getExtent(), event.coordinate)) {
            this.selectStacLayer(stac, folder);
          }
        });
      });
    },
    async removeStacLayer(file) {
      let panAssetHref = await this.getPanAssetHref(file.href);
      let stac = this.layers[panAssetHref];
      if (stac) {
        this.map.map.removeLayer(stac);
        delete this.layers[panAssetHref];
      }
    },

    async selectStacLayer(stac, folder) {
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

    async getPanAssetHref(url) {
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

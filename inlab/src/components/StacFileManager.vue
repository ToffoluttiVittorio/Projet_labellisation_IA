<template>
  <div>
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
            @toggle="toggleFolder"
            @updateMap="updateMap"
          />
        </template>
      </ul>
    </div>
    <button @click="saveProject">Enregistrer le chantier</button>
  </div>
</template>

<style>
li {
  text-align: left;
}
.scrollable {
  height: 80%;
  overflow-y: auto;
}
</style>

<script>
import * as STAC from "./stac.js";
import STACLayer from "ol-stac";
import axios from "axios";
import { pan } from "ol/interaction/Interaction";
import FolderComponent from "./FolderComponent.vue";

export default {
  inject: ["map"],
  data() {
    return {
      clicked: false,
      folders: [],
      url: "https://canada-spot-ortho.s3.amazonaws.com/catalog.json",
      layers: {},
    };
  },
  created() {},
  methods: {
    toggleFolder(folder) {
      folder.open = !folder.open;
    },
    loadFiles(elem, folder) {
      try {
        folder.files.push({
          href: elem.href,
          checked: false,
        });
        // this.createStacLayer(elem);
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
          open: false,
          subfolders: [],
        };
        parentFolder.subfolders.push(folder);
        let children = rootNode.entry.links.filter(
          (link) => link.rel === "item" || link.rel === "child"
        );
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
          open: false,
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
        console.log("fin");
        console.log(this.folders);
      } catch (error) {
        console.error("Error loading STAC:", error);
      }
    },
    async updateMap(file) {
      let panAssetHref = await this.getPanAssetHref(file.href);
      if (file.checked) {
        let stac = new STACLayer({ url: file.href });
        this.layers[panAssetHref] = stac;
        this.map.map.addLayer(stac);
        stac.on("sourceready", () => {
          this.map.map.getView().fit(stac.getExtent());
        });
      } else {
        let stac = this.layers[panAssetHref];
        if (stac) {
          this.map.map.removeLayer(stac);
          delete this.layers[panAssetHref];
        }
      }
    },
    async createStacLayer(file) {
      let stac = new STACLayer({ url: file.href });
      this.map.map.addLayer(stac);
      stac.on("sourceready", () => {
        this.map.map.getView().fit(stac.getExtent());
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

    saveProject() {
      if (this.clicked) {
        return; // Si oui, ne rien faire
      }
      // Marquer le clic comme effectué
      this.clicked = true;

      let project = {
        layers: Object.keys(this.layers),
      };
      console.log(project);

      // Enregistrez le chantier
      axios
        .post("http://localhost:5000/data/chantier", {
          id_style: 1, // Remplacez par l'ID de style approprié
          code: 1, // Remplacez par le code approprié
          name: "La frod", // nom du chantier
          nbr_image: project.layers.length,
          stac_url: this.url,
          user_key: 1, // id du user
        })
        .then((response) => {
          // Enregistrez chaque couche comme une image_sortie
          let promises = project.layers.map((layer) => {
            return axios.post("http://localhost:5000/data/image_sortie", {
              name: layer, // Utilisez le nom de la couche comme nom de l'image_sortie
              id_chantier: response.data.id, // Utilisez l'ID du chantier que nous venons de créer
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
    },
  },
  components: {
    FolderComponent,
  },
};
</script>

<template>
  <div>
    <h2>STAC File Manager</h2>

    <form @submit.prevent="loadFiles">
      <input type="text" v-model="url" placeholder="Enter URL" />
      <button type="submit">Enter</button>
    </form>
    <div class="scrollable">
      <ul>
        <li v-for="file in files" :key="file.url">
          {{ file.href }}
          <input
            type="checkbox"
            v-model="file.checked"
            @change="updateMap(file)"
          />
        </li>
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

export default {
  inject: ["map"],
  data() {
    return {
      clicked: false,
      files: [],
      url: "https://canada-spot-ortho.s3.amazonaws.com/canada_spot_orthoimages/canada_spot4_orthoimages/S4_2006/catalog.json",
      layers: {},
    };
  },
  created() {},
  methods: {
    loadFiles() {
      let index = new STAC.Index();
      index.initialize(this.url);
      const rootNode = index.getRootNode();
      console.log(rootNode.entry.links);
      this.files = rootNode.entry.links;
    },
    updateMap(file) {
      if (file.checked) {
        // Add a stacLayer to the map for this file
        // console.log(file.href);
        let stac = new STACLayer({
          url: file.href,
        });

        let panAssetHref = "";

        fetch(file.href)
          .then((response) => response.json())
          .then((data) => {
            let assets = data.assets;
            panAssetHref = assets.pan
              ? assets.pan.href
              : Object.values(assets)[0].href;
            this.layers[panAssetHref] = stac;
          })
          .catch((error) => console.error("Error:", error));

        this.map.map.addLayer(stac);

        stac.on("sourceready", () => {
          this.map.map.getView().fit(stac.getExtent());
        });
      } else {
        let stac = this.layers[panAssetHref]; // Retrieve the layer
        if (stac) {
          this.map.map.removeLayer(stac);
          delete this.layers[panAssetHref]; // Remove the layer from the layers object
        }
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
};
</script>

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
import * as stac from "./stac.js";
import STACLayer from "ol-stac";
import axios from "axios";

export default {
  inject: ["map"],
  data() {
    return {
      files: [],
      url: "https://canada-spot-ortho.s3.amazonaws.com/canada_spot_orthoimages/canada_spot4_orthoimages/S4_2006/catalog.json",
      layers: {},
    };
  },
  created() {},
  methods: {
    loadFiles() {
      let index = new stac.Index();
      index.initialize(this.url);
      const rootNode = index.getRootNode();
      // console.log(rootNode.entry.links);
      this.files = rootNode.entry.links;
    },
    updateMap(file) {
      if (file.checked) {
        // Add a stacLayer to the map for this file
        // console.log(file.href);
        let stac = new STACLayer({
          url: file.href,
        });
        console.log(stac);
        this.layers[file.href] = stac;
        this.map.map.addLayer(stac);

        stac.on("sourceready", () => {
          this.map.map.getView().fit(stac.getExtent());
        });
      } else {
        let stac = this.layers[file.href]; // Retrieve the layer
        if (stac) {
          this.map.map.removeLayer(stac);
          delete this.layers[file.href]; // Remove the layer from the layers object
        }
      }
    },
    saveProject() {
      let project = {
        layers: Object.keys(this.layers),
      };
      console.log(project);

      // Enregistrez le chantier
      axios
        .post("http://localhost:5000/data/chantier", {
          id_style: 1, // Remplacez par l'ID de style approprié
          code: 1, // Remplacez par le code approprié
          nbr_image: project.layers.length,
          stac_url: this.url,
        })
        .then((response) => {
          // Enregistrez chaque couche comme une image_sortie
          project.layers.forEach((layer) => {
            axios.post("http://localhost:5000/data/image_sortie", {
              name: layer, // Utilisez le nom de la couche comme nom de l'image_sortie
              data: {}, // Remplacez par les données appropriées
              id_chantier: response.data.id, // Utilisez l'ID du chantier que nous venons de créer
            });
          });
        });
    },
  },
};
</script>

<template>
  <div class="stac-container">
    <h2>STAC File Manager</h2>
    <form @submit.prevent="loadFiles">
      <input type="text" v-model="url" placeholder="Enter URL" />
      <button type="submit">Enter</button>
    </form>
    <div class="scrollable">
      <ul>
        <li v-for="file in files" :key="file.url">
          {{ file.href }}
          <input type="checkbox" v-model="file.checked" @change="updateMap(file)" />
        </li>
      </ul>
    </div>
    <button @click="saveProject">Enregistrer le chantier</button>
  </div>

  <div class="save-container">
    <form @submit.prevent="saveChantier">
      <div class="form-group">
        <label for="nomChantier">Nom du chantier : </label>
        <input type="text" id="nomChantier" v-model="nomChantier">
      </div>
      <div class="form-group">
        <label for="labelliser">À annoter par : </label>
        <select id="labelliser" v-model="labelliser">
          <option value="">Sélectionner un utilisateur</option>
          <option v-for="user in users" :key="user.id" :value="user.username">{{ user.username }}</option>
        </select>
      </div>
      <div class="form-group">
        <label for="review">À review par : </label>
        <select id="review" v-model="review">
          <option value="">Sélectionner un utilisateur</option>
          <option v-for="user in users" :key="user.id" :value="user.username">{{ user.username }}</option>
        </select>
      </div>
      <div id="nomenclature-container" class="form-group">
        <label for="nomenclature">Nomenclature:</label>
        <input type="text" id="nomenclature" v-model="nomenclature">

        <div id="nomenclature">
          <div id="nomenclature-select">
            <label for="nomenclature">Sélectionnez une nomenclature existante :</label>
            <select id="nomenclature" @change="getStyles">
              <option value="" disabled selected>Choisissez une nomenclature</option>
              <option v-for="nomenclature in nomenclatures" :value="nomenclature.id">{{ nomenclature.nom }}</option>
            </select>
          </div>
          <form @submit.prevent="handleCreaNomSubmit">
            <label for="textContent">Créer un champs :</label>
            <input type="text" id="textContent" name="textContent" v-model="textContent">
            <label for="buttonColor">Couleur:</label>
            <input type="color" id="buttonColor" name="buttonColor" v-model="buttonColor">
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
                  <td><button @click="removeField(index)">Supprimer</button> </td>
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

export default {
  inject: ["map"],
  data() {
    return {
      clicked: false,
      files: [],
      url: "https://canada-spot-ortho.s3.amazonaws.com/canada_spot_orthoimages/canada_spot4_orthoimages/S4_2006/catalog.json",
      layers: {},
      users: [],
      labelliser: "",
      review: "",
      nomChantier: "",
      nomenclature: "",
      fields: [],
      textContent: '',
      buttonColor: '',
      nomenclatures: [],
      selectedNomenclatureId: null,
    };
  },
  mounted() {
    this.fetchUsers();
    this.getNomenclaturesAndStyles();
  },
  methods: {

    removeField(index) {
      this.fields.splice(index, 1);
    },

    getNomenclaturesAndStyles() {
      axios.get('http://localhost:5000/gestion/nomenclatures')
        .then(response => {
          this.nomenclatures = response.data;
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des nomenclatures et des styles :', error);
        });
    },
    getStyles(event) {
      const selectedNomenclatureId = event.target.value;
      const selectedNomenclature = this.nomenclatures.find(nomenclature => nomenclature.id === parseInt(selectedNomenclatureId));
      if (selectedNomenclature) {
        this.fields = selectedNomenclature.styles.map(style => [style.nom, style.couleur]);
      } else {
        this.fields = [];
      }
    },

    handleCreaNomSubmit() {
      if (this.textContent == '' && this.buttonColor == '') {
        return
      }
      this.fields.push([this.textContent, this.buttonColor]);
      this.textContent = '';
      this.buttonColor = '';
    },

    fetchUsers() {
      axios.get('http://localhost:5000/data/user/getUser')
        .then(response => {
          this.users = response.data.users;
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des utilisateurs :', error);
        });
    },
    saveProject() {
      const saveContainer = document.querySelector('.save-container');
      if (saveContainer) {
        saveContainer.style.zIndex = 100;
        saveContainer.style.opacity = 1;
      }
    },
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
    saveChantier() {
      const user_id = sessionStorage.getItem('user_id');
      const annotateur = this.users.find(user => user.username === this.labelliser);
      const reviewer = this.users.find(user => user.username === this.review);

      if (this.clicked || !annotateur || !reviewer) {
        return; // Si oui, ne rien faire ou si les utilisateurs ne sont pas sélectionnés
      }

      // Marquer le clic comme effectué
      this.clicked = true;

      let project = {
        layers: Object.keys(this.layers),
      };

      axios.post('http://localhost:5000/gestion/nomenclature', {
        nom: this.nomenclature,
        champs: this.fields
      })
        .then(response => {
          console.log('Nomenclature créée');
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
              message: ''
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
        .catch(error => {
          console.error('Erreur lors de la création de la nomenclature :', error);
        });

    },
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

.save-container form div,
.save-container form button {}

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

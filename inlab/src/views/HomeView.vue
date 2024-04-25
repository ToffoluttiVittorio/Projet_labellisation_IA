<template>
  <div id="homeview-container">
    <button @click="logout">Déconnexion</button>
    <div id="mesChantiers">
      <h2>Mes chantiers</h2>
      <div class="scroll-container">
        <div class="chantiers-container" ref="chantiersContainer">
          <div
            v-for="(chantier, index) in chantiers"
            :key="index"
            class="chantier-card"
            :id="chantier.id"
            @click="redirectToLabellisation(chantier.id)"
          >
            <span>{{ chantier.name }}</span>
            <button
              class="btnCancelChantier"
              @click="deleteChantier(chantier.id)"
            >
              X
            </button>
            <button
              class="btnInfo info-button"
              @click="Open_info(chantier.id, $event)"
            >
              Informations
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="open_info">
      <div class="informations"></div>
      <button class="btnRetour" @click="hideInfo">Retour</button>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "HomeView",
  data() {
    return {
      chantiers: [],
      cardWidth: 200,
      scrollStep: 200,
    };
  },
  mounted() {
    this.fetchChantiers();
  },
  methods: {
    fetchChantiers() {
      const username = sessionStorage.getItem("username");
      axios
        .get("http://localhost:5000/data/user/getChantier", {
          params: {
            username: username,
          },
        })
        .then((response) => {
          console.log(response.data);
          this.chantiers = response.data.chantier;
        })
        .catch((error) => {
          console.error(
            "Erreur lors de la récupération des chantiers :",
            error
          );
        });
    },

    async deleteChantier(chantierId) {
      event.stopPropagation();
      await axios
        .delete("http://localhost:5000/data/chantier/delete", {
          params: {
            id: chantierId,
          },
        })
        .then((response) => {
          console.log(response.data.message);
          this.fetchChantiers();
        })
        .catch((error) => {
          console.error("Erreur lors de la suppression du chantier :", error);
        });
    },

    Open_info(chantierId, event) {
      event.stopPropagation(); // Empêche la propagation de l'événement de clic

      // Effectuer une requête Axios pour récupérer les informations sur le chantier
      axios
        .get(
          `http://localhost:5000/data/chantier/getChantierInfo?id=${chantierId}`
        )
        .then((response) => {
          // Vérifier si la réponse contient des données sur le chantier
          if (response.data.chantier) {
            // Récupérer les données du chantier depuis la réponse
            const chantier = response.data.chantier;

            // Déclarer une fonction pour obtenir le nom d'un utilisateur
            const getUserName = (userId) => {
              return axios
                .get(`http://localhost:5000/data/user/getUserName?id=${userId}`)
                .then((res) => res.data.user_name)
                .catch((error) =>
                  console.error(
                    "Erreur lors de la récupération du nom d'utilisateur :",
                    error
                  )
                );
            };
            // Effectuer les requêtes pour obtenir les noms
            Promise.all([
              getUserName(chantier.createur),
              getUserName(chantier.annotateur),
              getUserName(chantier.reviewer),
            ]).then(([createurName, annotateurName, reviewerName]) => {
              // Mettre à jour les informations dans la div qui apparaît
              const openinfo = document.querySelector(
                ".open_info .informations"
              );
              if (openinfo) {
                // Remplacer le contenu HTML avec les informations du chantier, incluant les noms d'utilisateurs
                openinfo.innerHTML = `
                            <h3>${chantier.name}</h3>
                            <p>ID: ${chantier.id}</p>
                            <p>Nom: ${chantier.name}</p>
                            <p>Nomenclature: ${chantier.nomenclature}</p>
                            <p>Nombre d'images: ${chantier.nbr_image}</p>
                            <p>URL STAC: ${
                              chantier.stac_url ? chantier.stac_url : ""
                            }</p>
                            <p>Créateur: ${createurName}</p>
                            <p>Annotateur: ${annotateurName}</p>
                            <p>Reviewer: ${reviewerName}</p>
                            <p>Message de révision: ${
                              chantier.message ? chantier.message : ""
                            }</p>
                        `;

                // Afficher la div qui apparaît
                openinfo.parentElement.style.zIndex = 100;
                openinfo.parentElement.style.opacity = 1;
              }
            });
          } else {
            console.error(
              "Erreur: Aucune donnée sur le chantier n'a été récupérée."
            );
          }
        })
        .catch((error) => {
          console.error(
            "Erreur lors de la récupération des informations sur le chantier :",
            error
          );
        });
    },

    hideInfo() {
      // Méthode pour masquer la div d'informations
      const openinfo = document.querySelector(".open_info");
      if (openinfo) {
        openinfo.style.zIndex = 0;
        openinfo.style.opacity = 0;
      }
    },

    redirectToLabellisation(idChantier) {
      this.$router.push(`/labellisation/${idChantier}`);
    },

    logout() {
      sessionStorage.clear();
      this.$router.push(`/login`);
    },
  },
};
</script>

<style scoped>
#homeview-container {
  position: absolute;
  top: 5vh;
  left: 0;
  width: 100vw;
  height: 95vh;
}

#mesChantiers {
  position: relative;
  width: 90%;
  padding: 0 20px;
  top: 0%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.scroll-container {
  overflow-x: auto;
  white-space: nowrap;
}

.chantiers-container {
  display: inline-block;
}

.chantier-card {
  position: relative; /* Permet de positionner les boutons de manière relative à ce conteneur */
  width: 200px;
  height: 150px;
  background-color: #f0f0f0;
  border-radius: 10px;
  margin-right: 10px;
  display: inline-block;
}

.btnCancelChantier {
  background-color: aqua;
  color: white;
  border: 0;
}

/* Style pour le bouton "Informations" */
.btnInfo {
  position: absolute;
  bottom: 10px; /* Alignement au bas */
  left: 50%; /* Centrage horizontal */
  transform: translateX(-50%); /* Ajustement pour centrer exactement */
  background-color: rgb(64, 64, 91);
  color: white;
  border: none;
  border-radius: 5px; /* Ajout des bords arrondis */
  padding: 8px 16px; /* Ajout de rembourrage pour une meilleure apparence */
  cursor: pointer;
  z-index: 20;
}

.open_info {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80vw;
  height: 78vh;
  max-height: 78vh;
  overflow-y: auto;
  background-color: rgb(64, 64, 91);
  color: white;
  border: solid black 5px;
  border-radius: 8px; /* Ajout des bords arrondis */
  padding: 8px 16px; /* Ajout de rembourrage pour une meilleure apparence */
  opacity: 0;
  z-index: 0;
}
</style>

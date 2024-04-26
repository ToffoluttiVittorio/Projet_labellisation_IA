<template>
    <div id="homeview-container">
        <button @click="logout">Déconnexion</button>
        <div id="mesChantiers">
            <h2>Mes chantiers crées</h2>
            <div class="scroll-container">
                <div class="chantiers-container" ref="chantiersContainer">
                    <div v-for="(chantier, index) in chantiersCreateur" :key="index" class="chantier-card"
                        :id="chantier.id">
                        <span>{{ chantier.name }}</span>
                        <button class="btnCancelChantier" @click="deleteChantier(chantier.id)">
                            X
                        </button>
                        <button class="btnInfo info-button" @click="Open_info(chantier.id, $event)">
                            Informations
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div id="chantiersAnnote">
            <h2>Les chantiers à annotés</h2>
            <div class="scroll-container">
                <div class="chantiers-container" ref="chantiersContainer">
                    <div v-for="(chantier, index) in chantiersAnnotateur" :key="index" class="chantier-card"
                        :id="chantier.id" @click="redirectToLabellisation(chantier.id)">
                        <span>{{ chantier.name }}</span>
                        <button class="btnInfo info-button" @click="Open_info(chantier.id, $event)">
                            Informations
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div id="chantiersReview">
            <h2>Les chantiers à review</h2>
            <div class="scroll-container">
                <div class="chantiers-container" ref="chantiersContainer">
                    <div v-for="(chantier, index) in chantiersReviewer" :key="index" class="chantier-card"
                        :id="chantier.id" @click="redirectToReview(chantier.id)">
                        <span>{{ chantier.name }}</span>
                        <button class="btnInfo info-button" @click="Open_info(chantier.id, $event)">
                            Informations
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="open_info">
            <div class="informations"></div>
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
                            <td>{{
                                field[0] }}</td>
                            <td :style="{ backgroundColor: field[1] }"> </td>
                        </tr>
                    </tbody>
                </table>
            </div>
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
            chantiersCreateur: [],
            chantiersAnnotateur: [],
            chantiersReviewer: [],
            cardWidth: 200,
            scrollStep: 200,
            fields: [],
        };
    },
    mounted() {
        this.fetchChantiers();
    },
    methods: {
        async fetchChantiers() {
            try {
                const username = sessionStorage.getItem("username");

                const responseCreateur = await axios.get(
                    `http://localhost:5000/data/user/getChantier/createur/${username}`
                );
                this.chantiersCreateur = responseCreateur.data.chantier;

                const responseAnnotateur = await axios.get(
                    `http://localhost:5000/data/user/getChantier/annotateur/${username}`
                );
                this.chantiersAnnotateur = responseAnnotateur.data.chantier;
                const responseReviewer = await axios.get(
                    `http://localhost:5000/data/user/getChantier/reviewer/${username}`
                );
                this.chantiersReviewer = responseReviewer.data.chantier;
            } catch (error) {
                console.error("Erreur lors de la récupération des chantiers :", error);
            }
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

        async fetchStylesByNomenclature(nomenclatureId) {
            try {
                const response = await axios.get(
                    `http://localhost:5000/gestion/nomenclature/${nomenclatureId}/styles`
                );
                console.log("Styles de la nomenclature:", response.data.styles);
                this.fields = response.data.styles.map((style) => [
                    style.nom,
                    style.couleur,
                ]);
            } catch (error) {
                console.error(
                    "Erreur lors de la récupération des styles de la nomenclature:",
                    error
                );
            }
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
                            this.fetchStylesByNomenclature(chantier.nomenclature);
                            console.log(chantier.id);
                            if (openinfo) {
                                // Remplacer le contenu HTML avec les informations du chantier, incluant les noms d'utilisateurs
                                openinfo.innerHTML = `
                            <h3>${chantier.name}</h3>
                            <p>ID: ${chantier.id}</p>
                            <p>Nom: ${chantier.name}</p>
                            <p>Nombre d'images: ${chantier.nbr_image}</p>
                            <p>URL STAC: ${chantier.stac_url ? chantier.stac_url : ""
                                    }</p>
                            <p>Créateur: ${createurName}</p>
                            <p>Annotateur: ${annotateurName}</p>
                            <p>Reviewer: ${reviewerName}</p>
                            <p>Message de révision: ${chantier.message ? chantier.message : ""
                                    }</p>
                            <p>Nomenclature: ${chantier.nomenclature}</p>
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
        redirectToReview(idChantier) {
            this.$router.push(`/review/${idChantier}`);
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

#chantiersAnnote {
    position: relative;
    z-index: 10;
}

#chantiersReview {
    position: relative;
    z-index: 10;
}

.scroll-container {
    overflow-x: auto;
    white-space: nowrap;
}

.chantiers-container {
    display: flex;
    justify-content: center;
}

.chantier-card {
    position: relative;
    display: inline-block;
    width: 200px;
    height: 150px;
    background-color: #f0f0f0;
    border-radius: 10px;
    margin-right: 10px;
}

.scroll-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    background-color: #ccc;
    border: none;
    color: #fff;
    font-size: 24px;
    cursor: pointer;
}

.btnCancelChantier {
    background-color: aqua;
    color: white;
    border: 0;
}

.btnInfo {
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgb(64, 64, 91);
    color: white;
    border: none;
    border-radius: 5px;
    padding: 8px 16px;
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
    border-radius: 8px;
    padding: 8px 16px;
    opacity: 0;
    z-index: 0;
}
</style>

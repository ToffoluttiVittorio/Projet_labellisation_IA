<template>
    <div id="homeview-container">
        <button @click="logout">Déconnexion</button>
        <div id="mesChantiers">
            <h2>Mes chantiers crées</h2>
            <div class="scroll-container">
                <div class="chantiers-container" ref="chantiersContainer">
                    <div v-for="(chantier, index) in chantiersCreateur" :key="index" class="chantier-card"
                        :id="chantier.id" @click="redirectToLabellisation(chantier.id)">
                        <span>{{ chantier.name }}</span>
                        <button class="btnCancelChantier" @click="deleteChantier(chantier.id)">X</button>
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
                        <button class="btnCancelChantier" @click="deleteChantier(chantier.id)">X</button>
                    </div>
                </div>
            </div>
        </div>
        <div id="chantiersReview">
            <h2>Les chantiers à review</h2>
            <div class="scroll-container">
                <div class="chantiers-container" ref="chantiersContainer">
                    <div v-for="(chantier, index) in chantiersReviewer" :key="index" class="chantier-card"
                        :id="chantier.id" @click="redirectToLabellisation(chantier.id)">
                        <span>{{ chantier.name }}</span>
                        <button class="btnCancelChantier" @click="deleteChantier(chantier.id)">X</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import axios from 'axios';

export default {
    name: 'HomeView',
    data() {
        return {
            user_id: null,
            chantiersCreateur: [],
            chantiersAnnotateur: [],
            chantiersReviewer: [],
            cardWidth: 200,
            scrollStep: 200
        };
    },
    mounted() {
        this.fetchChantiers();
    },
    methods: {

        async fetchChantiers() {
            try {
                const username = sessionStorage.getItem('username');

                const responseCreateur = await axios.get(`http://localhost:5000/data/user/getChantier/createur/${username}`);
                this.chantiersCreateur = responseCreateur.data.chantier;

                const responseAnnotateur = await axios.get(`http://localhost:5000/data/user/getChantier/annotateur/${username}`);
                this.chantiersAnnotateur = responseAnnotateur.data.chantier;
                const responseReviewer = await axios.get(`http://localhost:5000/data/user/getChantier/reviewer/${username}`);
                this.chantiersReviewer = responseReviewer.data.chantier;

            } catch (error) {
                console.error('Erreur lors de la récupération des chantiers :', error);
            }
        },


        async deleteChantier(chantierId) {
            event.stopPropagation();
            await axios.delete('http://localhost:5000/data/chantier/delete', {
                params: {
                    id: chantierId
                }
            })
                .then(response => {
                    console.log(response.data.message);
                    this.fetchChantiers();
                })
                .catch(error => {
                    console.error('Erreur lors de la suppression du chantier :', error);
                });
        },

        redirectToLabellisation(idChantier) {
            this.$router.push(`/labellisation/${idChantier}`);
        },
        logout() {
            sessionStorage.clear();
            this.$router.push(`/login`);
        }
    }
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
</style>

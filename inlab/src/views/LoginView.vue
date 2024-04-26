<template>
    <div class="login-container">
        <h2 v-if="loginMode">Connexion</h2>
        <h2 v-else>Inscription</h2>

        <form @submit.prevent="loginMode ? login() : signup()">
            <div class="form-group">
                <label for="username">Nom d'utilisateur:</label>
                <input type="text" id="username" v-model="username" required>
            </div>
            <div class="form-group">
                <label for="password">Mot de passe:</label>
                <input type="password" id="password" v-model="password" required>
            </div>
            <button type="submit">{{ loginMode ? 'Se connecter' : 'Créer un compte' }}</button>
        </form>

        <p>{{ loginMode ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?" }} <a href="#"
                @click="toggleMode">{{ loginMode ? 'Créer un compte' : 'Se connecter' }}</a></p>
    </div>
</template>

<script>
import axios from 'axios';

export default {
    name: 'LoginView',
    data() {
        return {
            loginMode: true,
            username: '',
            password: ''
        };
    },
    methods: {
        login() {
            const userData = {
                username: this.username,
                password: this.password
            };

            axios.post('http://localhost:5000/data/user/login', userData)
                .then(response => {
                    console.log(response.data);
                    sessionStorage.setItem('username', this.username);
                    // Ajouter l'ID de l'utilisateur à la session
                    axios.get('http://localhost:5000/data/user/getUserId', {
                        params: {
                            username: this.username
                        }
                    })
                        .then(response => {
                            const userId = response.data.user_id;
                            sessionStorage.setItem('user_id', userId);
                            this.$router.push('/');
                        })
                        .catch(error => {
                            console.error('Erreur lors de la récupération de l\'ID de l\'utilisateur :', error);
                        });
                })
                .catch(error => {
                    console.error('Erreur lors de la connexion :', error);
                });
        },

        signup() {
            axios.post('http://localhost:5000/data/user/createUser', {
                username: this.username,
                password: this.password
            })
                .then(response => {
                    console.log(response.data.message);
                    sessionStorage.setItem('username', this.username);

                    axios.get('http://localhost:5000/data/user/getUserId', {
                        params: {
                            username: this.username
                        }
                    })
                        .then(response => {
                            const userId = response.data.user_id;
                            sessionStorage.setItem('user_id', userId);
                            this.$router.push('/');
                        })
                        .catch(error => {
                            console.error('Erreur lors de la récupération de l\'ID de l\'utilisateur :', error);
                        });
                })
                .catch(error => {
                    console.error('Erreur lors de l\'inscription :', error.response.data.message);
                });
        },

        toggleMode() {
            this.loginMode = !this.loginMode;
            this.username = '';
            this.password = '';
        }
    }
};
</script>


<style scoped>
.login-container {

    position: absolute;
    left: 50%;
    top: 5vh;
    transform: translateX(-50%);

    width: 50%;
    margin: auto;
}

.form-group {
    margin-bottom: 20px;
}

label {
    display: block;
}

input[type="text"],
input[type="password"] {
    width: 100%;
    padding: 10px;
    font-size: 16px;
}

button {
    padding: 10px 20px;
    font-size: 16px;
    cursor: pointer;
}

a {
    color: blue;
    text-decoration: underline;
    cursor: pointer;
}
</style>
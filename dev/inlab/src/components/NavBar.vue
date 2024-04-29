<template>
  <nav class="navbar">
    <router-link to="/" class="link">Accueil</router-link>
    <router-link to="/map" class="link">Carte</router-link>
    <router-link to="/login" class="auth-link">Login</router-link>
  </nav>
</template>

<script>
export default {
  name: "NavBar",
};
</script>

<style scoped>
.navbar {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 5vh;

  background-color: black;
  color: #fff;

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.link {
  margin: 0 20px;
  font-size: 1.5vw;

  font-family: system-ui;
  color: #fff;
  text-decoration: none;
}

.auth-link {
  margin: 0 20px;
  font-size: 1.5vw;
  font-family: system-ui;
  color: #fff;
  text-decoration: none;
}

@media (max-width: 800px) {
  .link {
    font-size: 3vw;
  }
}
</style>

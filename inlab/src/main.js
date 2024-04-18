import { createApp } from "vue";
import App from "./App.vue";
import router from './router'

import OpenLayersMap from "vue3-openlayers";
import "vue3-openlayers/styles.css";

const app = createApp(App);
app.use(router)
app.use(OpenLayersMap /* options */);

app.mount("#app");
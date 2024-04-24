import { createRouter, createWebHistory } from "vue-router";

import MapView from "../views/MapView.vue";
import HomeView from "../views/HomeView.vue";
import LabellisationView from "../views/LabellisationView.vue";
import PatchView from "../views/PatchView.vue";
import LoginView from "../views/LoginView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/map",
      name: "map",
      component: MapView,
    },
    {
      path: "/patch",
      name: "patch",
      component: PatchView,
    },
    {
      path: "/login",
      name: "login",
      component: LoginView,
    },
    {
      path: "/labellisation/:id",
      name: "labellisation",
      component: LabellisationView,
      props: true,
    }
  ],
});

export default router;

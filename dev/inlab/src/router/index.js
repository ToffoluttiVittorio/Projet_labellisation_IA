import { createRouter, createWebHistory } from "vue-router";

import ReviewView from "../views/ReviewView.vue";
import MapView from "../views/MapView.vue";
import HomeView from "../views/HomeView.vue";
import LabellisationView from "../views/LabellisationView.vue";
import LoginView from "../views/LoginView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/review/:id",
      name: "review",
      props: true,
      component: ReviewView,
    },
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
      path: "/login",
      name: "login",
      component: LoginView,
    },
    {
      path: "/labellisation/:id",
      name: "labellisation",
      component: LabellisationView,
      props: true,
    },
  ],
});

router.beforeEach((to, from, next) => {
  const isAuthenticated = sessionStorage.getItem('username');
  if (!isAuthenticated && to.path !== '/login') {
    next('/login');
  } else {
    next();
  }
});

export default router;

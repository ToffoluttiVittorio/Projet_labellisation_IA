import { createRouter, createWebHistory } from 'vue-router'

import MapView from '../views/MapView.vue'
import HomeView from '../views/HomeView.vue'
import LabellisationView from '../views/LabellisationView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView
        },
        {
            path: '/map',
            name: 'map',
            component: MapView
        }
        ,
        {
            path: '/labellisation',
            name: 'labellisation',
            component: LabellisationView
        }
    ]
})

export default router
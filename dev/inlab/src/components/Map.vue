<template>
  <div class="container">
    <stac-file-manager class="stacReader" />
    <div id="map"></div>
  </div>
</template>

<style scoped>
#map {
  position: absolute;
  top: 5vh;
  left: 25vw;
  width: 75vw;
  height: 95vh;
}
</style>

<script>
import { Map, View } from "ol";
import { Tile as TileLayer } from "ol/layer";
import { OSM } from "ol/source";
import STACLayer from "ol-stac";
import proj4 from "proj4";
import { register } from "ol/proj/proj4.js";
import StacFileManager from "../components/StacFileManager.vue";

register(proj4);

export default {
  components: {
    StacFileManager,
  },
  data() {
    return {
      map: null,
    };
  },
  provide() {
    return {
      map: this.$data, // Provide the entire data object
    };
  },
  name: "Map",
  mounted() {
    const stac = new STACLayer({
      // url: "https://s3.us-west-2.amazonaws.com/sentinel-cogs/sentinel-s2-l2a-cogs/10/T/ES/2022/7/S2A_10TES_20220726_0_L2A/S2A_10TES_20220726_0_L2A.json",
      url: "http://127.0.0.1:8081/stac/D007_2020_RVB/007_2020_AA_S1_14/007_2020_AA_S1_14.json",
    });

    this.map = new Map({
      target: "map",
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        stac,
      ],
      view: new View({
        center: [0, 0],
        zoom: 2,
      }),
    });

    stac.on("sourceready", () => {
      this.map.getView().fit(stac.getExtent());
    });
  },
};
</script>

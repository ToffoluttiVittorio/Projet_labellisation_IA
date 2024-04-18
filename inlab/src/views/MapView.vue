<template>
  <div id="MapContainer">
    <Map />
  </div>
</template>

<script>
import Map from '../components/Map.vue';

export default {
  components: {
    Map
  }
};
</script>

<style>
#MapContainer {
  position: absolute;
  top: 5vh;
  left: 0;
  width: 100vw;
  height: 95vh;
}
</style>

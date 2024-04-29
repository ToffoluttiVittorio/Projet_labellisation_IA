<template>
  <p>
    <input
      type="checkbox"
      v-model="folder.checked"
      @change="toggleFolder(folder)"
    />
    <strong>{{ folder.name }}</strong>
    <ul v-if="folder.checked">
      <template v-for="subfolder in folder.subfolders" :key="subfolder.name">
        <FolderComponent
          :folder="subfolder"
          @toggleFolder="toggleFolder"
          @updateMap="updateMap"
        />
      </template>
      <p v-for="file in folder.files" :key="file.href">
        <input
          type="checkbox"
          v-model="file.checked"
          @change="updateMap(file)"
        />
        {{ file.href }}
      </p>
    </ul>
  </p>
</template>

<style scoped></style>

<script>
export default {
  props: ["folder"],
  methods: {
    toggleFolder(folder) {
      this.$emit("toggleFolder", folder);
    },
    updateMap(file) {
      this.$emit("updateMap", file);
    },
  },
};
</script>

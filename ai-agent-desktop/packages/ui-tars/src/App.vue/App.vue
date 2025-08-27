<template>
  <div class="container">
    <h1>🧠 UI-TARS Interface</h1>
    <p>Welcome, David. Ready to scan, tag, and map your Idea Atlas.</p>
    <button @click="scan">Run Scan</button>
  </div>
</template>

<script setup lang="ts">
function scan() {
  alert('Scan triggered. Agent logic coming soon.');
}
</script>

<style>
.container {
  padding: 2rem;
}
</style>
<template>
  <div v-html="renderedMarkdown" class="markdown-content"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';

const props = defineProps<{
  content: string;
}>();

// Configurar marked para usar highlight.js
marked.setOptions({
  highlight: (code, lang) => {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-',
  gfm: true,
  breaks: true,
});

const renderedMarkdown = computed(() => {
  if (!props.content) return '';
  return marked.parse(props.content) as string;
});
</script>

<style>
.markdown-content pre {
  background-color: #282c34; /* Dark background compatible with atom-one-dark */
  color: #abb2bf; /* Base text color for the dark theme */
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto; /* Horizontal scroll for long code lines */
  border: 1px solid #3a4048; /* Subtle border for the dark theme */
}

.markdown-content code {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
}

.markdown-content pre code {
  background-color: transparent;
  border: none;
  padding: 0;
}
</style>

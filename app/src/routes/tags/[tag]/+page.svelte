<script lang="ts">
  import PostGrid from '$lib/components/PostGrid.svelte';
  let { data } = $props();
</script>

<svelte:head>
  <title>#{data.tag} - etak64n's blog</title>
</svelte:head>

<h1 style="font-size:1.8rem;font-weight:800;margin:0 0 1.2rem">#{data.tag}</h1>
<PostGrid posts={data.posts} />

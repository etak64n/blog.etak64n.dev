<script lang="ts">
  import PostGrid from '$lib/components/PostGrid.svelte';
  let { data } = $props();
</script>

<svelte:head>
  <title>etak64n's blog</title>
</svelte:head>

<h1 style="font-size:1.8rem;font-weight:800;margin:0 0 1.2rem">最新記事</h1>

{#if data.posts.length === 0}
  <p
    style="color:var(--muted);text-align:center;padding:2rem;border:1px dashed var(--border);border-radius:8px"
  >
    まだ記事がありません。
  </p>
{:else}
  <PostGrid posts={data.posts} />
{/if}

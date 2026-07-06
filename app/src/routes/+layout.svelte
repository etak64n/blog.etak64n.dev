<script lang="ts">
  import '../app.css';
  let { children } = $props();

  const nav = [
    { href: '/', label: 'Home' },
    { href: '/articles/', label: 'Articles' },
    { href: '/tags/', label: 'Tags' }
  ];
</script>

<div style="min-height:100vh;display:flex;flex-direction:column">
  <header
    style="border-bottom:1px solid var(--border);background:var(--surface);position:sticky;top:0;z-index:10"
  >
    <div
      style="max-width:1100px;margin:0 auto;padding:0 1rem;height:60px;display:flex;align-items:center;justify-content:space-between"
    >
      <a href="/" style="font-weight:800;color:var(--brand);text-decoration:none;font-size:1.05rem">
        etak64n's blog
      </a>
      <nav style="display:flex;gap:1.2rem">
        {#each nav as item}
          <a href={item.href} style="color:var(--text);text-decoration:none">{item.label}</a>
        {/each}
      </nav>
    </div>
  </header>

  <main style="flex:1">
    <div style="max-width:1100px;margin:0 auto;padding:1.5rem 1rem">
      {@render children()}
    </div>
  </main>

  <footer style="border-top:1px solid var(--border);background:var(--surface)">
    <div style="max-width:1100px;margin:0 auto;padding:1.2rem 1rem;color:var(--muted);font-size:.9rem">
      &copy; 2026 etak64n
    </div>
  </footer>
</div>

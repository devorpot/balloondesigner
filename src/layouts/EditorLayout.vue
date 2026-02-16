<template>
  <div class="editor-shell">
    <header class="topbar">
      <slot name="topbar" />
    </header>

    <main class="main">
      <slot />
    </main>
  </div>
</template>

<style lang="less" scoped>
.editor-shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar {
  height: 56px;
  border-bottom: 1px solid rgba(0,0,0,.08);
  background: #fff;
  display: flex;
  align-items: center;
  padding: 0 12px;
}

.main {
  flex: 1;
  padding: 12px;
  background: #f6f7f9;
}
</style>

<script lang="ts">
  import { page } from '$app/stores';
  import { t } from '$lib/i18n';
</script>

<div class="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
  <div class="bg-red-50 text-red-600 p-6 rounded-2xl mb-6">
    <h1 class="text-4xl font-bold mb-2">{$page.status}</h1>
    <p class="text-xl">Ónei, eitthvað fór úrskeiðis.</p>
  </div>

  <h2 class="text-2xl font-semibold mb-4">Villa kom upp</h2>
  <p class="text-gray-600 mb-8 max-w-md">
    Við biðjumst velvirðingar á þessu. Síðan gæti verið tímabundið óaðgengileg eða slóðin er röng.
  </p>

  <div class="flex flex-col sm:flex-row gap-4">
    <a
      href="/"
      class="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
    >
      Fara á forsíðu
    </a>
    <button
      on:click={() => window.location.reload()}
      class="bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
    >
      Reyna aftur
    </button>
  </div>
</div>

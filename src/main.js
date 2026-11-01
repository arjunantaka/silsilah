import './app.css'
import App from './App.svelte'

const target = /** @type {HTMLElement} */ (document.getElementById('app'))
const app = new App({
  target,
})

export default app

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
}

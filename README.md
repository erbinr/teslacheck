# Tesla Delivery Checklist

Checklist PWA (es / pt / en) para revisar un Tesla Model 3 el día de la entrega: 83 puntos con estado OK / Problema / N/A, notas, matrícula, VIN, campos personalizados, barra de progreso apilada por estado (OK / Problema / N/A / pendiente) con porcentajes, selector de idioma ES·PT·EN y de tema auto/claro/oscuro, resumen de incidencias y PDF imprimible. HTML + CSS + JS vanilla, sin dependencias ni build.

## Privacidad

**La app no comunica ningún dato.** Todo se guarda en `localStorage` del dispositivo. Sin analítica, sin cookies, sin llamadas de red salvo cargar la propia app (la CSP en `_headers` lo impone). Funciona offline tras la primera carga (service worker cache-first).

## Aviso legal

**Esta app no está afiliada a Tesla, Inc.** Es solo una guía de ayuda y sugerencia: los autores no se hacen responsables de nada (decisiones tomadas, defectos no detectados, errores u omisiones, ni del uso de la información). Confirma siempre con Tesla y las fuentes oficiales. El aviso aparece en la cabecera, el pie y el PDF, en es/pt/en (`disclaimer` en `i18n/*.json`).

## Guardado

Todo lo que escribes (matrícula, VIN, campos personalizados, notas y estados) se guarda en `localStorage` mientras escribes (debounce de 200 ms) y de inmediato al cambiar de pestaña, desenfocar o cerrar (`visibilitychange`, `pagehide`, `beforeunload`, `blur`). Solo se borra con *Reiniciar*. Muestra un indicador «Guardado» y un aviso rojo si el navegador no deja guardar (cuota o modo privado). Pide `navigator.storage.persist()` para que el navegador no borre los datos.

## Créditos

La estructura y los 63 ítems originales (traducidos a pt/en y adaptados a Portugal en 2 ítems: V16 y documentos) proceden de la [checklist de entrega de Pedidos Tesla](https://pedidostesla.pages.dev/checklist) de **EdaL (Enrique DC)**. Los 20 ítems añadidos llevan su fuente enlazada en la app (`checklist.json`): Tesla Portugal FAQ, r/TeslaPortugal, Tesla Service Manual, Abstract Ocean, teslaowners.uk, r/teslamotors y AccessoriesForTesla.
Los puntos legales/administrativos son orientativos: confirma con tu asesor y las fuentes oficiales.

## Desarrollo

```
python3 -m http.server 8000   # http://localhost:8000
node tools/check.mjs          # i18n completo en es/pt/en, cobertura de checklist y precache del SW
```

Estructura: `checklist.json` (secciones, grupos, ids), `i18n/*.json` (textos), `app.js`, `styles.css` (incluye `@media print`), `sw.js`, `manifest.webmanifest`, `icons/`.
Al cambiar cualquier archivo servido, sube `VERSION` en `sw.js` y añade nuevos archivos a `ASSETS`.

## Despliegue (Cloudflare Pages)

Sitio estático: sin comando de build, directorio de salida `/` (raíz). Conecta el repo en Cloudflare Pages (rama de producción `main`) o `npx wrangler pages deploy . --project-name teslacheck`. Añade el dominio personalizado en el proyecto Pages.

## Licencia

MIT

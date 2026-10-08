# Audit des licences

Fichier généré par `npm run licenses` : ne pas modifier à la main.

- Plateforme du scan : darwin-arm64 (les binaires natifs optionnels dépendent de la plateforme)
- Paquets analysés : 58 (3 en production, 55 en développement uniquement)
- Scans bruts : [`licenses.json`](licenses.json) (tout l'arbre) et [`licenses.production.json`](licenses.production.json) (dépendances de production)
- Politique : [`policy.json`](policy.json) - décisions : [`decisions.md`](decisions.md)

## Verdict

Conforme : toutes les licences respectent la politique.

## Synthèse par licence

| Licence | Famille | Paquets | Dont production | Statut |
|---|---|---|---|---|
| MIT | permissive | 48 | 1 | autorisée |
| Apache-2.0 | permissive | 5 | 1 | autorisée |
| MPL-2.0 | copyleft | 2 | 0 | exception développement |
| ISC | permissive | 1 | 0 | autorisée |
| BSD-3-Clause | permissive | 1 | 0 | autorisée |
| 0BSD | permissive | 1 | 1 | autorisée |

## Signalements

### Copyleft

- `lightningcss@1.33.0` : MPL-2.0 (development, exception développement)
- `lightningcss-darwin-arm64@1.33.0` : MPL-2.0 (development, exception développement)

### Propriétaires

Aucun.

### Non identifiées ou déduites par l'outil

Aucun.

## Classification de chaque paquet

| Paquet | Version | Licence | Famille | Portée | Statut |
|---|---|---|---|---|---|
| @babel/helper-string-parser | 7.29.7 | MIT | permissive | development | autorisée |
| @babel/helper-validator-identifier | 7.29.7 | MIT | permissive | development | autorisée |
| @babel/parser | 7.29.9 | MIT | permissive | development | autorisée |
| @babel/types | 7.29.8 | MIT | permissive | development | autorisée |
| @bcoe/v8-coverage | 1.0.2 | MIT | permissive | development | autorisée |
| @esbuild/darwin-arm64 | 0.28.2 | MIT | permissive | development | autorisée |
| @jridgewell/resolve-uri | 3.1.2 | MIT | permissive | development | autorisée |
| @jridgewell/sourcemap-codec | 1.6.0 | MIT | permissive | development | autorisée |
| @jridgewell/trace-mapping | 0.3.31 | MIT | permissive | development | autorisée |
| @oxc-project/types | 0.153.0 | MIT | permissive | development | autorisée |
| @rolldown/binding-darwin-arm64 | 1.2.13 | MIT | permissive | development | autorisée |
| @rolldown/pluginutils | 1.0.1 | MIT | permissive | development | autorisée |
| @types/chai | 5.2.3 | MIT | permissive | development | autorisée |
| @types/deep-eql | 4.0.2 | MIT | permissive | development | autorisée |
| @types/estree | 1.0.9 | MIT | permissive | development | autorisée |
| @types/node | 26.6.4 | MIT | permissive | development | autorisée |
| @typescript/typescript-darwin-arm64 | 7.0.2 | Apache-2.0 | permissive | development | autorisée |
| @vitest/coverage-v8 | 5.0.3 | MIT | permissive | development | autorisée |
| @vitest/istanbul-lib-coverage | 1.0.2 | MIT | permissive | development | autorisée |
| @vitest/istanbul-lib-report | 1.0.2 | MIT | permissive | development | autorisée |
| @vitest/mocker | 5.0.3 | MIT | permissive | development | autorisée |
| @vitest/spy | 5.0.3 | MIT | permissive | development | autorisée |
| assertion-error | 2.0.1 | MIT | permissive | development | autorisée |
| ast-v8-to-istanbul | 1.0.7 | MIT | permissive | development | autorisée |
| chai | 6.3.0 | MIT | permissive | development | autorisée |
| detect-libc | 2.1.2 | Apache-2.0 | permissive | development | autorisée |
| es-module-lexer | 2.3.2 | MIT | permissive | development | autorisée |
| esbuild | 0.28.2 | MIT | permissive | development | autorisée |
| estree-walker | 3.0.3 | MIT | permissive | development | autorisée |
| expect-type | 1.4.0 | Apache-2.0 | permissive | development | autorisée |
| fdir | 6.5.0 | MIT | permissive | development | autorisée |
| fsevents | 2.3.3 | MIT | permissive | development | autorisée |
| js-tokens | 10.0.0 | MIT | permissive | development | autorisée |
| lightningcss | 1.33.0 | MPL-2.0 | copyleft | development | exception développement |
| lightningcss-darwin-arm64 | 1.33.0 | MPL-2.0 | copyleft | development | exception développement |
| magic-string | 1.4.3 | MIT | permissive | development | autorisée |
| magicast | 0.5.5 | MIT | permissive | development | autorisée |
| nanoid | 3.3.20 | MIT | permissive | development | autorisée |
| obug | 2.2.1 | MIT | permissive | development | autorisée |
| picocolors | 1.1.1 | ISC | permissive | development | autorisée |
| picomatch | 4.0.7 | MIT | permissive | development | autorisée |
| postcss | 8.5.29 | MIT | permissive | development | autorisée |
| reflect-metadata | 0.2.2 | Apache-2.0 | permissive | production | autorisée |
| rolldown | 1.2.13 | MIT | permissive | development | autorisée |
| source-map-js | 1.2.2 | BSD-3-Clause | permissive | development | autorisée |
| std-env | 4.3.0 | MIT | permissive | development | autorisée |
| tinybench | 6.2.1 | MIT | permissive | development | autorisée |
| tinyexec | 1.3.1 | MIT | permissive | development | autorisée |
| tinyglobby | 0.2.17 | MIT | permissive | development | autorisée |
| tinyrainbow | 3.2.0 | MIT | permissive | development | autorisée |
| tslib | 1.14.1 | 0BSD | permissive | production | autorisée |
| tsx | 4.23.15 | MIT | permissive | development | autorisée |
| tsyringe | 4.10.0 | MIT | permissive | production | autorisée |
| typescript | 7.0.2 | Apache-2.0 | permissive | development | autorisée |
| undici-types | 8.9.0 | MIT | permissive | development | autorisée |
| vite | 8.3.3 | MIT | permissive | development | autorisée |
| vitest | 5.0.3 | MIT | permissive | development | autorisée |
| why-is-node-running | 3.2.1 | MIT | permissive | development | autorisée |

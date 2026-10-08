# Audit des licences

Fichier généré par `npm run licenses` : ne pas modifier à la main.

- Plateforme du scan : darwin-arm64 (les binaires natifs optionnels dépendent de la plateforme)
- Paquets analysés : 157 (69 en production, 88 en développement uniquement)
- Scans bruts : [`licenses.json`](licenses.json) (tout l'arbre) et [`licenses.production.json`](licenses.production.json) (dépendances de production)
- Politique : [`policy.json`](policy.json) - décisions : [`decisions.md`](decisions.md)

## Verdict

Conforme : toutes les licences respectent la politique.

## Synthèse par licence

| Licence | Famille | Paquets | Dont production | Statut |
|---|---|---|---|---|
| MIT | permissive | 141 | 62 | autorisée |
| ISC | permissive | 6 | 4 | autorisée |
| Apache-2.0 | permissive | 5 | 1 | autorisée |
| MPL-2.0 | copyleft | 2 | 0 | exception développement |
| BSD-3-Clause | permissive | 2 | 1 | autorisée |
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
| @noble/hashes | 1.8.0 | MIT | permissive | development | autorisée |
| @oxc-project/types | 0.153.0 | MIT | permissive | development | autorisée |
| @paralleldrive/cuid2 | 2.3.1 | MIT | permissive | development | autorisée |
| @rolldown/binding-darwin-arm64 | 1.2.13 | MIT | permissive | development | autorisée |
| @rolldown/pluginutils | 1.0.1 | MIT | permissive | development | autorisée |
| @types/body-parser | 1.19.6 | MIT | permissive | development | autorisée |
| @types/chai | 5.2.3 | MIT | permissive | development | autorisée |
| @types/connect | 3.4.38 | MIT | permissive | development | autorisée |
| @types/cookiejar | 2.1.5 | MIT | permissive | development | autorisée |
| @types/deep-eql | 4.0.2 | MIT | permissive | development | autorisée |
| @types/estree | 1.0.9 | MIT | permissive | development | autorisée |
| @types/express | 5.0.6 | MIT | permissive | development | autorisée |
| @types/express-serve-static-core | 5.1.3 | MIT | permissive | development | autorisée |
| @types/http-errors | 2.0.5 | MIT | permissive | development | autorisée |
| @types/methods | 1.1.4 | MIT | permissive | development | autorisée |
| @types/node | 26.6.4 | MIT | permissive | development | autorisée |
| @types/qs | 6.15.1 | MIT | permissive | development | autorisée |
| @types/range-parser | 1.2.7 | MIT | permissive | development | autorisée |
| @types/send | 1.2.1 | MIT | permissive | development | autorisée |
| @types/serve-static | 2.2.0 | MIT | permissive | development | autorisée |
| @types/superagent | 8.1.11 | MIT | permissive | development | autorisée |
| @types/supertest | 7.2.1 | MIT | permissive | development | autorisée |
| @typescript/typescript-darwin-arm64 | 7.0.2 | Apache-2.0 | permissive | development | autorisée |
| @vitest/coverage-v8 | 5.0.3 | MIT | permissive | development | autorisée |
| @vitest/istanbul-lib-coverage | 1.0.2 | MIT | permissive | development | autorisée |
| @vitest/istanbul-lib-report | 1.0.2 | MIT | permissive | development | autorisée |
| @vitest/mocker | 5.0.3 | MIT | permissive | development | autorisée |
| @vitest/spy | 5.0.3 | MIT | permissive | development | autorisée |
| accepts | 2.0.0 | MIT | permissive | production | autorisée |
| asap | 2.0.6 | MIT | permissive | development | autorisée |
| assertion-error | 2.0.1 | MIT | permissive | development | autorisée |
| ast-v8-to-istanbul | 1.0.7 | MIT | permissive | development | autorisée |
| asynckit | 0.4.0 | MIT | permissive | development | autorisée |
| body-parser | 2.3.0 | MIT | permissive | production | autorisée |
| bytes | 3.1.2 | MIT | permissive | production | autorisée |
| call-bind-apply-helpers | 1.0.2 | MIT | permissive | production | autorisée |
| call-bound | 1.0.4 | MIT | permissive | production | autorisée |
| chai | 6.3.0 | MIT | permissive | development | autorisée |
| combined-stream | 1.0.8 | MIT | permissive | development | autorisée |
| component-emitter | 1.3.1 | MIT | permissive | development | autorisée |
| content-disposition | 1.1.0 | MIT | permissive | production | autorisée |
| content-type | 1.0.5 | MIT | permissive | production | autorisée |
| content-type | 2.1.0 | MIT | permissive | production | autorisée |
| cookie | 0.7.2 | MIT | permissive | production | autorisée |
| cookie-signature | 1.2.2 | MIT | permissive | production | autorisée |
| cookiejar | 2.1.4 | MIT | permissive | development | autorisée |
| debug | 4.4.3 | MIT | permissive | production | autorisée |
| delayed-stream | 1.0.0 | MIT | permissive | development | autorisée |
| depd | 2.0.0 | MIT | permissive | production | autorisée |
| detect-libc | 2.1.2 | Apache-2.0 | permissive | development | autorisée |
| dezalgo | 1.0.4 | ISC | permissive | development | autorisée |
| dunder-proto | 1.0.1 | MIT | permissive | production | autorisée |
| ee-first | 1.1.1 | MIT | permissive | production | autorisée |
| encodeurl | 2.0.0 | MIT | permissive | production | autorisée |
| es-define-property | 1.0.1 | MIT | permissive | production | autorisée |
| es-errors | 1.3.0 | MIT | permissive | production | autorisée |
| es-module-lexer | 2.3.2 | MIT | permissive | development | autorisée |
| es-object-atoms | 1.1.2 | MIT | permissive | production | autorisée |
| es-set-tostringtag | 2.1.0 | MIT | permissive | development | autorisée |
| esbuild | 0.28.2 | MIT | permissive | development | autorisée |
| escape-html | 1.0.3 | MIT | permissive | production | autorisée |
| estree-walker | 3.0.3 | MIT | permissive | development | autorisée |
| etag | 1.8.1 | MIT | permissive | production | autorisée |
| expect-type | 1.4.0 | Apache-2.0 | permissive | development | autorisée |
| express | 5.2.1 | MIT | permissive | production | autorisée |
| fast-safe-stringify | 2.1.1 | MIT | permissive | development | autorisée |
| fdir | 6.5.0 | MIT | permissive | development | autorisée |
| finalhandler | 2.1.1 | MIT | permissive | production | autorisée |
| form-data | 4.0.6 | MIT | permissive | development | autorisée |
| formidable | 3.5.4 | MIT | permissive | development | autorisée |
| forwarded | 0.2.0 | MIT | permissive | production | autorisée |
| fresh | 2.0.0 | MIT | permissive | production | autorisée |
| fsevents | 2.3.3 | MIT | permissive | development | autorisée |
| function-bind | 1.1.2 | MIT | permissive | production | autorisée |
| get-intrinsic | 1.3.0 | MIT | permissive | production | autorisée |
| get-proto | 1.0.1 | MIT | permissive | production | autorisée |
| gopd | 1.2.0 | MIT | permissive | production | autorisée |
| has-symbols | 1.1.0 | MIT | permissive | production | autorisée |
| has-tostringtag | 1.0.2 | MIT | permissive | development | autorisée |
| hasown | 2.0.4 | MIT | permissive | production | autorisée |
| http-errors | 2.0.1 | MIT | permissive | production | autorisée |
| iconv-lite | 0.7.3 | MIT | permissive | production | autorisée |
| inherits | 2.0.4 | ISC | permissive | production | autorisée |
| ipaddr.js | 1.9.1 | MIT | permissive | production | autorisée |
| is-promise | 4.0.0 | MIT | permissive | production | autorisée |
| js-tokens | 10.0.0 | MIT | permissive | development | autorisée |
| lightningcss | 1.33.0 | MPL-2.0 | copyleft | development | exception développement |
| lightningcss-darwin-arm64 | 1.33.0 | MPL-2.0 | copyleft | development | exception développement |
| magic-string | 1.4.3 | MIT | permissive | development | autorisée |
| magicast | 0.5.5 | MIT | permissive | development | autorisée |
| math-intrinsics | 1.1.0 | MIT | permissive | production | autorisée |
| media-typer | 1.1.1 | MIT | permissive | production | autorisée |
| merge-descriptors | 2.0.0 | MIT | permissive | production | autorisée |
| methods | 1.1.2 | MIT | permissive | development | autorisée |
| mime | 2.6.0 | MIT | permissive | development | autorisée |
| mime-db | 1.52.0 | MIT | permissive | development | autorisée |
| mime-db | 1.54.0 | MIT | permissive | production | autorisée |
| mime-types | 2.1.35 | MIT | permissive | development | autorisée |
| mime-types | 3.0.2 | MIT | permissive | production | autorisée |
| ms | 2.1.3 | MIT | permissive | production | autorisée |
| nanoid | 3.3.20 | MIT | permissive | development | autorisée |
| negotiator | 1.1.0 | MIT | permissive | production | autorisée |
| object-inspect | 1.13.4 | MIT | permissive | production | autorisée |
| obug | 2.2.1 | MIT | permissive | development | autorisée |
| on-finished | 2.4.1 | MIT | permissive | production | autorisée |
| once | 1.4.0 | ISC | permissive | production | autorisée |
| parseurl | 1.3.3 | MIT | permissive | production | autorisée |
| path-to-regexp | 8.4.2 | MIT | permissive | production | autorisée |
| picocolors | 1.1.1 | ISC | permissive | development | autorisée |
| picomatch | 4.0.7 | MIT | permissive | development | autorisée |
| postcss | 8.5.29 | MIT | permissive | development | autorisée |
| proxy-addr | 2.0.8 | MIT | permissive | production | autorisée |
| qs | 6.16.0 | BSD-3-Clause | permissive | production | autorisée |
| range-parser | 1.3.0 | MIT | permissive | production | autorisée |
| raw-body | 3.0.2 | MIT | permissive | production | autorisée |
| reflect-metadata | 0.2.2 | Apache-2.0 | permissive | production | autorisée |
| rolldown | 1.2.13 | MIT | permissive | development | autorisée |
| router | 2.2.0 | MIT | permissive | production | autorisée |
| safer-buffer | 2.1.2 | MIT | permissive | production | autorisée |
| send | 1.2.1 | MIT | permissive | production | autorisée |
| serve-static | 2.2.1 | MIT | permissive | production | autorisée |
| setprototypeof | 1.2.0 | ISC | permissive | production | autorisée |
| side-channel | 1.1.1 | MIT | permissive | production | autorisée |
| side-channel-list | 1.0.1 | MIT | permissive | production | autorisée |
| side-channel-map | 1.0.1 | MIT | permissive | production | autorisée |
| side-channel-weakmap | 1.0.2 | MIT | permissive | production | autorisée |
| source-map-js | 1.2.2 | BSD-3-Clause | permissive | development | autorisée |
| statuses | 2.0.2 | MIT | permissive | production | autorisée |
| std-env | 4.3.0 | MIT | permissive | development | autorisée |
| superagent | 10.4.1 | MIT | permissive | development | autorisée |
| supertest | 7.3.1 | MIT | permissive | development | autorisée |
| tinybench | 6.2.1 | MIT | permissive | development | autorisée |
| tinyexec | 1.3.1 | MIT | permissive | development | autorisée |
| tinyglobby | 0.2.17 | MIT | permissive | development | autorisée |
| tinyrainbow | 3.2.0 | MIT | permissive | development | autorisée |
| toidentifier | 1.0.1 | MIT | permissive | production | autorisée |
| tslib | 1.14.1 | 0BSD | permissive | production | autorisée |
| tsx | 4.23.15 | MIT | permissive | development | autorisée |
| tsyringe | 4.10.0 | MIT | permissive | production | autorisée |
| type-is | 2.1.0 | MIT | permissive | production | autorisée |
| typescript | 7.0.2 | Apache-2.0 | permissive | development | autorisée |
| undici-types | 8.9.0 | MIT | permissive | development | autorisée |
| unpipe | 1.0.0 | MIT | permissive | production | autorisée |
| vary | 1.1.2 | MIT | permissive | production | autorisée |
| vite | 8.3.3 | MIT | permissive | development | autorisée |
| vitest | 5.0.3 | MIT | permissive | development | autorisée |
| why-is-node-running | 3.2.1 | MIT | permissive | development | autorisée |
| wrappy | 1.0.2 | ISC | permissive | production | autorisée |

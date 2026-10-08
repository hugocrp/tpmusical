# Réveil musical - CREPIN Hugo

Réveille un utilisateur avec un morceau choisi selon le jour et la météo, puis
le prévient sur son canal préféré (email, SMS ou push).

```bash
npm install
```

```bash
npm run dev
```

```bash
curl -X POST http://localhost:3000/wakeup -H "Content-Type: application/json" -d '{"userId":"u-001","day":"LUNDI","weather":"PLUIE"}'
```

```bash
npm run test:coverage
```

Exemples de requêtes, architecture, modes dégradés, configuration et tests :
[`DOCUMENTATION.md`](DOCUMENTATION.md).

## Packages : licences, versions et fraîcheur

État au 2026-10-08. Tout est régénérable :

```bash
npm run licenses
```

```bash
npm outdated
```

### Production

| Paquet | Rôle | Type | Licence | Version installée | Dernière stable (date) | Verdict |
|---|---|---|---|---|---|---|
| `express` | Serveur HTTP de l'API | Directe | MIT | 5.2.1 | 5.2.1 (2025-12-01) | À jour. Amène 65 paquets transitifs : voir justification |
| `tsyringe` | Conteneur IoC | Directe | MIT | 4.10.0 | 4.10.0 (2025-04-16) | À jour. Rythme de publication lent : voir justification |
| `reflect-metadata` | Métadonnées des décorateurs, requis par tsyringe | Directe | Apache-2.0 | 0.2.2 | 0.2.2 (2024-03-29) | À jour. Version `0.x` : voir justification |
| `tslib` | Fonctions d'aide TypeScript | Transitive (`tsyringe` → `tslib`) | 0BSD | 1.14.1 (2020-10-09) | 2.8.1 (2024-10-31) | **Une majeure de retard** : voir justification |

### Développement (non déployés)

| Paquet | Rôle | Licence | Version installée | Dernière stable (date) | Verdict |
|---|---|---|---|---|---|
| `typescript` | Compilateur | Apache-2.0 | 7.0.2 | 7.0.2 (2026-07-08) | À jour |
| `tsx` | Exécution TypeScript en développement | MIT | 4.23.15 | 4.23.15 (2026-09-20) | À jour |
| `vitest` | Tests | MIT | 5.0.3 | 5.0.3 (2026-09-30) | À jour |
| `@vitest/coverage-v8` | Couverture | MIT | 5.0.3 | 5.0.3 (2026-09-30) | À jour |
| `@types/node` | Types de Node.js | MIT | 26.6.4 | 26.6.4 (2026-10-01) | À jour |
| `supertest` | Requêtes HTTP dans les tests de bout en bout | MIT | 7.3.1 | 7.3.1 (2026-10-02) | À jour |
| `@types/express` | Types d'Express | MIT | 5.0.6 | 5.0.6 (2025-12-01) | À jour |
| `@types/supertest` | Types de supertest | MIT | 7.2.1 | 7.2.1 (2026-07-14) | À jour |
| `license-checker` | Scan des licences, lancé par `npx` (hors arbre) | BSD-3-Clause | 25.0.1 | 25.0.1 | Outil ancien mais figé à une version exacte ; n'analyse que des fichiers locaux |

Ces 11 dépendances directes entraînent **157 paquets** au total (69 en
production, 88 en développement uniquement). Chacun est listé avec sa licence dans
[`licenses/licenses.md`](licenses/licenses.md) et dans l'inventaire CycloneDX
[`licenses/sbom.cyclonedx.json`](licenses/sbom.cyclonedx.json) (`npm run sbom`).
Répartition : MIT 141, ISC 6, Apache-2.0 5, MPL-2.0 2, BSD-3-Clause 2, 0BSD 1.
`npm audit` : 0 vulnérabilité.

### Composants qui posent question

Les fiches complètes sont dans [`licenses/decisions.md`](licenses/decisions.md).

- **`express` — 65 paquets transitifs en production.** C'est la dépendance
  qui pèse le plus dans l'arbre. Tous sont sous licence permissive (MIT, ISC,
  BSD-3-Clause), aucune vulnérabilité connue. Express n'est importé que dans
  `app.ts` et `controllers/wakeUpController.ts` : le métier ne le connaît pas.
- **`lightningcss` — MPL-2.0 (copyleft faible).** Transitive de `vitest` via
  `vite`, en développement uniquement, ni modifiée ni distribuée : aucune
  obligation déclenchée. Acceptée par une exception limitée au développement ;
  la CI la refuse si le paquet passe en production.
- **`tslib@1.14.1` — version ancienne.** Imposée par `tsyringe` (`^1.9.3`).
  Licence sans contrainte, code sans accès au système, aucune vulnérabilité
  connue. Acceptée sous surveillance plutôt que forcée en version 2, que
  `tsyringe` ne déclare pas supporter.
- **`tsyringe` et `reflect-metadata` — pérennité.** À jour mais peu actifs. Le
  risque est borné : le conteneur n'est utilisé que dans `container.ts`, et les
  classes se construisent sans lui (c'est ce que font les tests unitaires).
- Aucune licence GPL, AGPL, LGPL, propriétaire ou non identifiée.

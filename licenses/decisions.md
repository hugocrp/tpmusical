# Décisions de licences et de fraîcheur

Audit du 2026-10-08. Le scan complet est dans [`licenses.json`](licenses.json), la classification de chaque paquet dans [`licenses.md`](licenses.md), l'inventaire CycloneDX dans [`sbom.cyclonedx.json`](sbom.cyclonedx.json), la politique appliquée par la CI dans [`policy.json`](policy.json).

## Conclusion

**Aucun composant bloquant.** Sur les 157 paquets analysés (69 en production), il n'y a aucune licence GPL, AGPL ou LGPL, aucune licence propriétaire et aucune licence non identifiée. Quatre points demandent une justification, détaillée dans les fiches ci-dessous :

1. `lightningcss` (MPL-2.0, copyleft faible), présent uniquement en développement ;
2. `tslib@1.14.1`, dépendance transitive de production en retard d'une version majeure ;
3. `tsyringe` et `reflect-metadata`, dont la dernière version stable est ancienne ;
4. `express`, qui amène à lui seul 65 paquets transitifs en production.

## Politique retenue

| Famille | Licences | Règle |
|---|---|---|
| Permissive | MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD | Liste blanche, autorisée partout |
| Copyleft faible | MPL-2.0 | Autorisée uniquement dans les dépendances de développement (fiche 1) |
| Copyleft fort | GPL, AGPL, LGPL (toutes variantes) | Refusée partout |
| Propriétaire, non identifiée, déduite par l'outil (`MIT*`, `Custom: ...`, `UNKNOWN`, `UNLICENSED`) | | Refusée : tout ajout exige une revue et une fiche |

Une licence permissive absente de la liste blanche est refusée aussi : l'y ajouter est une décision explicite. Pour les expressions SPDX, `A OR B` est accepté si l'un des termes est autorisé, `A AND B` seulement si tous le sont.

Le scan est fait par `license-checker@25.0.1` (BSD-3-Clause, lancé par `npx`, donc absent des dépendances du projet). L'évaluation de la liste blanche est faite par `tools/licenses/` et non par l'option `--onlyAllow` de l'outil, qui procède par recherche de sous-chaîne (`MIT AND GPL-3.0` contient « MIT » et passerait).

## Fiche 1 : `lightningcss@1.33.0` et son binaire natif

| | |
|---|---|
| Licence | MPL-2.0 (copyleft faible, au niveau du fichier) |
| Position dans l'arbre | Transitive, profondeur 3 : `reveil-musical` → `vitest@5.0.3` → `vite` → `lightningcss` (→ `lightningcss-darwin-arm64`, binaire optionnel dépendant de la plateforme) |
| Portée | Développement uniquement : `npm ls lightningcss --omit=dev --all` ne renvoie rien, absent de [`licenses.production.json`](licenses.production.json) |
| Décision | **Accepté, exception limitée au développement** |
| Stratégie | **Isoler** |

Les obligations du MPL-2.0 ne se déclenchent que si l'on distribue des fichiers MPL modifiés. Ici le paquet n'est ni modifié ni distribué : il sert à `vite` pendant les tests, et `src/` ne l'importe jamais. La frontière qui l'isole est celle du packaging (`devDependencies`), vérifiée à chaque build : l'exception est écrite au niveau de la licence en portée développement (`allowed.developmentOnly`), et le MPL-2.0 est refusé dès qu'un paquet passe en production.

**À réexaminer si :** `vite` ou `lightningcss` devient une dépendance de production, ou si un artefact contenant l'outillage de test est distribué.

## Fiche 2 : `tslib@1.14.1`

| | |
|---|---|
| Licence | 0BSD (permissive, sans obligation d'attribution) |
| Position dans l'arbre | Transitive de **production**, profondeur 2 : `reveil-musical` → `tsyringe@4.10.0` → `tslib@^1.9.3` |
| Fraîcheur | Version installée du 2020-10 ; dernière stable `2.8.1`. Retard d'une version majeure |
| Décision | **Accepté, sous surveillance** |
| Stratégie | **Isoler** (derrière `tsyringe`, lui-même cantonné au câblage) |

Le retard n'est pas un choix du projet : `tsyringe` impose la plage `^1.9.3`. `tslib` ne contient que les fonctions d'aide émises par le compilateur TypeScript (aucun accès réseau, fichier ou processus), et `npm audit` ne signale aucune vulnérabilité. Forcer la version 2 par un `overrides` npm ferait tourner `tsyringe` sur une version qu'il ne déclare pas supporter : le risque serait supérieur au bénéfice.

**À réexaminer si :** `npm audit` signale `tslib`, ou si `tsyringe` publie une version qui lève la contrainte.

## Fiche 3 : `tsyringe@4.10.0` et `reflect-metadata@0.2.2`

| | |
|---|---|
| Licences | MIT (`tsyringe`), Apache-2.0 (`reflect-metadata`) |
| Position dans l'arbre | Directes, production |
| Fraîcheur | Installées = dernières stables, mais publiées le 2025-04-16 (`tsyringe`) et le 2024-03-29 (`reflect-metadata`) : rythme de publication lent. `reflect-metadata` est en `0.x` |
| Décision | **Accepté** |
| Stratégie | **Isoler** |

Les deux paquets sont à jour ; la question posée est celle de la pérennité (rythme lent, proposition de décorateurs sur laquelle ils reposent restée « expérimentale » dans TypeScript). Le risque est borné par l'architecture :

- le conteneur n'est manipulé que dans le composition root ([`src/container.ts`](../src/container.ts)) ;
- ailleurs, `tsyringe` n'apparaît que sous forme de deux décorateurs (`@injectable`, `@inject`) posés sur des classes qui reçoivent tout par leur constructeur. Les tests unitaires construisent ces classes sans conteneur, ce qui prouve qu'elles n'en dépendent pas pour fonctionner ;
- changer de conteneur revient donc à retirer ces décorateurs et réécrire un fichier de câblage.

**À réexaminer si :** `tsyringe` est archivé, ou si une version de TypeScript retire `experimentalDecorators`.

## Fiche 4 : `express@5.2.1`

| | |
|---|---|
| Licence | MIT |
| Position dans l'arbre | Directe, production. Amène 65 paquets transitifs (`body-parser`, `router`, `qs`, `send`…) |
| Licences de la chaîne | MIT, ISC et BSD-3-Clause uniquement : toutes sur la liste blanche |
| Fraîcheur | Installée = dernière stable (2025-12-01) |
| Décision | **Accepté** |
| Stratégie | **Isoler** |

L'ajout d'Express fait passer la production de 3 à 69 paquets : c'est le prix d'un serveur HTTP maintenu (lecture du corps JSON avec limite de taille, routage, gestion des erreurs) plutôt qu'écrit à la main. Le risque est celui de la chaîne transitive, que personne ne lit paquet par paquet : il est couvert par l'audit automatique des licences et par `npm audit` à chaque build (0 violation, 0 vulnérabilité à ce jour), et par le SBOM qui permet de répondre vite à « ai-je ce paquet ? » en cas de faille.

Express n'est importé que par [`src/app.ts`](../src/app.ts) et [`src/controllers/wakeUpController.ts`](../src/controllers/wakeUpController.ts). Le métier (`WakeUpService`) ne le connaît pas : changer de framework HTTP revient à réécrire ces deux fichiers.

**À réexaminer si :** `npm audit` signale un paquet de la chaîne, ou si une licence de la chaîne change.

## Constats sans décision

- **`typescript@7.0.2`** : première branche majeure du compilateur natif. Les options `experimentalDecorators` et `emitDecoratorMetadata` nécessaires à `tsyringe` fonctionnent (build, lint et tests verts). Développement uniquement.
- **`reveil-musical@1.0.0`** : le projet lui-même, `private: true` et `UNLICENSED`, exclu du scan (`--excludePrivatePackages`).

## Limites

- Le scan reflète les paquets installés sur la machine qui l'exécute : les binaires natifs optionnels changent d'un système à l'autre. La CI (Linux) est la référence ; les fichiers committés viennent d'un poste macOS.
- L'outil lit les licences **déclarées** par les paquets, il ne vérifie pas le contenu des fichiers `LICENSE`.
- La fraîcheur n'est pas bloquante en CI : `npm outdated` est à lancer avant chaque livraison, et le tableau du README à mettre à jour.

## Modèle de fiche

Pour tout futur composant qui pose question (copyleft, licence non identifiée ou propriétaire, version ancienne, mainteneur unique) : nom et version, licence et famille, position (directe ou transitive, profondeur, chaîne `npm ls`), portée (production ou développement), fraîcheur, stratégie parmi *réécrire / substituer / isoler / négocier*, justification au regard de l'architecture, conditions de réexamen.

# Réveil musical - documentation technique

Le TP porte sur **l'appel qui déclenche l'envoi** : il reçoit l'identifiant de
l'utilisateur, le jour de la semaine et la météo du jour. L'ordonnancement et
l'envoi réel ne sont pas dans le périmètre : les trois canaux sont simulés par
des mocks qui écrivent sur la console.

Le tableau des packages (licence, version, fraîcheur) est dans le
[`README.md`](README.md).

## Utilisation

```bash
npm run wake -- u-001 LUNDI PLUIE
```

- Utilisateurs de démonstration : `u-001` (email), `u-002` (SMS), `u-003` (push),
  définis dans [`InMemoryUserPreferencesService`](src/infrastructure/preferences/InMemoryUserPreferencesService.ts).
- Jour : `LUNDI` … `DIMANCHE`. Météo : `SOLEIL | PLUIE | NEIGE | NUAGEUX`.
- Code de sortie `0` si le réveil est parti (même en mode dégradé), `1` sinon.

Démonstration des modes dégradés, sans toucher au code :

```bash
SIMULATED_CHANNEL_OUTAGES=sms npm run wake -- u-002 MARDI PLUIE
```

```bash
MUSIC_PROVIDERS= npm run wake -- u-002 MARDI NEIGE
```

```bash
MUSIC_PROVIDERS=musicbrainz,itunes npm run wake -- u-003 DIMANCHE NEIGE
```

## Les quatre exigences et leur traduction technique

| Exigence métier | Traduction | Où |
|---|---|---|
| **Musique** : tester plusieurs sources, en changer vite | Port `MusicProvider`, un adaptateur par fournisseur, registre nom → classe, ordre de priorité par variable d'environnement | [`ports/MusicProvider.ts`](src/application/ports/MusicProvider.ts), [`config/providers.ts`](src/config/providers.ts) |
| **Notification** : email, SMS, push, bientôt WhatsApp et appel vocal | Port `NotificationChannel`, un adaptateur par canal qui ramène trois SDK aux interfaces différentes vers la même méthode `send(adresse, message)`. Le nom du canal est une donnée, pas un type fermé | [`ports/NotificationChannel.ts`](src/application/ports/NotificationChannel.ts), [`infrastructure/notification/`](src/infrastructure/notification) |
| **Légal** : aucun composant externe sans vérification de licence et de fraîcheur | Audit automatique de tout l'arbre (transitives comprises) bloquant en CI, SBOM CycloneDX, tableau et fiches de décision | [`README.md`](README.md), [`licenses/`](licenses) |
| **Fiabilité** : une panne ne doit jamais empêcher l'envoi | Bascule entre fournisseurs, cache, quota, délai maximal par appel, morceau de secours local, bascule entre canaux | [Fiabilité](#fiabilité--jamais-de-silence) |

## Architecture

Trois couches ; les dépendances pointent toujours vers le métier.

```
src/
  domain/            Types et erreurs du métier. Aucune dépendance.
  application/       Le métier : ne dépend que du domaine et de ses ports.
    ports/           Les abstractions dont le métier a besoin (interfaces).
    WakeUpService.ts            Cas d'usage : préférences -> morceau -> message -> notification
    DayAndWeatherTrackSelectionPolicy.ts   Strategy : quel morceau pour ce jour et cette météo
    FailoverNotifier.ts         Règle métier : canal préféré, puis les autres canaux de l'utilisateur
    wakeUpMessage.ts            Rédaction du message
  infrastructure/    Les adaptateurs : tout ce qui connaît un détail technique.
    music/           iTunes, MusicBrainz, + décorateurs (cache, quota), bascule, secours local
    notification/    Adaptateurs email / SMS / push
    preferences/     Mock du service interne de préférences
    http/ cache/ time/ logging/   fetch, cache mémoire avec durée de vie, horloge, console
  vendors/           Mocks des SDK tiers de notification (interfaces volontairement différentes)
  config/            env.ts : seul lecteur de process.env. providers.ts : registres nom -> classe
  di/                Jetons d'injection (métier d'un côté, infrastructure de l'autre)
  container.ts       Composition root : le seul endroit qui associe abstraction et implémentation
  cli/ main.ts       Point d'entrée en ligne de commande
```

### Isolation et faible couplage

`WakeUpService` ne connaît que six abstractions reçues par son constructeur. Il
ne sait pas que la musique vient d'iTunes, ni qu'un SMS fait 160 caractères.

- **Rien de propre à un fournisseur ne sort de son adaptateur.** Les DTO
  (`trackViewUrl` d'iTunes, `artist-credit` de MusicBrainz) sont des interfaces
  privées du fichier de l'adaptateur. Le domaine ne manipule que
  `Track { title, artist }`.
- **Les SDK de notification ont trois formes différentes** : `sendMail(objet)`
  qui retourne une promesse, `sendSms(numéro, texte)` synchrone qui retourne un
  statut au lieu de lever une erreur et refuse plus de 160 caractères,
  `push(payload, callback)`. Chaque adaptateur absorbe ces différences
  (troncature du SMS, conversion du statut ou du callback en erreur du domaine).
- **Les coordonnées de l'utilisateur sont indexées par nom de canal**
  (`addresses: { email: "...", sms: "..." }`). Le métier transmet l'adresse du
  canal sans savoir si c'est un numéro ou un jeton d'appareil.

### IoC / DI : aucun `new` sur une implémentation

Le conteneur [tsyringe](https://github.com/microsoft/tsyringe) crée tous les
objets. Chaque classe déclare ses besoins par des interfaces dans son
constructeur, désignées par un jeton (`@inject(MUSIC_PROVIDER)`), et
[`container.ts`](src/container.ts) est le seul fichier qui choisit les
implémentations. Les décorateurs empilés (cache → quota → adaptateur) sont
eux aussi assemblés par le conteneur, dans un conteneur enfant par fournisseur :
chaque fournisseur a ainsi son propre cache et son propre compteur de quota.

Les seuls `new` de `src/` portent sur des erreurs et des structures du langage
(`Map`, `Set`, `Promise`).

### Des règles vérifiées par les tests

[`tests/architecture/architecture.test.ts`](tests/architecture/architecture.test.ts)
fait échouer le build si :

- un `new` d'implémentation concrète apparaît dans `src/` ;
- un fichier de `domain/` ou `application/` importe autre chose que le domaine,
  les ports, les jetons métier ou tsyringe ;
- un mot propre à un fournisseur ou à un canal (`itunes`, `trackViewUrl`,
  `smtp`, `deviceToken`…) apparaît dans le métier ;
- `process.env`, l'horloge système ou `fetch` sont utilisés ailleurs que dans
  leur unique adaptateur (pas de dépendance cachée).

### Coût du changement

| Changement | Ce qu'il faut écrire | Ce qui ne bouge pas |
|---|---|---|
| Nouveau fournisseur musical (Deezer…) | 1 adaptateur `MusicProvider` + 1 ligne dans `MUSIC_PROVIDER_REGISTRY` (avec son quota). Cache, quota et bascule sont hérités | Métier, conteneur, autres adaptateurs |
| Changer l'ordre ou retirer un fournisseur | `MUSIC_PROVIDERS=musicbrainz,itunes` | Tout le code |
| Nouveau canal (WhatsApp, appel vocal) | 1 adaptateur `NotificationChannel` + 1 ligne dans `NOTIFICATION_CHANNEL_REGISTRY` + l'enregistrement de son SDK dans `container.ts` | Métier, domaine, autres canaux |
| Vrai service de préférences | 1 adaptateur `UserPreferencesService` + 1 ligne dans `container.ts` | Tout le reste |
| Autre règle de sélection (saison, humeur…) | 1 classe `TrackSelectionPolicy` + 1 ligne dans `container.ts` | `WakeUpService` |
| Cache Redis | 1 classe `Cache` + 1 ligne dans `container.ts` | `CachingMusicProvider` |

Chaque nouvel adaptateur se valide en l'ajoutant à la suite de tests de contrat
de son abstraction (`tests/contract`).

## Fiabilité : jamais de silence

```
morceau demandé
  └─ FailoverMusicProvider ── pour chaque fournisseur, dans l'ordre configuré :
       CachingMusicProvider ─ RateLimitedMusicProvider ─ adaptateur (iTunes, MusicBrainz)
  └─ rien trouvé ou tout en panne ─> LocalFallbackTrackSource (liste codée en dur)

notification
  └─ FailoverNotifier ── canal préféré, puis les autres canaux pour lesquels
                         l'utilisateur a une adresse
```

| Panne | Comportement |
|---|---|
| iTunes en erreur, lent ou au format inattendu | MusicBrainz répond. L'utilisateur ne voit aucune différence |
| Appel plus long que `HTTP_TIMEOUT_MS` (3 s) | Abandonné, traité comme une panne : le réveil part à l'heure |
| Quota du fournisseur atteint (iTunes : 20 requêtes/minute) | L'appel n'est pas émis, le fournisseur suivant prend le relais |
| Fournisseur en panne mais morceau déjà demandé | Servi depuis le cache (24 h par défaut). Les pannes ne sont jamais mises en cache |
| Tous les fournisseurs en panne ou morceau introuvable | Morceau de la liste locale : celui demandé s'il y figure, sinon un morceau par défaut |
| Canal préféré en panne, non installé ou sans adresse | Envoi sur un autre canal de l'utilisateur |

Le résultat de l'appel indique toujours ce qui s'est passé (`trackSource`,
`channel`, `degraded`, `incidents`), et chaque incident est journalisé.

**Limites assumées.** Si *tous* les canaux de l'utilisateur échouent, l'appel
lève `NotificationFailedError` (code de sortie 1) avec le détail de chaque
tentative : c'est à l'ordonnanceur de relancer et d'alerter. De même, une panne
du service interne de préférences fait échouer l'appel, puisque sans lui ni le
canal ni l'adresse ne sont connus. Le cache et les quotas sont en mémoire : ils
ne valent que pour un processus qui reste en vie entre deux réveils.

## Choix d'interprétation

- **Jour et météo.** Le service de préférences retourne les morceaux choisis
  par météo (`tracksByWeather`), des choix propres à certains jours
  (`tracksByDay`, par exemple un morceau différent le dimanche sous la pluie) et
  un morceau de secours. La sélection (`DayAndWeatherTrackSelectionPolicy`)
  prend, dans l'ordre : le choix pour ce jour et cette météo, sinon le choix
  pour cette météo, sinon le morceau de secours.
- **Morceau de secours de l'utilisateur** : utilisé pour les cas (jour, météo) qu'il
  n'a pas couverts. À ne pas confondre avec le **secours local**, utilisé quand
  aucun fournisseur ne répond.
- **Point d'entrée en ligne de commande** plutôt qu'une API HTTP : l'appel est
  déclenché par un ordonnanceur, et cela évite d'ajouter un framework web aux
  dépendances de production.

## Configuration

Toutes les variables sont lues à un seul endroit,
[`src/config/env.ts`](src/config/env.ts), avec leurs valeurs par défaut.
`npm run wake` et `npm start` chargent `.env` s'il existe (flag natif de Node,
pas de dépendance `dotenv`) ; [`.env.example`](.env.example) sert de modèle.

| Variable | Défaut | Rôle |
|---|---|---|
| `MUSIC_PROVIDERS` | `itunes,musicbrainz` | Fournisseurs actifs, par ordre de priorité. Vide = secours local seul |
| `NOTIFICATION_CHANNELS` | `email,sms,push` | Canaux installés |
| `HTTP_USER_AGENT` | voir `env.ts` | En-tête exigé par MusicBrainz (nom d'application + contact) |
| `HTTP_TIMEOUT_MS` | `3000` | Délai maximal d'un appel à un fournisseur |
| `MUSIC_CACHE_TTL_SECONDS` | `86400` | Durée de vie d'une réponse en cache |
| `EMAIL_SENDER` | `reveil@reveil-musical.example` | Expéditeur des emails |
| `SIMULATED_CHANNEL_OUTAGES` | *(vide)* | Canaux simulés en panne, pour la démonstration |

Une valeur inconnue (`MUSIC_PROVIDERS=spotify`) arrête le programme au
démarrage avec la liste des valeurs acceptées.

## Tests

```bash
npm test
```

```bash
npm run test:coverage
```

190 tests, aucun n'utilise le réseau. Couverture de `src/` : **100 %** des
instructions, branches, fonctions et lignes (seuil de 90 % imposé par
`vitest.config.ts` ; `main.ts` et les interfaces sont exclus du calcul).

- **Unitaires** (`tests/unit`) : chaque classe isolée, ses dépendances
  remplacées par des fakes (`tests/fakes`). Le temps est piloté par une fausse
  horloge.
- **Contrat** (`tests/contract`) : une suite par abstraction, exécutée contre
  chaque implémentation. `MusicProvider` : morceau trouvé sans champ propre au
  fournisseur, introuvable, panne, format inattendu, caractères accentués.
  `NotificationChannel` : envoi réussi, panne, panne d'un autre canal.
- **Bout en bout** (`tests/e2e`) : le vrai conteneur est construit par
  `buildContainer`, seules les frontières externes (HTTP, sortie des mocks) sont
  remplacées. Couvre le cas nominal et chaque mode dégradé.
- **Architecture** (`tests/architecture`) : les règles listées plus haut.

Vérifié aussi à la main contre les vraies API iTunes et MusicBrainz le
2026-10-08 (commandes de la section « Utilisation »).

## Audit automatique des licences

`npm run licenses` scanne tout l'arbre puis évalue chaque licence contre la
liste blanche de [`licenses/policy.json`](licenses/policy.json), avec un code
de sortie 1 à la moindre violation. Le job `dependencies` de la CI
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) l'exécute à chaque
push, avec `npm audit` et la génération du SBOM : une dépendance à licence non
autorisée ne peut pas être intégrée sans décision explicite.

## Services externes et environnement

| Dépendance | Nature | Conditions | Risque et parade |
|---|---|---|---|
| iTunes Search API (Apple, États-Unis) | API tierce, sans clé | ~20 requêtes/minute, conditions d'Apple modifiables unilatéralement, pas de SLA | Isolée derrière `MusicProvider` ; quota, cache, bascule |
| MusicBrainz (MetaBrainz Foundation, États-Unis) | API tierce, sans clé | `User-Agent` identifiable obligatoire, 1 requête/seconde en moyenne ; données de base sous CC0 | Idem ; quota de 50 requêtes/minute dans le registre |
| SDK email / SMS / push | Mocks écrits pour le TP | — | Un vrai SDK devra passer l'audit de licence avant intégration ; seul son adaptateur le connaîtra |
| Service interne de préférences | Mock | — | Isolé derrière `UserPreferencesService` |
| Node.js | Environnement d'exécution | ≥ 22 (`fetch`, `AbortSignal.timeout`, `--env-file-if-exists` natifs) | Aucune librairie HTTP ni `dotenv` à maintenir |

Seul le titre du morceau recherché est envoyé aux deux API, plus l'adresse de
contact du `User-Agent` : aucune donnée d'utilisateur ne quitte le système.

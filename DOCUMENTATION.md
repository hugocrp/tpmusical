# Réveil musical - documentation technique

Le TP porte sur **l'appel qui déclenche l'envoi**, exposé ici comme une API
HTTP : `POST /wakeup` reçoit l'identifiant de l'utilisateur, le jour de la
semaine et la météo du jour. L'ordonnancement et
l'envoi réel ne sont pas dans le périmètre : les trois canaux sont simulés par
des mocks qui écrivent sur la console.

Le tableau des packages (licence, version, fraîcheur) est dans le
[`README.md`](README.md).

## Utilisation

```bash
npm run dev
```

```bash
curl -X POST http://localhost:3000/wakeup -H "Content-Type: application/json" -d '{"userId":"u-001","day":"LUNDI","weather":"PLUIE"}'
```

```json
{
  "userId": "u-001",
  "track": { "title": "I Don't Like Mondays", "artist": "The Boomtown Rats" },
  "trackSource": "catalogue",
  "channel": "email",
  "degraded": false,
  "incidents": []
}
```

Le message envoyé par le mock du canal s'affiche dans la console du serveur.

| Statut | Cas |
|---|---|
| `200` | Réveil envoyé, y compris en mode dégradé (`degraded: true`, détail dans `incidents`) |
| `400` | Champ manquant, valeur inconnue ou JSON illisible |
| `404` | Utilisateur inconnu |
| `503` | Réveil impossible : l'appelant doit relancer et alerter |

### Exemples de requêtes

Une seule route, `POST /wakeup`, avec un corps JSON `userId`, `day`, `weather`.
Résultats obtenus avec la configuration par défaut (iTunes en premier).

**Morceau choisi pour la météo (u-001, canal email)**

```bash
curl -X POST http://localhost:3000/wakeup -H "Content-Type: application/json" -d '{"userId":"u-001","day":"MARDI","weather":"PLUIE"}'
```

`200` : « Riders on the Storm » de The Doors, envoyé par `email`.

**Même utilisateur, même météo, autre jour : le morceau change**

```bash
curl -X POST http://localhost:3000/wakeup -H "Content-Type: application/json" -d '{"userId":"u-001","day":"DIMANCHE","weather":"PLUIE"}'
```

`200` : « Sunday Morning » de Maroon 5, envoyé par `email`.

**Utilisateur qui préfère le SMS (u-002)**

```bash
curl -X POST http://localhost:3000/wakeup -H "Content-Type: application/json" -d '{"userId":"u-002","day":"VENDREDI","weather":"SOLEIL"}'
```

`200` : « Friday I'm In Love » de The Cure, envoyé par `sms`.

**Utilisateur qui préfère le push (u-003)**

```bash
curl -X POST http://localhost:3000/wakeup -H "Content-Type: application/json" -d '{"userId":"u-003","day":"JEUDI","weather":"NEIGE"}'
```

`200` : « Snow (Hey Oh) » de Red Hot Chili Peppers, envoyé par `push`.

**Météo non couverte par l'utilisateur : son morceau de secours**

```bash
curl -X POST http://localhost:3000/wakeup -H "Content-Type: application/json" -d '{"userId":"u-003","day":"JEUDI","weather":"NUAGEUX"}'
```

`200` : « Lovely Day » de Bill Withers, envoyé par `push`.

**Jour inconnu**

```bash
curl -X POST http://localhost:3000/wakeup -H "Content-Type: application/json" -d '{"userId":"u-001","day":"MONDAY","weather":"PLUIE"}'
```

`400` : `valeur "MONDAY" inconnue pour "day" (attendu : LUNDI | MARDI | …)`.

**Champ manquant**

```bash
curl -X POST http://localhost:3000/wakeup -H "Content-Type: application/json" -d '{"userId":"u-001","day":"MARDI"}'
```

`400` : `le champ "weather" est obligatoire (texte non vide)`.

**Utilisateur inconnu**

```bash
curl -X POST http://localhost:3000/wakeup -H "Content-Type: application/json" -d '{"userId":"u-999","day":"LUNDI","weather":"PLUIE"}'
```

`404` : `Utilisateur inconnu : "u-999"`.

- Utilisateurs de démonstration : `u-001` (email), `u-002` (SMS), `u-003` (push),
  définis dans [`InMemoryUserPreferencesService`](src/infrastructure/preferences/InMemoryUserPreferencesService.ts).
- Jour : `LUNDI` … `DIMANCHE`. Météo : `SOLEIL | PLUIE | NEIGE | NUAGEUX`.
- En production : `npm run build` puis `npm start`.

Démonstration des modes dégradés, sans toucher au code : relancer le serveur
avec une panne simulée, puis refaire la même requête.

```bash
SIMULATED_OUTAGES=email npm run dev
```

```bash
MUSIC_PROVIDERS= npm run dev
```

```bash
SIMULATED_OUTAGES=preferences npm run dev
```

```bash
MUSIC_PROVIDERS=musicbrainz,itunes npm run dev
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
    FailoverNotifier.ts         Règle métier : canal préféré, puis les autres canaux, plusieurs tours si tout échoue
    wakeUpMessage.ts            Rédaction du message
  infrastructure/    Les adaptateurs : tout ce qui connaît un détail technique.
    music/           iTunes, MusicBrainz, + décorateurs (cache, quota), bascule, secours local
    notification/    Adaptateurs email / SMS / push
    preferences/     Mock du service interne de préférences + repli sur les dernières préférences connues
    http/ cache/ time/ logging/   fetch, cache mémoire avec durée de vie, horloge, console
  vendors/           Mocks des SDK tiers de notification (interfaces volontairement différentes)
  config/            env.ts : seul lecteur de process.env. providers.ts : registres nom -> classe
  di/                Jetons d'injection (métier d'un côté, infrastructure de l'autre)
  container.ts       Composition root : le seul endroit qui associe abstraction et implémentation
  controllers/       Validation de la requête, appel du métier, erreurs -> statuts HTTP
  app.ts             Routes Express, à partir d'un WakeUpService déjà construit
  server.ts          Point d'entrée : configuration, conteneur, écoute du port
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

préférences
  └─ LastKnownUserPreferencesService ── service interne, sinon dernières
                                        préférences connues (fichier)

notification
  └─ FailoverNotifier ── canal préféré, puis les autres canaux pour lesquels
                         l'utilisateur a une adresse ; plusieurs tours si tout échoue
```

| Panne | Comportement |
|---|---|
| iTunes en erreur, lent ou au format inattendu | MusicBrainz répond. L'utilisateur ne voit aucune différence |
| Appel plus long que `HTTP_TIMEOUT_MS` (3 s) | Abandonné, traité comme une panne : le réveil part à l'heure |
| Quota du fournisseur atteint (iTunes : 20 requêtes/minute) | L'appel n'est pas émis, le fournisseur suivant prend le relais |
| Fournisseur en panne mais morceau déjà demandé | Servi depuis le cache (24 h par défaut). Les pannes ne sont jamais mises en cache |
| Tous les fournisseurs en panne ou morceau introuvable | Morceau de la liste locale : celui demandé s'il y figure, sinon un morceau par défaut |
| Canal préféré en panne, non installé ou sans adresse | Envoi sur un autre canal de l'utilisateur |
| Tous les canaux de l'utilisateur en panne | Nouveaux tours d'essai sur tous ses canaux après une pause (3 tours, 2 s de pause par défaut) |
| Service de préférences en panne | Dernières préférences connues de l'utilisateur, mémorisées à chaque réveil réussi |

Le résultat de l'appel indique toujours ce qui s'est passé (`trackSource`,
`channel`, `degraded`, `incidents`), et chaque incident est journalisé.

**Ce qui reste impossible.** Deux situations ne peuvent pas être résolues par
le code, et se terminent par une réponse `503`, pour que l'ordonnanceur
relance et alerte :

- tous les canaux de l'utilisateur sont encore en panne après le dernier tour
  d'essai ;
- le service de préférences est en panne pour un utilisateur qui n'a jamais été
  réveillé (aucune préférence connue, donc ni canal ni adresse).

Le cache des morceaux et les quotas sont en mémoire : ils vivent aussi
longtemps que le serveur, et repartent de zéro à chaque redémarrage. Les
dernières préférences connues, elles, sont dans un fichier
(`PREFERENCES_CACHE_FILE`) et survivent à un redémarrage ; ce fichier contient les adresses des utilisateurs et
n'est pas versionné.

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
- **Point d'entrée HTTP.** L'énoncé parle d'un « appel » sans en fixer la
  forme. Une API est ce qu'un ordonnanceur appelle en production, et un serveur
  qui reste en vie rend le cache et les quotas réellement utiles. Le prix est
  une dépendance de production de plus (Express), justifiée dans le README.

## Configuration

Toutes les variables sont lues à un seul endroit,
[`src/config/env.ts`](src/config/env.ts), avec leurs valeurs par défaut.
`npm run dev` et `npm start` chargent `.env` s'il existe (flag natif de Node,
pas de dépendance `dotenv`) ; [`.env.example`](.env.example) sert de modèle.

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `3000` | Port d'écoute de l'API |
| `MUSIC_PROVIDERS` | `itunes,musicbrainz` | Fournisseurs actifs, par ordre de priorité. Vide = secours local seul |
| `NOTIFICATION_CHANNELS` | `email,sms,push` | Canaux installés |
| `NOTIFICATION_ROUNDS` | `3` | Nombre de tours d'essai sur les canaux de l'utilisateur |
| `NOTIFICATION_RETRY_DELAY_MS` | `2000` | Pause entre deux tours |
| `PREFERENCES_CACHE_FILE` | `.reveil-musical/preferences.json` | Fichier des dernières préférences connues |
| `HTTP_USER_AGENT` | voir `env.ts` | En-tête exigé par MusicBrainz (nom d'application + contact) |
| `HTTP_TIMEOUT_MS` | `3000` | Délai maximal d'un appel à un fournisseur |
| `MUSIC_CACHE_TTL_SECONDS` | `86400` | Durée de vie d'une réponse en cache |
| `EMAIL_SENDER` | `reveil@reveil-musical.example` | Expéditeur des emails |
| `SIMULATED_OUTAGES` | *(vide)* | Pannes simulées pour la démonstration : `email`, `sms`, `push`, `preferences` |

Une valeur inconnue (`MUSIC_PROVIDERS=spotify`) arrête le programme au
démarrage avec la liste des valeurs acceptées.

## Tests

```bash
npm test
```

```bash
npm run test:coverage
```

229 tests, aucun n'utilise le réseau. Couverture de `src/` : **100 %** des
instructions, branches, fonctions et lignes (seuil de 90 % imposé par
`vitest.config.ts` ; `server.ts` et les interfaces sont exclus du calcul).

- **Unitaires** (`tests/unit`) : chaque classe isolée, ses dépendances
  remplacées par des fakes (`tests/fakes`). Le temps est piloté par une fausse
  horloge.
- **Contrat** (`tests/contract`) : une suite par abstraction, exécutée contre
  chaque implémentation. `MusicProvider` : morceau trouvé sans champ propre au
  fournisseur, introuvable, panne, format inattendu, caractères accentués.
  `NotificationChannel` : envoi réussi, panne, panne d'un autre canal.
- **Bout en bout** (`tests/e2e`) : le vrai conteneur est construit par
  `buildContainer`, seules les frontières externes (HTTP sortant, sortie des
  mocks) sont remplacées. `api.e2e.test.ts` envoie de vraies requêtes à
  l'application Express (supertest) : cas nominal, modes dégradés et chaque
  statut d'erreur.
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
| Node.js | Environnement d'exécution | ≥ 22 (`fetch`, `AbortSignal.timeout`, `--env-file-if-exists` natifs) | Aucune librairie de client HTTP ni `dotenv` à maintenir |

Seul le titre du morceau recherché est envoyé aux deux API, plus l'adresse de
contact du `User-Agent` : aucune donnée d'utilisateur ne quitte le système.

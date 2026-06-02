# 🍲 Popote

L'app qui décide des repas à ta place les jours de flemme — et qui t'accompagne
les jours où tu es motivée.

PWA (web app installable) qui marche sur iPhone et iPad. **Local-first** : toutes
tes données restent sur ton appareil, aucun compte requis.

## Ce que ça fait

- **Mode flemme** 😮‍💨 — il est 19h, zéro réflexion : 3 idées de repas faisables
  tout de suite avec ce que tu as déjà. Tu choisis « pour qui », le temps dispo,
  et un toggle « je peux faire les courses ».
- **Mode motivée** ✨ — planifie ta semaine avec un **curseur d'équilibre**
  (plaisir ↔ healthy), et génère ta liste de courses (ce qui te manque seulement).
- **Placards** 🧺 — inventaire par scan code-barres (via Open Food Facts, qui
  remplit aussi les calories) + ajout rapide pour le frais.
- **Recettes** 📖 — catalogue façon Spotify : like/dislike, notes, profils de
  goûts par personne. Rien n'est codé en dur, chacun crée ses profils.
- **Calories** 🔥 — suivi de la conso du jour par personne vs objectif.
- **Mascotte Popote** 🍲 — guide l'app de façon ludique, sympa à utiliser avec un enfant.

## Lancer en local

```bash
npm install
npm run dev
```

Ouvre http://localhost:5173 (le scan caméra marche sur `localhost` et en HTTPS).

## Build

```bash
npm run build      # génère dist/
npm run preview    # prévisualise le build
```

## Installer sur iPhone / iPad

1. Mets le projet sur GitHub (voir ci-dessous) ou héberge `dist/` en HTTPS.
2. Ouvre l'URL dans Safari.
3. Bouton Partager → **« Sur l'écran d'accueil »**. Popote s'installe comme une vraie app.

## Déployer sur GitHub Pages

Le workflow `.github/workflows/deploy.yml` déploie automatiquement à chaque push
sur `main`.

1. Crée un dépôt GitHub et pousse le code.
2. Dans **Settings → Pages**, choisis la source **GitHub Actions**.
3. À chaque `git push`, le site se met à jour. L'URL ressemble à
   `https://<ton-pseudo>.github.io/<nom-du-repo>/`.

## Sync iPhone ↔ iPad (optionnelle)

L'app marche 100 % en local. Si tu veux les mêmes données sur tes deux appareils,
active la sync dans **Profil → Sync** :

1. Crée un compte gratuit sur **supabase.com** et un nouveau projet.
2. **Project Settings → API** : copie l'**URL** et la clé **anon public**.
3. **SQL Editor** : exécute le script affiché dans l'app (crée la table `popote_sync`) :
   ```sql
   create table popote_sync (
     code text primary key,
     data jsonb,
     client_ts bigint
   );
   alter table popote_sync enable row level security;
   create policy "popote" on popote_sync for all using (true) with check (true);
   ```
4. Dans l'app, colle l'URL + la clé, choisis un **code de synchro** secret, et mets
   les mêmes infos (surtout le même code) sur ton iPhone ET ton iPad.

Fonctionnement : tout le contenu est stocké dans une ligne repérée par ton code.
L'app pousse après chaque modif et récupère à l'ouverture / au retour sur l'app /
toutes les 30 s. Dernière écriture gagne (pensé pour un seul utilisateur sur deux
appareils utilisés l'un après l'autre, pas pour de l'édition simultanée).

## Pile technique

- React + TypeScript + Vite, PWA (service worker + manifest)
- Stockage local (localStorage), zéro backend obligatoire
- Sync optionnelle via Supabase (`@supabase/supabase-js`, chargé à la demande)
- `@zxing/browser` pour le scan code-barres
- API Open Food Facts pour produits + nutrition

## Pour plus tard (voir `SPEC.md`)

- Charger la lib de scan à la demande (alléger le bundle initial)
- Sync temps réel (Supabase Realtime) au lieu du polling 30 s

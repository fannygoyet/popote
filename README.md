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

## Pile technique

- React + TypeScript + Vite, PWA (service worker + manifest)
- Stockage local (localStorage), zéro backend
- `@zxing/browser` pour le scan code-barres
- API Open Food Facts pour produits + nutrition

## Pour plus tard (voir `SPEC.md`)

- Sync iPhone ↔ iPad (Supabase free tier)
- Charger la lib de scan à la demande (alléger le bundle)
- Import/saisie de recettes perso

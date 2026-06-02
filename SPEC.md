# Maison — App de repas & courses (spec v1)

> Idée de Fanny. App perso, locale, hébergée sur GitHub. iPhone 15 + iPad 11".
> Document de cadrage issu d'une session brainstorm (office hours, builder mode).
> Statut : BROUILLON

## Le problème

Faire les courses et faire à manger, avec une **motivation très variable** :
- Certains jours : envie de faire l'inventaire, planifier, cuisiner.
- La plupart du temps : la flemme → pâtes aux lardons par défaut avec mon fils.

Vie en garde alternée (mon fils est là sauf un week-end sur deux), donc les
contextes de repas changent : seule / avec mon fils / avec des invités.

## L'angle (ce que les autres apps ratent)

Jow, Marmiton & co ne servent que le **mode motivée**. Personne ne sert le
**mode flemme**. Cette app marche dans les **deux humeurs** :

- **Mode flemme** : 19h, zéro réflexion → 3 propositions faisables tout de
  suite avec ce que j'ai, mon fils choisit.
- **Mode motivée** : inventaire, planification de la semaine, liste de courses.

## Insight clé : l'inventaire s'auto-maintient

Maintenir un inventaire à la main = corvée = abandon. Donc on ne le maintient
PAS à la main. Il est le sous-produit de deux gestes déjà faits :

- Retour de courses → **scan des produits qui rentrent** → stock +
- Cuisson d'une recette → l'app connaît les ingrédients → stock − (auto)
- Ajustement manuel = rare et rapide.

## Décisions prises

| Sujet | Décision |
|-------|----------|
| Inventaire | Scan code-barres (packagé) **+** ajout rapide pour le frais (poulet, légumes…) |
| Calories | Récupérées au scan via Open Food Facts ; calcul auto par portion de recette |
| Sync | iPhone ↔ iPad synchronisés (même données en temps réel) |
| Cœur du MVP | **Mode flemme** (proposition instantanée selon le stock) |
| Goûts | **Jamais codés en dur** : catalogue partagé + profils de goûts par utilisateur (modèle Spotify) |
| Plateforme | PWA (web app installable sur l'écran d'accueil iOS), GitHub Pages |

## MVP — Mode flemme (à construire en premier)

Écran d'accueil : **« T'as la flemme ou t'es motivée ? »**

Parcours flemme :
1. Pour qui ? 🙋 seule / 👦 avec mon fils / 👥 invités
2. Filtre temps (« j'ai 15 min »)
3. Toggle **« je peux faire les courses »** (OFF par défaut → uniquement le
   100 % faisable avec le stock ; ON → complète et alimente la liste de courses)
4. **3 cartes max** (éviter la paralysie du choix)
5. Après le repas : 👍 / 👎 + note → la recette remonte ou disparaît ; le stock
   se décrémente automatiquement.

Pré-requis : **semer ~15 recettes qu'on aime déjà** (pâtes aux lardons incluses),
taggées : ingrédients, temps, portions, qui aime (moi / mon fils / invités).

## Catalogue de recettes (façon Spotify)

- Like / dislike, note en fin de recette.
- « Jamais testé » → revient une fois pour essai, puis remonte ou disparaît.
- **Profils de goûts par personne** (moi / mon fils / invités) → le filtrage
  s'adapte à qui mange. Mon fils peut liker ses plats lui-même (ludique).
- Le catalogue s'enrichit à l'usage (j'ai cuisiné = j'aime → ça revient).

## Planification + liste de courses (phase 2)

- Sélection de recettes pour la semaine.
- L'app calcule ce qui manque vs le stock → ajoute à la liste de courses.
- Quantités ajustées avec `+ / −`, regroupées par rayon.
- Mode planif = je suis motivée = sans doute prête à faire les courses.

## Calories (phase 2)

- Chaque ingrédient porte ses infos nutrition (Open Food Facts pour le packagé,
  table générique pour le frais).
- Calcul auto des calories par portion de recette.
- Suivi de ma conso quotidienne vs objectif (j'ai commencé le sport).

## Usage avec mon fils

- Choix des repas à deux, interface intuitive, ludique et pédagogique.
- Il peut liker ses plats, voter pour les propositions du soir.

## Stack technique envisagée

- **Front** : PWA (Svelte + Vite ou React + Vite), installable sur l'écran
  d'accueil iOS. Hébergée sur **GitHub Pages**.
- **Données + sync** : **Supabase** (offre gratuite) — Postgres, sync temps
  réel iPhone↔iPad, auth simple.
- **Produits + nutrition** : API **Open Food Facts** (gratuite, FR).
- **Scan code-barres** : lib JS `@zxing/library` (le scan natif iOS Safari est
  peu fiable).

## Modèle de données (esquisse)

- `produits` : id, nom, code_barres?, type (packagé/frais), kcal_100g, infos_nutri
- `stock` : produit_id, quantité, unité, lieu (frigo/placard/congélo), date_maj
- `recettes` : id, nom, temps_min, portions, étapes
- `recette_ingredients` : recette_id, produit_id, quantité, unité
- `personnes` : id, nom, âge, profil_goûts
- `notes` : recette_id, personne_id, note, like/dislike, date
- `liste_courses` : produit_id, quantité, coché

## Risques / points d'attention

- **Le frais n'a pas de code-barres** → l'ajout rapide du frais est obligatoire,
  pas optionnel.
- **Scan iOS** → tester `@zxing` tôt sur l'iPhone réel.
- **Seed des recettes** → l'app est inutile tant que le catalogue est vide ;
  prévoir une saisie rapide ou un import de départ.
- **Garder le mode flemme à 3 cartes max** → la valeur, c'est de décider à ta
  place, pas de te redonner un catalogue.

## Prochaines étapes

1. Lister à la main les **15 recettes du quotidien** + leurs ingrédients/tags.
2. Maquette papier des 2-3 écrans du mode flemme.
3. Prototype : 1 écran « propose-moi 3 repas » sur un stock factice (sans scan,
   sans sync) → valider que la mécanique te plaît avant tout le reste.

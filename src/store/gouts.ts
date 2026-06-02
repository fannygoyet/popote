// Options du questionnaire de goûts, partagées entre l'onboarding et le profil.
// C'est évolutif : ces réponses donnent une base, puis chaque note de recette
// affine les propositions au fil du temps.

export interface GoutOption {
  cle: string // 'tag:...' ou 'prod:...'
  label: string
  emoji: string
}

export const GOUT_OPTIONS: GoutOption[] = [
  // Styles de plats (tags)
  { cle: 'tag:réconfort', label: 'Plats réconfort', emoji: '🥧' },
  { cle: 'tag:rapide', label: 'Vite fait', emoji: '⚡' },
  { cle: 'tag:équilibré', label: 'Équilibré', emoji: '🥗' },
  { cle: 'tag:végé', label: 'Végétarien', emoji: '🌱' },
  { cle: 'tag:épicé', label: 'Épicé', emoji: '🌶️' },
  { cle: 'tag:sucré', label: 'Sucré', emoji: '🍰' },
  { cle: 'tag:asiatique', label: 'Asiatique', emoji: '🥢' },
  // Aliments souvent clivants (produits)
  { cle: 'prod:poisson-pane', label: 'Poisson', emoji: '🐟' },
  { cle: 'prod:thon', label: 'Thon', emoji: '🥫' },
  { cle: 'prod:oeuf', label: 'Œufs', emoji: '🥚' },
  { cle: 'prod:fromage-rape', label: 'Fromage', emoji: '🧀' },
  { cle: 'prod:lardons', label: 'Lardons / porc', emoji: '🥓' },
  { cle: 'prod:champignon', label: 'Champignons', emoji: '🍄' },
  { cle: 'prod:courgette', label: 'Courgettes', emoji: '🥒' },
  { cle: 'prod:salade', label: 'Crudités', emoji: '🥬' },
  { cle: 'prod:lentilles', label: 'Légumes secs', emoji: '🫘' },
  { cle: 'prod:banane', label: 'Fruits', emoji: '🍌' },
  { cle: 'prod:epices', label: 'Curry / épices', emoji: '🍛' },
]

// Petite mascotte "Popote" : un visage rigolo qui parle. C'est elle qui rend
// l'app vivante et sympa à utiliser avec un enfant.
export function Mascotte({ texte, emoji = '🍲' }: { texte: string; emoji?: string }) {
  return (
    <div className="mascotte">
      <div className="face">{emoji}</div>
      <div className="bulle">{texte}</div>
    </div>
  )
}

/**
 * TD1 — Code à revoir : la caisse du magasin.
 *
 * Ce fichier contient volontairement plusieurs problèmes (logique, typage,
 * lisibilité, conception). À vous de les identifier en commentaires de
 * revue, puis d'en corriger au moins trois.
 */

// REVUE 1 (typage) : `Item` n'est pas exporté alors qu'il apparaît dans la signature
// des fonctions exportées ; `qty` est une abréviation peu lisible (-> quantity).
interface Item {
  name: string;
  price: number;
  qty: number;
}

const TAX_RATE = 0.2;

// REVUE 2 (cas limites) : aucun contrôle. Un prix négatif, une quantité à 0 ou
// négative, NaN ou Infinity donnent un total faux sans aucune erreur.
// REVUE 3 (flottants) : en virgule flottante 0.1 + 0.2 !== 0.3 ; le total n'est
// jamais arrondi au centime, donc on peut obtenir 12.000000000000002.
// Calcule le total TTC du panier
export function total(cart: Item[]): number {
  let sum = 0;
  for (const item of cart) {
    sum += item.price * item.qty;
  }
  return sum + sum * TAX_RATE;
}

// REVUE 4 (lisibilité/i18n) : toFixed(2) donne "12.00 €" ; le format français
// est "12,00 €" (virgule, espace insécable). Intl.NumberFormat le gère.
// Formate un prix en euros
export function formatPrice(value: number): string {
  return value.toFixed(2) + " €";
}

// REVUE 5 (conception) : checkout mélange calcul et effet de bord (console.log)
// et ne retourne rien : impossible à tester ou à brancher sur un vrai paiement.
// La variable `t` est peu parlante et le TODO laisse la fonction inachevée.
// REVUE 6 (cas limite) : le panier vide est signalé par un simple log, sans
// valeur de retour ni erreur : l'appelant ne peut pas réagir.
// Encaisse le panier : affiche le total et prépare le paiement
export function checkout(cart: Item[]) {
  if (cart.length === 0) {
    console.log("Panier vide");
    return;
  }
  const t = total(cart);
  console.log("Total à payer : " + formatPrice(t));
  // TODO: intégrer le paiement
}

/**
 * TD1 — Code à revoir : la caisse du magasin.
 *
 * Ce fichier contient volontairement plusieurs problèmes (logique, typage,
 * lisibilité, conception). À vous de les identifier en commentaires de
 * revue, puis d'en corriger au moins trois.
 */

interface Item {
  name: string;
  price: number;
  qty: number;
}

const TAX_RATE = 0.2;

// Arrondit au centime : évite les restes de calcul en flottants (ex. 0.1 + 0.2)
function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

// Calcule le total TTC du panier (arrondi au centime)
export function total(cart: Item[]): number {
  let sum = 0;
  for (const item of cart) {
    sum += item.price * item.qty;
  }
  return roundToCents(sum * (1 + TAX_RATE));
}

// Formate un prix en euros
export function formatPrice(value: number): string {
  return value.toFixed(2) + " €";
}

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

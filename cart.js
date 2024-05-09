
// Arrondis les operations de float
function roundPrice(x) {
    return parseFloat(x.toFixed(2));
}

// Renvoit le frais de port selon le pays et code postal (Colissimo)
function getShippingCost(country, postal_code, weight) {
    // Si le client habite à Plaisir, élancourt ou aux clayes, frais gratuit
    // let free = ['78370', '78990', '78340']
    // if (free.indexOf(postal_code) >= 0) return 0;

    // Si la panier ne pèse rien (par exemple pour des affiches), fdp gratos
    if (weight == 0) return 0;
    
    // On définie à l'avance les prix
    let metroCost  = [4.99, 6.99, 8.1, 8.80];     // (250mg, 500, 750, 1Kg)
    let domtomCost = [12.65, 12.65, 20, 20]; // (500mg, 1Kg)
    let euroCost   = [14.25, 14.25, 17.60, 17.60]; // (500mg, 1Kg)
    let inter1Cost = [21.40, 21.40, 25.55, 25.55]; // (500mg, 1Kg)
    let inter2Cost = [31.60, 31.60, 31.15, 31.15]; // (500mg, 1Kg)

    // On définit l'indice de prix selon le poid du colis
    let fdp_index = Math.trunc(parseFloat(weight-1) / 250);

    // On définit les differentes zones
    let euro = ['DE', 'AT', 'BE', 'BG', 'CY', 'HR', 'DK', 'ES', 'EE', 'FI', 'FR', 'GR', 'HU', 'IE', 'IT', 'LT', 
    'LV', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'SE', 'CZ', 'CH', 'SM', 'LI']; // UE + suisse etc
    let inter1 = ['NO', 'BA', 'HR', 'MK', 'ME', 'RS', 'AL', 'DZ', 'MA', 'TN', 'LY', 'MR'] // Europe Est + Norvège + Maghreb

    // Si le client est en france ...
    if (country == 'FR') {
        if (['97', '98'].indexOf(postal_code.slice(0, 2)) >= 0) return domtomCost[fdp_index];
        else return metroCost[fdp_index];
        
    }
    else if (['MC', 'AD'].indexOf(country) >= 0) return metroCost[fdp_index]; // Si Andorre ou Monaco
    else if (euro.indexOf(country) >= 0) return euroCost[fdp_index]; // Si UE + Suisse et autres
    else if (inter1.indexOf(country) >= 0) return inter1Cost[fdp_index]; // Si EU Est + Maghreb + Norvège
    else return inter2Cost[fdp_index]; // Sinon -> international
}

// Met à jour le panier selon le statut de l'utilisateur
function refreshCart(session) {
    if (session.cart) {
        if (session.logged) {
            session.cart.shipping_cost = getShippingCost(session.account.country, session.account.postal_code, session.cart.weight); // On récupère les frais de port estimés
        } else {
            session.cart.shipping_cost = getShippingCost('FR', '75000', session.cart.weight);
        }
        session.cart.total_cost = roundPrice(session.cart.shipping_cost + session.cart.subtotal_cost);
        return session.cart;
    } else {
        return 0;
    }
}

// Ajoute un ou plusieurs produits au panier
function addCart(session, product) {
    // si il n'y a pas encore cookies de panier, on en créer un
    var cart = session.cart;
    if (!cart) {
        cart = {
            products: [],
            nb_products: 0,
            weight: 0,
            voucher_code: '',
            voucher_promo: 0,
            subtotal_cost: 0,
            shipping_cost: 4.95, // valeur par défaut si non connecté
            total_cost: 4.95,
        }
    }

    // Si le produit est déjà dans le panier, on l'incremente
    var match = false;
    for (var i=0; i<cart.products.length; i++) {
        if (cart.products[i].id == product.id && cart.products[i].option == product.option && cart.products[i].color == product.color) {
            cart.products[i].cart_qty++;
            match = true;
            break;
        }
    }
    
    // Si le produit n'est pas déjà dans le panier, on l'ajoute
    if (!match) cart.products.push(product); 
    cart.nb_products += 1;
    cart.weight += product.weight;

    // On paramètre les frais de port si connecté
    if (session.logged) {
        cart.shipping_cost = getShippingCost(session.account.country, session.account.postal_code, cart.weight); // On récupère les frais de port estimés
    } else {
        cart.shipping_cost = getShippingCost('FR', '75000', cart.weight);
    }

    cart.subtotal_cost = roundPrice(cart.subtotal_cost + product.price * product.cart_qty);
    cart.total_cost = roundPrice(cart.subtotal_cost + cart.shipping_cost);

    return cart;
}

// Supprime un type de produit du panier, par son id et son option
function removeCart(session, data) {
    // On parcours le panier pour trouver l'occurence et la supprimer
    var cart = session.cart;
    for (var i=0; i<cart.products.length; i++) {
        if (cart.products[i].id == data.id && cart.products[i].option == data.option && cart.products[i].color == data.color) {
            // On met à jour les données du panier
            cart.nb_products -= cart.products[i].cart_qty;
            cart.weight -= cart.products[i].weight * cart.products[i].cart_qty;

            // On paramètre les frais de port si connecté
            if (session.logged) {
                cart.shipping_cost = getShippingCost(session.account.country, session.account.postal_code, cart.weight); // On récupère les frais de port estimés
            } else {
                cart.shipping_cost = getShippingCost('FR', '75000', cart.weight);
            }

            cart.subtotal_cost = roundPrice(cart.subtotal_cost - cart.products[i].cart_qty * cart.products[i].price);
            cart.total_cost = roundPrice(cart.shipping_cost + cart.subtotal_cost);

            cart.products.splice(i, 1); // On supprime le produit du panier
            break;
        }
    }
    return cart;
}

// Permet de convertir un panier envoyé côté client pour le standardiser
function convertCart(cart) {
    cart = JSON.parse(cart);
    let new_cart = {
        products: [],
        voucher_code: cart.voucher_code,
        voucher_promo: parseFloat(cart.voucher_promo),
        subtotal_cost: parseFloat(cart.subtotal_cost),
        shipping_cost: parseFloat(cart.shipping_cost),
        total_cost: parseFloat(cart.total_cost),
        nb_products: parseFloat(cart.nb_products),
        weight: parseInt(cart.weight)
    }
    new_cart.reduc = roundPrice(new_cart.voucher_promo * (new_cart.subtotal_cost + new_cart.shipping_cost) / 100);

    // On convertit chaque produit du panier
    for (product of cart.products) {
        new_cart.products.push({
            id: parseInt(product.id),
            name: product.name,
            available: parseInt(product.available),
            price: parseFloat(product.price),
            weight: parseInt(product.weight),
            color: product.color,
            option: product.option,
            cart_qty: parseInt(product.cart_qty),
            image: product.img
        });
    }
    return new_cart;
}

// Modifie le panier suite aux informations de livraison
function validShipping(cart, data) {
    cart.shipping_method = data.shippingMethod;

    // si on a choisi une autre adresse de livraison
    if (data.shippingAddress) {
        cart.shipping_address = {
            address1: data.address1,
            address2: data.address2,
            city: data.city,
            country: data.country,
            state: data.state,
            postal_code: data.postal_code,
            string: `${data.address1} ${data.address2} ${data.postal_code} ${data.city} ${data.state} ${data.country}`
        }
        cart.shipping_cost = getShippingCost(data.country, data.postal_code, cart.weight);
        cart.total_cost = roundPrice(cart.subtotal_cost + cart.shipping_cost - cart.reduc);
    }
    return cart;
}

module.exports = {
    addCart: addCart,
    removeCart: removeCart,
    convertCart: convertCart,
    validShipping: validShipping,
    getShippingCost: getShippingCost,
    refreshCart: refreshCart
};
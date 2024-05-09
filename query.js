
var bcrypt     = require('bcryptjs');
var mysql      = require('mysql2');
let cart_module = require('./cart.js');

var connection;
function init (cred) {
    // Créer la connection avec la BDD mysql.
    connection = mysql.createPool({
        connectionLimit : 20,
        host     : 'localhost',
        user     : cred.user,
        password : cred.pass,
        database : 'strange_day'
    });
    // On se connecte à une connexion du pool pour voir si la liaison se passe bien
    connection.getConnection(function(err, con) {
        if (err) throw err;
        console.log("> BDD MySQL connecté.");
        con.release(); // on libère manuellement la connexion
    });
};

// Arrondis les operations de float
function roundPrice(x) {
    return parseFloat(x.toFixed(2));
}

// ============================================= QUERY ===================================================

_getAllUser    = `SELECT * FROM user, address WHERE user_id = id`;
_getAllBaseProduct = `SELECT * FROM product WHERE visible = 1`;
_getAllProductSimple = `SELECT p.id, p.name, description, price, available, p.type, cover_image, collection, composition, clothe.type as clothe_type, print_size, weight, a.type as acc_type FROM product p
            LEFT JOIN accessory a ON a.product_id = p.id
            LEFT JOIN clothe ON clothe.product_id = p.id
            LEFT JOIN print ON print.product_id = p.id
            WHERE p.visible = 1
            ORDER BY id DESC`;
_getAllProduct = `SELECT DISTINCT p.id, p.name, description, price, available, p.type, default_color, c.name color_name, c.code color_code, image.name as image, pi.position as image_pos, composition, clothe.type as clothe_type, collection, print_size, weight, a.type as acc_type FROM product p
            INNER JOIN product_image pi ON pi.product_id = p.id
            INNER JOIN image ON image.id = pi.image_id
            LEFT JOIN accessory a ON a.product_id = p.id
            LEFT JOIN clothe ON clothe.product_id = p.id
            LEFT JOIN print ON print.product_id = p.id
            LEFT JOIN product_option po ON po.product_id = p.id
            LEFT JOIN color c ON c.name = po.color
            WHERE p.visible = 1 AND (default_color = pi.color OR default_color = 'Défaut')
            ORDER BY id DESC, image_pos`;
_getAllClothe = `SELECT DISTINCT p.id, p.name, description, price, available, p.type, default_color, c.name color_name, c.code color_code, image.name as image, pi.position as image_pos, collection, composition, clothe.type as clothe_type FROM product p 
            INNER JOIN clothe 
            INNER JOIN product_image pi ON pi.product_id = p.id 
            INNER JOIN image ON image.id = pi.image_id 
            LEFT JOIN product_option po ON po.product_id = p.id
            LEFT JOIN color c ON c.name = po.color
            WHERE clothe.product_id = p.id AND p.visible = 1 AND (default_color = pi.color OR default_color = 'Défaut')
            ORDER BY id DESC, image_pos; `;
_getAllPrint = `SELECT DISTINCT p.id, p.name, description, price, available, p.type, default_color, c.name color_name, c.code color_code, image.name as image, pi.position as image_pos, collection, print_size, printing, weight FROM product p
            INNER JOIN print
            INNER JOIN product_image pi ON pi.product_id = p.id
            INNER JOIN image ON image.id = pi.image_id
            LEFT JOIN product_option po ON po.product_id = p.id
            LEFT JOIN color c ON c.name = po.color
            WHERE print.product_id = p.id AND p.visible = 1 AND (default_color = pi.color OR default_color = 'Défaut')
            ORDER BY id DESC, image_pos`;
_getAllAcc = `SELECT DISTINCT p.id, p.name, description, price, available, p.type, default_color, c.name color_name, c.code color_code, image.name as image, pi.position as image_pos, collection, a.type as acc_type FROM product p
            INNER JOIN accessory a
            INNER JOIN product_image pi ON pi.product_id = p.id
            INNER JOIN image ON image.id = pi.image_id
            LEFT JOIN product_option po ON po.product_id = p.id
            LEFT JOIN color c ON c.name = po.color
            WHERE a.product_id = p.id AND p.visible = 1 AND (default_color = pi.color OR default_color = 'Défaut')
            ORDER BY id DESC, image_pos`;

_getAllOrder   = `SELECT * FROM \`order\``;
_getAllOrderUser = `SELECT o.id, u.name, u.email, total_cost, shipping_address, o.state, p.id as product_id, oc.name as product, oc.color, oc.size, oc.nb, oc.price, voucher
				FROM \`order\` o
                INNER JOIN user u
                INNER JOIN order_content oc ON oc.order_id = o.id 
                LEFT JOIN product p ON oc.product_id = p.id
                WHERE o.user_id = u.id
                ORDER BY id DESC;`;
_getUser       = `SELECT * FROM user, address WHERE id = ? AND user_id = id`;
_getUserFromEmail = `SELECT * FROM user, address WHERE email = ? AND user_id = id`;
_getProduct = `SELECT p.id, p.name, description, price, available, p.type, image.name as image, pi.position as image_pos, po.position as option_pos, default_color, po.size as size, stock, po.color as color, composition, clothe.type as clothe_type, collection, print_size, printing, weight, a.type as acc_type FROM product p
            INNER JOIN product_image pi ON pi.product_id = p.id
            INNER JOIN image ON image.id = pi.image_id
            INNER JOIN product_option po ON po.product_id = p.id
            LEFT JOIN clothe ON clothe.product_id = p.id
            LEFT JOIN print ON print.product_id = p.id
            LEFT JOIN accessory a ON a.product_id = p.id
            WHERE po.color = pi.color AND p.id = ?
            ORDER BY image_pos, option_pos;`;
_getOrder      = `SELECT o.id, user_id, date, subtotal_cost, shipping_cost, total_cost, billing_address, shipping_address, payment_method, shipping_method, state, p.id as product_id, oc.name as product, oc.color, oc.size, oc.nb, oc.price as product_price, cover_image, voucher 
			FROM \`order\` o
            INNER JOIN order_content oc ON oc.order_id = o.id 
            LEFT JOIN product p ON oc.product_id = p.id
            WHERE o.id = ?`;
_getOrderEmail = `SELECT email FROM \`order\` o, user WHERE o.user_id = user.id AND o.id = ?`;
_getUserOrder  = `SELECT * FROM \`order\` WHERE user_id = ?`;
_getUserEmail  = `SELECT email FROM user WHERE id = ?`;
_getUserNewsletter = `SELECT user.email FROM newsletter, user WHERE user.email = newsletter.email AND user.id = ?`;
_getAllNewsletter  = `SELECT email FROM newsletter`;
_getVoucher    = `SELECT * from voucher WHERE code = ? AND nb != 0`;
_getColors     = `SELECT * FROM color`;

_checkVoucherUser = `SELECT * FROM voucher v, user_voucher uv WHERE v.code = uv.code AND uv.user_id = ? AND v.code = ?`
_useVoucher    = `UPDATE voucher SET nb = ? WHERE code = ?`;

_addUser    = `INSERT INTO user (name, password, email, tel) VALUES (?, ?, ?, ?)`;
_addAddress = `INSERT INTO address (user_id, address1, address2, city, postal_code, state, country) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
_addOrder   = `INSERT INTO \`order\` (user_id, date, total_cost, subtotal_cost, shipping_cost, shipping_address, billing_address, payment_method, shipping_method, voucher) 
               VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)`;
_addProduct  = `INSERT INTO product (name, description, price, weight, available, type, cover_image, default_color, collection) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
_addClothe   = `INSERT INTO clothe (product_id, type, composition) VALUES (?, ?, ?)`;
_addPrint    = `INSERT INTO print (product_id, print_size, printing) VALUES (?, ?, ?)`;
_addAcc      = `INSERT INTO accessory (product_id, type) VALUES (?, ?)`;

_removeProduct = `UPDATE product SET visible = 0 WHERE id = ?`;
_removeOrder   = `DELETE FROM \`order\` WHERE id = ?`;
_removeUser    = `DELETE FROM user WHERE id = ?`;

_editUserPassword = `UPDATE user SET password = ? WHERE id = ?`;
_editUserAddress  = `UPDATE address SET address1 = ?, address2 = ?, city = ?, country = ?, state = ?, postal_code = ? WHERE user_id = ?`;
_editUserInfo     = `UPDATE user SET name = ?, email = ?, tel = ? WHERE id = ?`;

_updateOrder   = `UPDATE \`order\` SET state = ?, tracking_number = ? WHERE id = ?`;
_updateProduct = `UPDATE product SET name = ?, description = ?, price = ?, weight = ?, available = ?, type = ?, cover_image = ?, default_color = ?, collection = ? WHERE id = ?`;
_updateClothe  = `UPDATE clothe SET type = ?, composition = ? WHERE product_id = ?`;
_updatePrint   = `UPDATE print SET print_size = ?, printing = ? WHERE product_id = ?`;
_updateAcc     = `UPDATE accessory SET type = ? WHERE product_id = ?`;

// Requête de suppression lors de produits manquant
_sync_order         = `DELETE FROM \`order\` WHERE id NOT IN (
                           SELECT order_id FROM \`order_content\` oc, product p
                           WHERE oc.product_id = p.id)`
_sync_order_content = `DELETE FROM \`order_content\` WHERE order_id NOT IN (
                           SELECT id FROM \`order\` )`

_getStat = `SELECT * FROM 
            (SELECT count(*) as nb_user from user) as a ,
            (SELECT count(*) as nb_nl from newsletter) as b,
            (SELECT count(*) as nb_order from \`order\`) as c,
            (SELECT count(*) as nb_product from product) as d`

// ========================================= FONCTION =====================================================

function test(callback) {
    let query = `SELECT * FROM product p
            LEFT JOIN accessory a ON a.product_id = p.id
            LEFT JOIN clothe ON clothe.product_id = p.id
            LEFT JOIN print ON print.product_id = p.id
            WHERE p.visible = 1`

    connection.query(query, function(err, rows, fields) {
        if (err) throw err;

        if (!rows.length) {
            callback(false);
            return false;
        }

        callback(rows);
    });    
}

// Met à jour la base de données en convertissant l'ancien schéma vers le nouveau
function updateDatabase(callback) {
    // On met déjà à jour la séparation entre user et address
    /*connection.query(_getAllUser, function(err, rows, fields) {
        if (err) throw err;
        for (user of rows) {
            let address_query = 'INSERT INTO address (user_id, address1, address2, city, postal_code, country, state)  VALUES (?, ?, ?, ?, ?, ?, ?)'
            connection.query(address_query, [user.id, user.address1, user.address2, user.city, user.postal_code, user.country, user.state], function(err, rows, fields) {
                if (err) throw err;
            });
        }
    });*/

    // On met à jour les clothe (on vire les tailles vers product_option)
    /*getAllProduct(function(rows) {
        for (product of rows) {
            console.log(product)
            let size = false;
            let product_option_query = 'INSERT INTO product_option (product_id, size, color)  VALUES (?, ?, ?)'
            if (product.s) {
                size = true;
                connection.query(product_option_query, [product.id, 'S', ''], function(err, rows, fields) {
                    if (err) throw err;
                });                
            }
            if (product.m) {
                size = true;
                connection.query(product_option_query, [product.id, 'M', ''], function(err, rows, fields) {
                    if (err) throw err;
                });                
            }
            if (product.l) {
                size = true;
                connection.query(product_option_query, [product.id, 'L', ''], function(err, rows, fields) {
                    if (err) throw err;
                });                
            }
            if (product.xl) {
                size = true;
                connection.query(product_option_query, [product.id, 'XL', ''], function(err, rows, fields) {
                    if (err) throw err;
                });                
            }
            if (product.xxl) {
                size = true;
                connection.query(product_option_query, [product.id, 'XXL', ''], function(err, rows, fields) {
                    if (err) throw err;
                });                
            }
            if (!size) {
                connection.query(product_option_query, [product.id, '', ''], function(err, rows, fields) {
                    if (err) throw err;
                });                 
            }
        }
    }, 'all');*/
}

// Renvoit les données d'un utilisateur si les informations données sont correct
function login([email, password], callback) {
    connection.query(_getUserFromEmail, [email], function(err, rows, fields) {
    	if (err) throw err;
    	var user = rows[0]
        
        // Si l'email est bien enregistré ...
        if (user) {
            bcrypt.compare(password, user.password, function(err, response) {
                // Si les mots de passe correspondent ...
                if (response) {
                	callback(user);
                } 
                else {
                	callback(false, 'badPassword')
                }
            });
        }
        else {
        	callback(false, 'badEmail')
        }
    }); 
}

function signUp(data, callback) {
    // On hash le mot de passe à enregistrer dansla DB
    bcrypt.hash(data.password, 10, function(err, hashedPassword) {
        // On verifie qu'un utilisateur n'existe pas déjà
        connection.query(_getUserFromEmail, [data.email], function(err, rows, fields) {
            if (err) throw err;

            // Si l'adresse email n'est pas encore utilisé ...
            if (!rows.length) {
                // On modifie les infos principales
                connection.query(_addUser, [data.name, hashedPassword, data.email, data.tel], function(err, result) {
                    if (err) throw err;
                    let user_id = result.insertId;

                    // On modifie l'adresse
                    let queryParams = [user_id, data.address1, data.address2, data.city, data.postalCode, data.state, data.country]
                    connection.query(_addAddress, queryParams, function(err, result) {
                        if (err) throw err;
                    });
                    // On renvoit les informations de compte en même temps
                    connection.query(_getUser, [result.insertId], function(err, rows, fields) {
                    	callback(rows[0]);
                    })
                });

                // On ajoute à la newsletter si besoin
                if (parseInt(data.newsletter)) addNewsletter(data.email)
            }
            else {
            	callback(false, 'badEmail');
            }
        });
    });	
}

// Verifie les données du panier avec la base de données (correction des prix)
function checkCart(cart, callback) {
    // On calcule le prix totale depuis la DB (pour plus de securité)
    let subtotal_cost = 0;
    let total_weight  = 0;
    connection.query(_getAllBaseProduct, function(err, products, fields) {
        if (err) throw err;
        for (product of products) {
            for (cart_product of cart.products) {
                if (cart_product.id == product.id) {
                    subtotal_cost = roundPrice(subtotal_cost + cart_product.cart_qty * product.price); // On refait le prix total
                    total_weight += product.weight * cart_product.cart_qty;
                    cart_product.weight = product.weight;
                    cart_product.price = product.price; // On corrige le panier
                }
            }
        }

        // On prend en compte les remises possible sur les produits
        /*let tshirt = [30, 41, 42, 43, 44];
        let totbag = [31 , 37];
        let check1 = false;
        let check2 = false;
        for (product of cart.products) {
            if (tshirt.includes(product.id)) check1 = true;
            if (totbag.includes(product.id)) check2 = true;
        }
        if (check1 && check2) cart.shipping_cost = 0;*/

        cart.subtotal_cost = subtotal_cost;
        cart.weight = total_weight;
        cart.shipping_cost = cart_module.getShippingCost(cart.shipping_address.country, cart.shipping_address.postal_code, cart.weight);

        // Si un coupon de promo est appliqué, on va verifier son montant et sa validité
        if (cart.voucher_code) {
            checkVoucher(cart.voucher_code, function(voucher, error) {
                checkVoucherUser([cart.user_id, cart.voucher_code], function(data) {
                    let reduc = 0;
                    if (!data) reduc = roundPrice(cart.voucher_promo * (subtotal_cost + cart.shipping_cost) / 100);

                    cart.reduc = reduc;
                    cart.total_cost = roundPrice(subtotal_cost + cart.shipping_cost - reduc);
                    callback(cart); 
                })
            })
        } else {
            cart.total_cost = roundPrice(subtotal_cost + cart.shipping_cost);
            callback(cart);            
        }
    });
}

// Verifie la validité d'un code promo
function checkVoucher(code, callback) {
    connection.query(_getVoucher, [code], function(err, rows, fields) {
        if (err) throw err;
        callback(rows[0]);
    });
}

// Verifie la validité d'un code promo
function checkVoucherUser([id_user, code], callback) {
    // On vérifie si le coupon a atteint sa limite max d'utilisation par l'utilisateur
    connection.query(_checkVoucherUser, [id_user, code], function(err, rows, fields) {
        if (err) throw err;
        callback(rows[0]);
    });
}

// Si le coupon est limité, change son nombre son utilisation
function useVoucher([code, nb], callback) {
    connection.query(_useVoucher, [nb, code], function(err, rows, fields) {
        if (err) throw err;
        callback(rows[0]);
    });
}

// Renvoit les données d'un utilisateur par son id
function getUser(id, callback) {
    connection.query(_getUser, [id], function(err, rows, fields) {
        if (err) throw err;
        callback(rows[0]);
    });
}

// Renvoit les données d'un utilisateur par son email
function getUserFromEmail(email, callback) {
    connection.query(_getUserFromEmail, [email], function(err, rows, fields) {
        if (err) throw err;
        callback(rows[0]);
    });
}

// Renvoit une liste de tout les utilisateur (avec leur informations)
function getAllUser(callback) {
    connection.query(_getAllUser, function(err, rows, fields) {
        if (err) throw err;
        callback(rows);
    });
}

// Renvoit une liste de tout les produits (avec leurs informations et images)
function getAllProduct(callback, type) {
    switch (type) {
        case 'all': query = _getAllProduct;
            break;

        case 'clothe': query = _getAllClothe;
            break;

        case 'print': query = _getAllPrint;
            break;

        case 'accessory': query = _getAllAcc;
            break;

        default: query = _getAllProduct;
    }
    connection.query(query, function(err, rows, fields) {
        if (err) throw err;

        if (!rows.length) {
            callback(false);
            return false;
        }

        // On trie les résultats par produit et image
        let productList = [];
        let productCheck = [];
        let colorCheck = []
        for (product of rows) {
            if (!productCheck.includes(product.id)) {
                product.image = [product.image];
                if (product.color_name) {
                    product.color = [{name: product.color_name, code: product.color_code}];
                }

                productList.push(product);
                productCheck.push(product.id)
                colorCheck.push([product.color_name])
            } else {
                let index = productCheck.indexOf(product.id)
                if (product.default_color == "Défaut" || product.color_name == product.default_color) {
                    productList[index].image.push(product.image);
                }
                if (product.color_name && !colorCheck[index].includes(product.color_name)) {
                    productList[index].color.push({name: product.color_name, code: product.color_code});
                    colorCheck[index].push(product.color_name)
                }
            }
        }
        callback(productList);
    });
}

// Renvoit une liste de tout les produits (avec seulement l'image principale)
function getAllProductSimple(callback) {
    connection.query(_getAllProductSimple, function(err, rows, fields) {
        if (err) throw err;
        callback(rows);
    });
}

// Renvoit une liste de toutes les commandes
function getAllOrder(callback) {
    connection.query(_getAllOrder, function(err, rows, fields) {
        if (err) throw err;
        callback(rows);
    });
}

// Renvoit une liste de toutes les commandes, avec le nom d'utilisateur affilié
function getAllOrderUser(callback) {
    connection.query(_getAllOrderUser, function(err, rows, fields) {
        if (err) throw err;

        // La requête renvoit une ligne par produit différente de la commande, on doit donc recomposer en liste
        orderList = [];
        checkedId = [];
        for (order of rows) {
        	// Si la commande a déjà été traité (pour au moins 1 produit)
        	if (!checkedId.includes(order.id)) {
        		order.product = [{
        			id: order.product_id,
        			name: order.product,
                    email: order.email,
                    color: order.color,
        			size: order.size,
        			nb: order.nb
        		}]; // on reconstruit sous forme de liste
				orderList.push(order);
				checkedId.push(order.id);
        	}
        	else {
        		// ... sinon on regarde dans la liste et on modifie
        		for (var i=0; i<orderList.length; i++) {
        			if (order.id == orderList[i].id) {
        				orderList[i].product.push({
        					id: order.product_id,
        					name: order.product,
                            email: order.email,
                            color: order.color,
                            size: order.size,
        					nb: order.nb
        				});
        			}
        		}
        	}
        }
        callback(orderList);
    });
}

// Renvoit la liste des couleurs disponibles
function getColors(callback) {
    connection.query(_getColors, function(err, rows, fields) {
        if (err) throw err;
        callback(rows);  
    });    
}

// Renvoit un produit selon l'id donné
function getProduct(id, callback) {
    connection.query(_getProduct, [id], function(err, rows, fields) {
        if (err) throw err;

        if (!rows.length) {
            callback(false);
            return false;
        }

        // La requête renvoit une ligne par image et taille différente du produit, on doit donc recomposer en tableau
        // Chaque entrée du tableau renvoit à une couleur/variation du produit. 'base' s'il n'y a pas d'options.
        imageArray = {}
        optionArray = {}

        // De simples tableaux utilisé pour la vérification de boucle
        sizeCheck = {}
        imageCheck = {}
        for (product of rows) {
            // S'il n'a pas de couleur particulière, on la règle sur default
            if (!product.color) product.color = 'Défaut';

            // Si l'option n'est pas encore dans le tableau, on l'ajoute
            if (!optionArray[product.color]) {
                optionArray[product.color] = [];
                imageArray[product.color] = [];
                sizeCheck[product.color] = [];
                imageCheck[product.color] = [];
            }

            // Si l'image ou la taille n'est pas déjà dans le tableau, on l'ajoute à l'option
            if (!imageCheck[product.color].includes(product.image)) {
                imageArray[product.color].push(product.image);
                imageCheck[product.color].push(product.image);
            }
            if (!sizeCheck[product.color].includes(product.size)) {
                optionArray[product.color].push({
                    size: product.size,
                    stock: product.stock
                });
                sizeCheck[product.color].push(product.size)
            }
            
        }

        let colorQuery = `SELECT DISTINCT c.name, c.code FROM product_option po, color c WHERE po.color = c.name AND po.product_id = ?`
        connection.query(colorQuery, [id], function(err, res, fields) {
            if (err) throw err;

            rows[0].image = imageArray; // On recompose à partir du 1er resultat, par exemple
            rows[0].option = optionArray; // On recompose à partir du 1er resultat, par exemple
            rows[0].color = res;
            callback(rows[0]);
        });
    });
}

// Renvoit le détail d'une commande, par son id
function getOrder(id, callback) {
    connection.query(_getOrder, [id], function(err, rows, fields) {
        if (err) throw err;
        // La requête renvoit une ligne par image différente du produit, on doit donc recomposer en liste
        productList = []
        for (order of rows) {
        	productList.push({
				id: order.product_id,
				name: order.product,
                color: order.color,
				size: order.size,
				nb: order.nb,
				price: order.product_price,
                image: order.cover_image
			});
        }

        if (rows.length) {
            rows[0].product = productList; // On recompose à partir du 1er resultat, par exemple
            callback(rows[0]);
        }
        else callback(false, 'badOrder'); // S'il y a eu un problème quelconque
    });
}

// Renvoit l'email de l'utilisateur d'une commande par son id
function getOrderEmail(id, callback) {
    connection.query(_getOrderEmail, [id], function(err, rows, fields) {
        if (err) throw err;
        callback(rows[0]); // on renvoit seulement 1 email (le seul à priori)
    });
}

// Renvoit les commandes passées d'un utilisateur
function getUserOrder(user_id, callback) {
    connection.query(_getUserOrder, [user_id], function(err, rows, fields) {
        if (err) throw err;
        callback(rows); 
    });
}

// Renvoit l'email d'un utilisateur
function getUserEmail(user_id, callback) {
    connection.query(_getUserEmail, [user_id], function(err, rows, fields) {
        if (err) throw err;
        callback(rows[0]); 	
    });
}

// Renseigne si l'utilisateur est abonné à la newsletter
function getUserNewsletter(user_id, callback) {
    connection.query(_getUserNewsletter, [user_id], function(err, rows, fields) {
        if (err) throw err;
        callback(rows[0]);  
    });
}

// Renvoit des statistiques globales sur le site
function getAllNewsletter(callback) {
    connection.query(_getAllNewsletter, function(err, rows, fields) {
        if (err) throw err;
        callback(rows);  
    });    
}

// Renvoit des statistiques globales sur le site
function getStat(callback) {
    connection.query(_getStat, function(err, rows, fields) {
        if (err) throw err;
        callback(rows[0]);  
    });    
}

// Ajoute le produit général à la BDD
function addProduct(data) {
    data.images = JSON.parse(data.images)
    data.option = JSON.parse(data.option)

    let cover_image = data.images[data.default_color][0]

	var queryParam = [data.name, data.description, data.price, data.weight, data.available, data.type, cover_image, data.default_color, data.collection]
	connection.query(_addProduct, queryParam, function(err, result) {
	    if (err) throw err;
	    productId = result.insertId;

	    // Ajoute le champ Clothe ou Poster sur la BDD
		switch (data.type) {
			case 'clothe':
				connection.query(_addClothe, [productId, data.clothe_type, data.composition], function(err, result) {
				    if (err) throw err;
				});
				break;

			case 'print':
				connection.query(_addPrint, [productId, data.print_size, data.printing], function(err, result) {
				    if (err) throw err;
				});
				break;

            case 'accessory':
                connection.query(_addAcc, [productId, data.acc_type], function(err, result) {
                    if (err) throw err;
                });
                break;
		}	

        // On ajoute une par une les options à la BDD
        for (let color in data.option) {
            let optionList = data.option[color];
            if (color == "Défaut") color = ""
            // On itère chaque option par couleur
            for (let option_pos=0; option_pos<optionList.length; option_pos++) {
                let option = optionList[option_pos];
                // On règle les valeurs par défaut
                if (optionList.length == 1) option.size = "";

                // On créer le lien entre le produit et l'option             
                let linkImageProduct = `INSERT INTO product_option (product_id, color, size, stock, position) VALUES (?, ?, ?, ?, ?)`;
                connection.query(linkImageProduct, [productId, color, option.size, option.stock, option_pos], function(err, result) {
                    if (err) throw err;
                });
            }            
        }

		// On ajoute une par une les images à la BDD
        for (let color in data.images) {
            let imageList = data.images[color];
            if (color == "Défaut") color = "";
            for (let image_pos=0; image_pos<imageList.length; image_pos++) {
                let image = imageList[image_pos];
                // On verifie si les images n'existent pas déjà
                connection.query(`SELECT * FROM image WHERE name = ?`, [image], function(err, rows, fields) {
                    if (err) throw err;

                    // Si l'image n'existe pas, on l'ajoute à la BDD
                    if (!rows.length) {
                        connection.query(`INSERT INTO image (name) VALUES (?)`, [image], function(err, result) {
                            if (err) throw err;
                            console.log('-> File uploaded')
                            let imageId = result.insertId;

                            // On lie les images au produit dans la BDD
                            let linkImageProduct = `INSERT INTO product_image (product_id, image_id, color, position) VALUES (?, ?, ?, ?)`;
                            connection.query(linkImageProduct, [productId, imageId, color, image_pos], function(err, result) {
                                if (err) throw err;
                            });
                        });
                    }
                    else {
                        // On créer le lien entre le produit et l'image             
                        let linkImageProduct = `INSERT INTO product_image (product_id, image_id, color, position) VALUES (?, ?, ?, ?)`;
                        connection.query(linkImageProduct, [productId, rows[0].id, color, image_pos], function(err, result) {
                            if (err) throw err;
                        });
                    }
                });
            }            
        }

	});
}

// On ajoute une commande à l'historique de la BDD
function addOrder(cart, callback) {
    if (!cart.products.length) return;

    // on calcule le prix totale depuis la BDD (pour plus de securité)
    checkCart(cart, function(new_cart) {
    	cart = new_cart;

        // On ajoute la commande à la BDD
        var queryParam = [
        	cart.user_id, cart.total_cost, cart.subtotal_cost, cart.shipping_cost, cart.shipping_address.string, 
			cart.billing_address, cart.payment_method, cart.shipping_method, cart.voucher_code
		];
        connection.query(_addOrder, queryParam, function(err, result) {
            if (err) throw err;
            orderId = result.insertId;

    		// On construit la query de liaison entre produit et commande
    		var queryParam = [];
			var linkOrderContent = `INSERT INTO order_content (order_id, product_id, size, color, nb, name, price) VALUES `;
			for (i=0; i<cart.products.length; i++) {
				if (i) linkOrderContent += `,`;
				linkOrderContent += `(?, ?, ?, ?, ?, ?, ?)`; // Ajoute le nom à la requête 
                let product_color = cart.products[i].color == "Défaut" ? '' : cart.products[i].color
				queryParam.push(orderId, cart.products[i].id, cart.products[i].option, product_color, cart.products[i].cart_qty, cart.products[i].name, cart.products[i].price)
			}

			// On lie les produits avec la commande
            connection.query(linkOrderContent, queryParam, function(err, result) {
	            if (err) throw err;
	            callback(cart, orderId); // on termine avec la callback
	        });

            // On met à jour la liaison produit/option, notamment les stock
            let queryProductOption = 'SELECT * FROM product_option WHERE product_id = ? AND size = ? AND color = ?';
            for (let product of cart.products) {
                if (product.color == "Défaut") product.color = ''
                connection.query(queryProductOption, [product.id, product.option, product.color], function(err, result) {
                    if (err) throw err;

                    // On modifie seulement si le stock est limité
                    if (result[0].stock >= 0) {
                        // On calcule avec une petite securité sur la valeur (pas en dessous de 0)
                        let new_stock = result[0].stock - product.cart_qty < 0 ? 0 : result[0].stock - product.cart_qty;
                        // On créer le lien entre le produit et l'option             
                        let linkImageProduct = `UPDATE product_option SET stock = ? WHERE product_id = ? AND size = ? AND color = ?`;
                        connection.query(linkImageProduct, [new_stock, product.id, product.option, product.color], function(err, result) {
                            if (err) throw err;
                        }); 
                    }        
                });
            }

            // On met à jour l'utilisation des coupons
            if (cart.voucher_code) {
                checkVoucher(cart.voucher_code, function(voucher, error) {
                    // Si le coupon a une utilisation limité, on décremente
                    if (voucher.nb > 0) {
                        useVoucher([voucher.code, voucher.nb-1], function(err, result) {
                            if (err) throw err;
                        });     
                    }

                    // On lie le coupon avec la personne (1 utilisation par personne)
                    var linkUserVoucher = `INSERT INTO user_voucher (code, user_id) VALUES (?, ?)`;
                    connection.query(linkUserVoucher, [voucher.code, cart.user_id], function(err, result) {
                        if (err) throw err;
                    }); 
                });
            }
        });
    });
}

// Ajoute un email dans les newsletter
function addNewsletter(email, callback) {
    // on vérifie d'abord que l'ancien mdp est valide ...
    connection.query('INSERT INTO newsletter (email) VALUES (?)', [email], function(err, result) {
        console.log('-> Inscription newsletter ! | '+email)
        if (callback) callback();
    });
}

// Ajoute un email dans les newsletter
function removeNewsletter(email, callback) {
    // on supprime l'email de la BDD
    connection.query('DELETE FROM newsletter WHERE email=?', [email], function(err, result) {
        callback();
    });
}

// Change l'adresse d'un utilisateur
function editUserInfo([name, email, tel, id], callback) {
    // On verifie si l'email n'est pas déjà utilisé par un autre utilisateur
    getUserFromEmail(email, function (user) {
        if (user && (user.id != id)) callback('badEmail');
        else {
            connection.query(_editUserInfo, [name, email, tel, id], function(err, rows, fields) {
                if (err) {
                    throw err;
                }
                callback();     
            });
        }
    })
}

// Change les infos d'un utilisateur
function editUserAddress(data, callback) {
    connection.query(_editUserAddress, data, function(err, rows, fields) {
        if (err) throw err;
        callback(); 	
    });
}

// Change le paramètre newsletter d'un utilisateur
function editUserNewsLet([newsletter, email], callback) {
    // Par défaut on supprime l'email avant de le reajouter si besoin
    removeNewsletter(email, function() {
        if (newsletter) {
            addNewsletter(email, function(err, rows, fields) {
                if (err) throw err;
                callback();     
            });
        }
        else {
            if (callback) callback(); 
        }
    })
}

// Change l'ancien mot de passe par un nouveau, après verification
function editUserPassword([user_id, oldPassword, newPassword], callback) {
    // on vérifie d'abord que l'ancien mdp est valide ...
    getUser(user_id, function(user) {
        // on compare les mdp ...
        bcrypt.compare(oldPassword, user.password, function(err, response) {
            if (response) {
                // On hash le nouveau mot de passe à enregistrer dans la DB
                bcrypt.hash(newPassword, 10, function(err, hashedPassword) {                        
                    // on modifie le nouveau mot de passe
                    connection.query(_editUserPassword, [hashedPassword, user_id], function(err, rows, fields) {
                        if (err) throw err;
                        callback();
                    });
                });
            } 
            else {
            	callback('badPassword');
            }
        });
    });
}

// Change l'ancien mot de passe par un nouveau, après verification
function resetUserPassword([email, newPassword], callback) {
    getUserFromEmail(email, function(user) {
        if (user) {
            // On hash le nouveau mdp
            bcrypt.hash(newPassword, 10, function(err, hashedPassword) {                        
                // On change le mot de passe del'utilisateur
                connection.query(_editUserPassword, [hashedPassword, user.id], function(err, rows, fields) {
                    if (err) throw err;
                    callback();
                });
            });
        } else {
            callback('no user')
        }
    });
}

// Modifie le produit général à la BDD
function updateProduct (data) {
    data.image = JSON.parse(data.image)
    data.option = JSON.parse(data.option)

    let cover_image = data.image[data.default_color][0]

	var queryParam = [data.name, data.description, data.price, data.weight, data.available, data.type, cover_image, data.default_color, data.collection, data.id]
	connection.query(_updateProduct, queryParam, function(err, result) {
	    if (err) throw err;

	    // On modifie égalalement les tables clothe ou poster
		switch (data.type) {
			case 'clothe':

				connection.query(_updateClothe, [data.clothe_type, data.composition, data.id], function(err, result) {
				    if (err) throw err;
				});
				break;

			case 'print':
				connection.query(_updatePrint, [data.print_size, data.printing, data.id], function(err, result) {
				    if (err) throw err;
				});
				break;

            case 'accessory':
                connection.query(_updateAcc, [data.acc_type, data.id], function(err, result) {
                    if (err) throw err;
                });
                break;
		}

		// On supprime d'avance toutes les connections entre le produits et des images pour les refaire
		connection.query(`DELETE FROM product_image WHERE product_id = ?`, [data.id], function(err, rows, fields) {
			if (err) throw err;

            // On ajoute une par une les images à la BDD
            for (let color in data.image) {
                let imageList = data.image[color];
                if (color == "Défaut") color = "";
                for (let image_pos=0; image_pos<imageList.length; image_pos++) {
                    let image = imageList[image_pos];
                    // On verifie si les images n'existent pas déjà
                    connection.query(`SELECT * FROM image WHERE name = ?`, [image], function(err, rows, fields) {
                        if (err) throw err;

                        // Si l'image n'existe pas, on l'ajoute à la BDD
                        if (!rows.length) {
                            connection.query(`INSERT INTO image (name) VALUES (?)`, [image], function(err, result) {
                                if (err) throw err;
                                console.log('-> File uploaded')
                                let imageId = result.insertId;

                                // On lie les images au produit dans la BDD
                                let linkImageProduct = `INSERT INTO product_image (product_id, image_id, color, position) VALUES (?, ?, ?, ?)`;
                                connection.query(linkImageProduct, [data.id, imageId, color, image_pos], function(err, result) {
                                    if (err) throw err;
                                });
                            });
                        }
                        else {
                            // On créer le lien entre le produit et l'image             
                            let linkImageProduct = `INSERT INTO product_image (product_id, image_id, color, position) VALUES (?, ?, ?, ?)`;
                            connection.query(linkImageProduct, [data.id, rows[0].id, color, image_pos], function(err, result) {
                                if (err) throw err;
                            });
                        }
                    });
                }            
            }
		});

        // On supprime d'avance toutes les connections entre le produits et des images pour les refaire
        connection.query(`DELETE FROM product_option WHERE product_id = ?`, [data.id], function(err, rows, fields) {
            if (err) throw err;

            // On ajoute une par une les options à la BDD
            for (let color in data.option) {
                let optionList = data.option[color];
                if (color == "Défaut") color = ""
                // On itère chaque option par couleur
                for (let option_pos=0; option_pos<optionList.length; option_pos++) {
                    let option = optionList[option_pos];
                    // On règle les valeurs par défaut
                    if (optionList.length == 1) option.size = "";

                    // On créer le lien entre le produit et l'option             
                    let linkImageProduct = `INSERT INTO product_option (product_id, color, size, stock, position) VALUES (?, ?, ?, ?, ?)`;
                    connection.query(linkImageProduct, [data.id, color, option.size, option.stock, option_pos], function(err, result) {
                        if (err) throw err;
                    });
                }            
            }
        });
	});
}

// Met à jour une commande selon le status passé en paramètre
function updateOrder(status, id, trackNumber) {
    connection.query(_updateOrder, [status, trackNumber, id], function(err, rows, fields) {
        if (err) throw err;
    });
}

// Supprime un produit de la BDD
function removeProduct (id) {
	// On supprime le produit de la BDD
    connection.query(_removeProduct, [id], function(err, rows, fields) {
        if (err) throw err;
        // On supprime également les liens entre le produit et les commandes liées
        /*connection.query(_sync_order, function(err, rows, fields) {
            if (err) throw err;
            connection.query(_sync_order_content, function(err, rows, fields) {
                if (err) throw err;
            });
        }); */
    });

    /*
    // On supprime les vêtement ou poster dediés
    connection.query(`DELETE FROM clothe WHERE product_id=?`, [id], function(err, rows, fields) {
        if (err) throw err;
    });
    connection.query(`DELETE FROM print WHERE product_id=?`, [id], function(err, rows, fields) {
        if (err) throw err;
    });
    connection.query(`DELETE FROM accessory WHERE product_id=?`, [id], function(err, rows, fields) {
        if (err) throw err;
    });
    
    // On supprime également les lien entre le produit et leurs images
    connection.query(`DELETE FROM product_image WHERE product_id=?`, [id], function(err, rows, fields) {
        if (err) throw err;
    });*/
}

// Supprime un produit de la BDD
function removeOrder (id) {
	// On supprime la commande de la BDD
    connection.query(_removeOrder, [id], function(err, rows, fields) {
        if (err) throw err;
    });
    // On supprime les liens entre la commande et les produits
    connection.query(`DELETE FROM order_content WHERE order_id=?`, [id], function(err, rows, fields) {
        if (err) throw err;
    });
}

// Supprime un utilisateur de la BDD
function removeUser (id, callback) {
    connection.query(_removeUser, [id], function(err, rows, fields) {
        if (err) throw err;
        callback();
    });
}

module.exports = {
	login: login,
	signUp: signUp,
	checkCart: checkCart,
    checkVoucher: checkVoucher,
    checkVoucherUser: checkVoucherUser,

	getAllUser: getAllUser,
	getAllProduct: getAllProduct,
    getAllProductSimple: getAllProductSimple,
	getAllOrder: getAllOrder,
	getAllOrderUser: getAllOrderUser,
	getProduct: getProduct,
	getOrder: getOrder,
	getOrderEmail: getOrderEmail,
	getUserOrder: getUserOrder,
	getUserEmail: getUserEmail,
    getUserNewsletter: getUserNewsletter,
    getAllNewsletter: getAllNewsletter,
    getStat: getStat,
    getColors: getColors,

	addProduct: addProduct,
	addOrder: addOrder,
    addNewsletter: addNewsletter,

	editUserPassword: editUserPassword,
    resetUserPassword: resetUserPassword,
	editUserAddress: editUserAddress,
	editUserInfo: editUserInfo,
	editUserNewsLet: editUserNewsLet,

	updateProduct: updateProduct,
	updateOrder: updateOrder,

	removeProduct: removeProduct,
	removeOrder: removeOrder,
	removeUser: removeUser,

    test: test,
    updateDatabase: updateDatabase,
	init: init
};

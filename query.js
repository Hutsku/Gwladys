
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
        database : 'kita_pena'
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
_getAllProductSimple = `SELECT p.id, p.name, description, price, available, p.type, cover_image, composition, clothe.type as clothe_type, weight FROM product p
            LEFT JOIN clothe ON clothe.product_id = p.id
            WHERE p.visible = 1
            ORDER BY id DESC`;
_getAllProduct = `SELECT DISTINCT p.id, p.name, description, price, available, p.type, image.name as image, pi.position as image_pos, composition, clothe.type as clothe_type, weight FROM product p
            INNER JOIN product_image pi ON pi.product_id = p.id
            INNER JOIN image ON image.id = pi.image_id
            LEFT JOIN clothe ON clothe.product_id = p.id
            WHERE p.visible = 1
            ORDER BY id DESC, image_pos`;
_getAllClothe = `SELECT DISTINCT p.id, p.name, description, price, available, p.type, image.name as image, pi.position as image_pos, composition FROM product p 
            INNER JOIN clothe 
            INNER JOIN product_image pi ON pi.product_id = p.id 
            INNER JOIN image ON image.id = pi.image_id 
            WHERE clothe.product_id = p.id AND p.visible = 1
            ORDER BY id DESC, image_pos; `;
_getAllOrder   = `SELECT * FROM \`order\``;
_getAllOrderUser = `SELECT o.id, u.name, u.email, total_cost, shipping_address, o.state, p.id as product_id, oc.name as product, oc.nb, oc.price, voucher
				FROM \`order\` o
                INNER JOIN user u
                INNER JOIN order_content oc ON oc.order_id = o.id 
                LEFT JOIN product p ON oc.product_id = p.id
                WHERE o.user_id = u.id
                ORDER BY id DESC;`;
_getAllBlogArticle = `SELECT blog_id as id, name as image, date, title, description1, description2, position FROM blog
            INNER JOIN blog_image ON blog.id = blog_id
            INNER JOIN image ON image.id = image_id
            ORDER BY position`;

_getUser       = `SELECT * FROM user, address WHERE id = ? AND user_id = id`;
_getUserFromEmail = `SELECT * FROM user, address WHERE email = ? AND user_id = id`;
_getProduct = `SELECT p.id, p.name, description, price, available, p.type, image.name as image, pi.position as image_pos, composition, clothe.type as clothe_type, weight FROM product p
            INNER JOIN product_image pi ON pi.product_id = p.id
            INNER JOIN image ON image.id = pi.image_id
            LEFT JOIN clothe ON clothe.product_id = p.id
            WHERE p.id = ?
            ORDER BY image_pos;`;
_getOrder      = `SELECT o.id, user_id, date, subtotal_cost, shipping_cost, total_cost, billing_address, shipping_address, payment_method, shipping_method, state, p.id as product_id, oc.name as product, oc.nb, oc.price as product_price, cover_image, voucher 
			FROM \`order\` o
            INNER JOIN order_content oc ON oc.order_id = o.id 
            LEFT JOIN product p ON oc.product_id = p.id
            WHERE o.id = ?`;
_getOrderEmail = `SELECT email FROM \`order\` o, user WHERE o.user_id = user.id AND o.id = ?`;
_getUserOrder  = `SELECT * FROM \`order\` WHERE user_id = ?`;
_getUserEmail  = `SELECT email FROM user WHERE id = ?`;
_getUserNewsletter = `SELECT user.email FROM newsletter, user WHERE user.email = newsletter.email AND user.id = ?`;
_getAllNewsletter  = `SELECT email FROM newsletter`;
_getVoucher     = `SELECT * FROM voucher WHERE code = ? AND nb != 0`;
_getBlogArticle = `SELECT blog_id as id, name as image, date, title, description1, description2, position FROM blog
            INNER JOIN blog_image ON blog.id = blog_id
            INNER JOIN image ON image.id = image_id
            WHERE blog_id = ?
            ORDER BY position`;

_checkVoucherUser = `SELECT * FROM voucher v, user_voucher uv WHERE v.code = uv.code AND uv.user_id = ? AND v.code = ?`
_useVoucher       = `UPDATE voucher SET nb = ? WHERE code = ?`;

_addUser        = `INSERT INTO user (name, password, email, tel) VALUES (?, ?, ?, ?)`;
_addAddress     = `INSERT INTO address (user_id, address1, address2, city, postal_code, state, country) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
_addOrder       = `INSERT INTO \`order\` (user_id, date, total_cost, subtotal_cost, shipping_cost, shipping_address, billing_address, payment_method, shipping_method, voucher) 
               VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)`;
_addProduct     = `INSERT INTO product (name, description, price, weight, available, type, cover_image) VALUES (?, ?, ?, ?, ?, ?, ?)`;
_addClothe      = `INSERT INTO clothe (product_id, type, composition) VALUES (?, ?, ?)`;
_addBlogArticle = `INSERT INTO blog (image_id, date, title, description) VALUES (?, ?, ?, ?)`;

_removeProduct = `UPDATE product SET visible = 0 WHERE id = ?`;
_removeOrder   = `DELETE FROM \`order\` WHERE id = ?`;
_removeUser    = `DELETE FROM user WHERE id = ?`;
_removeBlogArticle = `DELETE FROM blog WHERE id = ?`;

_editUserPassword = `UPDATE user SET password = ? WHERE id = ?`;
_editUserAddress  = `UPDATE address SET address1 = ?, address2 = ?, city = ?, country = ?, state = ?, postal_code = ? WHERE user_id = ?`;
_editUserInfo     = `UPDATE user SET name = ?, email = ?, tel = ? WHERE id = ?`;

_updateOrder   = `UPDATE \`order\` SET state = ?, tracking_number = ? WHERE id = ?`;
_updateProduct = `UPDATE product SET name = ?, description = ?, price = ?, weight = ?, available = ?, type = ?, cover_image = ? WHERE id = ?`;
_updateClothe  = `UPDATE clothe SET type = ?, composition = ? WHERE product_id = ?`;
_updateBlogArticle = `UPDATE blog SET image_id = ?, title = ?, description = ? WHERE id = ?`;

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
    connection.query(_getAllProduct, function(err, rows, fields) {
        if (err) throw err;

        if (!rows.length) {
            callback(false);
            return false;
        }

        // On trie les résultats par produit et image
        let productList = [];
        let productCheck = [];
        for (product of rows) {
            if (!productCheck.includes(product.id)) {
                product.image = [product.image];

                productList.push(product);
                productCheck.push(product.id)
            } else {
                let index = productCheck.indexOf(product.id)
                productList[index].image.push(product.image);
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
        					nb: order.nb
        				});
        			}
        		}
        	}
        }
        callback(orderList);
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

        // La requête renvoit une ligne par image différente du produit, on doit donc recomposer en tableau
        imageArray = []
        for (product of rows) {
            imageArray.push(product.image);
        }

        rows[0].image = imageArray; // On recompose à partir du 1er resultat, par exemple
        callback(rows[0]);
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

// Renvoit toutes les newsletter
function getAllNewsletter(callback) {
    connection.query(_getAllNewsletter, function(err, rows, fields) {
        if (err) throw err;
        callback(rows);  
    });    
}

// Renvoit un article de blog selon l'id correspondant
function getBlogArticle(id, callback) {
    connection.query(_getBlogArticle, [id], function(err, rows, fields) {
        if (err) throw err;

        if (!rows.length) {
            callback(false);
            return false;
        }

        // La requête renvoit une ligne par image différente du produit, on doit donc recomposer en tableau
        imageArray = []
        for (article of rows) {
            imageArray.push(article.image);
        }

        rows[0].image = imageArray; // On recompose à partir du 1er resultat, par exemple
        callback(rows[0]);
    });
}

// Renvoit tous les articles de blog
function getAllBlogArticle(callback) {
    connection.query(_getAllBlogArticle, function(err, rows, fields) {
        if (err) throw err;

        if (!rows.length) {
            callback(false);
            return false;
        }

        // On trie les résultats par produit et image
        let articleList = [];
        let articleCheck = [];
        for (article of rows) {
            if (!articleCheck.includes(article.id)) {
                article.image = [article.image];

                articleList.push(article);
                articleCheck.push(article.id)
            } else {
                let index = articleCheck.indexOf(article.id)
                articleList[index].image.push(article.image);
            }
        }
        callback(articleList);
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
    let cover_image = data.images[0]

	let queryParam = [data.name, data.description, data.price, data.weight, data.available, data.type, cover_image]
	connection.query(_addProduct, queryParam, function(err, result) {
	    if (err) throw err;
	    productId = result.insertId;

	    // Ajoute le champ Clothe sur la BDD
		connection.query(_addClothe, [productId, data.clothe_type, data.composition], function(err, result) {
		    if (err) throw err;
		});

		// On ajoute une par une les images à la BDD
        for (let image_pos=0; image_pos<data.images.length; image_pos++) {
            let image = data.images[image_pos];
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
                        let linkImageProduct = `INSERT INTO product_image (product_id, image_id, position) VALUES (?, ?, ?)`;
                        connection.query(linkImageProduct, [productId, imageId, image_pos], function(err, result) {
                            if (err) throw err;
                        });
                    });
                }
                else {
                    // On créer le lien entre le produit et l'image             
                    let linkImageProduct = `INSERT INTO product_image (product_id, image_id, position) VALUES (?, ?, ?)`;
                    connection.query(linkImageProduct, [productId, rows[0].id, image_pos], function(err, result) {
                        if (err) throw err;
                    });
                }
            });
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
			var linkOrderContent = `INSERT INTO order_content (order_id, product_id, nb, name, price) VALUES `;
			for (i=0; i<cart.products.length; i++) {
				if (i) linkOrderContent += `,`;
				linkOrderContent += `(?, ?, ?, ?, ?)`; // Ajoute le nom à la requête 
				queryParam.push(orderId, cart.products[i].id, cart.products[i].cart_qty, cart.products[i].name, cart.products[i].price)
			}

			// On lie les produits avec la commande
            connection.query(linkOrderContent, queryParam, function(err, result) {
	            if (err) throw err;
	            callback(cart, orderId); // on termine avec la callback
	        });

            // Pour chaque produit acheté, on le rend indisponible
            let updateAvailable = `UPDATE product SET available = 0 WHERE id = ?`;
            for (let product of cart.products) {
                connection.query(updateAvailable, [product.id], function(err, result) {
                    if (err) throw err;      
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

// Ajoute un article de blog
function addBlogArticle(data, callback) {
    connection.query(_addBlogArticle, [data.image_id, data.date, data.title, data.description], function(err, result) {
        console.log('-> Article de blog ajouté ! | '+data.title)
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
    let cover_image = data.image[0]

	var queryParam = [data.name, data.description, data.price, data.weight, data.available, data.type, cover_image, data.id]
	connection.query(_updateProduct, queryParam, function(err, result) {
	    if (err) throw err;

	    // On modifie égalalement les tables clothe
		connection.query(_updateClothe, [data.clothe_type, data.composition, data.id], function(err, result) {
		    if (err) throw err;
		});

		// On supprime d'avance toutes les connections entre le produits et des images pour les refaire
		connection.query(`DELETE FROM product_image WHERE product_id = ?`, [data.id], function(err, rows, fields) {
			if (err) throw err;

            // On ajoute une par une les images à la BDD
            for (let image_pos=0; image_pos<data.image.length; image_pos++) {
                let image = data.image[image_pos];
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
                            let linkImageProduct = `INSERT INTO product_image (product_id, image_id, position) VALUES (?, ?, ?)`;
                            connection.query(linkImageProduct, [data.id, imageId, image_pos], function(err, result) {
                                if (err) throw err;
                            });
                        });
                    }
                    else {
                        // On créer le lien entre le produit et l'image             
                        let linkImageProduct = `INSERT INTO product_image (product_id, image_id, position) VALUES (?, ?, ?)`;
                        connection.query(linkImageProduct, [data.id, rows[0].id, image_pos], function(err, result) {
                            if (err) throw err;
                        });
                    }
                });
            }            
        });
	});
}

// Met à jour une commande selon le status passé en paramètre
function updateOrder(status, id, trackNumb) {
    connection.query(_updateOrder, [status, trackNumber, id], function(err, rows, fields) {
        if (err) throw err;
    });
}

// Met à jour un article de blog selon les données entrées
function updateBlogArticle(data) {
    connection.query(_updateBlogArticle, [data.image_id, data.title, data.description], function(err, rows, fields) {
        console.log('-> Article de blog modifié ! |'+data.title)
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

// Supprime un article de blog de la BDD
function removeBlogArticle (id, callback) {
    connection.query(_removeBlogArticle, [id], function(err, rows, fields) {
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
    getBlogArticle: getBlogArticle,
    getAllBlogArticle: getAllBlogArticle,

	addProduct: addProduct,
	addOrder: addOrder,
    addNewsletter: addNewsletter,
    addBlogArticle: addBlogArticle,

	editUserPassword: editUserPassword,
    resetUserPassword: resetUserPassword,
	editUserAddress: editUserAddress,
	editUserInfo: editUserInfo,
	editUserNewsLet: editUserNewsLet,

	updateProduct: updateProduct,
	updateOrder: updateOrder,
    updateBlogArticle: updateBlogArticle,

	removeProduct: removeProduct,
	removeOrder: removeOrder,
	removeUser: removeUser,
    removeBlogArticle: removeBlogArticle,

    test: test,
    updateDatabase: updateDatabase,
	init: init
};

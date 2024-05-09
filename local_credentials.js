/* 
	Ce fichier sert à l'utilisation des identifiants sans passer par vault lors des test local du server. 
	Il ne doit pas être publié sur la version de production, le site web passant par un vault.
*/

var cred = {};

cred.admin = ['arouxel@outlook.fr', 'yoann.dogbe@gmail.com'];

cred.email = {
	user: 'arouxel@strangeday.fr', // gandi cred
	pass: '2wOoWwcz6ajUZs8eEfA0'
};

cred.mysql = {
	user: 'admin',
	pass: 'please'
};

cred.paypal_test = {
	client_id: 'ARu3nwdHXeGAnEZxzWsL-TeFmp7sWInn9ZSyvssU6fYeaqQBiV3ieo6bPMcL6920WfXpvE6rNl3v5-uv',
	secret: 'EC0R7C7eeJR9CqKtl_Sugzvv_oKAhAXCK9ueDU78021hHcZwFSpENQtTSiMLssnWjT1yuCMS7yuRyv_B' 
};
cred.paypal = {
	client_id: 'AZo9MGpggZ0jaK0RqCONVDE3ihcikpWZy563stEyQ6xVON-Rib7VALXAV3Kcdc44fGYduvQ7M36ZDuUk',
	secret:'EEoU4GJCLjISvsKxEKXMVAJ2DCdHjDSWpIkOFl_owdYHUhGpNpfpq7j-6OxfIa6U7koMbs1VXXSnuCE8'
};

cred.stripe_test = {
	secret: 'sk_test_0HJaHUkSg3JE8rkO4P4weCJS00cB00h5K9',
	public: 'pk_test_yPzxYfltlnyWe55PR7jjw4PX00vkHy4ywN',
};
cred.stripe = {
	secret: 'sk_live_ikqdQMhaoX1mYAs90qgfknEV00V6PC83VU',
	public: 'pk_live_baFcwuwS0lhEHOZ2GylNjE2d00dVtGYtMI',
};

module.exports = cred;
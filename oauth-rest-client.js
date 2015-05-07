/**
 * @fileOverview Main file of this library. (Actually the only file in here containing code).
 * For a more complete example, please refer to the official github repository at https://github.com/cmd-johnson/oauth-rest-client
 * @example <caption>Basic usage</caption>
 * // illustrates the basic usage of this library, for more information on the different function
 * // calls, please refer to the corresponding function's documentation
 * 
 * // get the OauthRestClient class
 * var OauthRestClient = require('rest-oauth-client');
 * // create a new client object
 * var client = new OauthRestClient(...);
 * 
 * // call the redirectToLogin function to redirect the user to the oauth login page
 * router.get('/oauth2/login', function(req, res) {
 *   client.redirectToLogin(res);
 * });
 * 
 * // call requestTokens when the user returns from the login page to get the users access token
 * router.get('/oauth2/callback', function(req, res, next) {
 *   client.requestTokens(...);
 * });
 * 
 * // use the oauth tokens of the user to make an authenticated api call
 * router.get('/showmesomeinfo', function(req, res, next) {
 *   client.request(...);
 * });
 * 
 * @author Jonas Auer <jonas.auer.94@gmail.com>
 * @version 0.1.0
 */

/**
 * TODO: add support for custom default parameters and headers used in each individual request 
 * TODO: add support for renaming all those query strings (e.g. client_id -> clientId or whatever)
 * TODO: automated refresh-token handling
 */

// import dependencies
/** @ignore */
var request = require('request');

// export the OauthClient class
module.exports = OauthRestClient;

/**
 * Creates a new OauthRestClient
 * @class
 * 
 * @param {object} config the configuration object of the client, refer to the class properties to see possible values
 * 
 * @property {string} clientId the id of your client, assigned to your app by the oauth provider
 * @property {string} clientSecret the secret of your client, get it from your oauth provider
 * @property {string} loginUrl the url to redirect the user to when it is time to get his tokens
 * @property {string} tokenUrl the url where this class will send token requests to
 * @property {string} callbackUrl the url the user gets redirected to when returning from the login page
 */
function OauthRestClient(config) {
	this.clientId = config.clientId || '';
	this.clientSecret = config.clientSecret || '';
	this.loginUrl = config.loginUrl || '';
	this.tokenUrl = config.tokenUrl || '';
	this.callbackUrl = config.callbackUrl || null;
}

/**
 * Redirects the user-agent to the login url, adding the given options to the
 * query of the redirection url.
 * 
 * @example
 * router.get('/oauth2/login', function(req, res) {
 *   client.redirectToLogin(res, {
 *     scope: 'public',
 *     state: 'someuniquestate'
 *   });
 * });
 * 
 * @param {Response} clientResponse the response object obtained from a client request
 * @param {object} options may contain key-value pairs that will be added to the
 *                         redirection-url's query, possibly overriding default values
 */
OauthRestClient.prototype.redirectToLogin = function(clientResponse, options) {
	// fixed url prefix
	var redirectUrl = this.loginUrl + '?client_id=' + this.clientId;
	
	// set the callback url set in the constructor if it was set, but prefer
	// redirect urls that where given with the options object
	if (this.callbackUrl && !options.redirect_uri) {
		redirectUrl += '&redirect_uri=' + this.callbackUrl;
	}
	
	// copy all key-value pairs of the options object into the url's query
	Object.keys(options).forEach(function(key) {
		redirectUrl += '&' + key + '=' + options[key];
	});
	
	// redirect the user-agent to the url we just built
	clientResponse.redirect(redirectUrl);
};

/**
 * This callback is called whenever a token request completed.
 * @callback OauthRestClient~tokenCallback
 * @param {object|null} error the error that occurred during the token request (if any)
 * @param {object|null} tokens the tokens returned by the token request (if any)
 * @param {string} tokens.access_token the access-token you can use to make authenticated api calls
 * @param {string|null} tokens.token_type the type of access-token you received (typically 'Bearer')
 * @param {number|null} tokens.expires_in time (in seconds) in wich the access-token will expire
 * @param {string|null} tokens.refresh_token the refresh-token used to get a new access-token if the old one expired
 */

/**
 * Requests an access-token using the code the user-agent passed to your
 * server when being redirected from the oauth server.
 * 
 * @example
 * // put this call at the url the user gets redirected to from the login page
 * router.get('/oauth2/callback', function(req, res, next) {
 *   client.requestTokens(req.query.code, function(err, tokens) {
 *     if (err) return next(err); // perform some error handling
 *     // save your tokens for later use (put them in the users session or a database or whatever)
 *     req.session.oauthTokens = tokens;
 *     res.redirect('/somepage');
 *   });
 * });
 * 
 * @param {string} code the authorization code to get access tokens from
 * @param {object} [urlOptions] options added to the url-object (i.e. custom headers, ...)
 * @param {OauthRestClient~tokenCallback} the function to call when the token request returned
 * 
 * @todo allow for different return formattings (e.g. xml, ...)
 * @todo allow configuration of property names (not all apis return the access-token as 'access_token', ...) 
 */
OauthRestClient.prototype.requestTokens = function(code, urlOptions, tokenCallback) {
	// if no urlOptions were given, put the tokenCallback in the correct parameter
	if (!tokenCallback && typeof urlOptions === 'function') {
		tokenCallback = urlOptions;
		urlOptions = {};
	}
	// build the token request url
	urlOptions.url = this.tokenUrl + '?grant_type=authorization_code'
			+ '&code=' + code;
	
	// request out tokens (currently only JSON responses are accepted)
	request.post(urlOptions, function(error, response, body) {
		console.log(JSON.stringify(response));
		console.log(body);
		if (error || response.statusCode !== 200) {
			console.log('error: ' + error);
			return tokenCallback(error);
		}
		var result = JSON.parse(body);
		
		// call the callback with the returned tokens
		return tokenCallback(null, result);
	});
};

/**
 * This callback is called whenever a token request completed.
 * @callback OauthRestClient~requestCallback
 * @param {object|null} error the error that occurred during the request (if any)
 * @param {object|null} response the response object that the request returned
 * @param {string|null} body the unparsed body of the response
 */

/**
 * all allowed methods for http requests 
 * @ignore
 */
var ALLOWED_METHODS = [ 'get', 'post', 'put', 'del', 'patch' ];

/**
 * Requests the given url using the method provided, passing the tokens in the authorization-header.
 * 
 * @example
 * router.get('/showmesomeinfo', function(req, res, next) {
 *   client.request('get', 'https://somewebsite.com/api/totalyimportantthings',
 *       req.session.oauthTokens.access_token,
 *       function(err, response, body) {
 *         if (err) return next(err);
 *         var data = JSON.parse(body);
 *         // do something with your data!
 *         res.json(data);
 *       });
 * });
 * 
 * @param {string} method the method to use for the request (i.e. 'get', 'post', 'put', 'del', 'patch')
 * @param {string|object} url the url or url-object to use for the request
 * @param {string} tokens the token-object to use for the request
 * @param {string} tokens.access_token the access-token to use for the request
 * @param {string} tokens.token_type the type of the access-token (e.g. 'Bearer')
 * @param {OauthRestClient~requestCallback} requestCallback the function to call when the request returned
 * 
 * @todo check if correct parameters were passed (e.g. the tokens-object contains all required fields)
 * @todo introduce actual error-objects to differenciate the different errors that can
 *       occur (e.g. auth-token expired, method is not supported, ...)
 * @todo somehow handle expired access-tokens by automatically using the refresh-token to get a new one
 *       if that request failed, pass the error on to the client
 */
OauthRestClient.prototype.request = function(method, url, tokens, requestCallback) {
	// convert the url to a url-object if only a string was given
	if (typeof url === 'string') {
		url = { url: url };
	}
	
	// initialize the header object if it doesn't exist yet
	if (!url.headers) {
		url.headers = {};
	}
	
	// set the authorization-header for making the request
	url.headers['Authorization'] = tokens.token_type + ': ' + tokens.access_token;
	
	// check if the given method is supported
	if (ALLOWED_METHODS.indexOf(method) < 0) {
		return requestCallback('The given method is not supported by this library!');
	}
	
	// actually make our request - since the callback used by the request-module has the same
	// signature as requestCallback, just pass it into the request
	request[method](url, requestCallback);
};

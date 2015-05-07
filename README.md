# rest-oauth-client
Helps you access OAuth 2.0 authenticated REST-APIs.

==Basic Usage==
Most commonly you'll want to use this library in combination with express. However, it doesn't depend on anything only provided by express (except a single redirection, I'll change that behavior later to completely decouple this module from express), so you can use it with whatever you like.
The example uses the express module to set up a simple server that accesses an OAuth 2.0 authenticated REST-API that produces JSON responses, as well as express-session and cookie-parser to save the access-tokens.

For a "visual" description of the OAuth 2.0 authorization-code flow, please refer to [RFC-6749](http://tools.ietf.org/html/rfc6749#section-4.1)
I added comments referencing to the steps described in that document (A through E).

```javascript
// import used modules
var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var OauthRestClient = require('oauth-rest-client');

// set up our server
var app = express();
app.use(cookieParser());
app.use(session({
	secret: 'pssssst!'
}));

// initialize the client 
var client = new OauthRestClient({
	clientId: 'clientId',
	clientSecret: 'secret',
	loginUrl: 'https://somewebsite.io/oauth2/login', // the url to redirect the user to when logging in
	tokenUrl: 'https://somewebsite.io/oauth2/token', // the url to send the authentication token to in order to get the access and refresh tokens
	callbackUrl: 'http://localhost:3000/oauth2/callback' // the url that the login page should redirect back to
});

/* (A) */
// redirect the user to the oauth service login page
app.get('/sso/login', function(req, res, next) {
	client.redirectToLogin(res, {
		response_type: 'code',
		scope: '', // the scope parameter to set when redirecting the user to the login page of the oauth server
		state: '' // optional, but recommended, see http://www.thread-safe.com/2014/05/the-correct-use-of-state-parameter-in.html
	});
});

/* (B) */
// only on user-agent side, nothing to do here!

/* (C) */
// the user returns with the authorization code in the address bar
app.get('/oauth2/callback', function(req, res) {
	/* (D) */
	// we request the access- and (optional) refresh-tokens
	var urlOptions = {
		headers: {
			'Authorization': 'Basic i2o...rEg=' // add some custom headers
		}
	};
	console.log('requesting tokens');
	// values added to the url request object
	client.requestTokens(req.query.code, urlOptions, function(err, tokens) {
		/* (E) */
		// do something with the returned tokens (i.e. save them or something)
		if (err) {
			return; // do some error handling!
		}
		req.session.oauthTokens = tokens;
		res.json(tokens);
	});
});

// start our server!
app.listen(3000);
```


# Rest-OAuth-Client
Helps you access OAuth 2.0 authenticated REST-APIs.

## Features
For the time being, this module only supports the *access-code* authorization grant.
Support for additional grant types is planned, especially automated refresh-token
usage, meaning if a call fails due to an expired access-token, the refresh-token
will automatically be used to get a new access-token. Only if that request fails
or the user doesn't have a refresh token, the error will be forwarded to your
application.

Another feature on the roadmap is HATEOAS support, providing you a simple interface
to traverse and explore HATEOAS compliant REST-APIs. In order to do that, I'll also
add JSON (and later XML) support, so you don't have to do all the parsing on your own.

their SSO service, however, I'll add some proper tests later on.
I (manually) tested the module against the EVE-Online CREST-API in combination with

## Basic Usage
Most commonly you'll want to use this library in combination with express. However,
it doesn't depend on anything only provided by express (except a single redirection,
I'll change that behavior later to completely decouple this module from express),
so you can use it with whatever you like.
The example uses the express module to set up a simple server that accesses an
OAuth 2.0 authenticated REST-API that produces JSON responses, as well as
express-session and cookie-parser to save the access-tokens.

For a "visual" description of the OAuth 2.0 authorization-code flow, please refer to
[RFC-6749](http://tools.ietf.org/html/rfc6749#section-4.1). I added comments
referencing to the steps described in that document (A through E), so you can get a
better view of whats going on here.

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
	// the unique id of your client
	clientId: 'clientId',
	// your client's secret
	clientSecret: 'secret',
	// the url to redirect the user to when logging in
	loginUrl: 'https://somewebsite.io/oauth2/login',
	// the url to send the authentication token to in order
	// to get the access and refresh tokens
	tokenUrl: 'https://somewebsite.io/oauth2/token',
	// the url that the login page should redirect back to
	callbackUrl: 'http://localhost:3000/oauth2/callback'
});

/* (A) */
// redirect the user to the oauth service login page
app.get('/sso/login', function(req, res, next) {
	client.redirectToLogin(res, {
		response_type: 'code',
		// the scope parameter to set when redirecting the
		// user to the login page of the oauth server
		scope: '',
		// optional, but recommended, see
		// http://www.thread-safe.com/2014/05/the-correct-use-of-state-parameter-in.html 
		state: ''
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
			// add some custom headers
			'Authorization': 'Basic i2o...rEg='
		}
	};
	// values added to the url request object
	client.requestTokens(req.query.code, urlOptions, function(err, tokens) {
		/* (E) */
		// do something with the returned tokens (i.e. save them or something)
		if (err) {
			return; // do some error handling!
		}
		req.session.oauthTokens = tokens;
		// now you're free to do whatever you like!
		res.send('Login successful!');
	});
});

// make an authenticated request
app.get('/api/info', function(req, res) {
	client.request('get', 'https://somewebsite.io/api/whoami', req.session.oauthTokens,
			function(err, response, body) {
				if (err) return; // error handling
				res.send(JSON.parse(body).userName);
			});
});

// start our server!
app.listen(3000);
```


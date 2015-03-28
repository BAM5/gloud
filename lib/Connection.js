var fs		= require("fs");
var url		= require("url");
var https	= require("https");
var JWT		= require("jsonwebtoken");
var Class	= require("ClassConstructor");

module.exports = CloudConnection = Class(
	
	/**
	 * @constructor
	 * 
	 * @param {Object}			options
	 *		An object whose properties are used to configure the returned Connection Object
	 * 
	 * @param {String|Object}	options.jsonKey
	 *		A string that points to the json key file, or the object itself.
	 *	
	 * @param {String|String[]}	options.scopes
	 *		A string or array of strings that define the permissions that the connection should request
	 */
	function CloudConnection(options){
		if(!options.jsonKey && !options.accessToken)
			throw new Error("Argument Error: Expected property jsonKey or accessToken on options object");
		
		if(typeof options.jsonKey === "string") // Load json object from file
			fs.readFile(options.jsonKey, {encoding: "utf8"}, this._jsonFromFile.bind(this));
		else
			this._jsonKey = options.jsonKey;
	},
	
	{
		
	},

	{
		_jsonFromFile: function(err, data){
			this._jsonKey = JSON.parse(data);
			if(this._queue){
				
			}
		},
		
		/**
		 * A wrapper for the http.request method that adds in the required authorization token.
		 * Most likely properties to set on the options object are path
		 * @public
		 * @param {type} options
		 *		Accepts the same options that https.request will. Plus a scopes property.
		 * @param {type} options.scopes
		 *		The permission scopes that this request requires.
		 *		If the access token associated with this connection object does not have the scopes required then the request will be put off until a new access token with appropriate permissions is requested and received.
		 * @param {type} callback
		 * @returns {undefined}
		 */
		request: function(options, reqReady, callback){
			// Get new access token if request requires additional permissions not present on the token, or the token is expired.
			if(!this._accessToken || this._accessToken.expired || (options.scopes && !this._accessToken.hasPermission(options.scopes))){
				console.log("Requesting new Access Token");
				// Request a new access token, then redo this request call.
				var aTokenOpts = {};
				var aTokenCB = (function(err, accessToken){
					if(err){
						reqReady(err);
						return;
					}
					console.log("Successfully received new Access Token");
					this._accessToken = accessToken;
					this.request(options, reqReady, callback);
				}).bind(this);
				
				if(this._accessToken && options.scopes && !this._accessToken.hasPermission(options.scopes))
					aTokenOpts.scopes = options.scopes;
				
				if(this._accessToken){
					console.log("Requesting a token from existing token.");
					this._accessToken.renew(aTokenOpts, aTokenCB);
				} else{
					console.log("Requesting a fresh token.");
					aTokenOpts.jsonKey = this._jsonKey;
					aTokenOpts.scopes = options.scopes;
					console.log(this._jsonKey);
					AccessToken.RequestToken(aTokenOpts, aTokenCB);
				}
				
				return;
			}
			
			console.log("Executing API request.");
			
			options.hostname = "www.googleapis.com";
			
			if(!("headers" in options)) options.headers = {};
			options.headers["Connection"]		= "keep-alive";
			options.headers["Authorization"]	= "Bearer "+this._accessToken.token;
			
			console.log(options);
			
			var req = https.request(options, callback);
			reqReady(null, req);
			return req;
		}
	}
);

CloudConnection.AccessToken = AccessToken = Class(
	
	/**
	 * @constructor
	 */
	function AccessToken(requestOptions, jsonResponse){
		if(typeof jsonResponse === "string")
			jsonResponse = JSON.parse(jsonResponse);
		
		this._requestOpts = requestOptions;
		this._response = jsonResponse;
		
		this._received = Date.now();
		this._expiresAt = this._received + this._response.expires_in*1000 - 15000; //report expiration 15 seconds before actual expiration
	},
	
	{
		/**
		 * @param {Object}			options
		 *		An object whose properties are used to define the desired token request.
		 *	
		 * @param {String|String[]}	options.scopes
		 *		A string or array of strings that define the permissions the returned token should have
		 *	
		 * @param {String|String[]}	options.jsonKey
		 *		A string or array of strings that define the permissions the returned token should have
		 *	
		 * @param {function}		callback
		 *		A callback function(err, AccessToken)
		 */
		RequestToken: function(options, callback){
			var requestBody = "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=";
			if(!Array.isArray(options.scopes)) options.scopes = [options.scopes];
			var requestToken = JWT.sign({
				// The email address of the service account.
				iss:	options.jsonKey.client_email,

				// A space-delimited list of the permissions that the application requests.
				scope:	options.scopes.join(" "),

				// A descriptor of the intended target of the assertion. When making an access token request this value is always
				aud:	"https://accounts.google.com/o/oauth2/token",

				// The expiration time of the assertion, specified as seconds since 00:00:00 UTC, January 1, 1970. This value has a maximum of 1 hour after the issued time.
				exp:	Date.now()/1000 + 30,

				//The time the assertion was issued, specified as seconds since 00:00:00 UTC, January 1, 1970.
				iat:	Date.now()/1000
			}, options.jsonKey.private_key, {algorithm: "RS256"});
			
			var req = https.request({
					host:	"accounts.google.com",
					path:	"/o/oauth2/token",
					method:	"post",
					agent:	false,
					
					headers: {
						"Content-Type":		"application/x-www-form-urlencoded",
						"Content-Length":	requestBody.length + requestToken.length
					}
				},
				function(res){
					if(res.statusCode !== 200) callback(new Error("Status code of response was not 200 ("+res.statusCode+")"));
					
					res.setEncoding("utf8");
					res.on("readable", function(){
						var body = res.read(res.headers["content-length"]);
						if(!body) return;
						res.removeAllListeners();
						callback(null, new AccessToken(options, body));
					});
				}
			);
			req.write(requestBody);
			req.end(requestToken);
		}
	},
	
	{
		/**
		 * Whether or not this token has expired
		 * @public
		 * @readonly
		 */
		expired: {
			configurable:	true,
			enumerable:		true,

			get: function(){
				return Date.now() > this._expiresAt;
			}
		},
		
		token: {
			configurable:	true,
			enumerable:		true,

			get: function(){ return this._response.access_token; }
		},

		type: {
			configurable:	true,
			enumerable:		true,

			get: function(){ return this._response.token_type; }
		},

		scopes: {
			configurable:	true,
			enumerable:		true,

			get: function(){ return this._requestOpts.scopes; }
		},
		
		/**
		 * @public
		 * @param {String|String[]}	scopes
		 *		A string or array of strings that define the permissions the returned token should have
		 */
		hasPermission: function(scopes){
			if(Array.isArray(scopes)){
				for(var i = 0; i<scopes.length; i++)
					if(!this.hasPermission(scopes[i]))
						return false;
				
				return true;
			} else
				return this._requestOpts.scopes && this._requestOpts.scopes.indexOf(scopes) !== -1;
		},
		
		/**
		 * Will return a new AccessToken with the same scopes and options as this token.
		 * Takes the same parameters as AccessToken.RequestToken, if options is ommited completely then the options of the original request will be used.
		 * @param {Object} [options]
		 */
		renew: function(options, callback){
			if(typeof options === "function"){
				callback = options;
				options = null;
			}
			if(options){
				if(options.scopes){
					if(!Array.isArray(options.scopes))
						options.scopes = [options.scopes];
					
					if(Array.isArray(this._requestOpts.scopes))
						options.scopes = options.scopes.concat(this._requestOpts.scopes);
					else
						options.scopes.push(this._requestOpts.scopes);
				}
				
				if(!options.jsonKey) options.jsonKey = this._requestOpts.jsonKey;
			} else
				options = this._requestOpts;
			
			AccessToken.RequestToken(options, callback);
		}
	}
);
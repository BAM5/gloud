var Class	= require("ClassConstructor");

module.exports = Datastore = Class(
	
	/**
	 * @constructor
	 * @param {Object}			options
	 *		An object whose properties are used to configure the returned Connection Object
	 * 
	 * @param {CloudConnection}	options.connection
	 *		A cloud connection object through which this object will communicate with google's servers.
	 * 
	 * @param {String|Object}	options.jsonKey
	 *		A string that points to the json key file, or the object itself. Will be passed to a new CloudConnection object
	 */
	function Datastore(options){
		if(!options) options = {};
		
		if(options.connection)
			this.connection = options.connection;
		else if(options.jsonKey)
			this.connection = new require("./Connection")({jsonKey: options.jsonKey});
		else
			throw new Error("No connection or jsonKey supplied. Cannot connect to storage without a connection.");
		
		this.datasetId = options.datasetId;
		this.namespace = options.namespace;
	},
	
	{
		_Current: null
	},

	{
		connection: {
			configurable:	true,
			enumerable:		true,
			
			get: function(){ return this._connection; },
			
			set: function(newConnection){
				if(!(newConnection instanceof CloudConnection))
					throw new Error("Argument Error: connection can only be set to instances of CloudConnection");
				
				this._connection = newConnection;
			}
		},
		
		datasetPath: {
			configurable:	true,
			enumerable:		true,
			
			get: function(){ return "/datastore/v1beta2/datasets/"+this.datasetId; }
		},
		
		/**
		 * Allocates ids on the server so it won't assign the id to any new entity.
		 * 
		 * @param {Key|Key[]} keys
		 *		A key, or array of keys to allocate on the datastore.
		 *	
		 * @param {Function} callback
		 *		callback(err) if err is not set then the call to allocate the ids was successful
		 */
		allocateIds: function(keys, callback){
			if(keys instanceof Key)
				keys = [keys];
			
			Datastore._Current = this;
			// We are serializing the data now as opposed to when the request is ready to the data being sent to the server cannot change before the request is ready
			var body = JSON.stringify({keys: keys});
			Datastore._Current = null;
			
			this.connection.request({
				method:	"POST",
				path:	this.datasetPath+"/allocateIds",
				scopes:	["https://www.googleapis.com/auth/datastore", "https://www.googleapis.com/auth/userinfo.email"],
				headers: {
					"Content-Length":	body.length,
					"Content-Type":		"application/json"
				}
			}, function(err, req){
				if(err){
					callback(err);
					return;
				}
				console.log("Making ID Allocation request");
				req.end(body);
			}, function(res){
				if(res.statusCode !== 200){
					callback(new Error("The staus code of the http response was not OK: "+res.statusCode));
					return;
				} 
				var body = "";
				res.on("data", function(chunk){
					body += chunk;
				});
				res.once("end", function(){
					res.removeAllListeners();
					body = JSON.parse(body);
					body.keys.forEach(function(keyJSON, i, arr){
						arr[i] = Key.FromJSON(keyJSON);
					});
					console.log("Allocation response Received");
					console.log(body);
					callback(null, body);
				});
			});
		},
		
		beginTransaction: function(isolationLevel, callback){
			return new Transaction({isolationLevel: isolationLevel, datastore: this}, callback);
		},
		
		commit: function(mutation, callback){
			/*
			if(typeof transaction === "function"){
				callback = transaction;
				transaction = undefined;
			}
			if(transaction && transaction instanceof Transaction)
				transaction = transaction.transactionID;
			*/
		   
			if(typeof mutation !== "string"){
				Datastore._Current = this;
				mutation = JSON.stringify(mutation);
				Datastore._Current = null;
			}
			
			this.connection.request({
				method:	"POST",
				path:	this.datasetPath+"/commit",
				scopes:	["https://www.googleapis.com/auth/datastore", "https://www.googleapis.com/auth/userinfo.email"],
				headers: {
					"Content-Length":	mutation.length,
					"Content-Type":		"application/json"
				}
			}, function(err, req){
				if(err){
					callback(err);
					return;
				}
				console.log("Making commit request");
				req.end(mutation);
			}, function(res){
				if(res.statusCode !== 200){
					callback(new Error("The staus code of the http response was not OK: "+res.statusCode));
					return;
				}
				var body = "";
				res.on("data", function(chunk){
					body += chunk;
				});
				res.once("end", function(){
					res.removeAllListeners();
					console.log("Commit response Received");
					if(res.headers["content-type"] === "application/json"){
						body = JSON.parse(body, Entity.EntityReviver);
						if(body.mutationResults.insertAutoIdKeys)
							body.mutationResults.insertAutoIdKeys.forEach(function(keyJSON, i, arr){
								arr[i] = Key.FromJSON(keyJSON);
							});
					}
					callback(null, body);
				});
			});
		},
			// These are all just abstractions of commit
			upsert: function(entities, callback){
				if(!Array.isArray(entities))
					entities = [entities];
				
				var mutation = { upsert: entities };
				this.commit(mutation, callback);
			},
			
			update: function(entities, callback){
				if(!Array.isArray(entities))
					entities = [entities];
				
				var mutation = { update: entities };
				this.commit(mutation, callback);
			},
			
			/**
			 * Will act as both an insert and insertAutoId mutation.
			 * It can even accept a mixture of the two in the entities array.
			 * @param {Entity|Entity[]} entities
			 *		An entity or array of entities to insert
			 * @param {Function} callback
			 *		The same callback signature as commit accepts.
			 */
			insert: function(entities, callback){
				if(!Array.isArray(entities))
					entities = [entities];
				
				var mutation = { insert: [], insretAutoId: [] };
				
				entities.forEach(function(entity){
					if(entity.key.autoId)
						mutation.insertAutoId.push(entity);
					else
						mutation.insert.push(entity);
				});
				
				this.commit(mutation, callback);
			},
			
			delete: function(keys, callback){
				if(!Array.isArray(keys)) keys = [keys];
				this.commit({delete: keys}, callback);
			},
			
			
		
		lookup: function(keys, callback){
			
			var body;
			
			if(typeof keys !== "string"){
				if(!Array.isArray(keys))
					keys = [keys];
				Datastore._Current = this;
				body = JSON.stringify({keys: keys});
				Datastore._Current = null;
			} else
				body = keys;
			
			this.connection.request({
				method:	"POST",
				path:	this.datasetPath+"/lookup",
				scopes:	["https://www.googleapis.com/auth/datastore", "https://www.googleapis.com/auth/userinfo.email"],
				headers: {
					"Content-Length":	body.length,
					"Content-Type":		"application/json"
				}
			}, function(err, req){
				if(err){
					callback(err);
					return;
				}
				console.log("Making lookup request");
				req.end(body);
			}, function(res){
				if(res.statusCode !== 200){
					callback(new Error("The staus code of the http response was not OK: "+res.statusCode));
					return;
				}
				var body = "";
				res.on("data", function(chunk){
					body += chunk;
				});
				res.once("end", function(){
					res.removeAllListeners();
					console.log("Lookup response Received");
					if(res.headers["content-type"] === "application/json"){
						body = JSON.parse(body, Entity.EntityReviver);
						if(body.mutationResults.insertAutoIdKeys)
							body.mutationResults.insertAutoIdKeys.forEach(function(keyJSON, i, arr){
								arr[i] = Key.FromJSON(keyJSON);
							});
					}
					callback(null, body);
				});
			});
		},
		
		/**
		 * Queries the database for information
		 * @param {Datastore.Query|Object|String} query
		 * @param {function} callback callback(err, results)
		 */
		query: function(query, callback){
			
			var body;
			
			if(typeof query !== "string"){
				Datastore._Current = this;
				body = JSON.stringify({keys: keys});
				Datastore._Current = null;
			} else
				body = query;
			
			this.connection.request({
				method:	"POST",
				path:	this.datasetPath+"/runQuery",
				scopes:	["https://www.googleapis.com/auth/datastore", "https://www.googleapis.com/auth/userinfo.email"],
				headers: {
					"Content-Length":	body.length,
					"Content-Type":		"application/json"
				}
			}, function(err, req){
				if(err){
					callback(err);
					return;
				}
				console.log("Making query request");
				req.end(body);
			}, function(res){
				if(res.statusCode !== 200){
					callback(new Error("The staus code of the http response was not OK: "+res.statusCode));
					return;
				}
				var body = "";
				res.on("data", function(chunk){
					body += chunk;
				});
				res.once("end", function(){
					res.removeAllListeners();
					console.log("Query response Received");
					if(res.headers["content-type"] === "application/json"){
						body = JSON.parse(body, Entity.EntityReviver);
						if(body.mutationResults.insertAutoIdKeys)
							body.mutationResults.insertAutoIdKeys.forEach(function(keyJSON, i, arr){
								arr[i] = Key.FromJSON(keyJSON);
							});
					}
					callback(null, body);
				});
			});
		},
		
		/**
		 * A helper function for creating a key with the partition set to this datastore
		 */
		key: function(keyData){
			return new Key(keyData, this);
		}
	}
);

require("./Key");
require("./Entity");
require("./EntityModel");
require("./Query");
require("./Transaction");
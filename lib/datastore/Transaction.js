var Class		= require("ClassConstructor");
var Datastore	= require("./Datastore.js");

Datastore.Transaction = Transaction = Class(
	
	/**
	 * 
	 * @param {Object|Datastore} options
	 * @param {Function} readyCB(err, transactionInstance)
	 * @returns {Transaction}
	 */
	function Transaction(options, readyCB){
		if(options instanceof Datastore)
			options = {datastore: options};
		
		this._datastore = options.datastore;
		this._isolation = options.isolationLevel || "snapshot";
		
		// Default is snapshot, so if not snapshot we have to specify the isolationLevel to the request
		if(this._isolation !== "snapshot")
			var body = "{\"isolationLevel\": \""+this._isolation+"\"}";
		
		var requestOpts = {
			method:	"POST",
			path:	this._datastore.datasetPath+"/beginTransaction",
			scopes:	["https://www.googleapis.com/auth/datastore", "https://www.googleapis.com/auth/userinfo.email"]
		};
		
		if(body)
			requestOpts.headers = {
				"Content-Length":	body.length,
				"Content-Type":		"application/json"
			};
		
		var self = this;
		this._datastore._connection.request(requestOpts,
		function(err, req){
			req.end(body);
		}, function(res){
			if(res.statusCode !== 200){
				readyCB(new Error("The request to create a new transaction did not complete successfuly."));
				return;
			}
			var body = "";
			res.on("data", function(chunk){
				body += chunk;
			});
			res.once("end", function(){
				res.removeAllListeners();
				this.transactionID = JSON.parse(body).transaction;
				self.ready = true;
				readyCB(null, self);
			});
		});
	},
	
	null,
	
	{
		commit: function(mutation, callback){
			if(!this.ready){
				throw new Error("The transaction object is not ready.")
				return;
			}
			
			mutation.transaction = this.transactionID;
			this._datastore.commit(mutation, callback);
		},
			// These are all just abstractions of commit
			// These are all just abstractions of commit
			upsert: function(entities, callback){
				if(!Array.isArray(entities))
					entities = [entities];
				
				var mutation = { transaction: this.transactionID, upsert: entities };
				this.commit(mutation, callback);
			},
			
			update: function(entities, callback){
				if(!Array.isArray(entities))
					entities = [entities];
				
				var mutation = { transaction: this.transactionID, update: entities };
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
				
				var mutation = { transaction: this.transactionID, insert: [], insretAutoId: [] };
				
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
				this.commit({transaction: this.transactionID, delete: keys}, callback);
			},
			
		
		lookup: function(keys, callback){
			if(!this.ready){
				throw new Error("The transaction object is not ready.")
				return;
			}
			
			if(!Array.isArray(keys))
				keys = [keys];
			Datastore._Current = this;
			var body = JSON.stringify({ readOptions: {transaction: this.transactionID}, keys: keys});
			Datastore._Current = null;
			
			this._datastore.lookup(body, callback);
		},
		
		/**
		 * 
		 * @param {Datastore.Query|Object} query
		 * @param {type} callback
		 * @returns {undefined}
		 */
		query: function(query, callback){
			if(!this.ready){
				throw new Error("The transaction object is not ready.")
				return;
			}
			
			if(query instanceof Datastore.Query)
				query = query.toJSON();
			
			query.readOptions = {transaction: this.transactionID};
			
			this._datastore.query(query, callback);
		},
		
		rollback: function(callback){
			if(!this.ready){
				throw new Error("The transaction object is not ready.")
				return;
			}
			
			var body = JSON.stringify({transaction: this.transactionID});
			
			this.connection.request({
				method:	"POST",
				path:	this._datastore.datasetPath+"/rollback",
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
				console.log("Making Rollback request for "+this.transactionID);
				req.end(body);
			}, function(res){
				if(res.statusCode !== 200){
					callback(new Error("The staus code of the http response was not OK: "+res.statusCode));
				} else callback();
			});
		},
	}
);
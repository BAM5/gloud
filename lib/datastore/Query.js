var Class		= require("ClassConstructor");
var Datastore	= require("./Datastore.js");

Datastore.Query = Query = Class(
	
	function Query(){
		this.kinds = [];
		this.filters = [];
		this.projection = [];
		this.groupBy = [];
		this.order = [];
	},
	
	{
		_Operators: {
			// Equal
			"=":					"equal",
			"==":					"equal",
			"===":					"equal",
			"equal":				"equal",
			
			// Less than
			"<":					"lessThan",
			"lessThan":				"lessThan",
			
			// Less than or equal to
			"<=":					"lessThanOrEqual",
			"lessThanOrEqual":		"lessThanOrEqual",
			
			// Greater than
			">":					"greaterThan",
			"greaterThan":			"greaterThan",
			
			// Greater than or equal to
			">=":					"greaterThanOrEqual",
			"greaterThanOrEqual":	"greaterThanOrEqual",
			
			// Ancestorial
			"ancestorof":			"hasAncestor",
			"hasancestor":			"hasAncestor"
		}
	},
	
	{
		immutable:			false,
		inequalityProperty:	null,


		startCursor: function(cursor){
			this._start = cursor;
			return this;
		},
		
		endCursor: function(cursor){
			this._end = cursor;
			return this;
		},
		
		offset: function(offset){
			this._offset = offset;
			return this;
		},
		
		limit: function(limit){
			this._limit = limit;
			return this;
		},
		
		/**
		 * 
		 * @param {String|EntityModel} kinds
		 * @param {type} remove
		 * @returns {UNKNOWN}
		 */
		kinds: function(kinds, remove){
			if(!Array.isArray(kinds))
				kinds = [kinds];
			
			if(remove){
				var rem;
				for(var i = kinds.length-1; i>=0; i++){
					rem = this.kinds.indexOf(kinds[i]);
					if(rem !== -1) this.kinds.splice(rem, 1);
				}
			} else
				this.kinds = this.kinds.concat(kinds);
			
			return this;
		},
		
		/**
		 * Restrictions
		 *		Can only perform inequality operators one 1 property.
		 * @param {type} property
		 * @param {type} operator
		 * @param {type} value
		 * @returns {undefined}
		 */
		filter: function(property, operator, value){
			if(operator !== "=" && operator !== "ancestorOf" || operator !== "hasAncestor"){
				// Make sure all inequality operators are being applied to only one property.
				if(this.inequalityProperty && this.property !== this.inequalityProperty){
					console.warn("Inequality operators can only be applied to a single property. Attempted to use inequality operators on property \""+property+"\" When inequality operators are already being used on property \""+this.inequalityProperty+"\"");
					return;
				}
				
				this.inequalityProperty = property;
			}
			
			this.filters.push({property: property, operator: operator, value: value});
			return this;
		},
		
		project: function(property, aggregationFunction){
			this.projection.push({property: property, aggregationFunction: aggregationFunction});
			return this;
		},
		
		groupBy: function(property){
			this.groupBy.push({name: property});
			return this;
		},
		
		order: function(property, direction){
			this.order.push({property: property, direction: direction});
			return this;
		},
		
		
		/**
		 * Executes the query on the specified datastore.
		 * 
		 * @param {Datastore} datastore
		 * @param {Function} callback
		 */
		execute: function(datastore, callback){
			datastore.query(this, function(err, res){
				
			});
			
			/*
			datastore.connection.request({
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
			});*/
		},
		
		nextResult:	null,
		
		nextPage:	null,
		
		
		
		toJSON: function(){
			var json = {};
			
			if(Datastore._Current)
				json.partitionId = {
					datasetId: Datastore._Current.datasetId,
					namespace: Datastore._Current.namespace
				};
			
			
			json.query = {};
			
			// Populate projection array.
			if(this.projection.length){
				json.query.projection = [];
				this.projection.forEach(function(projection){
					var proj = {};
					proj.property = {
						name: projection.property
					};
					if(projection.aggregationFunction)
						proj.aggregationFunction = projection.aggregationFunction
					
					json.query.projection.push(proj);
				});
			}
			
			if(this.kinds.length){
				json.query.kinds = [];
				this.kinds.forEach(function(kind){
					if(kind instanceof EntityModel)
						json.query.kinds.push(kind.kind);
					else
						json.query.kinds.push(kind);
				});
			}
			
			if(this.filters.length){
				json.query.filter = {};
				
				if(this.filters.length > 1){
					json.query.filter.compositeFilter = {
						operator:	"AND",
						filters:	[]
					};
					var filterArr = json.query.filter.compositeFilter.filters;
					
					this.filters.forEach(function(filterObj){
						var filter = {propertyFilter:{
							property: {name: filterObj.property},
							operator: Query._Operators[filterObj.operator.toLowerCase()],
							value: Entity.JS2Prop(filterObj.value)
						}};
						filterArr.push(filter);
					});
					
				} else{
					json.query.filter.propertyFilter = {
							property: {name: this.filters[0].property},
							operator: Query._Operators[this.filters[0].operator],
							value: Entity.JS2Prop(this.filters[0].value)
					};
				}
			}
			
			if(this.order.length){
				json.query.order = [];
				this.order.forEach(function(orderObj){
					var order = {
						property: {name: orderObj.property}
					};
					if(orderObj.direction){
						var dir = orderObj.direction.toLowerCase();
						if(dir === "descending" || dir === "desc" || dir === "v")
							order.direction = "DESCENDING"
					}
					json.query.order.push(order);
				});
			}
			
			if(this.groupBy.length)
				json.query.groupBy = this.groupBy;
			
			if(this._start)
				json.query.startCursor = this._start;
			
			if(this._end)
				json.query.endCursor = this._end;
			
			if(this._offset)
				json.query.offset = this._offset;
			
			if(this._limit)
				json.query.limit = this._limit;
			
			return json;
		}
	}
);
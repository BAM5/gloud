
var Class = require("ClassConstructor");

module.exports = DatastoreModel = Class(
	
	function DatastoreModel(){
		throw new Error("This class should never be instantiated. It should only be extended through the DatastoreModel.extend method");
	},
	
	{
		Dataset: {
			configurable:	true,
			enumerable:		true,
			
			get: function(){ return this._dataset; },
			set: function(newDataset){
				if(!Key) Key = newDataset.key([["GetKey", "Constructor"]]).constructor;
				this._dataset = newDataset; // Can't typecheck because gcloud module doesn't expose raw classes.
			}
		},
		
		/*
		 * @param kind			{String}	The entity Kind that entities will be stored as
		 * @param constructor	{Function}	A constructor function for this entity model.
		 * @param structure		{Object}	An object that defines the properties of this entity as well as some other data such as whether the property is indexed or not.
		 *									Structure: {
		 *										"key_name": {
		 *											dataType:		Boolean | Int | Double | Number | Date | String | Buffer | Array | Key | Object | (undefined | null),
		 *											indexed:		false,
		 *											required:		false,
		 *											defaultValue:	"default"
		 *										}
		 *									}
		 *	@param static		{Object}	An object whose own enumerable properties will be set on the constructor. If a property is a property descriptor then the descriptor will be applied to the constructor.
		 *	@param instance		{Object}	An object whose own enumerable properties will be set on the prototype of the constructor. If a property is a property descriptor then the descriptor will be applied to the prototype.
		 */
		extend: function(kind, constructor, structure, static, instance){
			
			if(!kind || typeof kind !== "string")
				throw new Error("Argument Error: Expecting argument kind but none was given or was of wrong type (should be string)");
			if(!structure || !DatastoreModel.IsStructure(structure))
				throw new Error("Argument Error: Expecting argument structure but none was given or was of wrong type (should be object)");
			
			var model = Class(constructor, static, instance, DatastoreModel);
			model.Kind = kind;
			model.Structure = structure;
			
			if(!("Dataset" in model) && this.Dataset)
				model.Dataset = this.Dataset;
			if(!("DefaultIndexed" in model) && "DefaultIndexed" in this)
				model.DefaultIndexed = this.DefaultIndexed;
			
			// Make Model generation functions if they don't exist on the constructor.
			if(!model.Create)
				model.Create = function(fromEntity){
					var modelInstance = new model();
					var struct = this.Structure;
					
					// TODO: Add from Entity stuff when we know what an entity object looks like.
					if(fromEntity){
						console.log("FromEntity:");
						console.log(fromEntity);
						console.log();
					}
					
					for(var key in struct){
						if("defaultValue" in struct[key]){
							if(typeof struct[key].defaultValue === "function")
								modelInstance[key] = struct[key].defaultValue();
							else
								modelInstance[key] = struct[key].defaultValue;
						}
					}
				};
			
			if(!model.RunQuery)
				model.RunQuery = function(query, callback, transaction){
					if(!transaction) transaction = model.Dataset;
					transaction.runQuery(query, function(err, entities, nextQuery){
						if(err){
							callback(err);
							return;
						}
						
						var modelEntities = [];
						entities.forEach(function(entity){
							modelEntities.push(model.Create(entity));
						});
						
						callback(null, modelEntities, nextQuery);
					});
				};
		},
		
		IsStructure: function(structure){
			if(structure !== Object(structure)) return false;
			for(var property in structure){
				
			}
		}
	},
	
	{ // Instance properties / methods
		save: function(transaction, callback){
			if(!transaction) transaction = this.constructor.Dataset;
			var entity = this._toGCloud();
		},
		
		/*
		 * Clones the entity properties and alows for a new key.
		 */
		clone: function(newKey){
			
		},
		
		getChildren: function(transaction){
			
		},
		
		key: {
			configurable:	true,
			enumberable:	true,
			
			get: function(){
				return this._key._DatasetKey;
			},
			
			/*
			 * [set]key
			 * @param newKey {Array|Key}	An array of arrays that represent entites. The last entity being this entitie's key.
			 *								Each sub array must consist of the first indexed element(0) being of type String, which identifies the key's kind,
			 *								The second may be a string or an integer.
			 */
			set: function(newKey){
				if(this._key._immutable)
					throw new Error("The key is immutable after it has been submitted to the database");
				
				if(newKey instanceof Key) newKey = newKey.path;
				
				// TODO: Verify newKey is a key
				// TODO: Verify newKey's last element is of kind this.constructor.Kind
				
				this._key = newKey;
				this._key._DatasetKey = this.constructor.Dataset.key(newKey);
			}
		},
		
		parent: {
			configurable:	true,
			enumerable:		true,
			
			get: function(){
				return this._key.slice(0, -1);
			},
			
			set: function(parent){
				if(this._key._immutable)
					throw new Error("The key is immutable after it has been submitted to the database");
				
				this.key = parent.concat(this._key.slice(-1));
			}
		},
		
		kind: {
			configurable:	false,
			enumberable:	true,
			
			get: function(){ return this.constructor.Kind }
		},
		
		id: {
			configurable:	true,
			enumerable:		true,
			
			get: function(){
				
			},
			
			set: function(newID){
				
			}
		},
		
		name: {
			configurable:	true,
			enumerable:		true,
			
			get: function(){
				
			},
			
			set: function(newID){
				
			}
		}
		
		deleteEntity: function(){
			
		},
		
		_toGCloud: function(){
			var structure = this.constructor.Structure;
			var entity = {};
			var key, property;
			var properties = []; // {name: "keyname", value: "property value", excludeFromIndexes: true}
			for(var key in structure){
				if(key in this){
					if(structure[key].dataType && !(this[key] instanceof structure[key].dataType))
						return null;
					
					property = {
						name:	key,
						value:	this[key]
					};
					if("indexed" in structure[key])
						property.excludeFromIndexes = !structure[key].indexed;
					else if("DefaultIndexed" in this.constructor && !this.constructor.DefaultIndexed)
						property.excludeFromIndexes = true;
					
					properties.push(property);
				} else if(structure[key].required)
					return null;
			}
			
			entity.key = this.key;
			entity.data = properties;
			return entity;
		}
	}
);
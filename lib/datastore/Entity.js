var Class		= require("ClassConstructor");
var Datastore	= require("./Datastore.js");

Datastore.Entity = Entity = Class(
	
	function Entity(){
		Object.defineProperties(this, {
			"_index": {
				configurable:	true,
				enumerable:		false,
				writable:		true,

				value: []
			},
			
			"key": {
				configurable:	true,
				enumerable:		false,
				writable:		true,

				value: new Datastore.Key([{kind: "Generic"}])
			}
		});
	},
	
	{
		/**
		 * Converts a javascript value into a datastore property object value.
		 * 
		 * Below is a list of javascript datatypes and what they'll be sent to the datastore as
		 *		Datastore.Key			=> keyValue
		 *		Boolean					=> booleanValue
		 *		Datastore.Long || Long	=> integerValue
		 *		Number (num%1 === 0)	=> integerValue
		 *			3562462345
		 *			"2363473456"
		 *		Number (num%1 !== 0)	=> doubleValue
		 *			1.587354
		 *			"157.47867"
		 *		Date					=> dateTimeValue
		 *		String					=> stringValue
		 *		Buffer					=> blobValue
		 *		Object					=> entityValue
		 *		Array					=> listValue
		 * 
		 * @public
		 * 
		 * @param {*}			value
		 *		Converts value into a datastore representation of value.
		 * 
		 * @param {Boolean}		indexed
		 *		Whether or not the property is indexed. If not provided the indexed property is not set.
		 * 
		 * @param {Datastore}	datastore
		 *		The datastore object that this entity will be mutating
		 *	
		 * @returns {Object}
		 */
		JS2Prop: function(value, indexed, datastore){
			var propValue = {};
			var valueType = typeof value;
			
			if(indexed !== undefined) propValue.indexed = Boolean(indexed);
			else indexed = true;
			
			switch(valueType){ 
				case "string":
					if(!isNaN(value)){// Value is a number string
						if(value.indexOf('.') === -1)
							propValue.integerValue = value;
						else
							propValue.doubleValue = parseFloat(value);
						
						break;
					}
					
					// Value is a string of characters
					if(indexed && value.length > 500)
						throw new Error("String values that are indexed have a max length of 500 characters.");
					else(value.length > 1000000) // String can only have a size of 1MB. This is only a rough check as unicode characters can take more than 1 byte.
						throw new Error("String values that are unindexed have a max size of 1MB.");
					
					propValue.stringValue = value;
					break;
				
				case "number":
					if(value % 1 === 0) // Number is an integer
						propValue.integerValue = value;
					else
						propValue.doubleValue = value;
					
					break;
				
				case "boolean":
					propValue.booleanValue = value;
					break;
				
				default:
					if(value instanceof Date){
						propValue.dateTimeValue = value.toISOString();
						
					} else if(value instanceof Datastore.Key){
						propValue.keyValue = value.toJSON(datastore);
						
					} else if(Array.isArray(value)){
						propValue.listValue = [];
						for(var i=0; i<value.length; i++)
							propValue.listValue.push(Entity.JS2Prop(value[i]));
						
					} else if(Long.isLong(value)){
						propValue.integerValue = value.toString();
						
					} else if(value instanceof Buffer){
						if(indexed && value.length > 500)
							throw new Error("Blob values that are indexed have a max size of 500 bytes.");
						else(value.length > 1000000) // String can only have a size of 1MB. This is only a rough check as unicode characters can take more than 1 byte.
							throw new Error("Blob values that are unindexed have a max size of 1MB.")
						
						propValue.blobValue = value.toString("binary");
						
					} else if(value instanceof Entity){
						propValue.entityValue = value.toJSON();
						
					} else { // Treat value as an object
						var props = Object.keys(value);
						propValue.entityValue = {properties: {}};
						for(var i = 0; i<props.length; i++)
							propValue.entityValue.properties[props[i]] = Entity.JS2Prop(value[props[i]]);
					}
					break;
			}
			
			return propValue;
		},
		
		/**
		 * Converts a datastore property object into a value.
		 * 
		 * @todo Firgure out what blobKeyValue is and convert it to appropriate object type.
		 */
		Prop2JS: function(propObj){
			var val = stringValue || booleanValue || doubleValue || blobKeyValue;
			if(val) return val;
			
			if(val = propObj.integerValue){
				if(typeof val === "string"){
					var long = Long(val);
					if(long.greaterThan(Long.MAX_SIGNED_VALUE)) return long;
					else return parseInt(val);
				} else
					return val;
				
			}else if(val = propObj.dateTimeValue)
				return new Date(val);
			else if(val = propObj.keyValue)
				return Datastore.Key.FromJSON(val);
			else if(val = propObj.blobValue)
				return new Buffer(val, "binary");
			else if(val = propObj.listValue){
				for(var i = 0; i<val.length; i++)
					val[i] = Entity.Prop2JS(val[i]);
				return val;
			} else if(val = propObj.entityValue)
				return Entity.FromJSON(val);
		},
		
		PropType: function(jsValue){
			switch(typeof value){
				case "string":
					if(!isNaN(value)){// Value is a number string
						if(value.indexOf('.') === -1)
							return "integerValue";
						else
							return "doubleValue";
					}
					
					// Value is a string of characters
					return "stringValue";
				
				case "number":
					if(value % 1 === 0) // Number is an integer
						return "integerValue";
					else
						return "doubleValue";
				
				case "boolean":
					return "booleanValue";
				
				default:
					if(value instanceof Date)
						return "dateTimeValue";
					
					else if(value instanceof Datastore.Key)
						return "keyValue";
					
					else if(Array.isArray(value))
						return "listValue";
					
					else if(Long.isLong(value))
						return "integerValue";
					
					else if(value instanceof Buffer)
						return "blobValue";
					
					else if(value instanceof Entity)
						return "entityValue";
					
					else
						return "entityValue";
			}
		},
		
		/**
		 * A function to convert a JSON entity object to an Entity instance.
		 * @todo Check for a EntityModel that corresponds to the kind of this model?
		 */
		FromJSON: function(jsonEntityObj){
			var ent = new Entity();
			
			if(jsonEntityObj.key) ent.key = Datastore.Key.FromJSON(jsonEntityObj.key);
			
			for(var prop in jsonEntityObj.properties)
				ent[prop] = Entity.Prop2JS(jsonEntityObj.properties[prop]);
			
			return ent;
		},
		
		/**
		 * A function to be used as a reviver for entity json strings.
		 * Root element should be an entity.
		 * 
		 * Json.parse(jsonEntityString, Entity.FromJSON);
		 * 
		 * All strings listed here should not be used as property names:
		 *		Special strings:
		 *		found, missing, entityResults, entity
		 *		
		 *		All value type strings:
		 *		entityValue, blobKeyValue, stringValue, booleanValue,
		 *		doubleValue, integerValue, dateTimeValue, keyValue, blobValue,
		 *		listValue
		 */
		EntityReviver: function(k, v){
			switch(k){
				case "found":
				case "missing":
				case "entityResults":
					if(!Array.isArray(v)) return v;
					v.forEach(function(elm, i, arr){
						arr[i] = elm.entity;
					});
					return v;
				
				case "deferred":
					if(!Array.isArray(v)) return v;
					v.forEach(function(elm, i, arr){
						arr[i] = Datastore.Key.FromJSON(elm);
					});
					return v;
					
				case "entity": // Root Entity Object
				case "entityValue":
					// Make key into a Datastore.Key instance
					if(v.key)
						var key = Datastore.Key.FromJSON(v.key);
					
					if(EntityModel.KindMap[key.kind]) // If a EntityModel for this kind exists then make model into that.
						var ent = new EntityModel.KindMap[key.kind]();
					else
						var ent = new Entity();
					
					if(key)
						ent.key = key;
					
					// Restore properties to singular objects
					for(var prop in v.properties){
						ent[prop] = v.properties[prop].value;
						if(v.properties[prop].indexed)
							ent.index(prop);
					}
					
					if(k === "entityValue") this.value = ent;
					else return ent;
					break;
				
				case "blobKeyValue": // I have no idea what this is since it isn't documented... LOOKIN AT YOU GOOGLE.
				case "stringValue":
				case "booleanValue":
				case "doubleValue":
					this.value = v;
					break;
					
				case "integerValue":
					if(typeof v === "string"){
						var long = Long(v);
						if(long>Long.MAX_SIGNED_VALUE) this.value = long;
						else this.value = parseInt(v);
					} else
						this.value = v;
					break;
					
				case "dateTimeValue":
					this.value = new Date(v);
					break;
					
				case "keyValue":
					this.value = new Datastore.Key(v);
					break;
				
				case "blobValue":
					this.value = new Buffer(v, "binary");
					break;
					
				case "listValue":
					for(var i = 0; i<v.length; i++)
						v[i] = v[i].value;
					this.value = v;
					break;
				
				default:
					return v;
			}
		}
	},
	
	{
		clone: function(){
			var clone = new this.constructor();
			clone.key = this.key.clone();
			
			var own = Object.keys(this);
			own.forEach(function(prop){
				clone[prop] = this[prop];
			});
			
			return clone;
		},
		
		/**
		 * Indexes the property or properties specified by propertyName
		 */
		index: function(propertyName){
			this._index.push(propertyName);
		},
		
		queryChildren: function(){
			var query = new Query();
			query.filter("__key__", "hasAncestor", this.key);
		},

		getParentEntity: function(callback){},
		
		/**
		 * This function converts the entity this into an object recognized as an
		 * entity by the Datastore JSON API https://cloud.google.com/datastore/docs/apis/v1beta2/entity
		 * The Entity object's enumerable own properties are the properties that
		 * will be sent to datastore.
		 * @function
		 * @returns {Object}
		 */
		toJSON: function(datastore){
			var ent = { properties: {} };
			var props = Object.keys(this);
			
			if(this.key)
				ent.key = this.key.toJSON(datastore);
			
			var reserved = /^__.*__$/
			// Restore properties to singular objects
			for(var i = 0; i<props.length; i++){
				if(reserved.test(props[i])){
					console.warning("The property "+props[i]+" has a reserved name and is being discarded. Any name that matches the following regexp is reserved "+reserved.toString());
					continue;
				}
				ent.properties[props[i]] = Entity.JS2Prop(this[props[i]], this.isIndexed(props[i]), datastore);
			}
			
			return ent;
		}
	}
);
var Class = require("ClassConstructor");
var Datastore = require("./Datastore.js");

var Long = Datastore.Long = require("Long");

Datastore.Key = Key = Class(
	
	/**
	 * Key does not keep track of the dataset-id or namespace. These values will beset when the key is used in a datastore request.
	 * 
	 * @constructor
	 * 
	 * @param {Array[]|Object[]|Object} keyData
	 *		If keyData is an array of arrays.
	 *			Each sub array's first element is the kind
	 *			Each sub array's second element is the identifier (Name or numeric id)
	 *		If keyData is an array of Objects.
	 *			object.kind is the entity's kind
	 *			object.id or object.name is the entity's identifier
	 *			
	 *		If keyData is an object then keyData is assumed to be raw data from a datastore request and will be passed to FromJSON.
	 *	
	 * @param {Object} partitionId
	 *		Can be any object that has the properties datasetId and namespace
	 */
	function Key(keyData, partitionId){
		
		if(partitionId) this.partitionId = partition;
		else this._partition = null;
		
		if(Array.isArray(keyData)){
			this.push.apply(this, keyData);
		} else if("kind" in keyData){
			this.push(keyData);
		} else
			return Key.FromJSON(keyData);
	},
	
	{
		Reserved: /^__.*__$/,

		FromJSON: function(jsonKeyData){
			if(typeof jsonKeyData === "string") jsonKeyData = JSON.parse(jsonKeyData);
			
			if(!jsonKeyData.path)
				throw new TypeError("jsonKeyData parameter has no path property and is deteremined to not be a key");
			else if(jsonKeyData.path)
				throw new TypeError("jsonKeyData parameter has no path property and is deteremined to not be a key");
			
			try{
				var key = new Key(jsonKeyData.path);
				if("partitionId" in jsonKeyData) key.partitionId = jsonKeyData.partitionId;
				return key;
			} catch(e){
				throw new Error("jsonKeyData was unable to be interpreted as a key");
			}
		}
	},
	
	{
		partitionId: {
			configurable:	true,
			enumerable:		true,
			
			get: function(){ return this._partition; },
			
			set: function(newPartition){
				if(!("datasetId" in newPartition && "namespace" in newPartition))
					throw new TypeError("new value for partitionId must have the properties datasetId and namespace");
				
				this._partition = newPartition;
			}
		},

		parent: {
			configurable:	true,
			enumerable:		true,
			
			get: function(){
				if(this.length < 2) return null; // This means that this key refers to a root element.
				if(!this._parent){
					this._parent = new this.constructor(this.slice(0, -1));
					this._parent.immutable = true;
				}
				return this._parent;
			},
			
			/**
			 * @param {Key|Array[]|Object[]|Object} newParent
			 *		Sets the ancestor path for this entity. Will accept same data as Key constructor as the newParent as well.
			 */
			set: function(newParent){
				if(this.immutable)
					throw new Error("This key is immutable. This can be checked with the property keyObj.immutable");
				
				if(!(newParent instanceof Key)) newParent = new this.constructor(newParent);
				this._parent = newParent.clone();
				this._parent.immutable = true;
				
				this.splice(0, this.length-1);				// Delete all except the main key.
				this.unshift.apply(this, this._parent);		// Add all elements from the parent key to the beginning of this key.
			}
		},
		
		kind: {
			configurable:	true,
			enumerable:		true,
			
			get: function(){
				return this[this.length - 1].kind;
			},
	
			set: function(newKind){
				if(this.immutable)
					throw new Error("This key is immutable. This can be checked with the property keyObj.immutable");
				
				if(typeof newKind !== "string")
					throw new TypeError("kind property can only be set to a string");
				
				// Check against reserved regexp
				if(Key.Reserved.test(newKind))
					throw new Error("Any kind name matching the regexp "+Key.Reserved+" is reserved.");
				
				this[this.length - 1].kind = newKind;
			}
		},
		
		name: {
			configurable:	true,
			enumerable:		true,
			
			get: function(){ return this[this.length - 1].name; },
			
			set: function(name){
				delete this[this.length - 1].id;
				this[this.length - 1].name = name;
			}
		},
		
		id: {
			configurable:	true,
			enumerable:		true,
			
			get: function(){ return this[this.length - 1].id; },
			
			set: function(id){
				delete this[this.length - 1].name;
				if(id instanceof Long) id = id.toString();
				this[this.length - 1].id = id;
			}
		},
		
		identifier: {
			configurable:	true,
			enumerable:		true,
			
			get: function(){
				return this[this.length - 1].id || this[this.length - 1].name;
			},
			
			set: function(newIdentifier){
				if(!isNaN(newIdentifier))
					this.id = newIdentifier;
				else
					this.name = newIdentifier;
			}
		},
		
		autoId: {
			configurable:	true,
			enumerable:		true,
			
			get: function(){ return !Boolean(this[this.length - 1].name || this[this.length - 1].id); },
			
			set: function(autoId){
				if(autoId){
					delete this[this.length - 1].id;
					delete this[this.length - 1].name;
				} else
					console.warning("To turn of autoId on a key just apply a value to key.name or key.id");
			}
		},
		
		clone: function(){
			return this.getKey();
		},
		
		/**
		 * @param {Object} entityKey
		 *		An object with 2 properties: kind and either name or id.
		 *	
		 *	@todo Check that entityKey is right.
		 */
		push: function(){
			this.super.push.apply(this, arguments);
		},
		
		/**
		 * Gets a key for the specified depth.
		 * EG A depth of 0 will get the root entity's key. 1 will get the root's direct child, 2 wil get the child's child, etc.
		 * 
		 * @param {Integer} depth
		 *		The depth of the key to get.
		 */
		getKey: function(depth){
			if(depth === undefined) depth = this.length - 1;
			if(depth >= this.length)
				throw new RangeError("This key does not have a depth greater than or equal to the depth specified.");
			
			return new this.constructor(this.slice(0, depth+1));
		},
		
		toString: function(){
			var str = "";
			for(var i = 0; i<this._path.length; i++){
				if(i>0) str += ", ";
				str += this._path[i][0]+":"+this._path[i][1];
			}
				
			return "["+str+"]";
		},
		
		toJSON: function(partitionId){
			var keyObj = { path: this.slice() };
			if(partitionId === undefined){
				if(this._partition)
					partitionId = this._partition;
				else
					partitionId = Datastore._Current;
			}
			if(partitionId)
				keyObj.partitionId = {
					datasetId: partitionId.datasetId,
					namespace: partitionId.namespace
				};
			
			return keyObj;
		}
	},
	
	Array
);
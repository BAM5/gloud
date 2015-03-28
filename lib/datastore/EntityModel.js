var Class		= require("ClassConstructor");
var Datastore	= require("./Datastore.js");

Datastore.EntityModel = EntityModel = Datastore.Entity.extend(
	
	function EntityModel(){
		
	},
	
	{
		KindMap: {},

		extend: function(kind, structure, constructor, static, instance){
			
			if(!kind || typeof kind !== "string")
				throw new TypeError("Argument Error: Expecting argument kind but none was given or was of wrong type (should be string)");
			if(!structure || !EntityModel.IsStructure(structure))
				throw new TypeError("Argument Error: Expecting argument structure but none was given or was of wrong type (should be object)");
			
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
		
		/**
		 * Structure is an object with the following properties
		 * {
		 *	entProp: {
		 *		propType:	Enum["list", "string", "int", etc...],
		 *		jsType:		Optional <Class>( [static function Prop2JS(prop):<jsType>], [static function JS2Prop(js):<propType>])
		 *		required:	true
		 *		default:	<value>
		 *		indexed:	false
		 *	}
		 * }
		 * @param {type} struct
		 * @returns {undefined}
		 */
		IsStructure: function(struct){
			
		}
	},
	
	{
		toJSON: function(){
			
		}
	}
);
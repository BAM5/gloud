/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


var gloud = require("gloud");
var Class = require("ClassConstructor");

var Bucket = module.exports = Class(
	
	/**
	 * @param {gloud.Connection}	options.connection
	 * @param {Object}				options.resource
	 * @param {String|Object}		options.jsonKey
	 * @param {String}				name 
	 * @returns {gloud.storage.Bucket}
	 */
	function Bucket(options){
		if(!options) options = {};
		
		if(options.connection)
			this.connection = options.connection;
		else if(options.jsonKey)
			this.connection = new require("./Connection")({jsonKey: options.jsonKey});
		
		this.name = options.name;
	},
	
	{
		Create: function(){
			
		},

		/*
		 * Opens a bucket and returns the bucket object in a callback.
		 */
		Open: function(bucketName, cb){
			
		},
		
		ComposeObject: function(){}
	},
	
	{
		/**
		 * Creates a new object in the bucket with the given identifier.
		 * 
		 * @return {gloud.storage.BucketObject}
		 */
		newObject: function(identifier){
			
		},
		
		/**
		 * Returns a listing of the objects within the bucket.
		 * Check https://cloud.google.com/storage/docs/json_api/v1/objects/list for more information.
		 * 
		 * @param {String}	criteria.delimiter
		 * @param {String}	criteria.pageToken
		 * @param {String}	criteria.prefix
		 * @param {String}	criteria.projection
		 * @param {Boolean}	criteria.versions
		 * 
		 * @param {uint}	maxResults
		 */
		list: function(criteria, maxResults){
			
		}
	}
)
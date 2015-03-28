/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


var stream	= require("stream");
var Class	= require("ClassConstructor");

var BucketObject = module.exports = Class(
	function BucketObject(bucket, name, generation){
		stream.Duplex.call(this, {
			allowHalfOpen:	true
		});
		
		this.bucket		= bucket;
		this.name		= name;
		this.generation	= generation;
		
		/*
		this.bucket				= "";
		this.cacheControl		= "";
		this.componentCount		= 0;
		this.contentDisposition	= "";
		this.contentEncoding	= "";
		this.contentLanguage	= "";
		this.contentType		= "";
		this.crc32c				= "";
		this.etag				= "";
		this.generation			= 0;
		this.id					= "";
		this.md5Hash			= "";
		this.mediaLink			= "";
		this.metadata			= {};
		this.metageneration		= 0;
		this.name				= "";
		this.owner				= {entity: "", entityId: ""};
		this.selfLink			= "";
		this.size				= 0;
		this.storageClass		= "";
		this.timeDeleted		= null;
		this.updated			= null;
		*/
	},
	
	{
		JS2Prop: function(bucketObj){
			return bucketObj.bucket +"/"+ bucketObj.name;
		},

		Prop2JS: function(prop){
			var js = new BucketObject();
			var split = prop.indexOf("/");
			js.bucket	= prop.substr(0, split);
			js.name		= prop.substr(split+1);
			
			return js;
		}
	},
	
	{
		/**
		 * Will return a string directly from the function to the bucket object.
		 */
		getURL: function(){
			
		},
		
		/**
		 * Gets the resource object as defined by https://cloud.google.com/storage/docs/json_api/v1/objects
		 * All the properties will be accessbile from the BucketObject instance.
		 * 
		 * @param {function} cb function(err, this)
		 */
		getResource: function(cb){
			this.bucket._connection.request({
				scopes: "https://www.googleapis.com/auth/devstorage.full_control"
			});
		},
		
		/**
		 * Updates the updatable resource on the server.
		 * 
		 * @param {function} cb function(err)
		 */
		updateResource: function(cb){
			
		},
		
		/**
		 * Loads the data file that this object represents and streams it through
		 * this BucketObject instance
		 */
		load: function(){
			
		},
		
		/**
		 * Uploads and updates an object to a new generation.
		 */
		upload: function(){
			
		},
		
		_startUploadSession: function(cb){
			 
		}
	},
	
	stream.Duplex
);
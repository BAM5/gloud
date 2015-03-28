/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


var Class = require("ClassConstructor");
var Bucket = require("./Bucket.js");

var Storage = module.exports = Class(
	function Storage(options){
		if(!options) options = {};
		
		if(options.connection)
			this.connection = options.connection;
		else if(options.jsonKey)
			this.connection = new require("../Connection")({jsonKey: options.jsonKey});
		else
			throw new Error("No connection or jsonKey supplied. Cannot connect to storage without a connection.");
	},
	
	{
		
	},
	
	{
		createBucket: function(name, cb){
			
		},

		openBucket: function(name, cb){
			return new Bucket({
				name:		name,
				connection:	this.connection
			});
		},
		
		listBuckets: function(cb){
			
		},
		
		deleteBucket: function(name){
			
		}
	}
);
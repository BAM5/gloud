/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


var Connection	= require("./Connection");
var Datastore	= require("./Datastore");
var jsonKey	= require("../../../../../private/Service Accounts/Frag Nexus-a069d08138c6-Test.json");


var conn = new Connection({jsonKey: jsonKey});
var ds = new Datastore({
	connection:	conn,
	datasetId:	"frag-nexus",
	namespace:	"Test"
});

ds.allocateIds(new Datastore.Key([
	{ kind: "TestEnt" }
]), function(err){
	if(!err) console.log("allocated successfully!");
	else console.error(err);
});



/*
var aToken;
Connection.AccessToken.RequestToken({
	jsonKey: jsonKey,
	scopes: ["https://www.googleapis.com/auth/datastore"]
}, function(err, accessToken){
	if(err){
		console.log(err.message);
		return;
	}
	aToken = accessToken;
	console.log("Received Token: ["+aToken.type+"]"+aToken.token);
	getNewToken();
});

function getNewToken(){
	aToken.renew({scopes: "https://www.googleapis.com/auth/cloud-platform"}, function(err, accessToken){
		if(err){
			console.log(err.message);
			return;
		}

		aToken = accessToken;
		console.log("Received Renewed Token: ["+aToken.type+"]"+aToken.token);
	});
}
*/
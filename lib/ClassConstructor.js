/*
 * constructor		{function}			constructor function of class
 * static			{object|function}	an object or function that returns an object that represents all the static properties for this class
 *										If a function then the constructor is passed to function as the first parameter
 *										The object can be a list of key: values, or it can be key: <propertyDescriptor> as defined by https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties
 * instance			{object|function}	an object or function that returns an object that represents all the prototype properties for this class
 *										If a function then the constructor is passed to function as the first parameter
 *										The object can be a list of key: values, or it can be key: <propertyDescriptor> as defined by https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties
 * inheritsFrom		{function}			If set then the class will extend this function and it's prototype. If array it will extend 
 */
module.exports = Class = function Class(constructor, static, instance, inheritsFrom){
	if(inheritsFrom && typeof inheritsFrom !== "function")
		throw new Error("Argument Error: inheritsFrom parameter must be a constructor function.");
	if(static && typeof static === "function") static = static(constructor);
	if(instance && typeof instance === "function") instance = instance(constructor);
	
	var prototype = {};
	
	// Extend inheritsFrom
	if(inheritsFrom){
		prototype = Object.create(inheritsFrom.prototype);
		Object.defineProperty(prototype, "super", {
			configurable:	false,
			enumerable:		false,
			writable:		false,
			
			value: inheritsFrom.prototype
		});
	}
	
	if(static){
		toDescriptors(static);
		Object.defineProperties(constructor, static);
	}
	
	if(instance){
		toDescriptors(instance);
		Object.defineProperties(prototype, instance);
	}
	
	Object.defineProperty(prototype, "constructor", {
		configurable:	false,
		enumerable:		false,
		writable:		false,

		value: constructor
	});
	Object.defineProperty(constructor, "prototype", {
		value: prototype
	});
	
	if(!("extend" in constructor))
		Object.defineProperty(constructor, "extend", {
			configurable:	true,
			enumerable:		false,
			writable:		false,
			
			value: function(childConstructor, static, instance){
				return Class(childConstructor, static, instance, constructor);
			}
		});
	
	return constructor;
};





function toDescriptors(object){
	for(var key in object)
		if(!isDescriptor(object[key])){
			object[key] = {
				configurable:	true,
				enumerable:		true,
				writable:		true,
				
				value: object[key]
			};
		}
}
function isDescriptor(object){
	// If object is not an object, then it cannot be a property descriptor.
	if(typeof object !== "object" || object === null) return false;
	
	// If there are any property names in the object that arn't in the array below, the object is not a descriptor.
	var validProps = ["configurable", "enumerable", "writable", "value", "get", "set"];
	for(var prop in object)
		if(validProps.indexOf(prop) === -1)
			return false;
	
	// Only say it's a descriptor if it has a value, or getter or setter.
	return ("value" in object || "get" in object || "set" in object);
}
var Bell 	= require('bell');
var Hapi = require("hapi");
var server = new Hapi.Server();
var config = require('./config');
var mongoose = require('mongoose');
console.log('config.mongoose: ', config.mongoose);
mongoose.connect(config.mongoose)
var Schema = mongoose.Schema;
var index = "public/index.html";

var userSchema = new Schema({
    email: String,
    username: String
});


var datasetSchema = new Schema({
	title: String,
	url: String,
	img_url: String,
	tags: Array,
	features: Number,
	datapoints: Number,
	rating: Number,
	comments: Array,
	user: String
});


var Dataset = mongoose.model('Dataset', datasetSchema);
var User = mongoose.model('User', userSchema);

server.connection({
	port: process.env.PORT || 8080,
    host: "0.0.0.0" || "localhost"
});


server.register([require('inert'), require('bell'), require('hapi-auth-cookie')], function(err){

    if (err) {
        throw err;
    }

    var authCookieOptions = {
        password: 'cookie-encryption-password', //Password used for encryption
        cookie: 'sitepoint-auth', // Name of cookie to set
        isSecure: false
    };

    server.auth.strategy('site-point-cookie', 'cookie', authCookieOptions);

    var bellAuthOptions = {
        provider: 'github',
        password: config.password, //Password used for encryption
        clientId: config.clientId,//'YourAppId',
        clientSecret: config.clientSecret,//'YourAppSecret',
        isSecure: false
    };

    server.auth.strategy('github-oauth', 'bell', bellAuthOptions);
	
	server.route([
		{
			method: "GET",
			path: "/login",
			config: {
				auth: 'github-oauth',
				handler: function(request, reply){
			        if (request.auth.isAuthenticated) {
			            request.auth.session.set(request.auth.credentials);
			            return reply.redirect('/');
			            //return reply('Hello ' + request.auth.credentials.profile.displayName);
			    	}
				    reply('Not logged in...').code(401);
				}
			}
		},
		{
			method: "GET",
			path: "/bundle.js",
			config: {
			    auth: false,
			    handler: function(request, reply){
					reply.file("public/bundle.js");
				}
			}
		},
		{
			method: 'GET',
			path: '/logout',
			config: {
			    auth: false,
			    handler: function (request, reply) {
			        request.auth.session.clear();
			        reply.redirect('/');
		    	}
			}
		},
		{
			method: "GET",
			path: "/api/user",
			config: {
				auth: {
		            strategy: 'site-point-cookie',
	                mode: 'try'
            	},
            	handler: function(request, reply){
            		if (request.auth.isAuthenticated){
                		console.log('is authenticated--------: ', request.auth.credentials);
                		reply(request.auth.credentials);
                	}else {
                		reply(false);
                	}
            	}
        	}

		},
		{
			method: ["POST"],
			path: "/api/dataset/new",
			config: {
				auth: {
		            strategy: 'site-point-cookie',
	                mode: 'try'
            	},
            	handler: function(request, reply){
            		if (request.auth.isAuthenticated){
						var d = request.payload;
	                    // Query the db to check if the user exists there
	                    Dataset.findOne({url: d.url}, function(err,dataset){
						    
						    if (err){
						        throw err;
						       	reply.file(index);
						    }

						    if (dataset) {
						       	reply(dataset);
							}
		                    else {
		                        //create new user object
		                        var new_dataset = new Dataset();
		                        new_dataset.title = d.title;
		                        new_dataset.url = d.url;
		                        new_dataset.img_url = d.img_url;
		                        new_dataset.tags = d.tags;
		                        new_dataset.user = d.displayName;
		                        // save the user to the db
		                        new_dataset.save( function(err, res){
		                            if (err){
		                                console.log('error when saving new member');
		                                throw error;
		                            }
		                            console.log('registration successful, dataset: ',res);
		                            reply(res);
		                        });
					    	}
						});
					} 
	                // if the user isn't authenticated
	                else {
	                	console.log('not logged in');
						reply.file(index);
					}

                }
            }
        },
		{
			method: "GET",
			path: "/api/dataset/{datasetId}",
			config: {
				auth: {
		            strategy: 'site-point-cookie',
	                mode: 'try'
            	},
            	handler: function(request, reply){
            		var dataset = request.params.datasetId;
            		console.log('------dataset:',dataset);
            		Dataset.findById(dataset, function(err,dataset){
            			console.log('mongodb - dataset:',dataset);
					    if (err){
					        throw err;
					       	reply.file(index);
					    }

	                    // if the user exists, simply reply without doing anything
					    if (dataset) {
					       	reply(dataset);
						} else {
							reply(false);
						}
            		});
				}
			}
		},
		{
			method: "GET",
			path: "/api/datasets/featured",
			config: {
				auth: {
		            strategy: 'site-point-cookie',
	                mode: 'try'
            	},
            	handler: function(request, reply){
            		console.log("/api/datasets/featured");
            		Dataset.find({}).sort({rating: -1}).limit(6).exec(
            			function(err,datasets){
            				console.log('datasets:', datasets);
					    if (err){
					        throw err;
					       	reply.file(index);
					    }

	                    // if the user exists, simply reply without doing anything
					    if (datasets) {
					       	reply(datasets);
						} else {
							reply(false);
						}
            		});
				}
			}
		},
		{
			method: "GET",
			path: "/{param*}",
			config: {
			   	auth: {
		            strategy: 'site-point-cookie',
	                mode: 'try'
            	},
			    handler: function(request, reply){

            // Check if user is authenticated
				if (request.auth.isAuthenticated){
					var profile = request.auth.credentials.profile;
					
                    // Query the db to check if the user exists there
                    User.findOne({email: profile.email}, function(err,user){
					    if (err){
					        throw err;
					       	reply.file(index);
					    }

	                    // if the user exists, simply reply without doing anything
					    if (user) {
					       	reply.file(index);
						} 

	                    // if the user doesn't exist
	                    else {

	                        //create new user object
	                        var new_user = new User();
	                        new_user.email = profile.email;
	                        new_user.username = profile.username;
	                        new_user.name = profile.displayName;
	                        new_user.img = profile.raw.avatar_url;

	                        // save the user to the db
	                        new_user.save( function(err){
	                            if (err){
	                                console.log('error when saving new member');
	                                throw error;
	                            }
	                            console.log('registration successful');
	                            reply.file(index);
	                        });
				    	}
						});

				} 

                // if the user isn't authenticated
                else {
                	console.log('not logged in');
					reply.file(index);
				}


				}
			}
		}
/*		,
		{
			method: "GET",
			path: "/",
			config: {
			   	auth: {
		            strategy: 'site-point-cookie',
	                mode: 'try'
            	},
			    handler: function(request, reply){
			    	console.log('--------/')
	            	// Check if user is authenticated
					if (request.auth.isAuthenticated){ 
						reply.file(index);
					} 
	                // if the user isn't authenticated
	                else {
	                	console.log('not logged in');
						reply.file(index);
					}
				}
			}
		}*/
	]);

/*	server.start(function (err) {
		if (err) {
	        throw err;
	    }
		console.log('Server running');
	});*/

});

module.exports = {
	server: server
};

/*
'use strict';

import express from 'express';

let server = express();
const PORT = 8080;

// Serve files from ./public/ as the root web directory.
// See http://expressjs.com/starter/static-files.html
server.use(express.static('public'));

console.log("Server is up at http://localhost:%d", PORT);
server.listen(PORT);*/
'use strict';

module.exports = {
	port: 8443,
	db: {
		uri: process.env.MONGOHQ_URL || process.env.MONGOLAB_URI || 'mongodb://localhost/mean',
		auth: {
			user: '',
			pass: ''
		},
		options: {},
		// If mongoose >= 4.11.0 or the uri provided above is formatted for the new version
		// http://mongoosejs.com/docs/connections.html#use-mongo-client
		// The formatter will format the uri to use this new version
		// skipFormatter: true
	},
	log: {
		// Can specify one of 'combined', 'common', 'dev', 'short', 'tiny'
		format: 'combined',
		// Stream defaults to process.stdout
		// Uncomment to enable logging to a log on the file system
		options: {
			stream: 'access.log'
		}
	},
	assets: {
		lib: {
			css: [],
			js: []
		},
		css: '',
		js: ''
	},
	mailer: {
		from: process.env.MAILER_FROM || 'MAILER_FROM',
		options: {
			service: process.env.MAILER_SERVICE_PROVIDER || 'MAILER_SERVICE_PROVIDER',
			auth: {
				user: process.env.MAILER_EMAIL_ID || 'MAILER_EMAIL_ID',
				pass: process.env.MAILER_PASSWORD || 'MAILER_PASSWORD'
			}
		}
	}
};

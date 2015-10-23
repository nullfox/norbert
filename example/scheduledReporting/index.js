var Norbert = require('../../index');

// Set the defaul logger
Norbert.Server.setLogger(require('bunyan').createLogger({
  name: 'FOOBAR!'
}));

Norbert
  .Server
  .factory({
  	verboseLogging: true
  })
  .addSequelizeResource(
  	'/1.0/organizations/{organizationId}/reports/{reportId}',
  	require('./models/report'),
  	{
  		parentResource: 'organization'
  	}
  )
  .start();
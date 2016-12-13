var Norbert = require('../../index');
var Report = require('./models/report');

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
  .addResource(
  	'/1.0/organizations/{organizationId}/reports/{reportId}/states/{stateId}',
    [
      Norbert.Collection.factory(
        function (request) {
          return Report.all(request.params.reportId);
        }
      )
    ]
  )
  .start();